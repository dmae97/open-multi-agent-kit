export type ContextGraphProfile = "production" | "local-memory" | "team-temporal-memory" | "remote-vector-scale";

export type ContextGraphLibraryCategory =
	| "static-code-graph"
	| "hybrid-search"
	| "hybrid-search-persistence"
	| "graph-algorithm"
	| "local-memory"
	| "temporal-memory"
	| "server-graph-backend"
	| "remote-vector-search"
	| "unified-db"
	| "embedded-graph-db"
	| "unknown";

export type ContextGraphVerdict =
	| "adopt-now"
	| "optional"
	| "defer"
	| "scale-only"
	| "canary-only"
	| "reject"
	| "unknown";

export type Neo4jAdoptionCondition =
	| "multi_repo"
	| "shared_workers"
	| "team_shared_memory"
	| "cypher_queries"
	| "central_server"
	| "graph_visualization";

export interface ContextGraphLibraryClassification {
	library: string;
	category: ContextGraphLibraryCategory;
	verdict: ContextGraphVerdict;
	reason: string;
}

export interface ContextGraphStackRecommendation {
	staticGraphSource: "understand-anything";
	hybridSearch?: "@orama/orama";
	hybridSearchPersistence?: "@orama/plugin-data-persistence";
	graphTraversal: string[];
	localMemory?: "@electric-sql/pglite";
	temporalMemory?: "graphiti";
	remoteVectorSearch?: "@qdrant/js-client-rest";
	serverGraphBackend?: "neo4j-driver" | "falkordb";
}

export interface ContextGraphAdoptionInput {
	library: string;
	conditions?: readonly Neo4jAdoptionCondition[];
	adapterBacked?: boolean;
}

export type ContextGraphAdoptionReason =
	| "eligible"
	| "neo4j.requires_two_adoption_conditions"
	| "pglite.requires_adapter"
	| "surrealdb.canary_only"
	| "kuzu.rejected"
	| "unknown_library";

export type ContextGraphAdoptionDecision =
	| { ok: true; reason: "eligible" }
	| { ok: false; reason: Exclude<ContextGraphAdoptionReason, "eligible">; detail: string };

export type MemoryFactCategory =
	| "decision"
	| "verified_fact"
	| "resolved_error"
	| "user_preference"
	| "unresolved_task"
	| "test_evidence"
	| "build_evidence"
	| "raw_conversation"
	| "raw_shell_output"
	| "speculation"
	| "secret";

export interface MemoryFactPolicyCandidate {
	workspaceId: string;
	repoSha: string;
	branch: string;
	category: string;
	confidence: number;
}

export type MemoryFactPolicyReason =
	| "eligible"
	| "missing_workspace_id"
	| "missing_repo_sha"
	| "missing_branch"
	| "forbidden_category"
	| "unsupported_category"
	| "invalid_confidence";

export type MemoryFactPolicyDecision =
	| { ok: true; reason: "eligible" }
	| { ok: false; reason: Exclude<MemoryFactPolicyReason, "eligible"> };

export interface UnderstandAnythingIndexPlan {
	loadEvent: "session_start";
	sourcePath: ".understand-anything/knowledge-graph.json";
	documentFields: string[];
	retrievalFlow: string[];
	contextBudgetTokens: { min: number; max: number };
	provenanceRequired: boolean;
}

const ADOPT_NOW_LIBRARIES: Record<string, ContextGraphLibraryClassification> = {
	"@orama/orama": {
		library: "@orama/orama",
		category: "hybrid-search",
		verdict: "adopt-now",
		reason: "local TypeScript BM25/vector/hybrid search fits OMK CLI deployment",
	},
	"@orama/plugin-data-persistence": {
		library: "@orama/plugin-data-persistence",
		category: "hybrid-search-persistence",
		verdict: "adopt-now",
		reason: "persists local Orama indexes without requiring a daemon",
	},
	graphology: {
		library: "graphology",
		category: "graph-algorithm",
		verdict: "adopt-now",
		reason: "direct traversal and graph representation over Understand Anything nodes",
	},
	"graphology-shortest-path": {
		library: "graphology-shortest-path",
		category: "graph-algorithm",
		verdict: "adopt-now",
		reason: "dependency and impact path calculations",
	},
	"graphology-traversal": {
		library: "graphology-traversal",
		category: "graph-algorithm",
		verdict: "adopt-now",
		reason: "BFS/DFS neighborhood expansion for bounded context retrieval",
	},
	"graphology-metrics": {
		library: "graphology-metrics",
		category: "graph-algorithm",
		verdict: "adopt-now",
		reason: "centrality and hotspot ranking over code symbols",
	},
};

const LIBRARY_CLASSIFICATIONS: Record<string, ContextGraphLibraryClassification> = {
	...ADOPT_NOW_LIBRARIES,
	"understand-anything": {
		library: "understand-anything",
		category: "static-code-graph",
		verdict: "adopt-now",
		reason: "existing Tree-sitter static code graph source",
	},
	"@electric-sql/pglite": {
		library: "@electric-sql/pglite",
		category: "local-memory",
		verdict: "optional",
		reason: "file-backed local relational memory behind an adapter; always scope by repoSha and branch",
	},
	graphiti: {
		library: "graphiti",
		category: "temporal-memory",
		verdict: "defer",
		reason: "use when team/multi-repo temporal memory is needed",
	},
	"neo4j-driver": {
		library: "neo4j-driver",
		category: "server-graph-backend",
		verdict: "defer",
		reason: "multi-repo/team temporal memory backend only; do not replace local Understand Anything graph",
	},
	falkordb: {
		library: "falkordb",
		category: "server-graph-backend",
		verdict: "defer",
		reason: "Graphiti backend alternative for shared temporal memory",
	},
	"@qdrant/js-client-rest": {
		library: "@qdrant/js-client-rest",
		category: "remote-vector-search",
		verdict: "scale-only",
		reason: "only needed once local Orama indexes exceed process-local scale",
	},
	surrealdb: {
		library: "surrealdb",
		category: "unified-db",
		verdict: "canary-only",
		reason: "evaluate as isolated extension until JS/embedded stability is proven",
	},
	kuzu: {
		library: "kuzu",
		category: "embedded-graph-db",
		verdict: "reject",
		reason: "new adoption is not recommended; Graphiti deprecates Kuzu backend usage",
	},
};

