/**
 * RepairPolicyEngine — failure-aware repair strategy selection.
 *
 * Examines diagnosis results, failure history, and node context
 * to decide the optimal repair action: retry, fallback, skip, or abort.
 */

import type {
  AttemptRecord,
  DiagnosisResult,
  ContextAdjustment,
  RepairDecision,
} from "../evidence/attempt-record.js";
import type { EvidenceFailureKind } from "./evidence-gate.js";
import type { DagNode } from "./dag.js";
import { createDecisionTraceStore } from "../evidence/decision-trace.js";

export interface RepairContext {
  readonly node: DagNode;
  readonly attempt: AttemptRecord;
  readonly diagnosis: DiagnosisResult;
  readonly failureKind?: EvidenceFailureKind;
  readonly availableProviders: readonly string[];
  readonly previousProviders: readonly string[];
  readonly totalAttempts: number;
  readonly runId?: string;
}

const ESCALATE_THRESHOLD = 3;

export function decideRepair(ctx: RepairContext): RepairDecision {
  const { node, failureKind, totalAttempts, runId } = ctx;

  let decision: RepairDecision;

  // 1. Hard abort — policy violation is never retryable
  if (failureKind === "policy_violation") {
    decision = {
      action: "abort",
      reason: `Policy violation on node ${node.id} — cannot retry`,
    };
  } else if (totalAttempts >= ESCALATE_THRESHOLD) {
    decision = escalateDecision(ctx);
  } else {
    switch (failureKind) {
      case "type_error":
        decision = handleTypeError(ctx);
        break;
      case "test_failure":
        decision = handleTestFailure(ctx);
        break;
      case "build_error":
        decision = handleBuildError(ctx);
        break;
      case "lint_failure":
        decision = handleLintFailure(ctx);
        break;
      case "missing_file":
        decision = handleMissingFile(ctx);
        break;
      case "no_diff":
      case "wrong_output":
        decision = handleOutputFailure(ctx);
        break;
      default:
        decision = handleAmbiguous(ctx);
        break;
    }
  }

  // Record repair-policy decision trace
  if (runId) {
    const attemptId = ctx.attempt.attemptId;
    const traceStore = createDecisionTraceStore();
    traceStore.record(runId, {
      component: "repair-policy",
      inputSummary: `node=${node.id} failureKind=${failureKind ?? "unknown"} totalAttempts=${totalAttempts}`,
      outputDecision: `action=${decision.action}`,
      reason: decision.reason,
      scores: { totalAttempts, escalateThreshold: ESCALATE_THRESHOLD },
      nodeId: node.id,
      attemptId,
    });
  }

  return decision;
}

function handleTypeError(ctx: RepairContext): RepairDecision {
  const { node, diagnosis, availableProviders, previousProviders } = ctx;
  const adjustment = diagnosis.suggestedContextAdjustment;

  // First try: add error context
  if (ctx.totalAttempts === 1) {
    return {
      action: "retry-with-context",
      reason: `Type error on ${node.id} — retrying with error context`,
      adjustment: adjustment ?? buildTypeErrorAdjustment(ctx.attempt),
    };
  }

  // Second try: fallback provider
  const fallback = selectFallbackProvider(availableProviders, previousProviders);
  if (fallback) {
    return {
      action: "fallback-provider",
      reason: `Type error persists on ${node.id} — trying ${fallback}`,
      fallbackProvider: fallback,
    };
  }

  // Last resort: skip if possible
  return skipOrAbort(node, `Type error on ${node.id} after ${ctx.totalAttempts} attempts`);
}

function handleTestFailure(ctx: RepairContext): RepairDecision {
  const { node, diagnosis, availableProviders, previousProviders } = ctx;
  const adjustment = diagnosis.suggestedContextAdjustment;

  if (ctx.totalAttempts === 1) {
    return {
      action: "retry-with-context",
      reason: `Test failure on ${node.id} — retrying with test output`,
      adjustment: adjustment ?? buildTestFailureAdjustment(ctx.attempt),
    };
  }

  const fallback = selectFallbackProvider(availableProviders, previousProviders);
  if (fallback) {
    return {
      action: "fallback-provider",
      reason: `Test failure persists on ${node.id} — trying ${fallback}`,
      fallbackProvider: fallback,
    };
  }

  return skipOrAbort(node, `Test failure on ${node.id} after ${ctx.totalAttempts} attempts`);
}

