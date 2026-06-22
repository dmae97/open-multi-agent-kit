import { describe, expect, it } from "vitest";
import {
	buildStructuralFingerprint,
	calculateIdentitySimilarity,
	makeLogicalId,
	makeRevisionId,
	resolveIdentity,
} from "../src/core/context-graph-identity-resolution.ts";

const baseIdentityInput = {
	workspaceId: "workspace-alpha",
	repositoryId: "repo-alpha",
	branch: "main",
	classIri: "omk:FunctionSymbol",
	sourceKind: "tree_sitter" as const,
	identityNamespace: "packages/coding-agent/src/core/context-graph",
	qualifiedName: "ContextGraph.resolveIdentity",
	normalizedSignature: "<T>(candidate: T): IdentityDecision",
	filePath: "packages/coding-agent/src/core/old-path.ts",
};

const baseFingerprintInput = {
	classIri: "omk:FunctionSymbol",
	sourceKind: "tree_sitter" as const,
	normalizedContent: "export function resolveIdentity() {\r\n\treturn true;\r\n}",
	astTokens: [" function_decl ", "identifier:resolveIdentity", "return_stmt"],
	publicApiTokens: ["export function resolveIdentity(): IdentityDecision"],
	relationTokens: ["calls -> omk:FunctionSymbol:scoreCandidate"],
	importTokens: ["./score-candidate"],
	exportTokens: ["resolveIdentity"],
	summaryTokens: ["Identity resolver"],
	metrics: {
		astNodeCount: 3,
		exportedSymbolCount: 1,
		importCount: 1,
		relationCount: 1,
		lineCount: 3,
	},
};

const buildBaseFingerprint = () => buildStructuralFingerprint(baseFingerprintInput);

