/**
 * ContextSnapshot — persisted snapshot of ContextCapsule per attempt.
 *
 * Enables post-hoc analysis of what context was provided to each runtime,
 * supporting diagnosis of context_overflow and evidence_failed attempts.
 */

import { readFile, readdir, mkdir, writeFile } from "fs/promises";
import { join } from "path";
import type { ContextCapsule } from "../runtime/context-capsule.js";

export interface ContextSnapshotMeta {
  readonly runId: string;
  readonly nodeId: string;
  readonly attemptId: string;
  readonly capturedAt: string;
  readonly estimatedTokens: number;
}

export interface ContextSnapshotStore {
  save(capsule: ContextCapsule, attemptId: string): Promise<void>;
  load(runId: string, nodeId: string, attemptId: string): Promise<ContextCapsule | null>;
  list(runId: string): Promise<ContextSnapshotMeta[]>;
}

export function createContextSnapshotStore(runsDir: string = ".omk/runs"): ContextSnapshotStore {
  const snapshotsDir = (runId: string) => join(runsDir, runId, "context-capsules");

  async function save(capsule: ContextCapsule, attemptId: string): Promise<void> {
    const dir = snapshotsDir(capsule.runId);
    const filePath = join(dir, `${capsule.nodeId}-${attemptId}.json`);
    const snapshot = {
      ...capsule,
      _snapshot: {
        capturedAt: new Date().toISOString(),
        estimatedTokens: estimateFromCapsule(capsule),
      },
    };
    await mkdir(dir, { recursive: true });
    await writeFile(filePath, JSON.stringify(snapshot, null, 2), "utf-8");
  }

  async function load(
    runId: string,
    nodeId: string,
    attemptId: string
  ): Promise<ContextCapsule | null> {
    const filePath = join(snapshotsDir(runId), `${nodeId}-${attemptId}.json`);
    try {
      const content = await readFile(filePath, "utf-8");
      return JSON.parse(content) as ContextCapsule;
    } catch {
      return null;
    }
  }

  async function list(runId: string): Promise<ContextSnapshotMeta[]> {
    const dir = snapshotsDir(runId);
    try {
      const entries = await readdir(dir);
      const meta: ContextSnapshotMeta[] = [];
      for (const entry of entries) {
        if (!entry.endsWith(".json")) continue;
        try {
          const content = await readFile(join(dir, entry), "utf-8");
          const parsed = JSON.parse(content) as ContextCapsule & { _snapshot?: { capturedAt: string; estimatedTokens: number } };
          const fileStem = entry.replace(".json", "");
          const attemptId = fileStem.startsWith(`${parsed.nodeId}-`)
            ? fileStem.slice(`${parsed.nodeId}-`.length)
            : fileStem;
          meta.push({
            runId,
            nodeId: parsed.nodeId ?? "",
            attemptId,
            capturedAt: parsed._snapshot?.capturedAt ?? "",
            estimatedTokens: parsed._snapshot?.estimatedTokens ?? 0,
          });
        } catch {
          // skip corrupted snapshots
        }
      }
      return meta;
    } catch {
      return [];
    }
  }

  return { save, load, list };
}

function estimateFromCapsule(capsule: ContextCapsule): number {
  let total = 0;
  total += Math.ceil(capsule.system.length / 4);
  total += Math.ceil(capsule.task.length / 4);
  total += Math.ceil(capsule.goal.length / 4);
  for (const s of capsule.dependencySummaries) total += Math.ceil(s.length / 4);
  for (const f of capsule.relevantFiles) total += Math.ceil(f.content.length / 4);
  for (const m of capsule.graphMemory) total += Math.ceil((m.key.length + m.value.length) / 4);
  return total;
}