const ALLOWED_MEMORY_FACT_CATEGORIES = new Set<MemoryFactCategory>([
	"decision",
	"verified_fact",
	"resolved_error",
	"user_preference",
	"unresolved_task",
	"test_evidence",
	"build_evidence",
]);

const FORBIDDEN_MEMORY_FACT_CATEGORIES = new Set<MemoryFactCategory>([
	"raw_conversation",
	"raw_shell_output",
	"speculation",
	"secret",
]);

export function getRecommendedContextGraphStack(profile: ContextGraphProfile): ContextGraphStackRecommendation {
	const production: ContextGraphStackRecommendation = {
		staticGraphSource: "understand-anything",
		hybridSearch: "@orama/orama",
		hybridSearchPersistence: "@orama/plugin-data-persistence",
		graphTraversal: ["graphology", "graphology-shortest-path", "graphology-traversal", "graphology-metrics"],
		localMemory: undefined,
		temporalMemory: undefined,
		remoteVectorSearch: undefined,
		serverGraphBackend: undefined,
	};

	if (profile === "local-memory") {
		return { ...production, localMemory: "@electric-sql/pglite" };
	}
	if (profile === "team-temporal-memory") {
		return { ...production, temporalMemory: "graphiti", serverGraphBackend: "neo4j-driver" };
	}
	if (profile === "remote-vector-scale") {
		return { ...production, remoteVectorSearch: "@qdrant/js-client-rest" };
	}
	return production;
}

export function classifyContextGraphLibrary(library: string): ContextGraphLibraryClassification {
	const normalized = normalizeLibraryName(library);
	return (
		LIBRARY_CLASSIFICATIONS[normalized] ?? {
			library: normalized,
			category: "unknown",
			verdict: "unknown",
			reason: "library is not in OMK context graph adoption policy",
		}
	);
}

export function validateContextGraphAdoption(input: ContextGraphAdoptionInput): ContextGraphAdoptionDecision {
	const library = normalizeLibraryName(input.library);
	const classification = classifyContextGraphLibrary(library);
	if (classification.verdict === "unknown") {
		return denyContextGraph("unknown_library", "library is not in OMK context graph adoption policy");
	}
	if (library === "neo4j-driver" && countUniqueConditions(input.conditions) < 2) {
		return denyContextGraph(
			"neo4j.requires_two_adoption_conditions",
			"Neo4j needs at least two multi-repo/team/server graph conditions",
		);
	}
	if (library === "@electric-sql/pglite" && input.adapterBacked !== true) {
		return denyContextGraph("pglite.requires_adapter", "PGlite must stay behind a storage adapter");
	}
	if (library === "surrealdb") {
		return denyContextGraph("surrealdb.canary_only", "SurrealDB belongs in canary extensions only");
	}
	if (library === "kuzu") {
		return denyContextGraph("kuzu.rejected", "Kuzu is excluded from new OMK adoption");
	}
	return { ok: true, reason: "eligible" };
}

export function validateMemoryFactPolicy(candidate: MemoryFactPolicyCandidate): MemoryFactPolicyDecision {
	if (candidate.workspaceId.trim().length === 0) return { ok: false, reason: "missing_workspace_id" };
	if (candidate.repoSha.trim().length === 0) return { ok: false, reason: "missing_repo_sha" };
	if (candidate.branch.trim().length === 0) return { ok: false, reason: "missing_branch" };
	if (!Number.isFinite(candidate.confidence) || candidate.confidence < 0 || candidate.confidence > 1) {
		return { ok: false, reason: "invalid_confidence" };
	}
	const category = candidate.category as MemoryFactCategory;
	if (FORBIDDEN_MEMORY_FACT_CATEGORIES.has(category)) return { ok: false, reason: "forbidden_category" };
	if (!ALLOWED_MEMORY_FACT_CATEGORIES.has(category)) return { ok: false, reason: "unsupported_category" };
	return { ok: true, reason: "eligible" };
}

export function getContextGraphToolSurface(): string[] {
	return [
		"code_search",
		"symbol_neighbors",
		"impact_path",
		"dependency_path",
		"hotspot_symbols",
		"find_cycles",
		"memory_search",
	];
}

export function getUnderstandAnythingIndexPlan(): UnderstandAnythingIndexPlan {
	return {
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
	};
}

function countUniqueConditions(conditions: readonly Neo4jAdoptionCondition[] | undefined): number {
	return new Set(conditions ?? []).size;
}

function normalizeLibraryName(library: string): string {
	return library.trim().toLowerCase();
}

function denyContextGraph(
	reason: Exclude<ContextGraphAdoptionReason, "eligible">,
	detail: string,
): ContextGraphAdoptionDecision {
	return { ok: false, reason, detail };
}
