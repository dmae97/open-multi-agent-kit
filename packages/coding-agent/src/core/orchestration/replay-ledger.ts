import { createHash } from "node:crypto";
import {
	chmodSync,
	closeSync,
	existsSync,
	fsyncSync,
	lstatSync,
	mkdirSync,
	openSync,
	readFileSync,
	realpathSync,
	renameSync,
	rmSync,
	statSync,
	writeSync,
} from "node:fs";
import path, { dirname } from "node:path";

export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | readonly JsonValue[] | { readonly [key: string]: JsonValue };

export interface ReplayLedgerEventInput {
	sequence: number;
	type: string;
	reducerVersion: number;
	payload: JsonValue;
	beforeStateHash: string;
	afterStateHash: string;
	prevEventHash: string | null;
}

export interface ReplayLedgerEvent extends ReplayLedgerEventInput {
	eventHash: string;
}

export interface ReplayLedgerVerificationResult {
	ok: boolean;
	error?: string;
}

export interface ArtifactReference {
	path: string;
	repoRoot: string;
	sha256: string;
}

export interface ResolvedArtifactReference {
	realPath: string;
	isFile: boolean;
	sha256: string;
}

export type ArtifactReferenceResolver = (path: string) => ResolvedArtifactReference | undefined;

export function stableStringify(value: JsonValue): string {
	if (value === null) {
		return "null";
	}
	if (typeof value === "string") {
		return JSON.stringify(value);
	}
	if (typeof value === "number") {
		if (!Number.isFinite(value)) {
			throw new Error("Cannot stableStringify non-finite number");
		}
		return JSON.stringify(value);
	}
	if (typeof value === "boolean") {
		return value ? "true" : "false";
	}
	if (Array.isArray(value)) {
		return `[${value.map((item) => stableStringify(item)).join(",")}]`;
	}
	if (!isPlainObject(value)) {
		throw new Error("Cannot stableStringify unsupported object");
	}

	const record = value as { readonly [key: string]: JsonValue | undefined };
	const parts: string[] = [];
	for (const key of Object.keys(record).sort()) {
		const entryValue = record[key];
		if (entryValue === undefined) {
			throw new Error(`Cannot stableStringify undefined value at key ${key}`);
		}
		parts.push(`${JSON.stringify(key)}:${stableStringify(entryValue)}`);
	}
	return `{${parts.join(",")}}`;
}

export function sha256Hex(input: string): string {
	return createHash("sha256").update(input).digest("hex");
}

export function computeEventHash(event: ReplayLedgerEventInput): string {
	return sha256Hex(stableStringify(eventToJson(event)));
}

export function verifyReplayLedger(events: readonly ReplayLedgerEvent[]): ReplayLedgerVerificationResult {
	let previous: ReplayLedgerEvent | undefined;
	for (let index = 0; index < events.length; index += 1) {
		const current = events[index];
		if (current.sequence !== index + 1) {
			return { ok: false, error: `sequence mismatch at index ${index}: expected ${index + 1}` };
		}

		const expectedHash = computeEventHash(stripEventHash(current));
		if (current.eventHash !== expectedHash) {
			return { ok: false, error: `eventHash mismatch at sequence ${current.sequence}` };
		}

		const expectedPrevHash = previous?.eventHash ?? null;
		if (current.prevEventHash !== expectedPrevHash) {
			return { ok: false, error: `prevEventHash mismatch at sequence ${current.sequence}` };
		}

		if (previous !== undefined && current.beforeStateHash !== previous.afterStateHash) {
			return { ok: false, error: `beforeStateHash mismatch at sequence ${current.sequence}` };
		}

		previous = current;
	}
	return { ok: true };
}

export function verifyArtifactReference(
	ref: ArtifactReference,
	resolver: ArtifactReferenceResolver,
): ReplayLedgerVerificationResult {
	const resolved = resolver(ref.path);
	if (resolved === undefined) {
		return { ok: false, error: `artifact not found: ${ref.path}` };
	}
	if (!resolved.isFile) {
		return { ok: false, error: `artifact is not a file: ${ref.path}` };
	}
	if (!pathIsInside(ref.repoRoot, resolved.realPath)) {
		return { ok: false, error: `artifact resolved outside repo root: ${resolved.realPath}` };
	}
	if (resolved.sha256 !== ref.sha256) {
		return { ok: false, error: `artifact sha256 mismatch for ${ref.path}` };
	}
	return { ok: true };
}

