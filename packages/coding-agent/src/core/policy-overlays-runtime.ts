import { createHash } from "node:crypto";
import { resolve } from "node:path";
import type {
	TraceContentTier,
	TraceEnvironment,
	TraceJsonObject,
	TraceJsonValue,
	TraceSink,
} from "./observability-trace.ts";
import { sanitizeTraceData } from "./observability-trace.ts";
import type { DeferredReason, ExportPolicyOverlay, PolicyOverlay } from "./package-procurement.ts";

// ---------------------------------------------------------------------------
// Shared types
// ---------------------------------------------------------------------------

export type PolicyDomain = "observability" | "memory" | "advisor" | "simplify" | "todo" | "cache-optimizer";

export type PolicyDecision =
	| { kind: "allow"; rule: string; reason: string }
	| { kind: "deny"; rule: string; reason: string }
	| { kind: "defer"; rule: string; reason: string; deferredReason: DeferredReason };

export type PolicyTraceContentTier = TraceContentTier | "full";

export interface ObservabilityExportRequest {
	sink: TraceSink;
	contentTier: PolicyTraceContentTier;
	env: TraceEnvironment;
	data: TraceJsonObject;
}

export type MemoryStore = "memory" | "supermemory";
export type MemoryOperation = "read" | "write" | "replay";
export type MemoryWriteSource =
	| "user-explicit"
	| "compaction-summary"
	| "branch-summary"
	| "session-digest"
	| "harness-control"
	| "extension";
export type MemoryContentTier = "metadata" | "summary" | "evidence" | "raw";
export type MemoryLaneAuthority = "none" | "read" | "write-sanitized" | "write-global";
export type MemoryNamespaceScope = "project" | "session" | "goal" | "lane" | "user";
export type MemorySanitizerCategory = "secret" | "auth" | "pii" | "path" | "rawTool" | "rawPrompt" | "binary";

export interface MemoryNamespaceRequest {
	scope: MemoryNamespaceScope;
	projectRoot?: string;
	sessionId?: string;
	goalId?: string;
	laneId?: string;
	topic?: string;
}

export interface MemoryPolicyContext {
	cwd: string;
	sessionId?: string;
	goalId?: string;
	laneId?: string;
	userId?: string;
	laneAuthority: MemoryLaneAuthority;
	offline?: boolean;
}

export interface MemoryAccessRequest {
	kind: MemoryOperation;
	store: MemoryStore;
	key?: string;
	namespace?: MemoryNamespaceRequest;
	source?: MemoryWriteSource;
	contentTier?: MemoryContentTier;
	payload?: unknown;
}

export interface SanitizerOptions {
	source: MemoryWriteSource;
	contentTier: MemoryContentTier;
	maxChars: number;
	external: boolean;
}

export interface SanitizerFindingSummary {
	sanitized: boolean;
	denied: boolean;
	categories: Partial<Record<MemorySanitizerCategory, number>>;
	redactionCount: number;
	originalChars: number;
	keptChars: number;
	digest: string;
}

export interface MemorySanitizerResult {
	payload: TraceJsonValue;
	findings: SanitizerFindingSummary;
	reason?: string;
}

export type MemoryNamespaceDecision =
	| { kind: "allow"; rule: string; reason: string; namespace: string; topic?: string }
	| { kind: "deny"; rule: string; reason: string }
	| { kind: "defer"; rule: string; reason: string; missing: string[] };

export type MemoryPolicyDecision =
	| {
			kind: "allow";
			rule: string;
			reason: string;
			namespace: string;
			sanitizedPayload?: TraceJsonValue;
			findings: SanitizerFindingSummary;
	  }
	| { kind: "deny"; rule: string; reason: string; findings: SanitizerFindingSummary }
	| { kind: "defer"; rule: string; reason: string; missing: string[]; findings: SanitizerFindingSummary };

export interface ToolInvocationRequest {
	source: "advisor" | "simplify" | "harness-control" | "verification" | "package-manager";
	toolName: string;
	toolCategory: "read" | "write" | "shell" | "memory" | "other";
}

export interface TodoOverlayRequest {
	text: string;
	source: "compaction-summary" | "user-explicit";
}

export interface CacheOptimizerRequest {
	metrics: string[];
	gateDecision?: "control" | "treatment" | "deferred";
}

// ---------------------------------------------------------------------------
// Observability export enforcer
// ---------------------------------------------------------------------------

const TIER_RANK: Record<PolicyTraceContentTier, number> = {
	metadata: 0,
	summary: 1,
	full: 2,
};

