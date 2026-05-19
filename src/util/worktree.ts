import { isAbsolute, join, relative, resolve } from "path";
import { mkdir, readdir, access, lstat, realpath, rm } from "fs/promises";
import { runShell } from "./shell.js";
import { getProjectRoot } from "./fs.js";

const WORKTREE_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/;

export function validateWorktreeId(value: string, label = "worktree id"): string {
  if (!WORKTREE_ID_PATTERN.test(value) || value === "." || value === "..") {
    throw new Error(`Invalid ${label}`);
  }
  return value;
}

export function getWorktreesRoot(): string {
  return resolve(getProjectRoot(), ".omk", "worktrees");
}

function isPathContained(parent: string, child: string): boolean {
  const rel = relative(parent, child);
  return rel.length > 0 && !rel.startsWith("..") && !isAbsolute(rel);
}

async function assertNoSymlinkInExistingPath(root: string, target: string): Promise<void> {
  const rel = relative(root, target);
  const parts = rel.split(/[\\/]+/).filter(Boolean);
  let current = root;

  for (const part of parts) {
    current = join(current, part);
    try {
      const entry = await lstat(current);
      if (entry.isSymbolicLink()) {
        throw new Error(`Refusing symlink in worktree path: ${current}`);
      }
    } catch (error) {
      if (error instanceof Error && "code" in error && error.code === "ENOENT") return;
      throw error;
    }
  }
}

export async function resolveSafeWorktreePath(candidatePath: string): Promise<string> {
  const root = getWorktreesRoot();
  const resolved = resolve(candidatePath);

  if (!isPathContained(root, resolved)) {
    throw new Error(`Worktree path escapes ${root}`);
  }

  try {
    const rootEntry = await lstat(root);
    if (rootEntry.isSymbolicLink()) {
      throw new Error(`Refusing symlink worktrees root: ${root}`);
    }
    const [realRoot, realTarget] = await Promise.all([
      realpath(root),
      realpath(resolved).catch((error: unknown) => {
        if (error instanceof Error && "code" in error && error.code === "ENOENT") return resolved;
        throw error;
      }),
    ]);
    if (realTarget !== resolved && !isPathContained(realRoot, realTarget)) {
      throw new Error(`Worktree path resolves outside ${root}`);
    }
  } catch (error) {
    if (!(error instanceof Error && "code" in error && error.code === "ENOENT")) throw error;
  }

  await assertNoSymlinkInExistingPath(root, resolved);
  return resolved;
}

function buildWorktreePath(runId: string, leafId: string): string {
  return join(getWorktreesRoot(), validateWorktreeId(runId, "runId"), validateWorktreeId(leafId, "nodeId"));
}

export async function createWorktree(runId: string, nodeId: string): Promise<string> {
  const worktreePath = await resolveSafeWorktreePath(buildWorktreePath(runId, nodeId));
  await mkdir(worktreePath, { recursive: true });

  const branchName = `work/${runId}/${nodeId}`;
  const result = await runShell("git", ["worktree", "add", worktreePath, "-b", branchName], {
    cwd: getProjectRoot(),
    timeout: 15000,
  });

  if (result.failed) {
    // If branch already exists, try using the existing branch
    const retry = await runShell("git", ["worktree", "add", worktreePath, branchName], {
      cwd: getProjectRoot(),
      timeout: 15000,
    });
    if (retry.failed) {
      throw new Error(`Failed to create worktree at ${worktreePath}: ${retry.stderr}`);
    }
  }

  return worktreePath;
}

export async function removeWorktreeDirectory(path: string): Promise<void> {
  const worktreePath = await resolveSafeWorktreePath(path);
  await rm(worktreePath, { recursive: true, force: true });
}

export async function removeWorktree(path: string): Promise<void> {
  const worktreePath = await resolveSafeWorktreePath(path);
  const result = await runShell("git", ["worktree", "remove", "--force", worktreePath], { timeout: 15000 });
  if (result.failed) {
    throw new Error(`Failed to remove worktree at ${worktreePath}: ${result.stderr}`);
  }
}

export async function listWorktrees(runId: string): Promise<string[]> {
  const worktreesDir = await resolveSafeWorktreePath(join(getWorktreesRoot(), validateWorktreeId(runId, "runId")));

  try {
    await access(worktreesDir);
  } catch {
    return [];
  }

  const entries = await readdir(worktreesDir, { withFileTypes: true });
  return entries
    .filter((e) => e.isDirectory() && WORKTREE_ID_PATTERN.test(e.name))
    .map((e) => join(worktreesDir, e.name));
}

export async function createAttemptWorktree(runId: string, nodeId: string, attempt: number): Promise<string> {
  validateWorktreeId(runId, "runId");
  validateWorktreeId(nodeId, "nodeId");
  if (!Number.isInteger(attempt) || attempt < 0 || attempt > 999) {
    throw new Error(`Invalid attempt`);
  }
  const attemptId = attempt.toString().padStart(3, "0");
  const leafId = `attempt-${nodeId}-${attemptId}`;
  const worktreePath = await resolveSafeWorktreePath(buildWorktreePath(runId, leafId));
  await mkdir(worktreePath, { recursive: true });

  const branchName = `work/${runId}/${nodeId}/${attemptId}`;
  const result = await runShell("git", ["worktree", "add", worktreePath, "-b", branchName], {
    cwd: getProjectRoot(),
    timeout: 15000,
  });

  if (result.failed) {
    const retry = await runShell("git", ["worktree", "add", worktreePath, branchName], {
      cwd: getProjectRoot(),
      timeout: 15000,
    });
    if (retry.failed) {
      throw new Error(`Failed to create worktree at ${worktreePath}: ${retry.stderr}`);
    }
  }

  return worktreePath;
}

export async function removeAttemptWorktree(runId: string, nodeId: string, attempt: number): Promise<void> {
  validateWorktreeId(runId, "runId");
  validateWorktreeId(nodeId, "nodeId");
  if (!Number.isInteger(attempt) || attempt < 0 || attempt > 999) {
    throw new Error(`Invalid attempt`);
  }
  const attemptId = attempt.toString().padStart(3, "0");
  const worktreePath = join(getWorktreesRoot(), runId, `attempt-${nodeId}-${attemptId}`);
  await removeWorktree(worktreePath);
}

export async function listAttemptWorktrees(runId: string, nodeId: string): Promise<string[]> {
  validateWorktreeId(nodeId, "nodeId");
  const worktreesDir = await resolveSafeWorktreePath(join(getWorktreesRoot(), validateWorktreeId(runId, "runId")));

  try {
    await access(worktreesDir);
  } catch {
    return [];
  }

  const prefix = `attempt-${nodeId}-`;
  const entries = await readdir(worktreesDir, { withFileTypes: true });
  return entries
    .filter((e) => e.isDirectory() && e.name.startsWith(prefix) && WORKTREE_ID_PATTERN.test(e.name))
    .map((e) => join(worktreesDir, e.name));
}