// Canonicalize a base directory through realpath so symlinked roots (for example
// macOS /tmp -> /private/tmp) compare consistently against realpath'd artifacts.
// ── Persistence ────────────────────────────────────────────────────────────

const LOCK_STALE_MS = 30000;

export interface ReplayLedgerPersistOptions {
	ledgerPath: string;
	lockTimeoutMs?: number;
	maxLedgerBytes?: number;
}

export interface ReplayLedgerWriteResult {
	ok: boolean;
	path?: string;
	event?: ReplayLedgerEvent;
	error?: string;
}

export interface ReplayLedgerQuarantineEntry {
	lineNumber: number;
	reason: string;
}

export interface ReplayLedgerFileVerificationResult {
	ok: boolean;
	events: ReplayLedgerEvent[];
	errors: string[];
	quarantinedLines: ReplayLedgerQuarantineEntry[];
}

/**
 * Acquires an exclusive lock for the ledger file using O_CREAT|O_EXCL.
 * Stale locks (older than LOCK_STALE_MS) are removed before retry.
 */
function acquireLock(lockPath: string, timeoutMs: number): number {
	const start = Date.now();
	while (true) {
		try {
			return openSync(lockPath, "wx", 0o600);
		} catch (error) {
			if (existsSync(lockPath)) {
				try {
					const stats = statSync(lockPath);
					if (Date.now() - stats.mtimeMs > LOCK_STALE_MS) rmSync(lockPath, { force: true });
				} catch {
					/* stale check best-effort */
				}
			}
			if (Date.now() - start >= timeoutMs) {
				throw error;
			}
		}
	}
}

/**
 * Appends a JSON line to the ledger file and fsyncs both the file and its
 * parent directory so the write is durable on crash.
 *
 * Platform fallback: some filesystems (e.g. tmpfs, NFS) do not support
 * directory fsync. In those cases the directory fsync is best-effort; the
 * file fsync remains mandatory.
 */
function fsyncDirectory(dirPath: string): void {
	try {
		const dirFd = openSync(dirPath, "r");
		try {
			fsyncSync(dirFd);
		} finally {
			closeSync(dirFd);
		}
	} catch {
		// Directory fsync is not supported on all platforms/filesystems.
		// File fsync remains the mandatory durability guarantee.
	}
}

function enforcePrivateFilePermissions(filePath: string): void {
	try {
		if (existsSync(filePath) && (statSync(filePath).mode & 0o777) !== 0o600) {
			chmodSync(filePath, 0o600);
		}
	} catch {
		/* best-effort permission enforcement */
	}
}

function appendJsonLineWithFsync(ledgerPath: string, line: string): void {
	const fd = openSync(ledgerPath, "a", 0o600);
	try {
		enforcePrivateFilePermissions(ledgerPath);
		writeSync(fd, `${line}\n`, undefined, "utf-8");
		fsyncSync(fd);
	} finally {
		closeSync(fd);
	}
	fsyncDirectory(dirname(ledgerPath));
}

/**
 * Persists a replay ledger event to disk with durable write (fsync),
 * directory permissions 0o700, and file permissions 0o600. Uses advisory
 * locking to serialize concurrent appends.
 */