export function enforceObservabilityExport(
	policy: ExportPolicyOverlay | undefined,
	request: ObservabilityExportRequest,
): PolicyDecision {
	if (policy === undefined || policy.defaultOff === true) {
		if (request.sink === "braintrust") {
			return {
				kind: "deny",
				rule: "export.default_off",
				reason: "External trace export disabled by default.",
			};
		}
	}
	if (request.env.offline === true) {
		return {
			kind: "deny",
			rule: "export.offline",
			reason: "Offline mode disables external trace export.",
		};
	}
	if (request.sink !== "braintrust") {
		return {
			kind: "deny",
			rule: "export.local_sink",
			reason: "Local sink does not export externally.",
		};
	}
	if (policy?.payloadTier !== undefined && TIER_RANK[request.contentTier] > TIER_RANK[policy.payloadTier]) {
		return {
			kind: "deny",
			rule: "export.tier_exceeded",
			reason: "Requested content tier exceeds policy.",
		};
	}
	return {
		kind: "allow",
		rule: "export.allowed",
		reason: "External trace export permitted by policy.",
	};
}

// ---------------------------------------------------------------------------
// Trace sanitization enforcer
// ---------------------------------------------------------------------------

const PROMPT_KEY_PATTERN = /(?:prompt|completion|response)/i;
const TOOL_KEY_PATTERN = /tool[_-]?(?:output|input|call|result)|toolCall|toolResult/i;

function dropKeys(value: TraceJsonValue, patterns: readonly RegExp[]): TraceJsonValue {
	if (value === null || typeof value !== "object") {
		return value;
	}
	if (Array.isArray(value)) {
		return value.map((entry) => dropKeys(entry, patterns));
	}
	const result: TraceJsonObject = {};
	for (const [key, entry] of Object.entries(value)) {
		if (patterns.some((pattern) => pattern.test(key))) {
			continue;
		}
		result[key] = dropKeys(entry, patterns);
	}
	return result;
}

export function sanitizeForExportPolicy(
	policy: ExportPolicyOverlay | undefined,
	data: TraceJsonObject,
): TraceJsonObject {
	const patterns: RegExp[] = [];
	if (policy?.denyRawPrompt === true) {
		patterns.push(PROMPT_KEY_PATTERN);
	}
	if (policy?.denyRawToolOutput === true) {
		patterns.push(TOOL_KEY_PATTERN);
	}
	const base = sanitizeTraceData(data);
	if (patterns.length === 0) {
		return base;
	}
	return dropKeys(base, patterns) as TraceJsonObject;
}

// ---------------------------------------------------------------------------
// Memory namespace / sanitizer / access enforcer
// ---------------------------------------------------------------------------

const MEMORY_REDACTED = "[redacted]";
const MEMORY_BINARY_REDACTED = "[redacted:binary]";
const MEMORY_TRUNCATION_MARKER = "…[omk-memory:truncated]…";
const MAX_MEMORY_SANITIZER_DEPTH = 6;
const MAX_MEMORY_OBJECT_KEYS = 80;
const MAX_MEMORY_ARRAY_ITEMS = 80;
const LOCAL_MEMORY_MAX_CHARS = 8_000;
const EXTERNAL_MEMORY_MAX_CHARS = 4_000;
const OMITTED_MEMORY_VALUE = Symbol("omitted-memory-value");
const NAMESPACE_COMPONENT_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]{0,120}$/;
const TOPIC_PATTERN = /^[a-z0-9][a-z0-9._/-]{0,120}$/;
const SENSITIVE_MEMORY_KEY_PATTERN =
	/(?:secret|token|api[_-]?key|authorization|password|credential|private[_-]?key|cookie|session|refresh[_-]?token|access[_-]?token)/i;
const AUTH_MEMORY_KEY_PATTERN = /(?:authorization|cookie|session|refresh[_-]?token|access[_-]?token|token)/i;
const PRIVATE_KEY_PATTERN = /-----BEGIN [^-]+PRIVATE KEY-----[\s\S]*?-----END [^-]+PRIVATE KEY-----/g;
const SSH_PRIVATE_KEY_PATTERN = /-----BEGIN OPENSSH PRIVATE KEY-----[\s\S]*?-----END OPENSSH PRIVATE KEY-----/g;
const BEARER_PATTERN = /Bearer\s+[A-Za-z0-9._~+/=-]{8,}/gi;
const JWT_PATTERN = /\beyJ[A-Za-z0-9_-]{5,}\.[A-Za-z0-9_-]{5,}\.[A-Za-z0-9_-]{5,}\b/g;
const PROVIDER_TOKEN_PATTERN = /\bsk-(?:proj-|ant-)?[A-Za-z0-9_-]{16,}\b/g;
const SERVICE_TOKEN_PATTERN =
	/\b(?:ghp|gho|ghu|ghs|ghr|github_pat|npm|xox[baprs]|rk_live|sk_live)_[A-Za-z0-9_=-]{16,}\b/g;
