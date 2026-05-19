import { mkdir, writeFile, readFile, readdir } from "fs/promises";
import { isAbsolute, join, normalize } from "path";
import { runShell } from "./shell.js";
import { redactSecrets } from "../orchestration/state-persister.js";
import { getProjectRoot, pathExists, readTextFile } from "./fs.js";
import { validateRunId } from "./run-store.js";

const CHECKPOINTS_DIR = ".omk/checkpoints";
const PROTECTED_CHECKPOINT_PATH_MARKERS = [
  ".env",
  ".pem",
  ".key",
  "id_rsa",
  "id_ed25519",
  "credentials.json",
  "service-account",
  ".p12",
  ".pfx",
  ".keystore",
];

function sanitizeLabel(label: string): string {
  return label.replace(/[^a-zA-Z0-9_-]/g, "_").substring(0, 64);
}

function getCheckpointsBasePath(): string {
  return join(getProjectRoot(), CHECKPOINTS_DIR);
}

function getCheckpointPath(runId: string, checkpointId: string): string {
  return join(getCheckpointsBasePath(), validateRunId(runId), sanitizeLabel(checkpointId));
}

function getRunPath(runId: string): string {
  return join(getProjectRoot(), ".omk", "runs", validateRunId(runId));
}

function sanitizeJsonText(content: string): string {
  try {
    return JSON.stringify(redactSecrets(JSON.parse(content)), null, 2);
  } catch {
    return String(redactSecrets(content));
  }
}

function normalizePatchPath(pathValue: string): string {
  return normalize(pathValue.replace(/^"?[ab]\//, "").replace(/"?$/, ""));
}

function protectedPatchPathReason(pathValue: string): string | null {
  const normalized = normalizePatchPath(pathValue);
  if (!normalized || normalized === "/dev/null") return null;
  if (isAbsolute(normalized) || normalized.startsWith("..")) return `unsafe checkpoint path: ${pathValue}`;
  const lower = normalized.toLowerCase();
  const base = lower.split(/[\\/]/).pop() ?? lower;
  if (PROTECTED_CHECKPOINT_PATH_MARKERS.some((marker) => lower.includes(marker) || base === marker)) {
    return `protected checkpoint path: ${pathValue}`;
  }
  return null;
}

function validateCheckpointPatchPaths(patchContent: string): string | null {
  for (const line of patchContent.split(/\r?\n/)) {
    let candidate: string | null = null;
    if (line.startsWith("diff --git ")) {
      const parts = line.split(/\s+/);
      candidate = parts[2] ?? parts[3] ?? null;
    } else if (line.startsWith("+++ ") || line.startsWith("--- ")) {
      candidate = line.slice(4).trim();
    }
    if (!candidate || candidate === "/dev/null") continue;
    const reason = protectedPatchPathReason(candidate);
    if (reason) return reason;
  }
  return null;
}

export interface SaveCheckpointResult {
  checkpointId: string;
  path: string;
}

export interface CheckpointInfo {
  checkpointId: string;
  runId: string;
  label: string;
  createdAt: string;
}

export interface RestoreCheckpointResult {
  success: boolean;
  restoredFiles: string[];
  message: string;
}

export interface RestoreCheckpointOptions {
  force?: boolean;
}

export async function saveCheckpoint(
  runId: string,
  label: string,
  metadata?: Record<string, unknown>
): Promise<SaveCheckpointResult> {
  const timestamp = new Date().toISOString().replace(/:/g, "-");
  const checkpointId = `${sanitizeLabel(label)}-${timestamp}`;
  const cpPath = getCheckpointPath(runId, checkpointId);

  await mkdir(cpPath, { recursive: true });

  const meta = redactSecrets({
    timestamp: new Date().toISOString(),
    label,
    runId,
    ...(metadata ?? {}),
  });
  await writeFile(join(cpPath, "metadata.json"), JSON.stringify(meta, null, 2), "utf-8");

  const projectRoot = getProjectRoot();
  const gitDiffResult = await runShell("git", ["diff", "HEAD"], { cwd: projectRoot, timeout: 10000 });
  const patchContent = !gitDiffResult.failed ? gitDiffResult.stdout : "";
  await writeFile(join(cpPath, "git-patch.diff"), patchContent, "utf-8");

  const runDir = getRunPath(runId);
  const todosPath = join(runDir, "todos.json");
  if (await pathExists(todosPath)) {
    const todosContent = await readFile(todosPath, "utf-8");
    await writeFile(join(cpPath, "todos.json"), sanitizeJsonText(todosContent), "utf-8");
  }

  const statePath = join(runDir, "state.json");
  if (await pathExists(statePath)) {
    const stateContent = await readFile(statePath, "utf-8");
    await writeFile(join(cpPath, "state.json"), sanitizeJsonText(stateContent), "utf-8");
  }

  return { checkpointId, path: cpPath };
}

