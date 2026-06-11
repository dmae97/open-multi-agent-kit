import { createHash } from "node:crypto";
import { lstat, mkdir, readFile, readlink, rm, writeFile } from "node:fs/promises";
import { basename, join } from "node:path";
import { redactSecrets } from "../orchestration/state-persister.js";
import { getRunPath, validateRunId } from "../util/run-store.js";

export type RecoveryFailureKind =
  | "rate_limit"
  | "quota"
  | "timeout"
  | "provider_crash"
  | "provider_error"
  | "abort"
  | "unknown";

export interface RecoveryCaptureInput {
  readonly runId: string;
  readonly provider: string;
  readonly nodeId: string;
  readonly attemptId?: string;
  readonly failureKind: RecoveryFailureKind;
  readonly exitCode?: number;
  readonly cwd?: string;
  readonly command?: readonly string[];
  readonly stdout?: string;
  readonly stderr?: string;
  readonly sessionPaths?: readonly string[];
  readonly metadata?: Record<string, unknown>;
}

export interface RecoveryArtifactRef {
  readonly schemaVersion: "omk.recovery-artifact.v1";
  readonly runId: string;
  readonly provider: string;
  readonly nodeId: string;
  readonly attemptId?: string;
  readonly failureKind: RecoveryFailureKind;
  readonly dir: string;
  readonly manifestPath: string;
  readonly sessionHandlePath?: string;
}

export interface RecoveryArtifactStore {
  captureFailure(input: RecoveryCaptureInput): Promise<RecoveryArtifactRef>;
  cleanup(input: { runId: string; provider?: string; nodeId?: string }): Promise<void>;
}

export interface RecoveryArtifactStoreOptions {
  readonly root?: string;
  readonly maxLogBytes?: number;
}

const DEFAULT_MAX_LOG_BYTES = 128 * 1024;
const MAX_SEGMENT_LENGTH = 80;

function safeSegment(value: string, fallback: string): string {
  const sanitized = value
    .replace(/[^A-Za-z0-9._-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, MAX_SEGMENT_LENGTH);
  return sanitized && sanitized !== "." && sanitized !== ".." ? sanitized : fallback;
}

function redactText(value: string | undefined, maxBytes: number): string {
  if (!value) return "";
  const bounded = Buffer.byteLength(value, "utf8") > maxBytes
    ? Buffer.from(value, "utf8").subarray(-maxBytes).toString("utf8")
    : value;
  const redacted = redactSecrets(bounded);
  return typeof redacted === "string" ? redacted : JSON.stringify(redacted);
}

function sha256Text(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

async function inspectSessionPath(path: string): Promise<Record<string, unknown>> {
  const base = { path, name: basename(path) };
  try {
    const stat = await lstat(path);
    if (stat.isSymbolicLink()) {
      return { ...base, kind: "symlink", target: await readlink(path).catch(() => "unreadable"), copied: false };
    }
    if (stat.isFile()) {
      const bytes = await readFile(path);
      return { ...base, kind: "file", size: bytes.length, sha256: createHash("sha256").update(bytes).digest("hex"), copied: false };
    }
    if (stat.isDirectory()) {
      return { ...base, kind: "directory", copied: false };
    }
    return { ...base, kind: "other", copied: false };
  } catch (error) {
    return { ...base, kind: "missing", error: error instanceof Error ? error.message : String(error), copied: false };
  }
}

export function createRecoveryArtifactStore(options: RecoveryArtifactStoreOptions = {}): RecoveryArtifactStore {
  const maxLogBytes = options.maxLogBytes ?? DEFAULT_MAX_LOG_BYTES;

  function runDir(runId: string): string {
    return getRunPath(validateRunId(runId), undefined, options.root);
  }

  function recoveryDir(input: { runId: string; provider?: string; nodeId?: string }): string {
    const base = join(runDir(input.runId), "recovery");
    const provider = input.provider ? safeSegment(input.provider, "provider") : undefined;
    const nodeId = input.nodeId ? safeSegment(input.nodeId, "node") : undefined;
    return provider ? nodeId ? join(base, provider, nodeId) : join(base, provider) : base;
  }

  return {
    async captureFailure(input): Promise<RecoveryArtifactRef> {
      const runId = validateRunId(input.runId);
      const provider = safeSegment(input.provider, "provider");
      const nodeId = safeSegment(input.nodeId, "node");
      const dir = recoveryDir({ runId, provider, nodeId });
      await mkdir(dir, { recursive: true });

      const stdout = redactText(input.stdout, maxLogBytes);
      const stderr = redactText(input.stderr, maxLogBytes);
      const stdoutPath = join(dir, "stdout.log");
      const stderrPath = join(dir, "stderr.redacted.log");
      await writeFile(stdoutPath, stdout, "utf8");
      await writeFile(stderrPath, stderr, "utf8");

      const sessionHandlePath = join(dir, "session-handle.json");
      const sessionHandles = await Promise.all((input.sessionPaths ?? []).map(inspectSessionPath));
      await writeFile(sessionHandlePath, `${JSON.stringify({ schemaVersion: "omk.recovery-session.v1", sessionPaths: sessionHandles }, null, 2)}\n`, "utf8");

      const manifestPath = join(dir, "manifest.json");
      const manifest = {
        schemaVersion: "omk.recovery-artifact.v1",
        runId,
        provider,
        nodeId,
        ...(input.attemptId ? { attemptId: safeSegment(input.attemptId, "attempt") } : {}),
        failureKind: input.failureKind,
        ...(input.exitCode !== undefined ? { exitCode: input.exitCode } : {}),
        capturedAt: new Date().toISOString(),
        ...(input.cwd ? { cwd: input.cwd } : {}),
        command: input.command ? input.command.map((part) => redactText(part, maxLogBytes)) : [],
        logs: {
          stdout: { path: "stdout.log", sha256: sha256Text(stdout), bytes: Buffer.byteLength(stdout, "utf8") },
          stderr: { path: "stderr.redacted.log", sha256: sha256Text(stderr), bytes: Buffer.byteLength(stderr, "utf8"), redacted: true },
        },
        sessionHandle: { path: "session-handle.json", count: sessionHandles.length },
        metadata: redactSecrets(input.metadata ?? {}),
      };
      await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");

      return {
        schemaVersion: "omk.recovery-artifact.v1",
        runId,
        provider,
        nodeId,
        ...(input.attemptId ? { attemptId: safeSegment(input.attemptId, "attempt") } : {}),
        failureKind: input.failureKind,
        dir,
        manifestPath,
        sessionHandlePath,
      };
    },

    async cleanup(input): Promise<void> {
      await rm(recoveryDir(input), { recursive: true, force: true });
    },
  };
}
