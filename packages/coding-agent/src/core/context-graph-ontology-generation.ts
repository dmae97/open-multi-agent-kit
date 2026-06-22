import { hashCanonicalJson, type JsonObject } from "./exact-cache-policy.ts";

export const ONTOLOGY_GENERATION_ID_VERSION = "v1";
export const ONTOLOGY_GENERATION_CACHE_KEY_VERSION = "v1";

export const ONTOLOGY_GENERATION_STATUSES = ["draft", "active", "superseded", "failed"] as const;

export type OntologyGenerationStatus = (typeof ONTOLOGY_GENERATION_STATUSES)[number];

export type UaGraphFreshnessReason =
	| "fresh"
	| "metadata_missing"
	| "schema_mismatch"
	| "graph_commit_mismatch"
	| "meta_commit_mismatch"
	| "branch_mismatch"
	| "graph_hash_mismatch"
	| "dirty_covered_paths";

export interface CurrentRepositoryMetadata {
	readonly repoSha: string;
	readonly branch: string;
	readonly ontologySchemaVersion?: string;
	readonly schemaVersion?: string;
	readonly uaGraphSha256?: string;
	readonly graphSha256?: string;
}

export interface UaGraphMetadata {
	readonly schemaVersion: string;
	readonly branch: string;
	readonly graphRepoSha?: string;
	readonly graphCommitSha?: string;
	readonly repoSha?: string;
	readonly metadataRepoSha?: string;
	readonly metaRepoSha?: string;
	readonly uaGraphSha256?: string;
	readonly graphSha256?: string;
	readonly coveredPaths?: readonly string[];
}

export interface UaGraphFreshnessDiagnostic {
	readonly reason: Exclude<UaGraphFreshnessReason, "fresh">;
	readonly field: string;
	readonly expected?: string;
	readonly actual?: string;
	readonly dirtyCoveredPaths?: readonly string[];
}

export interface UaGraphFreshnessEvaluation {
	readonly fresh: boolean;
	readonly reasons: readonly UaGraphFreshnessReason[];
	readonly diagnostics: readonly UaGraphFreshnessDiagnostic[];
	readonly dirtyCoveredPaths: readonly string[];
}

export interface OntologyGenerationIdentityInput {
	readonly schemaVersion: string;
	readonly registryVersion: string;
	readonly uaGraphSha256: string;
	readonly workspaceId: string;
	readonly repositoryId: string;
	readonly repoSha: string;
	readonly branch: string;
}

export interface OntologyGenerationIdMaterial extends JsonObject {
	readonly schemaVersion: string;
	readonly registryVersion: string;
	readonly uaGraphSha256: string;
	readonly workspaceId: string;
	readonly repositoryId: string;
	readonly repoSha: string;
	readonly branch: string;
}

export interface OntologyGenerationCacheKeyMaterial extends JsonObject {
	readonly kind: "ontology-generation";
	readonly version: typeof ONTOLOGY_GENERATION_CACHE_KEY_VERSION;
	readonly schemaVersion: string;
	readonly registryVersion: string;
	readonly generationId: string;
	readonly workspaceId: string;
	readonly repositoryId: string;
	readonly repoSha: string;
	readonly branch: string;
	readonly uaGraphSha256: string;
}

export interface OntologyGenerationCacheKey {
	readonly kind: "ontology-generation";
	readonly version: typeof ONTOLOGY_GENERATION_CACHE_KEY_VERSION;
	readonly key: string;
	readonly hash: string;
	readonly material: OntologyGenerationCacheKeyMaterial;
}

export interface OntologyGenerationValidationIssue {
	readonly code: string;
	readonly severity: "error" | "warning" | "info";
	readonly message: string;
}

export type OntologyGenerationActivationReason =
	| "eligible"
	| "stale_source_graph"
	| "generation_failed"
	| "generation_superseded"
	| "validation_errors";

export type OntologyGenerationActivationDecision =
	| { readonly ok: true; readonly reason: "eligible"; readonly nextStatus: "active" }
	| {
			readonly ok: false;
			readonly reason: Exclude<OntologyGenerationActivationReason, "eligible">;
			readonly blockers: readonly string[];
			readonly diagnostics?: readonly UaGraphFreshnessDiagnostic[] | readonly OntologyGenerationValidationIssue[];
	  };

