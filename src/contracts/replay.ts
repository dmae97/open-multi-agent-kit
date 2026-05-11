/**
 * Replay contracts — deterministic execution reproducibility.
 *
 * A ReplayManifest captures every decision, context capsule, and evidence
 * sequence so that a run can be audited, replayed, or diffed.
 */

import type { AttemptStatus, RuntimeId } from "../evidence/attempt-record.js";

// ─── Decision Trace ─────────────────────────────────────────────────────────

export type DecisionComponent =
  | "runtime-router"
  | "context-broker"
  | "repair-policy"
  | "evidence-gate"
  | "scheduler"
  | "provider-router"
  | "ensemble-decision"
  | "skill-assigner";

export interface DecisionTraceEntry {
  readonly at: string;
  readonly component: DecisionComponent;
  readonly inputSummary: string;
  readonly outputDecision: string;
  readonly reason: string;
  readonly scores?: Record<string, number>;
  readonly nodeId?: string;
  readonly attemptId?: string;
}

// ─── Replay Attempt ─────────────────────────────────────────────────────────

export interface ReplayAttemptRecord {
  readonly attemptId: string;
  readonly runtime: RuntimeId;
  readonly model?: string;
  readonly provider?: string;

  readonly contextCapsulePath: string;
  readonly promptSnapshotPath: string;
  readonly toolEventsPath: string;
  readonly evidencePath: string;
  readonly diffPatchPath?: string;
  readonly decisionTracePath: string;

  readonly startedAt: string;
  readonly endedAt?: string;
  readonly latencyMs?: number;
  readonly status: AttemptStatus;
  readonly error?: string;

  readonly inputTokensEstimated: number;
  readonly outputTokensEstimated: number;
  readonly toolResultTokensEstimated: number;
  readonly costUsdEstimated?: number;

  readonly decisionTrace: readonly DecisionTraceEntry[];
}

// ─── Replay Node ────────────────────────────────────────────────────────────

export interface ReplayNodeRecord {
  readonly nodeId: string;
  readonly nodeName?: string;
  readonly role?: string;
  readonly attempts: readonly ReplayAttemptRecord[];
  readonly finalStatus: "success" | "failed" | "skipped" | "cancelled";
  readonly totalLatencyMs: number;
  readonly totalCostUsd: number;
}

// ─── Replay Manifest ────────────────────────────────────────────────────────

export interface ReplayManifest {
  readonly runId: string;
  readonly omkVersion: string;

  readonly dagHash: string;
  readonly policyHash: string;
  readonly routerPolicyHash: string;
  readonly repairPolicyHash: string;
  readonly contextPolicyHash: string;

  readonly startedAt: string;
  readonly completedAt?: string;

  readonly nodes: readonly ReplayNodeRecord[];

  readonly summary: {
    readonly totalNodes: number;
    readonly totalAttempts: number;
    readonly successCount: number;
    readonly failureCount: number;
    readonly skippedCount: number;
    readonly totalLatencyMs: number;
    readonly totalCostUsd: number;
    readonly totalInputTokens: number;
    readonly totalOutputTokens: number;
  };
}

// ─── Replay Diff ────────────────────────────────────────────────────────────

export interface ReplayDiffEntry {
  readonly kind: "node-added" | "node-removed" | "attempt-count" | "status-changed" | "decision-changed" | "latency" | "cost" | "token-delta" | "context-changed" | "evidence-changed" | "repair-changed";
  readonly nodeId: string;
  readonly runA: string;
  readonly runB: string;
  readonly detail: string;
  readonly values?: { a?: string | number; b?: string | number };
}

export interface ReplayDiffReport {
  readonly runA: string;
  readonly runB: string;
  readonly dagHashMatch: boolean;
  readonly policyHashMatch: boolean;
  readonly entries: readonly ReplayDiffEntry[];
}

// ─── Replay Validation ──────────────────────────────────────────────────────

export interface ReplayValidationResult {
  readonly valid: boolean;
  readonly errors: readonly string[];
  readonly warnings: readonly string[];
}
