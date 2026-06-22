import { createHash } from "node:crypto";

export type Sha256 = string;
export type WorkspaceId = string;
export type RepositoryId = string;
export type LogicalId = string;
export type RevisionId = string;

export type SourceKind =
	| "compiler"
	| "test"
	| "git"
	| "tree_sitter"
	| "understand_anything"
	| "user"
	| "document"
	| "llm"
	| "heuristic";

export interface IdentityKeyInput {
	readonly workspaceId: WorkspaceId;
	readonly repositoryId: RepositoryId;
	readonly branch: string;
	readonly classIri: string;
	readonly sourceKind: SourceKind;
	readonly identityNamespace: string;
	readonly qualifiedName: string;
	readonly normalizedSignature: string;
	/** Retained for callers, but ignored for symbol identity when namespace/name/signature exist. */
	readonly filePath?: string;
}

export interface RevisionKeyInput {
	readonly logicalId: LogicalId;
	readonly revisionSourceSha: string;
	readonly structuralHash: Sha256;
}

export interface StructuralFingerprintMetrics {
	readonly astNodeCount: number;
	readonly exportedSymbolCount: number;
	readonly importCount: number;
	readonly relationCount: number;
	readonly lineCount?: number;
}

export interface StructuralFingerprintInput {
	readonly classIri: string;
	readonly sourceKind: SourceKind;
	readonly normalizedContent?: string;
	readonly astTokens: readonly string[];
	readonly publicApiTokens: readonly string[];
	readonly relationTokens: readonly string[];
	readonly importTokens?: readonly string[];
	readonly exportTokens?: readonly string[];
	readonly summaryTokens?: readonly string[];
	readonly metrics: StructuralFingerprintMetrics;
}

export interface StructuralFingerprint {
	readonly version: "omk.ontology.fingerprint.v1";
	readonly extractor: "ua-tree-sitter-normalized-v1";
	readonly classIri: string;
	readonly sourceKind: SourceKind;
	readonly strictContentHash?: Sha256;
	readonly structuralHash: Sha256;
	readonly publicApiHash: Sha256;
	readonly relationShapeHash: Sha256;
	readonly importHash?: Sha256;
	readonly exportHash?: Sha256;
	readonly textSummaryHash?: Sha256;
	readonly metrics: StructuralFingerprintMetrics;
}

export interface IdentitySimilarityFeatures {
	readonly strictContentEqual: boolean;
	readonly structuralEqual: boolean;
	readonly publicApiEqual: boolean;
	readonly normalizedSignatureSimilarity: number;
	readonly relationShapeSimilarity: number;
	readonly nameSimilarity: number;
	readonly pathSimilarity: number;
	readonly parentScopeSimilarity: number;
	readonly sizeSimilarity: number;
	readonly gitRenameHint: boolean;
}

export interface IdentityDecisionThresholds {
	readonly autoSameAs: number;
	readonly possibleSameAs: number;
}

export interface IdentityResolutionCandidate {
	readonly logicalId: LogicalId;
	readonly score: number;
}

export interface IdentityAlias {
	readonly fromLogicalId: LogicalId;
	readonly toLogicalId: LogicalId;
	readonly confidence: number;
	readonly relation: "sameAs" | "renamedTo";
}

export interface IdentityResolutionInput {
	readonly currentLogicalId: LogicalId;
	readonly previousLogicalIds: readonly LogicalId[];
	readonly aliases: readonly IdentityAlias[];
	readonly candidates: readonly IdentityResolutionCandidate[];
	readonly thresholds?: Partial<IdentityDecisionThresholds>;
}

export type IdentityResolutionDecision =
	| {
			readonly kind: "sameAs";
			readonly reason: "exact" | "alias" | "merge";
			readonly logicalId: LogicalId;
			readonly confidence: number;
	  }
	| {
			readonly kind: "possibleSameAs";
			readonly candidates: readonly IdentityResolutionCandidate[];
			readonly confidence: number;
	  }
	| {
			readonly kind: "new";
			readonly logicalId: LogicalId;
			readonly confidence: 0;
	  };

export const IDENTITY_ALGORITHM_VERSION = "omk.ontology.identity.v1";
export const FINGERPRINT_ALGORITHM_VERSION = "omk.ontology.fingerprint.v1";

export const DEFAULT_IDENTITY_DECISION_THRESHOLDS: IdentityDecisionThresholds = {
	autoSameAs: 0.92,
	possibleSameAs: 0.78,
};

