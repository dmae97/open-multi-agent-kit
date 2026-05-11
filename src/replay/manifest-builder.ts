/**
 * ReplayManifestBuilder — constructs a ReplayManifest from run artifacts.
 */

import { readFile } from "fs/promises";
import { readFileSync } from "fs";

import { join } from "path";
import type {
  ReplayManifest,
  ReplayNodeRecord,
  ReplayAttemptRecord,
  ReplayValidationResult,
} from "../contracts/replay.js";
import type { AttemptRecord } from "../evidence/attempt-record.js";
import { createDecisionTraceStore } from "../evidence/decision-trace.js";
import { validateRunId } from "../util/run-store.js";

export interface ManifestBuilderOptions {
  runsDir?: string;
}

export function createManifestBuilder(options?: ManifestBuilderOptions) {
  const runsDir = options?.runsDir ?? ".omk/runs";
  const decisionStore = createDecisionTraceStore(runsDir);

  async function build(runId: string): Promise<ReplayManifest> {
    const validRunId = validateRunId(runId);
    const runDir = join(runsDir, validRunId);

    // Load run meta
    const metaRaw = await readFile(join(runDir, "run.json"), "utf-8").catch(() => null);
    const meta = metaRaw ? (JSON.parse(metaRaw) as { startedAt?: string; completedAt?: string }) : {};

    // Load DAG snapshot for hash (use content hash as proxy)
    const dagRaw = await readFile(join(runDir, "dag.json"), "utf-8").catch(() => "{}");
    const dagHash = hashString(dagRaw);

    // Load attempts
    const attemptsPath = join(runDir, "attempts.jsonl");
    const attemptsRaw = await readFile(attemptsPath, "utf-8").catch(() => "");
    const attempts: AttemptRecord[] = attemptsRaw
      .trim()
      .split("\n")
      .filter((l) => l.length > 0)
      .map((line) => JSON.parse(line) as AttemptRecord);

    // Load all decision traces
    const allDecisions = decisionStore.load(runId);

    // Group by node
    const nodeMap = new Map<string, AttemptRecord[]>();
    for (const a of attempts) {
      const list = nodeMap.get(a.nodeId) ?? [];
      list.push(a);
      nodeMap.set(a.nodeId, list);
    }

    const nodes: ReplayNodeRecord[] = [];
    let totalAttempts = 0;
    let successCount = 0;
    let failureCount = 0;
    let skippedCount = 0;
    let totalLatencyMs = 0;
    let totalCostUsd = 0;
    let totalInputTokens = 0;
    let totalOutputTokens = 0;

    for (const [nodeId, nodeAttempts] of nodeMap) {
      // Sort by attempt number
      nodeAttempts.sort((a, b) => {
        const aNum = parseInt(a.attemptId.split("__").pop() ?? "0", 10);
        const bNum = parseInt(b.attemptId.split("__").pop() ?? "0", 10);
        return aNum - bNum;
      });

      const lastAttempt = nodeAttempts[nodeAttempts.length - 1];
      const finalStatus =
        lastAttempt?.status === "success"
          ? "success"
          : lastAttempt?.status === "cancelled"
          ? "cancelled"
          : nodeAttempts.length === 0
          ? "skipped"
          : "failed";

      if (finalStatus === "success") successCount++;
      else if (finalStatus === "skipped") skippedCount++;
      else failureCount++;

      const replayAttempts: ReplayAttemptRecord[] = nodeAttempts.map((a) => {
        const attemptDecisions = allDecisions.filter((d) => d.attemptId === a.attemptId);
        const basePath = join(runsDir, runId);
        return {
          attemptId: a.attemptId,
          runtime: a.runtime,
          model: a.model,
          provider: a.provider,
          contextCapsulePath: join(basePath, "context-capsules", `${a.nodeId}-${a.attemptId}.json`),
          promptSnapshotPath: join(basePath, "prompts", `${a.nodeId}-${a.attemptId}.txt`),
          toolEventsPath: join(basePath, "tool-events", `${a.nodeId}-${a.attemptId}.jsonl`),
          evidencePath: join(basePath, "evidence.jsonl"),
          decisionTracePath: join(basePath, "decisions.jsonl"),
          startedAt: a.startedAt,
          endedAt: a.endedAt,
          latencyMs: a.latencyMs,
          status: a.status,
          error: a.error,
          inputTokensEstimated: a.inputTokensEstimated,
          outputTokensEstimated: a.outputTokensEstimated,
          toolResultTokensEstimated: a.toolResultTokensEstimated,
          costUsdEstimated: a.costUsdEstimated,
          decisionTrace: attemptDecisions,
        };
      });

      const nodeLatency = nodeAttempts.reduce((s, a) => s + (a.latencyMs ?? 0), 0);
      const nodeCost = nodeAttempts.reduce((s, a) => s + (a.costUsdEstimated ?? 0), 0);

      nodes.push({
        nodeId,
        nodeName: nodeId,
        attempts: replayAttempts,
        finalStatus,
        totalLatencyMs: nodeLatency,
        totalCostUsd: nodeCost,
      });

      totalAttempts += nodeAttempts.length;
      totalLatencyMs += nodeLatency;
      totalCostUsd += nodeCost;
      totalInputTokens += nodeAttempts.reduce((s, a) => s + (a.inputTokensEstimated ?? 0), 0);
      totalOutputTokens += nodeAttempts.reduce((s, a) => s + (a.outputTokensEstimated ?? 0), 0);
    }

    // Sort nodes deterministically
    nodes.sort((a, b) => a.nodeId.localeCompare(b.nodeId));

    return {
      runId,
      omkVersion: getOmkVersion(),
      dagHash,
      policyHash: "pending", // populated by external policy engine
      routerPolicyHash: "pending",
      repairPolicyHash: "pending",
      contextPolicyHash: "pending",
      startedAt: meta.startedAt ?? new Date().toISOString(),
      completedAt: meta.completedAt,
      nodes,
      summary: {
        totalNodes: nodes.length,
        totalAttempts,
        successCount,
        failureCount,
        skippedCount,
        totalLatencyMs,
        totalCostUsd,
        totalInputTokens,
        totalOutputTokens,
      },
    };
  }

  async function validate(runId: string): Promise<ReplayValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];
    const validRunId = validateRunId(runId);
    const runDir = join(runsDir, validRunId);

    const required = ["run.json", "dag.json", "attempts.jsonl"];
    for (const file of required) {
      const exists = await readFile(join(runDir, file), "utf-8")
        .then(() => true)
        .catch(() => false);
      if (!exists) errors.push(`Missing required artifact: ${file}`);
    }

    // Check that every attempt has a context capsule
    const attemptsPath = join(runDir, "attempts.jsonl");
    const attemptsRaw = await readFile(attemptsPath, "utf-8").catch(() => "");
    const attempts: AttemptRecord[] = attemptsRaw
      .trim()
      .split("\n")
      .filter((l) => l.length > 0)
      .map((line) => JSON.parse(line) as AttemptRecord);

    for (const a of attempts) {
      const capsulePath = join(runDir, "context-capsules", `${a.nodeId}-${a.attemptId}.json`);
      const exists = await readFile(capsulePath, "utf-8")
        .then(() => true)
        .catch(() => false);
      if (!exists) {
        warnings.push(`Missing context capsule for ${a.nodeId}/${a.attemptId}`);
      }
    }

    return { valid: errors.length === 0, errors, warnings };
  }

  return { build, validate };
}

function hashString(input: string): string {
  let h = 0;
  for (let i = 0; i < input.length; i++) {
    h = ((h << 5) - h + input.charCodeAt(i)) | 0;
  }
  return Math.abs(h).toString(36);
}

function getOmkVersion(): string {
  try {
    const pkg = JSON.parse(readFileSync(new URL("../../package.json", import.meta.url), "utf-8"));
    return pkg.version ?? "unknown";
  } catch {
    return "unknown";
  }
}