function handleBuildError(ctx: RepairContext): RepairDecision {
  const { node, diagnosis } = ctx;

  if (ctx.totalAttempts === 1) {
    return {
      action: "retry-with-context",
      reason: `Build error on ${node.id} — retrying with error output`,
      adjustment: diagnosis.suggestedContextAdjustment ?? buildBuildErrorAdjustment(ctx.attempt),
    };
  }

  return skipOrAbort(node, `Build error on ${node.id} after ${ctx.totalAttempts} attempts`);
}

function handleLintFailure(ctx: RepairContext): RepairDecision {
  // Lint failures are usually simple — retry same with fix hints
  if (ctx.totalAttempts <= 2) {
    return {
      action: "retry-same",
      reason: `Lint failure on ${ctx.node.id} — retrying with lint output as context`,
    };
  }

  return skipOrAbort(ctx.node, `Lint failure on ${ctx.node.id} after ${ctx.totalAttempts} attempts`);
}

function handleMissingFile(ctx: RepairContext): RepairDecision {
  const { node, diagnosis } = ctx;

  if (ctx.totalAttempts === 1) {
    return {
      action: "retry-with-context",
      reason: `Missing file on ${node.id} — retrying with file requirement context`,
      adjustment: diagnosis.suggestedContextAdjustment,
    };
  }

  return skipOrAbort(node, `Missing file on ${node.id} after ${ctx.totalAttempts} attempts`);
}

function handleOutputFailure(ctx: RepairContext): RepairDecision {
  const { node, availableProviders, previousProviders } = ctx;

  if (ctx.totalAttempts === 1) {
    return {
      action: "retry-with-context",
      reason: `Output failure on ${node.id} — retrying with expected output spec`,
    };
  }

  const fallback = selectFallbackProvider(availableProviders, previousProviders);
  if (fallback) {
    return {
      action: "fallback-provider",
      reason: `Output failure persists on ${node.id} — trying ${fallback}`,
      fallbackProvider: fallback,
    };
  }

  return skipOrAbort(node, `Output failure on ${node.id} after ${ctx.totalAttempts} attempts`);
}

function handleAmbiguous(ctx: RepairContext): RepairDecision {
  if (ctx.totalAttempts === 1) {
    return {
      action: "retry-same",
      reason: `Ambiguous failure on ${ctx.node.id} — retrying same`,
    };
  }

  return skipOrAbort(ctx.node, `Ambiguous failure on ${ctx.node.id} after ${ctx.totalAttempts} attempts`);
}

function escalateDecision(ctx: RepairContext): RepairDecision {
  const { node, availableProviders, previousProviders } = ctx;

  // Try fallback provider first
  const fallback = selectFallbackProvider(availableProviders, previousProviders);
  if (fallback) {
    return {
      action: "fallback-provider",
      reason: `${ctx.totalAttempts} failures on ${node.id} — escalating to ${fallback}`,
      fallbackProvider: fallback,
    };
  }

  // If all providers exhausted, try split-node for complex tasks
  if (node.cost && node.cost >= 2) {
    return {
      action: "split-node",
      reason: `${ctx.totalAttempts} failures on ${node.id} — splitting into smaller tasks`,
      splitParts: 2,
    };
  }

  return skipOrAbort(node, `${ctx.totalAttempts} failures on ${node.id} — all strategies exhausted`);
}

// --- Helpers ---

function skipOrAbort(node: DagNode, reason: string): RepairDecision {
  const canSkip =
    node.failurePolicy?.skipOnFailure === true ||
    node.outputs?.every((o) => o.required === false);

  return {
    action: canSkip ? "skip" : "abort",
    reason,
  };
}

function selectFallbackProvider(
  available: readonly string[],
  previous: readonly string[],
): string | undefined {
  for (const provider of available) {
    if (!previous.includes(provider)) {
      return provider;
    }
  }
  return undefined;
}

function buildTypeErrorAdjustment(attempt: AttemptRecord): ContextAdjustment {
  const errorLines = attempt.error?.split("\n").slice(0, 10).join("\n") ?? "";
  return {
    promptPatch: `Previous attempt failed with type errors:\n${errorLines}\n\nFix these type errors specifically.`,
  };
}

function buildTestFailureAdjustment(attempt: AttemptRecord): ContextAdjustment {
  const errorLines = attempt.error?.split("\n").slice(0, 10).join("\n") ?? "";
  return {
    promptPatch: `Previous attempt failed tests:\n${errorLines}\n\nFix the failing tests specifically.`,
  };
}

function buildBuildErrorAdjustment(attempt: AttemptRecord): ContextAdjustment {
  const errorLines = attempt.error?.split("\n").slice(0, 10).join("\n") ?? "";
  return {
    promptPatch: `Previous attempt failed to build:\n${errorLines}\n\nFix the build errors specifically.`,
  };
}
