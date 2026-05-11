/**
 * RunTrace — aggregates attempts, evidence, and run state into a single trace.
 *
 * Provides read/write view of all attempts across a run, with per-node
 * breakdown, diagnosis summaries, cost/latency rollups, and failure memory.
 *
 * Storage structure:
 *   .omk/runs/<runId>/
 *     run.json          — run metadata (started, completed, status, stats)
 *     dag.json          — DAG snapshot at run start
 *     attempts.jsonl    — per-attempt records
 *     evidence.jsonl    — per-gate evidence results
 *     context-capsules/ — context snapshots per attempt
 *     artifacts/        — output artifacts
 *     reports/          — generated reports
 */

import { readFile, mkdir, writeFile } from "fs/promises";
import { join } from "path";
import type { AttemptRecord, AttemptStatus, DiagnosisResult } from "./attempt-record.js";

// ─── Read-side types ────────────────────────────────────────────────────────

export interface NodeTraceSummary {
  readonly nodeId: string;
  readonly attempts: readonly AttemptRecord[];
  readonly finalStatus: AttemptStatus;
  readonly totalLatencyMs: number;
  readonly totalCostUsd: number;
  readonly diagnoses: readonly DiagnosisResult[];
}

export interface RunTrace {
  readonly runId: string;
  readonly nodes: readonly NodeTraceSummary[];
  readonly totalAttempts: number;
  readonly successRate: number;
  readonly totalLatencyMs: number;
  readonly totalCostUsd: number;
}

// ─── Write-side types ───────────────────────────────────────────────────────

export interface RunMeta {
  readonly runId: string;
  readonly startedAt: string;
  completedAt?: string;
  status: "running" | "completed" | "failed" | "cancelled";
  readonly dagNodeCount: number;
  totalAttempts: number;
  successCount: number;
  failureCount: number;
  totalLatencyMs: number;
  totalCostUsd: number;
  readonly options?: {
    workers?: number;
    timeoutPreset?: string;
    ensemble?: boolean;
  };
}

export interface NodeReport {
  readonly nodeId: string;
  readonly nodeName: string;
  readonly role: string;
  readonly finalStatus: AttemptStatus;
  readonly attemptCount: number;
  readonly totalLatencyMs: number;
  readonly totalCostUsd: number;
  readonly diagnoses: readonly DiagnosisResult[];
  readonly lastError?: string;
  readonly evidenceGates: readonly {
    readonly gate: string;
    readonly passed: boolean;
    readonly ref?: string;
    readonly message?: string;
  }[];
}

export interface RunReport {
  readonly runId: string;
  readonly generatedAt: string;
  readonly durationMs: number;
  readonly summary: {
    readonly totalNodes: number;
    readonly succeeded: number;
    readonly failed: number;
    readonly skipped: number;
    readonly totalAttempts: number;
    readonly successRate: number;
    readonly totalLatencyMs: number;
    readonly totalCostUsd: number;
    readonly totalInputTokens: number;
    readonly totalOutputTokens: number;
    readonly totalEvidencePassCount: number;
    readonly totalEvidenceFailCount: number;
    readonly evidencePassRatePerToken: number;
  };
  readonly nodes: readonly NodeReport[];
  readonly failureBreakdown: readonly {
    readonly kind: string;
    readonly count: number;
    readonly nodeIds: readonly string[];
  }[];
}

// ─── Store interface ────────────────────────────────────────────────────────

export interface RunTraceStore {
  load(runId: string): Promise<RunTrace>;
  loadAttempts(runId: string): Promise<AttemptRecord[]>;
  loadRunMeta(runId: string): Promise<RunMeta | null>;
  saveRunMeta(meta: RunMeta): Promise<void>;
  saveDagSnapshot(runId: string, dag: unknown): Promise<void>;
  saveReport(report: RunReport): Promise<void>;
  generateReport(runId: string): Promise<RunReport>;
}

// ─── Implementation ─────────────────────────────────────────────────────────