export function recordReplayLedgerEvent(
	event: ReplayLedgerEvent,
	options: ReplayLedgerPersistOptions,
): ReplayLedgerWriteResult {
	const { ledgerPath } = options;
	const lockPath = `${ledgerPath}.lock`;
	let lockFd: number | undefined;
	try {
		// Create the ledger directory with owner-only permissions.
		// mode is applied to the deepest directory; recursive parents use umask-adjusted defaults.
		mkdirSync(dirname(ledgerPath), { recursive: true, mode: 0o700 });

		// On platforms where mkdirSync with mode over umask can produce
		// group/world-readable directories, re-apply the mode explicitly.
		try {
			const dirStats = statSync(dirname(ledgerPath));
			if ((dirStats.mode & 0o777) !== 0o700) {
				chmodSync(dirname(ledgerPath), 0o700);
			}
		} catch {
			/* best-effort permission enforcement */
		}

		lockFd = acquireLock(lockPath, options.lockTimeoutMs ?? 1000);

		// Rotate if the ledger exceeds the size threshold.
		if (Number.isFinite(options.maxLedgerBytes) && (options.maxLedgerBytes ?? 0) > 0 && existsSync(ledgerPath)) {
			enforcePrivateFilePermissions(ledgerPath);
			const stats = statSync(ledgerPath);
			if (stats.size >= Math.floor(options.maxLedgerBytes!)) {
				// Simple rotation: rename current to .rotated, start fresh.
				// The new ledger will start from genesis since we don't carry
				// forward the previous hash chain across rotations for the
				// orchestration replay ledger (unlike harness-control which uses anchors).
				const rotatedPath = `${ledgerPath}.${new Date().toISOString().replace(/[:.]/g, "-")}.rotated`;
				renameSync(ledgerPath, rotatedPath);
				enforcePrivateFilePermissions(rotatedPath);
				fsyncDirectory(dirname(ledgerPath));
			}
		}

		appendJsonLineWithFsync(ledgerPath, JSON.stringify(event));
		return { ok: true, path: ledgerPath, event };
	} catch (error) {
		return {
			ok: false,
			path: ledgerPath,
			error: error instanceof Error ? error.message : String(error),
		};
	} finally {
		if (lockFd !== undefined) {
			try {
				closeSync(lockFd);
			} catch {
				/* fd may already be closed */
			}
			rmSync(lockPath, { force: true });
		}
	}
}

/**
 * Reads a replay ledger file and verifies every record against:
 * - Valid JSON (malformed lines are quarantined)
 * - Required fields present and well-formed (truncated records quarantined)
 * - Full hash-chain integrity (tampered records quarantined)
 *
 * Quarantined records are skipped so replay consumers only receive the
 * deterministic verified prefix/chain. Any quarantine still makes ok=false.
 */
export function verifyReplayLedgerFromFile(ledgerPath: string): ReplayLedgerFileVerificationResult {
	const errors: string[] = [];
	const events: ReplayLedgerEvent[] = [];
	const quarantinedLines: ReplayLedgerQuarantineEntry[] = [];

	if (!existsSync(ledgerPath)) return { ok: true, events, errors, quarantinedLines };

	const content = readFileSync(ledgerPath, "utf-8");
	const lines = content
		.split("\n")
		.map((line) => line.trim())
		.filter((line) => line.length > 0);

	function quarantine(lineNumber: number, reason: string): void {
		quarantinedLines.push({ lineNumber, reason });
		errors.push(`line ${lineNumber}: quarantined — ${reason}`);
	}

	for (let index = 0; index < lines.length; index++) {
		const lineNumber = index + 1;
		let parsed: Record<string, unknown>;
		try {
			parsed = JSON.parse(lines[index]!);
		} catch (jsonError) {
			quarantine(
				lineNumber,
				`malformed JSON — ${jsonError instanceof Error ? jsonError.message : String(jsonError)}`,
			);
			continue;
		}

		const requiredFields = [
			"sequence",
			"type",
			"reducerVersion",
			"payload",
			"beforeStateHash",
			"afterStateHash",
			"prevEventHash",
			"eventHash",
		] as const;
		const missingFields = requiredFields.filter((field) => !(field in parsed));
		if (missingFields.length > 0) {
			quarantine(lineNumber, `truncated or incomplete record — missing fields: ${missingFields.join(", ")}`);
			continue;
		}

		if (typeof parsed.sequence !== "number" || !Number.isInteger(parsed.sequence) || parsed.sequence < 1) {
			quarantine(lineNumber, "invalid sequence");
			continue;
		}
		if (typeof parsed.eventHash !== "string" || !/^[a-f0-9]{64}$/.test(parsed.eventHash)) {
			quarantine(lineNumber, "invalid eventHash");
			continue;
		}
		if (typeof parsed.prevEventHash !== "string" && parsed.prevEventHash !== null) {
			quarantine(lineNumber, "invalid prevEventHash");
			continue;
		}
		if (typeof parsed.beforeStateHash !== "string") {
			quarantine(lineNumber, "invalid beforeStateHash");
			continue;
		}
		if (typeof parsed.afterStateHash !== "string") {
			quarantine(lineNumber, "invalid afterStateHash");
			continue;
		}
		if (typeof parsed.type !== "string") {
			quarantine(lineNumber, "invalid type");
			continue;
		}
		if (typeof parsed.reducerVersion !== "number" || !Number.isInteger(parsed.reducerVersion)) {
			quarantine(lineNumber, "invalid reducerVersion");
			continue;
		}

		const event = parsed as unknown as ReplayLedgerEvent;
		const expectedSequence = events.length + 1;
		if (event.sequence !== expectedSequence) {
			quarantine(lineNumber, `sequence mismatch: expected ${expectedSequence}, got ${event.sequence}`);
			continue;
		}
		const expectedHash = computeEventHash(stripEventHash(event));
		if (event.eventHash !== expectedHash) {
			quarantine(lineNumber, `eventHash mismatch at sequence ${event.sequence}`);
			continue;
		}
		const previous = events.at(-1);
		const expectedPrevHash = previous?.eventHash ?? null;
		if (event.prevEventHash !== expectedPrevHash) {
			quarantine(lineNumber, `prevEventHash mismatch at sequence ${event.sequence}`);
			continue;
		}
		if (previous !== undefined && event.beforeStateHash !== previous.afterStateHash) {
			quarantine(lineNumber, `beforeStateHash mismatch at sequence ${event.sequence}`);
			continue;
		}

		events.push(event);
	}

	return { ok: errors.length === 0, events, errors, quarantinedLines };
}

