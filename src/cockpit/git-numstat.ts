/**
 * Git diff --numstat parser for cockpit modified-files view.
 */

import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

export interface GitNumstatEntry {
  path: string;
  added: number | null;
  deleted: number | null;
}

export async function getGitNumstat(root: string, staged = true): Promise<Map<string, GitNumstatEntry>> {
  const map = new Map<string, GitNumstatEntry>();

  // Unstaged changes
  const unstaged = await runNumstat(root, ["diff", "--numstat"]);
  for (const entry of unstaged) {
    map.set(entry.path, entry);
  }

  // Staged changes
  if (staged) {
    const stagedEntries = await runNumstat(root, ["diff", "--cached", "--numstat"]);
    for (const entry of stagedEntries) {
      const existing = map.get(entry.path);
      if (existing) {
        map.set(entry.path, {
          path: entry.path,
          added: sumMaybe(existing.added, entry.added),
          deleted: sumMaybe(existing.deleted, entry.deleted),
        });
      } else {
        map.set(entry.path, entry);
      }
    }
  }

  // Untracked files (no numstat available)
  const untracked = await runUntracked(root);
  for (const path of untracked) {
    if (!map.has(path)) {
      map.set(path, { path, added: null, deleted: null });
    }
  }

  return map;
}

async function runNumstat(root: string, args: string[]): Promise<GitNumstatEntry[]> {
  try {
    const { stdout } = await execFileAsync("git", args, {
      cwd: root,
      timeout: 5000,
      encoding: "utf-8",
      maxBuffer: 1024 * 1024,
    });
    return parseNumstat(String(stdout));
  } catch {
    return [];
  }
}

function parseNumstat(stdout: string): GitNumstatEntry[] {
  const entries: GitNumstatEntry[] = [];
  for (const line of stdout.split(/\r?\n/)) {
    if (!line.trim()) continue;
    const [addedRaw, deletedRaw, ...pathParts] = line.split("\t");
    const path = pathParts.join("\t");
    if (!path) continue;
    entries.push({
      path,
      added: addedRaw === "-" ? null : Number(addedRaw),
      deleted: deletedRaw === "-" ? null : Number(deletedRaw),
    });
  }
  return entries;
}

async function runUntracked(root: string): Promise<string[]> {
  try {
    const { stdout } = await execFileAsync(
      "git",
      ["ls-files", "--others", "--exclude-standard"],
      { cwd: root, timeout: 5000, encoding: "utf-8", maxBuffer: 1024 * 1024 }
    );
    return String(stdout)
      .split(/\r?\n/)
      .map((s) => s.trim())
      .filter(Boolean);
  } catch {
    return [];
  }
}

function sumMaybe(a: number | null, b: number | null): number | null {
  if (a == null && b == null) return null;
  return (a ?? 0) + (b ?? 0);
}

export async function getGitBranch(root: string): Promise<string | undefined> {
  try {
    const { stdout } = await execFileAsync(
      "git",
      ["branch", "--show-current"],
      { cwd: root, timeout: 3000, encoding: "utf-8" }
    );
    const branch = String(stdout).trim();
    return branch || undefined;
  } catch {
    return undefined;
  }
}
