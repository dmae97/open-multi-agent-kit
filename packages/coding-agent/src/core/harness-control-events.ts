import { randomUUID } from "node:crypto";
import { appendFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";

export type HarnessControlEventStatus = "started" | "completed" | "failed" | "blocked";

export type HarnessControlEventKind =
	| "compaction.summary.generated"
	| "extension.migration.plan"
	| "extension.migration.apply"
	| "interactive.model_thinking.commit"
	| "interactive.theme.apply";

export type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };
export type JsonObject = { [key: string]: JsonValue };

export interface HarnessControlEvent {
	schemaVersion: "omk.harness-control.event.v1";
	id: string;
	timestamp: string;
	kind: HarnessControlEventKind;
	status: HarnessControlEventStatus;
	cwd: string;
	data: JsonObject;
}

export interface HarnessControlEventWriteResult {
	ok: boolean;
	path?: string;
	event?: HarnessControlEvent;
	error?: string;
}

export interface HarnessControlEventOptions {
	cwd?: string;
	logPath?: string;
	now?: Date;
	id?: string;
}

const MAX_EVENT_DEPTH = 6;
const MAX_EVENT_OBJECT_KEYS = 80;
const MAX_EVENT_ARRAY_ITEMS = 80;
const MAX_EVENT_STRING_LENGTH = 2000;
const REDACTED = "[redacted]";

function isSensitiveKey(key: string): boolean {
	return /(?:secret|token|api[_-]?key|authorization|password|credential|private[_-]?key)/i.test(key);
}

function truncateString(value: string): string {
	if (value.length <= MAX_EVENT_STRING_LENGTH) return value;
	return `${value.slice(0, MAX_EVENT_STRING_LENGTH)}…[truncated]`;
}

function sanitizeValue(value: unknown, depth: number, seen: WeakSet<object>): JsonValue {
	if (value === null) return null;
	if (typeof value === "string") return truncateString(value);
	if (typeof value === "number") return Number.isFinite(value) ? value : String(value);
	if (typeof value === "boolean") return value;
	if (typeof value === "bigint") return value.toString();
	if (typeof value === "undefined" || typeof value === "function" || typeof value === "symbol") return String(value);
	if (depth >= MAX_EVENT_DEPTH) return "[max-depth]";

	if (Array.isArray(value)) {
		return value.slice(0, MAX_EVENT_ARRAY_ITEMS).map((entry) => sanitizeValue(entry, depth + 1, seen));
	}

	if (value instanceof Date) return value.toISOString();
	if (value instanceof Error) {
		return {
			name: value.name,
			message: truncateString(value.message),
		};
	}

	if (typeof value === "object") {
		if (seen.has(value)) return "[circular]";
		seen.add(value);
		const result: JsonObject = {};
		for (const [key, entry] of Object.entries(value).slice(0, MAX_EVENT_OBJECT_KEYS)) {
			result[key] = isSensitiveKey(key) ? REDACTED : sanitizeValue(entry, depth + 1, seen);
		}
		seen.delete(value);
		return result;
	}

	return String(value);
}

export function sanitizeHarnessControlEventData(data: unknown): JsonObject {
	const sanitized = sanitizeValue(data ?? {}, 0, new WeakSet<object>());
	return typeof sanitized === "object" && sanitized !== null && !Array.isArray(sanitized)
		? sanitized
		: { value: sanitized };
}

export function resolveHarnessControlEventLogPath(options: HarnessControlEventOptions = {}): string | undefined {
	if (process.env.OMK_HARNESS_CONTROL_EVENTS === "0") return undefined;
	if (options.logPath) return options.logPath;
	if (process.env.OMK_HARNESS_CONTROL_EVENT_LOG) return process.env.OMK_HARNESS_CONTROL_EVENT_LOG;
	return join(options.cwd ?? process.cwd(), ".omk", "runs", "harness-control", "events.jsonl");
}

export function createHarnessControlEvent(
	kind: HarnessControlEventKind,
	status: HarnessControlEventStatus,
	data: unknown = {},
	options: HarnessControlEventOptions = {},
): HarnessControlEvent {
	return {
		schemaVersion: "omk.harness-control.event.v1",
		id: options.id ?? randomUUID(),
		timestamp: (options.now ?? new Date()).toISOString(),
		kind,
		status,
		cwd: options.cwd ?? process.cwd(),
		data: sanitizeHarnessControlEventData(data),
	};
}

export function recordHarnessControlEvent(
	kind: HarnessControlEventKind,
	status: HarnessControlEventStatus,
	data: unknown = {},
	options: HarnessControlEventOptions = {},
): HarnessControlEventWriteResult {
	const logPath = resolveHarnessControlEventLogPath(options);
	if (!logPath) return { ok: false, error: "harness control event logging disabled" };
	const event = createHarnessControlEvent(kind, status, data, options);
	try {
		mkdirSync(dirname(logPath), { recursive: true });
		appendFileSync(logPath, `${JSON.stringify(event)}\n`, "utf-8");
		return { ok: true, path: logPath, event };
	} catch (error) {
		return { ok: false, path: logPath, event, error: error instanceof Error ? error.message : String(error) };
	}
}
