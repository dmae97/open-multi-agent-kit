import { mkdir, readFile, writeFile } from "fs/promises";
import { dirname, join } from "path";
import { getRunPath } from "../util/run-store.js";

export interface SentinelEvidence {
  kind: string;
  target: string;
  passed: boolean;
  actual?: string;
  error?: string;
}

export interface CompletionSentinel {
  status: string;
  completedBy: string;
  evidence: SentinelEvidence[];
  timestamp: string;
  runId?: string;
  goalId?: string;
}

export async function readCompletionSentinel(options: {
  root: string;
  runId?: string;
  goalId?: string;
}): Promise<CompletionSentinel | null> {
  const paths: string[] = [];
  if (options.runId) {
    paths.push(getRunPath(options.runId, "completion-sentinel.json", options.root));
  }
  if (options.goalId) {
    paths.push(join(options.root, ".omk", "goals", options.goalId, "completion-sentinel.json"));
  }
  for (const p of paths) {
    try {
      const content = await readFile(p, "utf-8");
      const parsed = JSON.parse(content) as unknown;
      if (parsed && typeof parsed === "object") {
        return parsed as CompletionSentinel;
      }
    } catch {
      // ignore missing or unreadable files
    }
  }
  return null;
}

export function hasCompletedEvidence(sentinel: CompletionSentinel | null): boolean {
  if (!sentinel) return false;
  if (sentinel.status !== "completed") return false;
  if (!sentinel.evidence || sentinel.evidence.length === 0) return false;
  return sentinel.evidence.every((e) => e.passed === true);
}

export async function writeCompletionSentinel(options: {
  root: string;
  runId?: string;
  goalId?: string;
  status: string;
  completedBy: string;
  evidence: SentinelEvidence[];
}): Promise<void> {
  const sentinel: CompletionSentinel = {
    status: options.status,
    completedBy: options.completedBy,
    evidence: options.evidence,
    timestamp: new Date().toISOString(),
    runId: options.runId,
    goalId: options.goalId,
  };

  const path = options.runId
    ? getRunPath(options.runId, "completion-sentinel.json", options.root)
    : join(options.root, ".omk", "goals", options.goalId ?? "unknown", "completion-sentinel.json");

  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, JSON.stringify(sentinel, null, 2) + "\n", "utf-8");
}

export async function markStoppedByLoopGuard(options: {
  root: string;
  runId?: string;
  goalId?: string;
  reason: string;
  confidence: number;
  rawPromptHash: string;
}): Promise<void> {
  await writeCompletionSentinel({
    root: options.root,
    runId: options.runId,
    goalId: options.goalId,
    status: "stopped",
    completedBy: "loop-guard",
    evidence: [
      {
        kind: "command",
        target: `loop-guard:${options.reason}`,
        passed: true,
        actual: `hash=${options.rawPromptHash}, confidence=${options.confidence}`,
      },
    ],
  });
}
