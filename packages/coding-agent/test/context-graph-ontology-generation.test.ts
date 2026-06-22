import { describe, expect, it } from "vitest";
import {
	type CurrentRepositoryMetadata,
	canActivateOntologyGeneration,
	computeOntologyGenerationId,
	createOntologyGenerationCacheKey,
	createOntologyGenerationCacheKeyMaterial,
	evaluateUaGraphFreshnessFromMetadata,
	ONTOLOGY_GENERATION_STATUSES,
	type OntologyGenerationIdentityInput,
	type UaGraphMetadata,
} from "../src/core/context-graph-ontology-generation.ts";

const currentMetadata: CurrentRepositoryMetadata = {
	repoSha: "c0dd781bc0dd781bc0dd781bc0dd781bc0dd781b",
	branch: "main",
	ontologySchemaVersion: "0.1.0",
	uaGraphSha256: "graph-hash-current",
};

const graphMetadata: UaGraphMetadata = {
	schemaVersion: "0.1.0",
	graphRepoSha: currentMetadata.repoSha,
	metadataRepoSha: currentMetadata.repoSha,
	branch: currentMetadata.branch,
	uaGraphSha256: currentMetadata.uaGraphSha256,
	coveredPaths: ["packages/coding-agent/src/core/context-graph-policy.ts", "README.md"],
};

const generationInput: OntologyGenerationIdentityInput = {
	schemaVersion: "0.1.0",
	registryVersion: "0.1.0",
	uaGraphSha256: "graph-hash-current",
	workspaceId: "omk",
	repositoryId: "open-multi-agent-kit",
	repoSha: currentMetadata.repoSha,
	branch: "main",
};

describe("context graph ontology generation freshness", () => {
	it("treats the observed stale UA graph shape as inactive without calling git", () => {
		const stale = evaluateUaGraphFreshnessFromMetadata(
			currentMetadata,
			{
				...graphMetadata,
				graphRepoSha: "0b8338185f0d699f29f4c2fcd07bf93ac8b39e1e",
			},
			[],
		);

		expect(stale.fresh).toBe(false);
		expect(stale.reasons).toContain("graph_commit_mismatch");
		expect(stale.diagnostics[0]).toMatchObject({
			reason: "graph_commit_mismatch",
			expected: currentMetadata.repoSha,
			actual: "0b8338185f0d699f29f4c2fcd07bf93ac8b39e1e",
		});
	});

	it.each([
		["schema_mismatch" as const, { graph: { schemaVersion: "9.0.0" }, dirtyPaths: [] as readonly string[] }],
		[
			"graph_commit_mismatch" as const,
			{ graph: { graphRepoSha: "graph-commit" }, dirtyPaths: [] as readonly string[] },
		],
		[
			"meta_commit_mismatch" as const,
			{ graph: { metadataRepoSha: "meta-commit" }, dirtyPaths: [] as readonly string[] },
		],
		["branch_mismatch" as const, { graph: { branch: "feature/context-graph" }, dirtyPaths: [] as readonly string[] }],
		[
			"graph_hash_mismatch" as const,
			{ graph: { uaGraphSha256: "other-graph-hash" }, dirtyPaths: [] as readonly string[] },
		],
		[
			"dirty_covered_paths" as const,
			{ graph: {}, dirtyPaths: ["./packages/coding-agent/src/core/context-graph-policy.ts"] as readonly string[] },
		],
	])("reports %s", (reason, overrides) => {
		const result = evaluateUaGraphFreshnessFromMetadata(
			currentMetadata,
			{ ...graphMetadata, ...overrides.graph },
			overrides.dirtyPaths,
		);

		expect(result.fresh).toBe(false);
		expect(result.reasons).toContain(reason);
	});

	it("accepts fresh metadata when schema, commits, branch, graph hash, and dirty coverage all match", () => {
		expect(
			evaluateUaGraphFreshnessFromMetadata(currentMetadata, graphMetadata, ["packages/ai/src/index.ts"]),
		).toEqual({
			fresh: true,
			reasons: ["fresh"],
			diagnostics: [],
			dirtyCoveredPaths: [],
		});
	});
});

