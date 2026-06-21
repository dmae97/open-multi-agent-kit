import { createHash } from "node:crypto";
import path from "node:path";

export type TraceSink = "local" | "braintrust";
export type TraceContentTier = "metadata" | "summary";

export interface TraceSettings {
	enabled?: boolean;
	sink?: TraceSink;
	contentTier?: TraceContentTier;
}

export interface TraceEnvironment {
	offline?: boolean;
	trace?: boolean;
}

export interface TraceArtifactInput {
	path: string;
	exists: boolean;
	allowed: boolean;
	sizeBytes?: number;
	sha256?: string;
}

export interface TraceEventInput {
	runId: string;
	sessionId?: string;
	operationId: string;
	timestamp: string;
	kind: string;
	status: string;
	dataHash?: string;
	data?: TraceJsonObject;
	artifacts?: readonly TraceArtifactInput[];
}

export type TraceJsonPrimitive = string | number | boolean | null;
export type TraceJsonValue = TraceJsonPrimitive | TraceJsonValue[] | TraceJsonObject;
export type TraceJsonObject = { [key: string]: TraceJsonValue };

export interface ObservabilityTraceArtifact {
	pathHash: string;
	relPath?: string;
	exists: boolean;
	allowed: boolean;
	sizeBytes?: number;
	sha256?: string;
}

export interface ObservabilityTraceV1 {
	schemaVersion: "omk.observability.trace.v1";
	traceId: string;
	runIdHash: string;
	sessionIdHash?: string;
	operationId: string;
	timestamp: string;
	source: "harness-control" | "verification" | "package-manager" | "advisor" | "simplify";
	kind: string;
	status: string;
	dataHash: string;
	sanitizedData: TraceJsonObject;
	artifacts: ObservabilityTraceArtifact[];
	external?: { sink: "braintrust"; contentTier: TraceContentTier; payloadBytes: number };
}

export interface CreateTraceOptions {
	source: ObservabilityTraceV1["source"];
	cwd?: string;
	sink?: TraceSink;
	contentTier?: TraceContentTier;
}

export interface TraceExportDecision {
	allowed: boolean;
	sink: TraceSink;
	contentTier: TraceContentTier;
	rule: string;
	reason: string;
}

const DROP_KEY_PATTERN =
	/^(?:stdout|stderr|prompt|completion|response|tool[_-]?output|tool[_-]?input|env|environment|headers?|cookies?|authorization)$/i;
const SECRET_KEY_PATTERN = /(?:secret|token|api[_-]?key|password|credential|private[_-]?key|authorization|cookie)/i;
const TOKEN_VALUE_PATTERN =
	/(?:Bearer\s+[A-Za-z0-9._~+/=-]+|sk-(?:proj-|ant-)?[A-Za-z0-9_-]{12,}|\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b|-----BEGIN [^-]+PRIVATE KEY-----)/i;
const SENSITIVE_PATH_PATTERN =
	/(?:^|[/\\])(?:\.env[^/\\]*|auth\.json|oauth\.json|\.ssh|\.aws|.*(?:secret|token|credential|private[_-]?key).*)/i;

function sha256(value: string): string {
	return createHash("sha256").update(value).digest("hex");
}

function stableStringify(value: TraceJsonValue): string {
	if (value === null) return "null";
	if (typeof value === "string" || typeof value === "number" || typeof value === "boolean")
		return JSON.stringify(value);
	if (Array.isArray(value)) return `[${value.map((entry) => stableStringify(entry)).join(",")}]`;
	return `{${Object.keys(value)
		.sort()
		.map((key) => `${JSON.stringify(key)}:${stableStringify(value[key] ?? null)}`)
		.join(",")}}`;
}

export function hashTraceValue(value: string): string {
	return sha256(value);
}

export function shouldExportTrace(settings: TraceSettings, env: TraceEnvironment = {}): boolean {
	if (env.offline) return false;
	return settings.enabled === true || env.trace === true;
}