export const canonicalText = (value: string): string =>
	value.normalize("NFKC").replace(/\\/g, "/").replace(/\s+/g, " ").replace(/^\.\//, "").trim();

export const makeLogicalId = (input: IdentityKeyInput): LogicalId => {
	const tuple = [
		"omk.logical.v1",
		canonicalText(input.workspaceId),
		canonicalText(input.repositoryId),
		canonicalText(input.branch),
		canonicalText(input.classIri),
		canonicalText(input.sourceKind),
		canonicalText(input.identityNamespace),
		makeQualifiedIdentityName(input),
		canonicalText(input.normalizedSignature),
	];

	return `log_${sha256Hex(tuple.join("\0"))}`;
};

export const makeRevisionId = (input: RevisionKeyInput): RevisionId => {
	const tuple = [
		"omk.revision.v1",
		canonicalText(input.logicalId),
		canonicalText(input.revisionSourceSha),
		canonicalText(input.structuralHash),
	];

	return `rev_${sha256Hex(tuple.join("\0"))}`;
};

export const buildStructuralFingerprint = (input: StructuralFingerprintInput): StructuralFingerprint => {
	const strictContentHash = input.normalizedContent
		? sha256Hex(["omk.content.v1", normalizeLf(input.normalizedContent)].join("\0"))
		: undefined;

	return {
		version: FINGERPRINT_ALGORITHM_VERSION,
		extractor: "ua-tree-sitter-normalized-v1",
		classIri: canonicalText(input.classIri),
		sourceKind: input.sourceKind,
		strictContentHash,
		structuralHash: hashTokens("omk.structure.v1", [input.classIri, ...input.astTokens]),
		publicApiHash: hashTokens("omk.public-api.v1", [input.classIri, ...input.publicApiTokens]),
		relationShapeHash: hashTokens("omk.relation-shape.v1", input.relationTokens),
		importHash: hashOptionalTokens("omk.imports.v1", input.importTokens),
		exportHash: hashOptionalTokens("omk.exports.v1", input.exportTokens),
		textSummaryHash: hashOptionalTokens("omk.summary.v1", input.summaryTokens),
		metrics: { ...input.metrics },
	};
};

export const calculateIdentitySimilarity = (features: IdentitySimilarityFeatures): number => {
	if (features.strictContentEqual) return 1;

	const score =
		(features.structuralEqual ? 0.35 : 0) +
		(features.publicApiEqual ? 0.18 : 0) +
		0.12 * clamp01(features.normalizedSignatureSimilarity) +
		0.1 * clamp01(features.relationShapeSimilarity) +
		0.1 * clamp01(features.nameSimilarity) +
		0.08 * clamp01(features.pathSimilarity) +
		0.05 * clamp01(features.parentScopeSimilarity) +
		0.02 * clamp01(features.sizeSimilarity) +
		(features.gitRenameHint ? 0.1 : 0);

	return clamp01(score);
};

export const identitySimilarity = calculateIdentitySimilarity;

export const resolveIdentity = (input: IdentityResolutionInput): IdentityResolutionDecision => {
	const thresholds = { ...DEFAULT_IDENTITY_DECISION_THRESHOLDS, ...input.thresholds };
	const exactMatch = sortLogicalIds(input.previousLogicalIds).find(
		(logicalId) => logicalId === input.currentLogicalId,
	);
	if (exactMatch) return { kind: "sameAs", reason: "exact", logicalId: exactMatch, confidence: 1 };

	const acceptedAlias = sortAliases(input.aliases).find(
		(alias) => alias.toLogicalId === input.currentLogicalId && alias.confidence >= thresholds.autoSameAs,
	);
	if (acceptedAlias) {
		return {
			kind: "sameAs",
			reason: "alias",
			logicalId: acceptedAlias.fromLogicalId,
			confidence: clamp01(acceptedAlias.confidence),
		};
	}

	const sortedCandidates = sortCandidates(input.candidates);
	const best = sortedCandidates[0];
	if (!best) return { kind: "new", logicalId: input.currentLogicalId, confidence: 0 };
	if (best.score >= thresholds.autoSameAs) {
		return { kind: "sameAs", reason: "merge", logicalId: best.logicalId, confidence: clamp01(best.score) };
	}
	if (best.score >= thresholds.possibleSameAs) {
		return {
			kind: "possibleSameAs",
			candidates: sortedCandidates.filter((candidate) => candidate.score >= thresholds.possibleSameAs),
			confidence: clamp01(best.score),
		};
	}
	return { kind: "new", logicalId: input.currentLogicalId, confidence: 0 };
};

const makeQualifiedIdentityName = (input: IdentityKeyInput): string => {
	const qualifiedName = canonicalText(input.qualifiedName);
	if (qualifiedName || isSymbolClass(input.classIri)) return qualifiedName;
	return canonicalText(input.filePath ?? "");
};

const isSymbolClass = (classIri: string): boolean => canonicalText(classIri).endsWith("Symbol");

const sha256Hex = (value: string): Sha256 => createHash("sha256").update(value, "utf8").digest("hex");

const normalizeLf = (value: string): string => value.replace(/\r\n?/g, "\n");

const hashTokens = (version: string, tokens: readonly string[]): Sha256 => {
	const canonicalTokens = tokens
		.map(canonicalText)
		.filter((token) => token.length > 0)
		.sort();
	return sha256Hex([version, ...canonicalTokens].join("\0"));
};

const hashOptionalTokens = (version: string, tokens: readonly string[] | undefined): Sha256 | undefined => {
	if (!tokens || tokens.length === 0) return undefined;
	return hashTokens(version, tokens);
};

const clamp01 = (value: number): number => {
	if (Number.isNaN(value) || value <= 0) return 0;
	if (value >= 1) return 1;
	return value;
};

const sortLogicalIds = (logicalIds: readonly LogicalId[]): LogicalId[] =>
	[...logicalIds].sort((a, b) => a.localeCompare(b));

const sortAliases = (aliases: readonly IdentityAlias[]): IdentityAlias[] =>
	[...aliases].sort((a, b) => b.confidence - a.confidence || a.fromLogicalId.localeCompare(b.fromLogicalId));

const sortCandidates = (candidates: readonly IdentityResolutionCandidate[]): IdentityResolutionCandidate[] =>
	[...candidates].sort((a, b) => b.score - a.score || a.logicalId.localeCompare(b.logicalId));
