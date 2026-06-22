import { createHash } from "node:crypto";

const CHARS_PER_TOKEN_ESTIMATE = 4;
const TRACKING_KEY_SEPARATOR = "\u0000";

export const LEAN_CONTEXT_DEFAULT_MIN_STUB_TOKENS = 256;
export const LEAN_CONTEXT_NEVER_STUB_FILENAMES = ["AGENTS.md", "CLAUDE.md", "SYSTEM.md"] as const;

const DEFAULT_SECRET_PATTERNS: readonly RegExp[] = [
	/-----BEGIN [A-Z0-9 ]*PRIVATE KEY-----/i,
	/\b(?:api[_-]?key|access[_-]?token|auth[_-]?token|refresh[_-]?token|client[_-]?secret|password|passwd|pwd)\b\s*[:=]\s*["']?[^\s"']{8,}/i,
	/\bauthorization\s*:\s*bearer\s+[A-Za-z0-9._~+/=-]{10,}/i,
	/\b(?:gh[pousr]_|sk-|xox[baprs]-)[A-Za-z0-9_=-]{10,}/i,
];

export type LeanContextEmission = "full" | "stub";

export type LeanContextDecisionReason =
	| "first-pass"
	| "changed"
	| "unchanged"
	| "never-stub-parent-instruction"
	| "secret-pattern"
	| "below-min-token-threshold";

export interface LeanContextPolicyState {
	readonly hashesByToolKey: Readonly<Record<string, string>>;
}

export interface LeanContextPolicyOptions {
	/** Repeated unchanged outputs below this token estimate stay full. */
	readonly minStubTokens?: number;
	/** Basenames that must never be replaced with an unchanged stub. */
	readonly neverStubFilenames?: readonly string[];
	/** Patterns that force full output when matched. */
	readonly secretPatterns?: readonly RegExp[];
}

export interface LeanContextPolicyInput extends LeanContextPolicyOptions {
	readonly state: LeanContextPolicyState;
	readonly tool: string;
	/** Stable caller-defined identity inside the tool, such as path or request key. */
	readonly key: string;
	readonly content: string;
	/** Optional path used for parent-instruction filename checks. Defaults to key. */
	readonly path?: string;
}

export interface LeanContextPolicyDecision {
	readonly emit: LeanContextEmission;
	readonly reason: LeanContextDecisionReason;
	readonly contentSha256: string;
	readonly previousSha256?: string;
	readonly estimatedTokens: number;
	readonly nextState: LeanContextPolicyState;
	readonly stub?: string;
}

export function createLeanContextPolicyState(
	hashesByToolKey: Readonly<Record<string, string>> = {},
): LeanContextPolicyState {
	return { hashesByToolKey: { ...hashesByToolKey } };
}

export function decideLeanContextEmission(input: LeanContextPolicyInput): LeanContextPolicyDecision {
	const contentSha256 = sha256Text(input.content);
	const trackingKey = createLeanContextTrackingKey(input.tool, input.key);
	const previousSha256 = input.state.hashesByToolKey[trackingKey];
	const estimatedTokens = estimateLeanContextTokens(input.content);
	const nextState = updateTrackedHash(input.state, trackingKey, contentSha256);
	const baseDecision = {
		contentSha256,
		previousSha256,
		estimatedTokens,
		nextState,
	};

	if (previousSha256 === undefined) {
		return { ...baseDecision, emit: "full", reason: "first-pass" };
	}

	if (previousSha256 !== contentSha256) {
		return { ...baseDecision, emit: "full", reason: "changed" };
	}

	if (isNeverStubParentInstruction(input.path ?? input.key, input.neverStubFilenames)) {
		return { ...baseDecision, emit: "full", reason: "never-stub-parent-instruction" };
	}

	if (containsSecretPattern(input.content, input.secretPatterns)) {
		return { ...baseDecision, emit: "full", reason: "secret-pattern" };
	}

	const minStubTokens = normalizeMinStubTokens(input.minStubTokens);
	if (estimatedTokens < minStubTokens) {
		return { ...baseDecision, emit: "full", reason: "below-min-token-threshold" };
	}

	return {
		...baseDecision,
		emit: "stub",
		reason: "unchanged",
		stub: formatLeanContextUnchangedStub({
			tool: input.tool,
			key: input.key,
			contentSha256,
			estimatedTokens,
		}),
	};
}

export function getLeanContextTrackingHash(
	state: LeanContextPolicyState,
	tool: string,
	key: string,
): string | undefined {
	return state.hashesByToolKey[createLeanContextTrackingKey(tool, key)];
}

export function createLeanContextTrackingKey(tool: string, key: string): string {
	return `${tool}${TRACKING_KEY_SEPARATOR}${key}`;
}

export function estimateLeanContextTokens(content: string): number {
	if (content.length === 0) return 0;
	return Math.ceil(content.length / CHARS_PER_TOKEN_ESTIMATE);
}

export function formatLeanContextUnchangedStub(input: {
	readonly tool: string;
	readonly key: string;
	readonly contentSha256: string;
	readonly estimatedTokens: number;
}): string {
	return `[lean-context] ${input.tool} result for ${input.key} unchanged; omitted ${input.estimatedTokens} estimated tokens (sha256:${input.contentSha256.slice(0, 12)}).`;
}

function updateTrackedHash(
	state: LeanContextPolicyState,
	trackingKey: string,
	contentSha256: string,
): LeanContextPolicyState {
	if (state.hashesByToolKey[trackingKey] === contentSha256) {
		return state;
	}
	return {
		hashesByToolKey: {
			...state.hashesByToolKey,
			[trackingKey]: contentSha256,
		},
	};
}

function sha256Text(content: string): string {
	return createHash("sha256").update(content, "utf8").digest("hex");
}

function isNeverStubParentInstruction(pathOrKey: string, filenames?: readonly string[]): boolean {
	const allowedNames = filenames ?? LEAN_CONTEXT_NEVER_STUB_FILENAMES;
	const basename = getBasename(pathOrKey).toUpperCase();
	return allowedNames.some((name) => name.toUpperCase() === basename);
}

function getBasename(pathOrKey: string): string {
	const normalized = pathOrKey.replaceAll("\\", "/");
	const parts = normalized.split("/");
	return parts.at(-1) ?? normalized;
}

function containsSecretPattern(content: string, patterns?: readonly RegExp[]): boolean {
	const activePatterns = patterns ?? DEFAULT_SECRET_PATTERNS;
	return activePatterns.some((pattern) => regexTestStateless(pattern, content));
}

function regexTestStateless(pattern: RegExp, content: string): boolean {
	const flags = pattern.flags.replace(/[gy]/g, "");
	return new RegExp(pattern.source, flags).test(content);
}

function normalizeMinStubTokens(value: number | undefined): number {
	if (value === undefined) return LEAN_CONTEXT_DEFAULT_MIN_STUB_TOKENS;
	if (!Number.isFinite(value) || value <= 0) return 0;
	return Math.ceil(value);
}