describe("context graph identity resolution", () => {
	it("creates stable SHA-256 logical IDs and ignores path-only changes for symbols", () => {
		const first = makeLogicalId(baseIdentityInput);
		const second = makeLogicalId({
			...baseIdentityInput,
			workspaceId: " workspace-alpha ",
			repositoryId: "repo-alpha",
			filePath: "packages/coding-agent/src/core/new-path.ts",
		});

		expect(first).toMatch(/^log_[a-f0-9]{64}$/);
		expect(second).toBe(first);
	});

	it("isolates logical IDs by repository and branch and uses file path fallback only for artifacts", () => {
		const main = makeLogicalId(baseIdentityInput);
		const otherRepo = makeLogicalId({ ...baseIdentityInput, repositoryId: "repo-beta" });
		const featureBranch = makeLogicalId({ ...baseIdentityInput, branch: "feature/context-graph" });
		const firstFile = makeLogicalId({
			...baseIdentityInput,
			classIri: "omk:SourceFile",
			sourceKind: "understand_anything",
			identityNamespace: "packages/coding-agent/src/core",
			qualifiedName: "",
			normalizedSignature: "source-file",
			filePath: "packages/coding-agent/src/core/a.ts",
		});
		const secondFile = makeLogicalId({
			...baseIdentityInput,
			classIri: "omk:SourceFile",
			sourceKind: "understand_anything",
			identityNamespace: "packages/coding-agent/src/core",
			qualifiedName: "",
			normalizedSignature: "source-file",
			filePath: "packages/coding-agent/src/core/b.ts",
		});

		expect(otherRepo).not.toBe(main);
		expect(featureBranch).not.toBe(main);
		expect(secondFile).not.toBe(firstFile);
	});

	it("keeps revision IDs stable for the same fingerprint and changes them when the fingerprint changes", () => {
		const logicalId = makeLogicalId(baseIdentityInput);
		const fingerprint = buildBaseFingerprint();
		const first = makeRevisionId({
			logicalId,
			revisionSourceSha: "c0dd781b453cd7eb64709f0f03c50304d29ff851",
			structuralHash: fingerprint.structuralHash,
		});
		const second = makeRevisionId({
			logicalId,
			revisionSourceSha: "c0dd781b453cd7eb64709f0f03c50304d29ff851",
			structuralHash: fingerprint.structuralHash,
		});
		const changedFingerprint = buildStructuralFingerprint({
			...baseFingerprintInput,
			astTokens: ["function_decl", "identifier:resolveIdentity", "if_stmt", "return_stmt"],
		});
		const changed = makeRevisionId({
			logicalId,
			revisionSourceSha: "c0dd781b453cd7eb64709f0f03c50304d29ff851",
			structuralHash: changedFingerprint.structuralHash,
		});

		expect(first).toMatch(/^rev_[a-f0-9]{64}$/);
		expect(second).toBe(first);
		expect(changed).not.toBe(first);
	});

	it("normalizes structural fingerprint tokens deterministically", () => {
		const first = buildBaseFingerprint();
		const second = buildStructuralFingerprint({
			classIri: "omk:FunctionSymbol",
			sourceKind: "tree_sitter",
			normalizedContent: "export function resolveIdentity() {\n\treturn true;\n}",
			astTokens: ["return_stmt", "identifier:resolveIdentity", "function_decl"],
			publicApiTokens: [" export   function resolveIdentity(): IdentityDecision "],
			relationTokens: ["calls -> omk:FunctionSymbol:scoreCandidate"],
			importTokens: [".\\score-candidate"],
			exportTokens: ["resolveIdentity"],
			summaryTokens: ["Identity   resolver"],
			metrics: {
				astNodeCount: 3,
				exportedSymbolCount: 1,
				importCount: 1,
				relationCount: 1,
				lineCount: 3,
			},
		});

		expect(second.structuralHash).toBe(first.structuralHash);
		expect(second.publicApiHash).toBe(first.publicApiHash);
		expect(second.importHash).toBe(first.importHash);
		expect(second.textSummaryHash).toBe(first.textSummaryHash);
		expect(second.strictContentHash).toBe(first.strictContentHash);
	});

	it("scores identity similarity with exact content precedence and weighted features", () => {
		expect(
			calculateIdentitySimilarity({
				strictContentEqual: true,
				structuralEqual: false,
				publicApiEqual: false,
				normalizedSignatureSimilarity: 0,
				relationShapeSimilarity: 0,
				nameSimilarity: 0,
				pathSimilarity: 0,
				parentScopeSimilarity: 0,
				sizeSimilarity: 0,
				gitRenameHint: false,
			}),
		).toBe(1);

		expect(
			calculateIdentitySimilarity({
				strictContentEqual: false,
				structuralEqual: true,
				publicApiEqual: true,
				normalizedSignatureSimilarity: 0.8,
				relationShapeSimilarity: 0.5,
				nameSimilarity: 0.7,
				pathSimilarity: 0.6,
				parentScopeSimilarity: 0.5,
				sizeSimilarity: 1,
				gitRenameHint: true,
			}),
		).toBeCloseTo(0.939, 3);
	});

	it("gives accepted aliases precedence over merge candidates", () => {
		const decision = resolveIdentity({
			currentLogicalId: "log_current",
			previousLogicalIds: [],
			aliases: [
				{ fromLogicalId: "log_old_alias", toLogicalId: "log_current", confidence: 0.95, relation: "renamedTo" },
			],
			candidates: [{ logicalId: "log_better_score", score: 1 }],
		});

		expect(decision).toEqual({
			kind: "sameAs",
			reason: "alias",
			logicalId: "log_old_alias",
			confidence: 0.95,
		});
	});

	it("distinguishes sameAs, possibleSameAs, and new decisions at configured thresholds", () => {
		expect(
			resolveIdentity({
				currentLogicalId: "log_current",
				previousLogicalIds: [],
				aliases: [],
				candidates: [{ logicalId: "log_same", score: 0.92 }],
			}),
		).toEqual({ kind: "sameAs", reason: "merge", logicalId: "log_same", confidence: 0.92 });

		expect(
			resolveIdentity({
				currentLogicalId: "log_current",
				previousLogicalIds: [],
				aliases: [],
				candidates: [{ logicalId: "log_review", score: 0.78 }],
			}),
		).toEqual({
			kind: "possibleSameAs",
			candidates: [{ logicalId: "log_review", score: 0.78 }],
			confidence: 0.78,
		});

		expect(
			resolveIdentity({
				currentLogicalId: "log_current",
				previousLogicalIds: [],
				aliases: [],
				candidates: [{ logicalId: "log_new", score: 0.779 }],
			}),
		).toEqual({ kind: "new", logicalId: "log_current", confidence: 0 });
	});

	it("uses exact match precedence and deterministic tie-breaks for alias and score candidates", () => {
		expect(
			resolveIdentity({
				currentLogicalId: "log_current",
				previousLogicalIds: ["log_current"],
				aliases: [
					{ fromLogicalId: "log_old_alias", toLogicalId: "log_current", confidence: 0.95, relation: "sameAs" },
				],
				candidates: [{ logicalId: "log_score", score: 0.95 }],
			}),
		).toEqual({ kind: "sameAs", reason: "exact", logicalId: "log_current", confidence: 1 });

		expect(
			resolveIdentity({
				currentLogicalId: "log_current",
				previousLogicalIds: [],
				aliases: [
					{ fromLogicalId: "log_z", toLogicalId: "log_current", confidence: 0.95, relation: "sameAs" },
					{ fromLogicalId: "log_a", toLogicalId: "log_current", confidence: 0.95, relation: "sameAs" },
				],
				candidates: [],
			}),
		).toEqual({ kind: "sameAs", reason: "alias", logicalId: "log_a", confidence: 0.95 });

		expect(
			resolveIdentity({
				currentLogicalId: "log_current",
				previousLogicalIds: [],
				aliases: [],
				candidates: [
					{ logicalId: "log_z", score: 0.95 },
					{ logicalId: "log_a", score: 0.95 },
				],
			}),
		).toEqual({ kind: "sameAs", reason: "merge", logicalId: "log_a", confidence: 0.95 });
	});
});
