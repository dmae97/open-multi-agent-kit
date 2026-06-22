import { describe, expect, it } from "vitest";
import {
	classifyContextGraphLibrary,
	getContextGraphToolSurface,
	getRecommendedContextGraphStack,
	getUnderstandAnythingIndexPlan,
	validateContextGraphAdoption,
	validateMemoryFactPolicy,
} from "../src/core/context-graph-policy.ts";

describe("context graph adoption policy", () => {
	it("recommends Understand Anything with Orama and Graphology for current production", () => {
		expect(getRecommendedContextGraphStack("production")).toEqual({
			staticGraphSource: "understand-anything",
			hybridSearch: "@orama/orama",
			hybridSearchPersistence: "@orama/plugin-data-persistence",
			graphTraversal: ["graphology", "graphology-shortest-path", "graphology-traversal", "graphology-metrics"],
			localMemory: undefined,
			temporalMemory: undefined,
			remoteVectorSearch: undefined,
			serverGraphBackend: undefined,
		});
	});

	it("keeps Neo4j out of the default local single-repo stack", () => {
		expect(classifyContextGraphLibrary("neo4j-driver")).toEqual({
			library: "neo4j-driver",
			category: "server-graph-backend",
			verdict: "defer",
			reason: "multi-repo/team temporal memory backend only; do not replace local Understand Anything graph",
		});
		expect(validateContextGraphAdoption({ library: "neo4j-driver", conditions: ["cypher_queries"] })).toEqual({
			ok: false,
			reason: "neo4j.requires_two_adoption_conditions",
			detail: "Neo4j needs at least two multi-repo/team/server graph conditions",
		});
	});

	it("allows Neo4j when Graphiti-style shared temporal memory has enough conditions", () => {
		expect(
			validateContextGraphAdoption({
				library: "neo4j-driver",
				conditions: ["multi_repo", "team_shared_memory", "central_server"],
			}),
		).toEqual({ ok: true, reason: "eligible" });
	});

	it("classifies optional and deferred libraries by role", () => {
		expect(classifyContextGraphLibrary("@electric-sql/pglite").verdict).toBe("optional");
		expect(classifyContextGraphLibrary("graphiti").verdict).toBe("defer");
		expect(classifyContextGraphLibrary("@qdrant/js-client-rest").verdict).toBe("scale-only");
		expect(classifyContextGraphLibrary("surrealdb").verdict).toBe("canary-only");
		expect(classifyContextGraphLibrary("kuzu").verdict).toBe("reject");
	});

	it("requires repo and branch scoped memory facts and rejects raw unsafe memory categories", () => {
		expect(
			validateMemoryFactPolicy({
				workspaceId: "omk",
				repoSha: "abc123",
				branch: "main",
				category: "decision",
				confidence: 0.9,
			}),
		).toEqual({ ok: true, reason: "eligible" });

		expect(
			validateMemoryFactPolicy({
				workspaceId: "omk",
				repoSha: "",
				branch: "main",
				category: "decision",
				confidence: 0.9,
			}),
		).toEqual({ ok: false, reason: "missing_repo_sha" });
		expect(
			validateMemoryFactPolicy({
				workspaceId: "omk",
				repoSha: "abc123",
				branch: "main",
				category: "raw_shell_output",
				confidence: 1,
			}),
		).toEqual({ ok: false, reason: "forbidden_category" });
	});

	it("exposes a minimal code graph tool surface instead of raw graph dumps", () => {
		expect(getContextGraphToolSurface()).toEqual([
			"code_search",
			"symbol_neighbors",
			"impact_path",
			"dependency_path",
			"hotspot_symbols",
			"find_cycles",
			"memory_search",
		]);
	});

	it("plans Understand Anything indexing with hybrid retrieval and bounded context injection", () => {
		expect(getUnderstandAnythingIndexPlan()).toEqual({
			loadEvent: "session_start",
			sourcePath: ".understand-anything/knowledge-graph.json",
			documentFields: [
				"id",
				"repoSha",
				"branch",
				"path",
				"symbol",
				"kind",
				"summary",
				"content",
				"domain",
				"language",
				"embedding",
			],
			retrievalFlow: [
				"orama_hybrid_search",
				"repo_branch_language_filter",
				"top_20_candidates",
				"graphology_neighbor_path_expansion",
				"top_5_to_10_context_injection",
			],
			contextBudgetTokens: { min: 1000, max: 2000 },
			provenanceRequired: true,
		});
	});
});