export function createRunTraceStore(runsDir: string = ".omk/runs"): RunTraceStore {
  async function ensureDir(dir: string): Promise<void> {
    await mkdir(dir, { recursive: true });
  }

  async function writeJson(filePath: string, data: unknown): Promise<void> {
    await ensureDir(join(filePath, ".."));
    await writeFile(filePath, JSON.stringify(data, null, 2), "utf-8");
  }

  async function readJson(filePath: string): Promise<unknown | null> {
    try {
      const content = await readFile(filePath, "utf-8");
      return JSON.parse(content);
    } catch {
      return null;
    }
  }

  async function loadAttempts(runId: string): Promise<AttemptRecord[]> {
    const filePath = join(runsDir, runId, "attempts.jsonl");
    try {
      const content = await readFile(filePath, "utf-8");
      const lines = content.trim().split("\n").filter((l) => l.length > 0);
      return lines.map((line) => JSON.parse(line) as AttemptRecord);
    } catch {
      return [];
    }
  }

  async function load(runId: string): Promise<RunTrace> {
    const attempts = await loadAttempts(runId);

    // Group by node
    const nodeMap = new Map<string, AttemptRecord[]>();
    for (const attempt of attempts) {
      const existing = nodeMap.get(attempt.nodeId) ?? [];
      existing.push(attempt);
      nodeMap.set(attempt.nodeId, existing);
    }

    const nodes: NodeTraceSummary[] = [];
    for (const [nodeId, nodeAttempts] of nodeMap) {
      // Sort by attempt number
      nodeAttempts.sort((a, b) => {
        const aNum = parseInt(a.attemptId.split("__").pop() ?? "0", 10);
        const bNum = parseInt(b.attemptId.split("__").pop() ?? "0", 10);
        return aNum - bNum;
      });

      const lastAttempt = nodeAttempts[nodeAttempts.length - 1];
      const finalStatus = lastAttempt?.status ?? "runtime_failed";
      const totalLatencyMs = nodeAttempts.reduce((sum, a) => sum + (a.latencyMs ?? 0), 0);
      const totalCostUsd = nodeAttempts.reduce((sum, a) => sum + (a.costUsdEstimated ?? 0), 0);

      nodes.push({
        nodeId,
        attempts: nodeAttempts,
        finalStatus,
        totalLatencyMs,
        totalCostUsd,
        diagnoses: [], // populated lazily
      });
    }

    const totalAttempts = attempts.length;
    const successCount = attempts.filter((a) => a.status === "success").length;
    const successRate = totalAttempts > 0 ? successCount / totalAttempts : 0;
    const totalLatencyMs = attempts.reduce((sum, a) => sum + (a.latencyMs ?? 0), 0);
    const totalCostUsd = attempts.reduce((sum, a) => sum + (a.costUsdEstimated ?? 0), 0);

    return { runId, nodes, totalAttempts, successRate, totalLatencyMs, totalCostUsd };
  }

  async function loadRunMeta(runId: string): Promise<RunMeta | null> {
    const raw = await readJson(join(runsDir, runId, "run.json"));
    return raw as RunMeta | null;
  }

  async function saveRunMeta(meta: RunMeta): Promise<void> {
    const dir = join(runsDir, meta.runId);
    await ensureDir(dir);
    await ensureDir(join(dir, "artifacts"));
    await ensureDir(join(dir, "reports"));
    await ensureDir(join(dir, "context-capsules"));
    await writeJson(join(dir, "run.json"), meta);
  }

  async function saveDagSnapshot(runId: string, dag: unknown): Promise<void> {
    const dir = join(runsDir, runId);
    await ensureDir(dir);
    await writeJson(join(dir, "dag.json"), dag);
  }

  async function saveReport(report: RunReport): Promise<void> {
    const dir = join(runsDir, report.runId, "reports");
    await ensureDir(dir);
    await writeJson(join(dir, `report-${report.generatedAt.slice(0, 19).replace(/:/g, "-")}.json`), report);
  }

  async function generateReport(runId: string): Promise<RunReport> {
    const trace = await load(runId);
    const meta = await loadRunMeta(runId);
    const generatedAt = new Date().toISOString();

    const nodes: NodeReport[] = trace.nodes.map((node) => {
      const lastAttempt = node.attempts[node.attempts.length - 1];
      return {
        nodeId: node.nodeId,
        nodeName: node.nodeId, // best-effort from trace
        role: "",
        finalStatus: node.finalStatus,
        attemptCount: node.attempts.length,
        totalLatencyMs: node.totalLatencyMs,
        totalCostUsd: node.totalCostUsd,
        diagnoses: node.diagnoses,
        lastError: lastAttempt?.error,
        evidenceGates: lastAttempt?.evidenceResults.map((e) => ({
          gate: e.gate,
          passed: e.passed,
          ref: e.ref,
          message: e.message,
        })) ?? [],
      };
    });

    // Failure breakdown by kind
    const failureMap = new Map<string, Set<string>>();
    for (const node of nodes) {
      if (node.finalStatus !== "success") {
        const existing = failureMap.get(node.finalStatus) ?? new Set();
        existing.add(node.nodeId);
        failureMap.set(node.finalStatus, existing);
      }
    }
    const failureBreakdown = Array.from(failureMap.entries()).map(([kind, nodeIds]) => ({
      kind,
      count: nodeIds.size,
      nodeIds: Array.from(nodeIds),
    }));

    const succeeded = nodes.filter((n) => n.finalStatus === "success").length;
    const failed = nodes.filter((n) => n.finalStatus !== "success" && n.finalStatus !== "cancelled").length;
    const durationMs = meta
      ? new Date(meta.completedAt ?? generatedAt).getTime() - new Date(meta.startedAt).getTime()
      : trace.totalLatencyMs;

    return {
      runId,
      generatedAt,
      durationMs,
      summary: {
        totalNodes: trace.nodes.length,
        succeeded,
        failed,
        skipped: 0,
        totalAttempts: trace.totalAttempts,
        successRate: trace.successRate,
        totalLatencyMs: trace.totalLatencyMs,
        totalCostUsd: trace.totalCostUsd,
        totalInputTokens: trace.nodes.reduce((s, n) => s + n.attempts.reduce((s2, a) => s2 + (a.inputTokensEstimated ?? 0), 0), 0),
        totalOutputTokens: trace.nodes.reduce((s, n) => s + n.attempts.reduce((s2, a) => s2 + (a.outputTokensEstimated ?? 0), 0), 0),
        totalEvidencePassCount: trace.nodes.reduce((s, n) => s + n.attempts.reduce((s2, a) => s2 + (a.evidencePassCount ?? 0), 0), 0),
        totalEvidenceFailCount: trace.nodes.reduce((s, n) => s + n.attempts.reduce((s2, a) => s2 + (a.evidenceFailCount ?? 0), 0), 0),
        evidencePassRatePerToken: (() => {
          const totalIn = trace.nodes.reduce((s, n) => s + n.attempts.reduce((s2, a) => s2 + (a.inputTokensEstimated ?? 0), 0), 0);
          const totalOut = trace.nodes.reduce((s, n) => s + n.attempts.reduce((s2, a) => s2 + (a.outputTokensEstimated ?? 0), 0), 0);
          const totalTool = trace.nodes.reduce((s, n) => s + n.attempts.reduce((s2, a) => s2 + (a.toolResultTokensEstimated ?? 0), 0), 0);
          const totalTokens = totalIn + totalOut + totalTool;
          const totalPass = trace.nodes.reduce((s, n) => s + n.attempts.reduce((s2, a) => s2 + (a.evidencePassCount ?? 0), 0), 0);
          const totalAll = trace.nodes.reduce((s, n) => s + n.attempts.reduce((s2, a) => s2 + (a.evidencePassCount ?? 0) + (a.evidenceFailCount ?? 0), 0), 0);
          const rate = totalAll > 0 ? totalPass / totalAll : 1;
          return totalTokens > 0 ? rate / totalTokens : 0;
        })(),
      },
      nodes,
      failureBreakdown,
    };
  }

  return {
    load,
    loadAttempts,
    loadRunMeta,
    saveRunMeta,
    saveDagSnapshot,
    saveReport,
    generateReport,
  };
}