export async function listCheckpoints(runId?: string): Promise<CheckpointInfo[]> {
  const basePath = getCheckpointsBasePath();
  if (!(await pathExists(basePath))) return [];

  const results: CheckpointInfo[] = [];

  const runDirs = await readdir(basePath, { withFileTypes: true });
  for (const runDir of runDirs) {
    if (!runDir.isDirectory()) continue;
    const currentRunId = runDir.name;
    if (runId && currentRunId !== runId) continue;

    const runPath = join(basePath, currentRunId);
    const cpDirs = await readdir(runPath, { withFileTypes: true });
    for (const cpDir of cpDirs) {
      if (!cpDir.isDirectory()) continue;
      const checkpointId = cpDir.name;
      const metaPath = join(runPath, checkpointId, "metadata.json");
      if (!(await pathExists(metaPath))) continue;

      try {
        const metaContent = await readFile(metaPath, "utf-8");
        const meta = JSON.parse(metaContent) as { label?: string; timestamp?: string };
        results.push({
          checkpointId,
          runId: currentRunId,
          label: meta.label ?? checkpointId,
          createdAt: meta.timestamp ?? "",
        });
      } catch {
        // skip malformed metadata
      }
    }
  }

  return results.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function restoreCheckpoint(
  checkpointId: string,
  runId: string,
  options: RestoreCheckpointOptions = {}
): Promise<RestoreCheckpointResult> {
  const cpPath = getCheckpointPath(runId, checkpointId);
  const projectRoot = getProjectRoot();
  const restoredFiles: string[] = [];

  if (!(await pathExists(cpPath))) {
    return { success: false, restoredFiles, message: `Checkpoint not found: ${cpPath}` };
  }

  const patchPath = join(cpPath, "git-patch.diff");
  const patchContent = await readTextFile(patchPath, "");
  if (patchContent.trim().length > 0) {
    const unsafePatchPath = validateCheckpointPatchPaths(patchContent);
    if (unsafePatchPath) {
      return {
        success: false,
        restoredFiles,
        message: `Checkpoint restore refused: ${unsafePatchPath}`,
      };
    }

    const dirtyCheck = await runShell("git", ["status", "--porcelain", "--untracked-files=normal"], {
      cwd: projectRoot,
      timeout: 10000,
    });
    if (!options.force && !dirtyCheck.failed && dirtyCheck.stdout.trim().length > 0) {
      return {
        success: false,
        restoredFiles,
        message: "Checkpoint restore refused: dirty worktree. Re-run with force after reviewing local changes.",
      };
    }

    const gitApplyCheck = await runShell("git", ["apply", "--check", patchPath], {
      cwd: projectRoot,
      timeout: 10000,
    });
    if (!gitApplyCheck.failed) {
      const gitApply = await runShell("git", ["apply", patchPath], {
        cwd: projectRoot,
        timeout: 10000,
      });
      if (gitApply.failed) {
        return {
          success: false,
          restoredFiles,
          message: `Git apply failed: ${gitApply.stderr}`,
        };
      }
      restoredFiles.push("git-patch.diff (applied)");
    } else {
      const patchCheck = await runShell("patch", ["-p1", "--dry-run", "-i", patchPath], {
        cwd: projectRoot,
        timeout: 10000,
      });
      if (!patchCheck.failed) {
        const patchApply = await runShell("patch", ["-p1", "-i", patchPath], {
          cwd: projectRoot,
          timeout: 10000,
        });
        if (patchApply.failed) {
          return {
            success: false,
            restoredFiles,
            message: `patch command failed: ${patchApply.stderr}`,
          };
        }
        restoredFiles.push("git-patch.diff (applied via patch)");
      } else {
        return {
          success: false,
          restoredFiles,
          message: `Patch cannot be applied: ${gitApplyCheck.stderr || patchCheck.stderr}`,
        };
      }
    }
  }

  const runDir = getRunPath(runId);
  const todosCpPath = join(cpPath, "todos.json");
  if (await pathExists(todosCpPath)) {
    const todosContent = await readFile(todosCpPath, "utf-8");
    const todosRunPath = join(runDir, "todos.json");
    await mkdir(runDir, { recursive: true });
    await writeFile(todosRunPath, sanitizeJsonText(todosContent), "utf-8");
    restoredFiles.push("todos.json");
  }

  const stateCpPath = join(cpPath, "state.json");
  if (await pathExists(stateCpPath)) {
    const stateContent = await readFile(stateCpPath, "utf-8");
    const stateRunPath = join(runDir, "state.json");
    await mkdir(runDir, { recursive: true });
    await writeFile(stateRunPath, sanitizeJsonText(stateContent), "utf-8");
    restoredFiles.push("state.json");
  }

  return {
    success: true,
    restoredFiles,
    message: `Restored ${restoredFiles.length} items from checkpoint ${checkpointId}`,
  };
}