export interface OntologyGenerationActivationInput {
	readonly status: OntologyGenerationStatus;
	readonly freshness: UaGraphFreshnessEvaluation;
	readonly validationIssues?: readonly OntologyGenerationValidationIssue[];
}

export function evaluateUaGraphFreshnessFromMetadata(
	currentMetadata: CurrentRepositoryMetadata,
	graphMetadata: UaGraphMetadata,
	dirtyPaths: readonly string[],
): UaGraphFreshnessEvaluation {
	const diagnostics: UaGraphFreshnessDiagnostic[] = [];

	addRequiredComparisonDiagnostic(
		diagnostics,
		"schema_mismatch",
		"schemaVersion",
		firstNonEmptyString(currentMetadata.ontologySchemaVersion, currentMetadata.schemaVersion),
		graphMetadata.schemaVersion,
	);
	addRequiredComparisonDiagnostic(
		diagnostics,
		"graph_commit_mismatch",
		"graphRepoSha",
		currentMetadata.repoSha,
		firstNonEmptyString(graphMetadata.graphRepoSha, graphMetadata.graphCommitSha, graphMetadata.repoSha),
	);
	addRequiredComparisonDiagnostic(
		diagnostics,
		"meta_commit_mismatch",
		"metadataRepoSha",
		currentMetadata.repoSha,
		firstNonEmptyString(graphMetadata.metadataRepoSha, graphMetadata.metaRepoSha, graphMetadata.repoSha),
	);
	addRequiredComparisonDiagnostic(
		diagnostics,
		"branch_mismatch",
		"branch",
		currentMetadata.branch,
		graphMetadata.branch,
	);
	addRequiredComparisonDiagnostic(
		diagnostics,
		"graph_hash_mismatch",
		"uaGraphSha256",
		firstNonEmptyString(currentMetadata.uaGraphSha256, currentMetadata.graphSha256),
		firstNonEmptyString(graphMetadata.uaGraphSha256, graphMetadata.graphSha256),
	);

	const dirtyCoveredPaths = findDirtyCoveredPaths(graphMetadata.coveredPaths ?? [], dirtyPaths);
	if (dirtyCoveredPaths.length > 0) {
		diagnostics.push({
			reason: "dirty_covered_paths",
			field: "coveredPaths",
			dirtyCoveredPaths,
			actual: dirtyCoveredPaths.join(","),
		});
	}

	if (diagnostics.length === 0) {
		return { fresh: true, reasons: ["fresh"], diagnostics: [], dirtyCoveredPaths: [] };
	}

	return {
		fresh: false,
		reasons: uniqueReasons(diagnostics),
		diagnostics,
		dirtyCoveredPaths,
	};
}

export function createOntologyGenerationIdMaterial(
	input: OntologyGenerationIdentityInput,
): OntologyGenerationIdMaterial {
	return {
		schemaVersion: requireNonEmptyString("schemaVersion", input.schemaVersion),
		registryVersion: requireNonEmptyString("registryVersion", input.registryVersion),
		uaGraphSha256: requireNonEmptyString("uaGraphSha256", input.uaGraphSha256),
		workspaceId: requireNonEmptyString("workspaceId", input.workspaceId),
		repositoryId: requireNonEmptyString("repositoryId", input.repositoryId),
		repoSha: requireNonEmptyString("repoSha", input.repoSha),
		branch: requireNonEmptyString("branch", input.branch),
	};
}

export function computeOntologyGenerationId(input: OntologyGenerationIdentityInput): string {
	return hashCanonicalJson(createOntologyGenerationIdMaterial(input));
}

export function createOntologyGenerationCacheKeyMaterial(
	input: OntologyGenerationIdentityInput,
): OntologyGenerationCacheKeyMaterial {
	const material = createOntologyGenerationIdMaterial(input);
	return {
		kind: "ontology-generation",
		version: ONTOLOGY_GENERATION_CACHE_KEY_VERSION,
		schemaVersion: material.schemaVersion,
		registryVersion: material.registryVersion,
		generationId: computeOntologyGenerationId(input),
		workspaceId: material.workspaceId,
		repositoryId: material.repositoryId,
		repoSha: material.repoSha,
		branch: material.branch,
		uaGraphSha256: material.uaGraphSha256,
	};
}