export function canonicalizeBaseDir(baseDir: string): string {
	try {
		return realpathSync(baseDir);
	} catch {
		return path.resolve(baseDir);
	}
}

// Filesystem-backed resolver that follows symlinks via realpath and uses lstat to
// detect existence without following. Symlink escapes are caught downstream by
// verifyArtifactReference's realpath containment check.
export function createFsArtifactResolver(baseDir: string): ArtifactReferenceResolver {
	return (artifactPath) => {
		const resolved = path.resolve(baseDir, artifactPath);
		try {
			lstatSync(resolved);
		} catch {
			return undefined;
		}
		let realPath: string;
		try {
			realPath = realpathSync(resolved);
		} catch {
			return undefined;
		}
		let isFile = false;
		try {
			isFile = statSync(realPath).isFile();
		} catch {
			return undefined;
		}
		return { realPath, isFile, sha256: isFile ? sha256File(realPath) : "" };
	};
}

function sha256File(filePath: string): string {
	return createHash("sha256").update(readFileSync(filePath)).digest("hex");
}

function isPlainObject(value: object): boolean {
	const prototype = Object.getPrototypeOf(value);
	return prototype === Object.prototype || prototype === null;
}

function stripEventHash(event: ReplayLedgerEvent): ReplayLedgerEventInput {
	return {
		sequence: event.sequence,
		type: event.type,
		reducerVersion: event.reducerVersion,
		payload: event.payload,
		beforeStateHash: event.beforeStateHash,
		afterStateHash: event.afterStateHash,
		prevEventHash: event.prevEventHash,
	};
}

function eventToJson(event: ReplayLedgerEventInput): { readonly [key: string]: JsonValue } {
	return {
		sequence: event.sequence,
		type: event.type,
		reducerVersion: event.reducerVersion,
		payload: event.payload,
		beforeStateHash: event.beforeStateHash,
		afterStateHash: event.afterStateHash,
		prevEventHash: event.prevEventHash,
	};
}

function normalizePath(value: string): string {
	return path.resolve(value).replace(/\\/g, "/").replace(/\/$/, "");
}

function pathIsInside(root: string, candidate: string): boolean {
	const normalizedRoot = normalizePath(root);
	const normalizedCandidate = normalizePath(candidate);
	return normalizedCandidate === normalizedRoot || normalizedCandidate.startsWith(`${normalizedRoot}/`);
}