describe("ontology generation identity and cache key material", () => {
	it("computes deterministic generation ids and changes when registry, graph hash, branch, or repoSha changes", () => {
		const baseline = computeOntologyGenerationId(generationInput);

		expect(baseline).toBe(computeOntologyGenerationId({ ...generationInput }));
		expect(baseline).toMatch(/^[a-f0-9]{64}$/);
		expect(computeOntologyGenerationId({ ...generationInput, registryVersion: "0.2.0" })).not.toBe(baseline);
		expect(computeOntologyGenerationId({ ...generationInput, uaGraphSha256: "other-hash" })).not.toBe(baseline);
		expect(computeOntologyGenerationId({ ...generationInput, branch: "feature/context-graph" })).not.toBe(baseline);
		expect(computeOntologyGenerationId({ ...generationInput, repoSha: "abc123" })).not.toBe(baseline);
	});

	it("creates deterministic cache key material scoped to generation, repo, branch, schema, registry, and graph hash", () => {
		const material = createOntologyGenerationCacheKeyMaterial(generationInput);
		const key = createOntologyGenerationCacheKey(generationInput);

		expect(material).toEqual({
			kind: "ontology-generation",
			version: "v1",
			schemaVersion: generationInput.schemaVersion,
			registryVersion: generationInput.registryVersion,
			generationId: computeOntologyGenerationId(generationInput),
			workspaceId: generationInput.workspaceId,
			repositoryId: generationInput.repositoryId,
			repoSha: generationInput.repoSha,
			branch: generationInput.branch,
			uaGraphSha256: generationInput.uaGraphSha256,
		});
		expect(key.material).toEqual(material);
		expect(key.key).toBe(`ontology-generation:v1:${key.hash}`);
		expect(createOntologyGenerationCacheKey(generationInput)).toEqual(key);
	});
});

describe("ontology generation activation", () => {
	it("exposes draft, active, superseded, and failed generation statuses", () => {
		expect(ONTOLOGY_GENERATION_STATUSES).toEqual(["draft", "active", "superseded", "failed"]);
	});

	it("activates only fresh draft generations without validation errors", () => {
		const freshness = evaluateUaGraphFreshnessFromMetadata(currentMetadata, graphMetadata, []);

		expect(canActivateOntologyGeneration({ status: "draft", freshness, validationIssues: [] })).toEqual({
			ok: true,
			reason: "eligible",
			nextStatus: "active",
		});
	});

	it("refuses stale metadata, failed status, superseded status, and error diagnostics", () => {
		const staleFreshness = evaluateUaGraphFreshnessFromMetadata(
			currentMetadata,
			{ ...graphMetadata, branch: "feature/context-graph" },
			[],
		);
		const fresh = evaluateUaGraphFreshnessFromMetadata(currentMetadata, graphMetadata, []);

		expect(canActivateOntologyGeneration({ status: "draft", freshness: staleFreshness })).toMatchObject({
			ok: false,
			reason: "stale_source_graph",
		});
		expect(canActivateOntologyGeneration({ status: "failed", freshness: fresh })).toMatchObject({
			ok: false,
			reason: "generation_failed",
		});
		expect(canActivateOntologyGeneration({ status: "superseded", freshness: fresh })).toMatchObject({
			ok: false,
			reason: "generation_superseded",
		});
		expect(
			canActivateOntologyGeneration({
				status: "draft",
				freshness: fresh,
				validationIssues: [
					{ code: "GENERATION_SCHEMA_UNSUPPORTED", severity: "error", message: "schema mismatch" },
				],
			}),
		).toMatchObject({ ok: false, reason: "validation_errors" });
	});
});