const AWS_ACCESS_KEY_PATTERN = /\bAKIA[0-9A-Z]{16}\b/g;
const ENV_SECRET_ASSIGNMENT_PATTERN =
	/(^|\n)([A-Z0-9_]*(?:SECRET|TOKEN|API[_-]?KEY|PASSWORD|CREDENTIAL|PRIVATE[_-]?KEY)[A-Z0-9_]*\s*=\s*)([^\s]+)/gi;
const SECRET_KEY_VALUE_PATTERN =
	/(^|[\s,;{[(])([A-Z0-9_.-]*(?:SECRET|TOKEN|API[_-]?KEY|APIKEY|AUTHORIZATION|PASSWORD|CREDENTIAL|PRIVATE[_-]?KEY|COOKIE|SESSION|REFRESH[_-]?TOKEN|ACCESS[_-]?TOKEN)[A-Z0-9_.-]*\s*[:=]\s*)(?:"([^"\r\n]*)"|'([^'\r\n]*)'|([^\s,;}\])]+))/gi;
const EMAIL_PATTERN = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
const PHONE_PATTERN = /\b\+?\d[\d\s().-]{7,}\d\b/g;
const SSN_PATTERN = /\b\d{3}-\d{2}-\d{4}\b/g;
const CREDIT_CARD_PATTERN = /\b(?:\d[ -]*?){13,19}\b/g;
const HOME_PATH_PATTERN = /(?:\/home|\/Users)\/[^/\s:]+/g;
const GENERIC_HIGH_ENTROPY_PATTERN = /\b(?=[A-Za-z0-9+/=_-]{32,}\b)(?=.*[A-Za-z])(?=.*\d)[A-Za-z0-9+/=_-]+\b/g;

type SanitizedMemoryValue = TraceJsonValue | typeof OMITTED_MEMORY_VALUE;

interface MutableSanitizerState {
	categories: Partial<Record<MemorySanitizerCategory, number>>;
	redactionCount: number;
	privateKeyBlocked: boolean;
	truncated: boolean;
}

function sha256Text(value: string): string {
	return createHash("sha256").update(value).digest("hex");
}

function canonicalMemoryJson(value: TraceJsonValue): string {
	if (value === null) return "null";
	if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
		return JSON.stringify(value);
	}
	if (Array.isArray(value)) {
		return `[${value.map((entry) => canonicalMemoryJson(entry)).join(",")}]`;
	}
	return `{${Object.keys(value)
		.sort()
		.map((key) => `${JSON.stringify(key)}:${canonicalMemoryJson(value[key] ?? null)}`)
		.join(",")}}`;
}

function createEmptyMemoryFindings(originalChars = 0): SanitizerFindingSummary {
	return {
		sanitized: false,
		denied: false,
		categories: {},
		redactionCount: 0,
		originalChars,
		keptChars: 0,
		digest: sha256Text("null"),
	};
}

function recordMemoryFinding(state: MutableSanitizerState, category: MemorySanitizerCategory, count = 1): void {
	state.categories[category] = (state.categories[category] ?? 0) + count;
	state.redactionCount += count;
}

function measureUnknownChars(value: unknown): number {
	try {
		const serialized = JSON.stringify(value);
		return serialized?.length ?? String(value).length;
	} catch {
		return String(value).length;
	}
}

function boundMemoryString(value: string, maxChars: number): { text: string; truncated: boolean } {
	const budget = Number.isFinite(maxChars) ? Math.max(0, Math.floor(maxChars)) : 0;
	if (budget <= 0) return { text: "", truncated: value.length > 0 };
	if (value.length <= budget) return { text: value, truncated: false };
	const marker = MEMORY_TRUNCATION_MARKER.length < budget ? MEMORY_TRUNCATION_MARKER : budget >= 3 ? "…" : "";
	const contentBudget = Math.max(0, budget - marker.length);
	const headBudget = Math.floor(contentBudget / 2);
	const tailBudget = Math.max(0, contentBudget - headBudget);
	return {
		text: `${value.slice(0, headBudget)}${marker}${value.slice(Math.max(0, value.length - tailBudget))}`,
		truncated: true,
	};
}

function redactMemoryString(value: string, state: MutableSanitizerState, maxChars: number): string {
	let redacted = value;
	redacted = redacted.replace(PRIVATE_KEY_PATTERN, () => {
		state.privateKeyBlocked = true;
		recordMemoryFinding(state, "secret");
		return MEMORY_REDACTED;
	});
	redacted = redacted.replace(SSH_PRIVATE_KEY_PATTERN, () => {
		state.privateKeyBlocked = true;
		recordMemoryFinding(state, "secret");
		return MEMORY_REDACTED;
	});
	redacted = redacted.replace(ENV_SECRET_ASSIGNMENT_PATTERN, (_match: string, prefix: string, assignment: string) => {
		recordMemoryFinding(state, "secret");
		return `${prefix}${assignment}${MEMORY_REDACTED}`;
	});
	redacted = redacted.replace(BEARER_PATTERN, () => {
		recordMemoryFinding(state, "auth");
		return `Bearer ${MEMORY_REDACTED}`;
	});
	redacted = redacted.replace(JWT_PATTERN, () => {
		recordMemoryFinding(state, "auth");
		return MEMORY_REDACTED;
	});
	redacted = redacted.replace(PROVIDER_TOKEN_PATTERN, () => {
		recordMemoryFinding(state, "secret");
		return MEMORY_REDACTED;
	});
	redacted = redacted.replace(SERVICE_TOKEN_PATTERN, () => {
		recordMemoryFinding(state, "secret");
		return MEMORY_REDACTED;
	});
	redacted = redacted.replace(AWS_ACCESS_KEY_PATTERN, () => {
		recordMemoryFinding(state, "secret");
		return MEMORY_REDACTED;
	});
	redacted = redacted.replace(
		SECRET_KEY_VALUE_PATTERN,
		(
			match: string,
			prefix: string,
			assignment: string,
			doubleQuoted: string | undefined,
			singleQuoted: string | undefined,
			bare: string | undefined,
		) => {
			const value = doubleQuoted ?? singleQuoted ?? bare ?? "";
			if (value.includes(MEMORY_REDACTED) || value.includes("[redacted")) return match;
			recordMemoryFinding(state, categoryForSensitiveKey(assignment));
			if (doubleQuoted !== undefined) return `${prefix}${assignment}"${MEMORY_REDACTED}"`;
			if (singleQuoted !== undefined) return `${prefix}${assignment}'${MEMORY_REDACTED}'`;
			return `${prefix}${assignment}${MEMORY_REDACTED}`;
		},
	);
	redacted = redacted.replace(EMAIL_PATTERN, () => {
		recordMemoryFinding(state, "pii");
		return MEMORY_REDACTED;
	});
	redacted = redacted.replace(SSN_PATTERN, () => {
		recordMemoryFinding(state, "pii");
		return MEMORY_REDACTED;
	});
	redacted = redacted.replace(CREDIT_CARD_PATTERN, () => {
		recordMemoryFinding(state, "pii");
		return MEMORY_REDACTED;
	});
	redacted = redacted.replace(PHONE_PATTERN, () => {
		recordMemoryFinding(state, "pii");
		return MEMORY_REDACTED;
	});
	redacted = redacted.replace(HOME_PATH_PATTERN, () => {
		recordMemoryFinding(state, "path");
		return "~";
	});
	redacted = redacted.replace(GENERIC_HIGH_ENTROPY_PATTERN, () => {
		recordMemoryFinding(state, "secret");
		return MEMORY_REDACTED;
	});
	const bounded = boundMemoryString(redacted, maxChars);
	if (bounded.truncated) state.truncated = true;
	return bounded.text;
}

function isSessionDerivedMemorySource(source: MemoryWriteSource): boolean {
	return source !== "user-explicit";
}

function categoryForSensitiveKey(key: string): MemorySanitizerCategory {
	return AUTH_MEMORY_KEY_PATTERN.test(key) ? "auth" : "secret";
}

function isPlainObject(value: object): value is Record<string, unknown> {
	return Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null;
}

function sanitizeMemoryValue(
	value: unknown,
	options: SanitizerOptions,
	state: MutableSanitizerState,
	depth: number,
	seen: WeakSet<object>,
): SanitizedMemoryValue {
	if (value === null) return null;
	if (typeof value === "string") return redactMemoryString(value, state, options.maxChars);
	if (typeof value === "number") return Number.isFinite(value) ? value : String(value);
	if (typeof value === "boolean") return value;
	if (typeof value === "bigint") return value.toString();
	if (typeof value === "undefined") return "";
	if (typeof value === "function" || typeof value === "symbol") return String(value);
	if (depth >= MAX_MEMORY_SANITIZER_DEPTH) return "[max-depth]";

	if (value instanceof ArrayBuffer || ArrayBuffer.isView(value)) {
		recordMemoryFinding(state, "binary");
		return MEMORY_BINARY_REDACTED;
	}
	if (value instanceof Date) return value.toISOString();
	if (value instanceof Error) {
		return {
			name: redactMemoryString(value.name, state, options.maxChars),
			message: redactMemoryString(value.message, state, options.maxChars),
		};
	}
	if (Array.isArray(value)) {
		return value.slice(0, MAX_MEMORY_ARRAY_ITEMS).map((entry) => {
			const sanitized = sanitizeMemoryValue(entry, options, state, depth + 1, seen);
			return sanitized === OMITTED_MEMORY_VALUE ? MEMORY_REDACTED : sanitized;
		});
	}
	if (typeof value === "object") {
		if (seen.has(value)) return "[circular]";
		seen.add(value);
		const entries = isPlainObject(value)
			? Object.entries(value)
			: Object.entries(value).slice(0, MAX_MEMORY_OBJECT_KEYS);
		const result: TraceJsonObject = {};
		for (const [key, entry] of entries.slice(0, MAX_MEMORY_OBJECT_KEYS)) {
			if (SENSITIVE_MEMORY_KEY_PATTERN.test(key)) {
				if (/private[_-]?key/i.test(key)) state.privateKeyBlocked = true;
				recordMemoryFinding(state, categoryForSensitiveKey(key));
				result[key] = MEMORY_REDACTED;
				continue;
			}
			if (isSessionDerivedMemorySource(options.source) && options.contentTier !== "evidence") {
				if (PROMPT_KEY_PATTERN.test(key)) {
					recordMemoryFinding(state, "rawPrompt");
					continue;
				}
				if (TOOL_KEY_PATTERN.test(key)) {
					recordMemoryFinding(state, "rawTool");
					continue;
				}
			}
			const sanitized = sanitizeMemoryValue(entry, options, state, depth + 1, seen);
			if (sanitized !== OMITTED_MEMORY_VALUE) result[key] = sanitized;
		}
		seen.delete(value);
		return result;
	}
	return String(value);
}

function boundSanitizedPayload(value: TraceJsonValue, maxChars: number, state: MutableSanitizerState): TraceJsonValue {
	const canonical = canonicalMemoryJson(value);
	if (canonical.length <= maxChars) return value;
	const bounded = boundMemoryString(canonical, maxChars);
	if (bounded.truncated) state.truncated = true;
	return bounded.text;
}

function isEmptyMemoryPayload(value: TraceJsonValue): boolean {
	if (value === null) return true;
	if (typeof value === "string") return value.trim().length === 0;
	if (Array.isArray(value)) return value.length === 0;
	if (typeof value === "object") return Object.keys(value).length === 0;
	return false;
}

function sanitizerDenyReason(
	payload: TraceJsonValue,
	options: SanitizerOptions,
	state: MutableSanitizerState,
): string | undefined {
	if (state.privateKeyBlocked) return "memory.sanitizer.private_key";
	const sensitiveCount = (state.categories.secret ?? 0) + (state.categories.auth ?? 0);
	if (sensitiveCount >= 3 && sensitiveCount * 2 >= Math.max(1, state.redactionCount)) {
		return "memory.sanitizer.high_secret_density";
	}
	if (options.contentTier !== "metadata" && isEmptyMemoryPayload(payload)) return "memory.sanitizer.empty_payload";
	return undefined;
}

export function sanitizeMemoryPayload(payload: unknown, options: SanitizerOptions): MemorySanitizerResult {
	const originalChars = measureUnknownChars(payload);
	const state: MutableSanitizerState = {
		categories: {},
		redactionCount: 0,
		privateKeyBlocked: false,
		truncated: false,
	};
	const sanitizedValue = sanitizeMemoryValue(payload, options, state, 0, new WeakSet<object>());
	const sanitizedPayload = sanitizedValue === OMITTED_MEMORY_VALUE ? null : sanitizedValue;
	const boundedPayload = boundSanitizedPayload(sanitizedPayload, options.maxChars, state);
	const canonicalPayload = canonicalMemoryJson(boundedPayload);
	const reason = sanitizerDenyReason(boundedPayload, options, state);
	return {
		payload: boundedPayload,
		findings: {
			sanitized: state.redactionCount > 0 || state.truncated,
			denied: reason !== undefined,
			categories: state.categories,
			redactionCount: state.redactionCount,
			originalChars,
			keptChars: canonicalPayload.length,
			digest: sha256Text(canonicalPayload),
		},
		reason,
	};
}

function canonicalProjectHash(root: string): string {
	return sha256Text(resolve(root).replace(/\\/g, "/")).slice(0, 16);
}

function normalizeResolvedProjectPath(path: string): string {
	const normalized = resolve(path).replace(/\\/g, "/");
	if (normalized.length > 1 && normalized.endsWith("/")) return normalized.replace(/\/+$/, "");
	return normalized;
}

function isSameOrAncestorProjectRoot(projectRoot: string, cwd: string): boolean {
	const root = normalizeResolvedProjectPath(projectRoot);
	const current = normalizeResolvedProjectPath(cwd);
	return current === root || current.startsWith(`${root}/`);
}

function resolveMemoryProjectRoot(
	context: MemoryPolicyContext,
	request: MemoryNamespaceRequest,
): MemoryNamespaceDecision | { kind: "allow"; projectRoot: string } {
	if (request.projectRoot === undefined) return { kind: "allow", projectRoot: context.cwd };
	if (isSameOrAncestorProjectRoot(request.projectRoot, context.cwd)) {
		return { kind: "allow", projectRoot: request.projectRoot };
	}
	return {
		kind: "deny",
		rule: "memory.namespace.project_root_mismatch",
		reason: "Memory namespace project root must contain the active workspace.",
	};
}

function validateNamespaceComponent(name: string, value: string): MemoryNamespaceDecision | undefined {
	if (NAMESPACE_COMPONENT_PATTERN.test(value)) return undefined;
	return {
		kind: "deny",
		rule: "memory.namespace.invalid_component",
		reason: `${name} contains unsupported namespace characters.`,
	};
}

function normalizeMemoryTopic(topic: string | undefined): MemoryNamespaceDecision | { kind: "allow"; topic?: string } {
	if (topic === undefined) return { kind: "allow" };
	const normalized = topic.trim().toLowerCase();
	if (
		normalized.length === 0 ||
		normalized.includes("..") ||
		normalized.startsWith("/") ||
		normalized.includes("\\") ||
		/^[a-z][a-z0-9+.-]*:/.test(normalized) ||
		/[\x00-\x1f\x7f]/.test(normalized) ||
		!TOPIC_PATTERN.test(normalized)
	) {
		return {
			kind: "deny",
			rule: "memory.namespace.invalid_topic",
			reason: "Memory namespace topic is not a safe relative suffix.",
		};
	}
	return { kind: "allow", topic: normalized };
}

function missingNamespaceDecision(missing: string[]): MemoryNamespaceDecision {
	return {
		kind: "defer",
		rule: "memory.namespace.missing_context",
		reason: "Memory namespace requires additional context.",
		missing,
	};
}

function appendMemoryTopic(namespace: string, topic: string | undefined): string {
	return topic === undefined ? namespace : `${namespace}:${topic}`;
}

export function deriveMemoryNamespace(
	context: MemoryPolicyContext,
	request: MemoryNamespaceRequest,
): MemoryNamespaceDecision {
	const topic = normalizeMemoryTopic(request.topic);
	if (topic.kind !== "allow") return topic;
	const projectRoot = resolveMemoryProjectRoot(context, request);
	if (!("projectRoot" in projectRoot)) return projectRoot;
	const projectHash = canonicalProjectHash(projectRoot.projectRoot);
	const projectNamespace = `omk:project:${projectHash}`;
	if (request.scope === "project")
		return {
			kind: "allow",
			rule: "memory.namespace.project",
			reason: "Project namespace derived.",
			namespace: appendMemoryTopic(projectNamespace, topic.topic),
			topic: topic.topic,
		};

	if (request.scope === "session") {
		const sessionId = request.sessionId ?? context.sessionId;
		if (sessionId === undefined) return missingNamespaceDecision(["sessionId"]);
		const invalid = validateNamespaceComponent("sessionId", sessionId);
		if (invalid) return invalid;
		return {
			kind: "allow",
			rule: "memory.namespace.session",
			reason: "Session namespace derived.",
			namespace: appendMemoryTopic(`${projectNamespace}:session:${sessionId}`, topic.topic),
			topic: topic.topic,
		};
	}

	if (request.scope === "goal") {
		const goalId = request.goalId ?? context.goalId;
		if (goalId === undefined) return missingNamespaceDecision(["goalId"]);
		const invalid = validateNamespaceComponent("goalId", goalId);
		if (invalid) return invalid;
		return {
			kind: "allow",
			rule: "memory.namespace.goal",
			reason: "Goal namespace derived.",
			namespace: appendMemoryTopic(`${projectNamespace}:goal:${goalId}`, topic.topic),
			topic: topic.topic,
		};
	}

	if (request.scope === "lane") {
		const goalId = request.goalId ?? context.goalId;
		const laneId = request.laneId ?? context.laneId;
		if (goalId === undefined || laneId === undefined) {
			const missing = [
				goalId === undefined ? "goalId" : undefined,
				laneId === undefined ? "laneId" : undefined,
			].filter((entry): entry is string => entry !== undefined);
			return missingNamespaceDecision(missing);
		}
		const invalidGoal = validateNamespaceComponent("goalId", goalId);
		if (invalidGoal) return invalidGoal;
		const invalidLane = validateNamespaceComponent("laneId", laneId);
		if (invalidLane) return invalidLane;
		return {
			kind: "allow",
			rule: "memory.namespace.lane",
			reason: "Lane namespace derived.",
			namespace: appendMemoryTopic(`${projectNamespace}:goal:${goalId}:lane:${laneId}`, topic.topic),
			topic: topic.topic,
		};
	}

	const userId = context.userId;
	if (userId === undefined) return missingNamespaceDecision(["userId"]);
	return {
		kind: "allow",
		rule: "memory.namespace.user",
		reason: "User namespace derived.",
		namespace: appendMemoryTopic(`omk:user:${sha256Text(userId).slice(0, 16)}`, topic.topic),
		topic: topic.topic,
	};
}

function canReadMemory(authority: MemoryLaneAuthority): boolean {
	return authority === "read" || authority === "write-sanitized" || authority === "write-global";
}

function canWriteMemory(authority: MemoryLaneAuthority): boolean {
	return authority === "write-sanitized" || authority === "write-global";
}

function defaultMemoryContext(
	overlay: PolicyOverlay | undefined,
	request: MemoryAccessRequest,
	context: MemoryPolicyContext | undefined,
): MemoryPolicyContext {
	return {
		cwd: context?.cwd ?? process.cwd(),
		sessionId: context?.sessionId,
		goalId: context?.goalId,
		laneId: context?.laneId,
		userId: context?.userId,
		laneAuthority:
			context?.laneAuthority ?? (overlay?.declaredUse === "memory" && request.kind === "read" ? "read" : "none"),
		offline: context?.offline,
	};
}

function denyMemory(rule: string, reason: string, findings = createEmptyMemoryFindings()): MemoryPolicyDecision {
	return { kind: "deny", rule, reason, findings };
}

function deferMemory(
	rule: string,
	reason: string,
	missing: string[],
	findings = createEmptyMemoryFindings(),
): MemoryPolicyDecision {
	return { kind: "defer", rule, reason, missing, findings };
}

function namespaceToPolicyDecision(
	decision: Exclude<MemoryNamespaceDecision, { kind: "allow" }>,
): MemoryPolicyDecision {
	if (decision.kind === "deny") return denyMemory(decision.rule, decision.reason);
	return deferMemory(decision.rule, decision.reason, decision.missing);
}

function missingRequestFields(request: MemoryAccessRequest): string[] {
	return [
		request.source === undefined ? "source" : undefined,
		request.contentTier === undefined ? "contentTier" : undefined,
	].filter((entry): entry is string => entry !== undefined);
}

function memoryMaxChars(store: MemoryStore): number {
	return store === "supermemory" ? EXTERNAL_MEMORY_MAX_CHARS : LOCAL_MEMORY_MAX_CHARS;
}

export function enforceMemoryAccess(
	overlay: PolicyOverlay | undefined,
	request: MemoryAccessRequest,
	context?: MemoryPolicyContext,
): MemoryPolicyDecision {
	const effectiveContext = defaultMemoryContext(overlay, request, context);
	const namespaceDecision = deriveMemoryNamespace(effectiveContext, request.namespace ?? { scope: "project" });
	if (namespaceDecision.kind !== "allow") return namespaceToPolicyDecision(namespaceDecision);

	if (request.kind === "read") {
		if (!canReadMemory(effectiveContext.laneAuthority)) {
			return denyMemory("memory.authority_denied", "Memory read requires lane memory authority.");
		}
		return {
			kind: "allow",
			rule: "memory.read_allowed",
			reason: "Memory read permitted.",
			namespace: namespaceDecision.namespace,
			findings: createEmptyMemoryFindings(),
		};
	}

	if (request.store === "supermemory" && request.contentTier === "raw") {
		return denyMemory("memory.supermemory_raw_denied", "Supermemory does not accept raw memory payloads.");
	}
	if (overlay?.declaredUse !== "memory") {
		return denyMemory("memory.not_a_memory_lane", "Write/replay requested outside a memory lane.");
	}
	if (overlay.advisoryOnly === true) {
		return denyMemory("memory.advisory_only", "Memory lane is advisory-only; writes denied.");
	}
	if (!canWriteMemory(effectiveContext.laneAuthority)) {
		return denyMemory("memory.authority_denied", "Memory write requires sanitized-write lane authority.");
	}
	if (request.kind === "replay" && overlay.replayInput !== true) {
		return denyMemory("memory.no_replay", "Memory replay requires an explicit replayInput overlay.");
	}
	if (effectiveContext.offline === true && request.store === "supermemory") {
		return deferMemory("memory.supermemory_offline", "Supermemory writes are deferred while offline.", ["online"]);
	}
	const source = request.source;
	const contentTier = request.contentTier;
	if (source === undefined || contentTier === undefined) {
		const missing = missingRequestFields(request);
		return deferMemory("memory.request.missing_context", "Memory write requires source and content tier.", missing);
	}
	if (request.namespace?.scope === "user") {
		if (effectiveContext.laneAuthority !== "write-global" || source !== "user-explicit") {
			return denyMemory(
				"memory.global_authority_denied",
				"User/global memory writes require explicit global authority.",
			);
		}
	}
	if (contentTier === "raw") {
		if (
			request.store !== "memory" ||
			source !== "user-explicit" ||
			effectiveContext.laneAuthority !== "write-global"
		) {
			return denyMemory(
				"memory.raw_denied",
				"Raw memory writes require explicit user-global local memory authority.",
			);
		}
	}

	const sanitized = sanitizeMemoryPayload(request.payload ?? null, {
		source,
		contentTier,
		maxChars: memoryMaxChars(request.store),
		external: request.store === "supermemory",
	});
	if (sanitized.findings.denied) {
		return denyMemory(
			sanitized.reason ?? "memory.sanitizer.denied",
			"Memory payload sanitizer denied persistence.",
			sanitized.findings,
		);
	}
	if (contentTier === "raw" && sanitized.findings.redactionCount > 0) {
		return denyMemory(
			"memory.raw_sensitive_denied",
			"Raw memory payload contains sanitizer findings.",
			sanitized.findings,
		);
	}
	return {
		kind: "allow",
		rule: request.kind === "replay" ? "memory.replay_sanitized" : "memory.write_sanitized",
		reason: "Memory payload permitted after sanitization.",
		namespace: namespaceDecision.namespace,
		sanitizedPayload: sanitized.payload,
		findings: sanitized.findings,
	};
}

// ---------------------------------------------------------------------------
// Advisor / simplify report-only tool enforcer
// ---------------------------------------------------------------------------

export function enforceReportOnlyToolInvocation(
	overlay: PolicyOverlay | undefined,
	request: ToolInvocationRequest,
): PolicyDecision {
	if (request.source !== "advisor" && request.source !== "simplify") {
		return {
			kind: "allow",
			rule: "source.not_advisor",
			reason: "Source is not advisor/simplify.",
		};
	}
	const declaredUse = overlay?.declaredUse;
	const hasReportOverlay =
		overlay?.mutationMode === "report-only" || declaredUse === "advisor" || declaredUse === "quality";
	if (!hasReportOverlay) {
		return {
			kind: "deny",
			rule: "advisor.missing_overlay",
			reason: "Advisor/simplify source requires a report-only overlay.",
		};
	}
	if (request.toolCategory === "write" || request.toolCategory === "shell") {
		return {
			kind: "deny",
			rule: "advisor.mutation_denied",
			reason: "Advisor/simplify tools are report-only.",
		};
	}
	return {
		kind: "allow",
		rule: "advisor.read_allowed",
		reason: "Read-only advisor/simplify tool permitted.",
	};
}

// ---------------------------------------------------------------------------
// Todo overlay classifier
// ---------------------------------------------------------------------------

function sanitizeStatusText(text: string): string {
	return text.replace(/[\x00-\x08\x0b-\x1f\x7f]/g, "").trim();
}

export type TodoOverlayClassification =
	| { authoritative: false; display: string }
	| { authoritative: true; source: "user-explicit" };

export function classifyTodoOverlay(request: TodoOverlayRequest): TodoOverlayClassification {
	if (request.source === "compaction-summary") {
		return { authoritative: false, display: sanitizeStatusText(request.text) };
	}
	return { authoritative: true, source: "user-explicit" };
}

// ---------------------------------------------------------------------------
// Cache optimizer A/B measurement gate
// ---------------------------------------------------------------------------

export function enforceCacheOptimizerGate(
	overlay: PolicyOverlay | undefined,
	request: CacheOptimizerRequest,
): PolicyDecision {
	if (overlay?.declaredUse !== "cache-perf") {
		return {
			kind: "deny",
			rule: "cache.not_a_cache_optimizer",
			reason: "Cache optimizer gate requested for non-cache lane.",
		};
	}
	if (request.metrics.length === 0) {
		return {
			kind: "defer",
			rule: "pending-measurement-plan",
			reason: "Cache optimizer requires metrics array.",
			deferredReason: "pending-measurement-plan",
		};
	}
	if (request.gateDecision !== "treatment") {
		return {
			kind: "defer",
			rule: "pending-measurement-plan",
			reason: "Cache optimizer awaiting A/B treatment decision.",
			deferredReason: "pending-measurement-plan",
		};
	}
	return {
		kind: "allow",
		rule: "cache.treatment_allowed",
		reason: "Cache optimizer treatment permitted.",
	};
}