export function createOntologyGenerationCacheKey(input: OntologyGenerationIdentityInput): OntologyGenerationCacheKey {
	const material = createOntologyGenerationCacheKeyMaterial(input);
	const hash = hashCanonicalJson(material);
	return {
		kind: "ontology-generation",
		version: ONTOLOGY_GENERATION_CACHE_KEY_VERSION,
		key: `ontology-generation:${ONTOLOGY_GENERATION_CACHE_KEY_VERSION}:${hash}`,
		hash,
		material,
	};
}

export function canActivateOntologyGeneration(
	input: OntologyGenerationActivationInput,
): OntologyGenerationActivationDecision {
	if (input.status === "failed") {
		return denyActivation("generation_failed", ["failed generations are immutable and cannot be activated"]);
	}
	if (input.status === "superseded") {
		return denyActivation("generation_superseded", ["superseded generations cannot be reactivated"]);
	}
	if (!input.freshness.fresh) {
		return denyActivation("stale_source_graph", input.freshness.reasons, input.freshness.diagnostics);
	}

	const errors = (input.validationIssues ?? []).filter((issue) => issue.severity === "error");
	if (errors.length > 0) {
		return denyActivation(
			"validation_errors",
			errors.map((issue) => issue.code),
			errors,
		);
	}

	return { ok: true, reason: "eligible", nextStatus: "active" };
}

function addRequiredComparisonDiagnostic(
	diagnostics: UaGraphFreshnessDiagnostic[],
	reason: Exclude<UaGraphFreshnessReason, "fresh" | "dirty_covered_paths" | "metadata_missing">,
	field: string,
	expected: string | undefined,
	actual: string | undefined,
): void {
	const normalizedExpected = normalizeMetadataValue(expected);
	const normalizedActual = normalizeMetadataValue(actual);
	if (normalizedExpected === undefined || normalizedActual === undefined) {
		diagnostics.push({ reason: "metadata_missing", field, expected: normalizedExpected, actual: normalizedActual });
		return;
	}
	if (normalizedExpected !== normalizedActual) {
		diagnostics.push({ reason, field, expected: normalizedExpected, actual: normalizedActual });
	}
}

function findDirtyCoveredPaths(coveredPaths: readonly string[], dirtyPaths: readonly string[]): readonly string[] {
	const normalizedCoveredPaths = coveredPaths.map(normalizePath).filter((path) => path.length > 0);
	return [
		...new Set(
			dirtyPaths
				.map(normalizePath)
				.filter((path) => path.length > 0)
				.filter((dirtyPath) => normalizedCoveredPaths.some((coveredPath) => pathsOverlap(coveredPath, dirtyPath))),
		),
	].sort();
}

function pathsOverlap(coveredPath: string, dirtyPath: string): boolean {
	return (
		dirtyPath === coveredPath || dirtyPath.startsWith(`${coveredPath}/`) || coveredPath.startsWith(`${dirtyPath}/`)
	);
}

function uniqueReasons(diagnostics: readonly UaGraphFreshnessDiagnostic[]): readonly UaGraphFreshnessReason[] {
	return [...new Set(diagnostics.map((diagnostic) => diagnostic.reason))];
}

function firstNonEmptyString(...values: readonly (string | undefined)[]): string | undefined {
	return values.find((value) => normalizeMetadataValue(value) !== undefined);
}

function normalizeMetadataValue(value: string | undefined): string | undefined {
	if (value === undefined) return undefined;
	const normalized = value.trim();
	return normalized.length === 0 ? undefined : normalized;
}

function normalizePath(path: string): string {
	return path.trim().replace(/\\/g, "/").replace(/\/+/g, "/").replace(/^\.\//, "").replace(/\/$/, "");
}

function requireNonEmptyString(name: string, value: string): string {
	const normalized = value.trim();
	if (normalized.length === 0) {
		throw new TypeError(`${name} must be a non-empty string`);
	}
	return normalized;
}

function denyActivation(
	reason: Exclude<OntologyGenerationActivationReason, "eligible">,
	blockers: readonly string[],
	diagnostics?: readonly UaGraphFreshnessDiagnostic[] | readonly OntologyGenerationValidationIssue[],
): OntologyGenerationActivationDecision {
	return diagnostics === undefined ? { ok: false, reason, blockers } : { ok: false, reason, blockers, diagnostics };
}