export function decideExternalSink(settings: TraceSettings, env: TraceEnvironment = {}): TraceExportDecision {
	const sink = settings.sink ?? "local";
	const contentTier = settings.contentTier ?? "metadata";
	if (!shouldExportTrace(settings, env)) {
		return { allowed: false, sink, contentTier, rule: "trace.disabled", reason: "Trace export is disabled." };
	}
	if (env.offline) {
		return {
			allowed: false,
			sink,
			contentTier,
			rule: "trace.offline",
			reason: "Offline mode disables external trace export.",
		};
	}
	if (sink !== "braintrust") {
		return {
			allowed: false,
			sink,
			contentTier,
			rule: "trace.local",
			reason: "Local trace sink does not export externally.",
		};
	}
	return {
		allowed: true,
		sink,
		contentTier,
		rule: "trace.external_allowed",
		reason: "External trace sink is explicitly enabled.",
	};
}

export function sanitizeTraceData(data: TraceJsonObject = {}): TraceJsonObject {
	const result: TraceJsonObject = {};
	for (const [key, value] of Object.entries(data)) {
		if (DROP_KEY_PATTERN.test(key)) continue;
		if (SECRET_KEY_PATTERN.test(key)) {
			result[key] = "[redacted]";
			continue;
		}
		result[key] = sanitizeTraceValue(value);
	}
	return result;
}

function sanitizeTraceValue(value: TraceJsonValue): TraceJsonValue {
	if (typeof value === "string") {
		if (TOKEN_VALUE_PATTERN.test(value)) return "[redacted]";
		if (value.length > 2000) return `${value.slice(0, 2000)}…[truncated]`;
		return value;
	}
	if (typeof value === "number" || typeof value === "boolean" || value === null) return value;
	if (Array.isArray(value)) return value.slice(0, 80).map((entry) => sanitizeTraceValue(entry));
	return sanitizeTraceData(value);
}

function maybeRelativePath(cwd: string | undefined, artifactPath: string): string | undefined {
	if (!cwd) return undefined;
	const resolvedCwd = path.resolve(cwd);
	const resolvedArtifact = path.resolve(cwd, artifactPath);
	if (SENSITIVE_PATH_PATTERN.test(resolvedArtifact)) return undefined;
	const relative = path.relative(resolvedCwd, resolvedArtifact).replace(/\\/g, "/");
	if (relative === "" || relative.startsWith("..") || path.isAbsolute(relative)) return undefined;
	return relative;
}

function sanitizeArtifacts(
	artifacts: readonly TraceArtifactInput[] | undefined,
	cwd: string | undefined,
): ObservabilityTraceArtifact[] {
	return (artifacts ?? []).map((artifact) => ({
		pathHash: sha256(path.resolve(cwd ?? "/", artifact.path)),
		...(maybeRelativePath(cwd, artifact.path) === undefined
			? {}
			: { relPath: maybeRelativePath(cwd, artifact.path) }),
		exists: artifact.exists,
		allowed: artifact.allowed,
		...(artifact.sizeBytes === undefined ? {} : { sizeBytes: artifact.sizeBytes }),
		...(artifact.sha256 === undefined ? {} : { sha256: artifact.sha256 }),
	}));
}

export function createObservabilityTrace(event: TraceEventInput, options: CreateTraceOptions): ObservabilityTraceV1 {
	const sanitizedData = sanitizeTraceData(event.data ?? {});
	const dataHash = event.dataHash ?? sha256(stableStringify(sanitizedData));
	const artifacts = sanitizeArtifacts(event.artifacts, options.cwd);
	const trace: ObservabilityTraceV1 = {
		schemaVersion: "omk.observability.trace.v1",
		traceId: sha256(`${event.runId}:${event.operationId}:${event.timestamp}:${event.kind}`),
		runIdHash: sha256(event.runId),
		...(event.sessionId === undefined ? {} : { sessionIdHash: sha256(event.sessionId) }),
		operationId: event.operationId,
		timestamp: event.timestamp,
		source: options.source,
		kind: event.kind,
		status: event.status,
		dataHash,
		sanitizedData,
		artifacts,
	};
	if (options.sink === "braintrust") {
		trace.external = {
			sink: "braintrust",
			contentTier: options.contentTier ?? "metadata",
			payloadBytes: Buffer.byteLength(stableStringify(sanitizedData)),
		};
	}
	return trace;
}
