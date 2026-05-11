/**
 * AttemptRecord — evidence-driven attempt tracking.
 *
 * Each attempt captures full context: runtime, tokens, evidence results,
 * changed files, and failure diagnosis for retry strategy selection.
 */

export type AttemptStatus =
  | "success"
  | "runtime_failed"
  | "tool_failed"
  | "evidence_failed"
  | "context_overflow"
  | "cancelled"
  | "timeout";

export type RuntimeId =
  | "kimi-wire"
  | "kimi-print"
  | "openai-compatible"
  | "deepseek"
  | "local";

export interface EvidenceResult {
  readonly gate: string;
  readonly passed: boolean;
  readonly ref?: string;
  readonly message?: string;
}

export interface AttemptRecord {
  readonly runId: string;
  readonly nodeId: string;
  readonly attemptId: string;
  readonly runtime: RuntimeId;
  readonly provider?: string;
  readonly model?: string;
  readonly startedAt: string;
  readonly endedAt?: string;
  readonly latencyMs?: number;
  readonly inputTokensEstimated: number;
  readonly outputTokensEstimated: number;
  readonly toolResultTokensEstimated: number;
  readonly costUsdEstimated?: number;
  readonly contextHash: string;
  readonly promptHash: string;
  readonly status: AttemptStatus;
  readonly error?: string;
  readonly evidenceResults: readonly EvidenceResult[];
  readonly changedFiles: readonly string[];
  readonly summary: string;
  readonly totalTokensEstimated: number;
  readonly evidencePassCount: number;
  readonly evidenceFailCount: number;
  readonly evidencePassRate: number;
  readonly evidencePassRatePerToken: number;
  readonly worktreePath?: string;
}

export interface DiagnosisResult {
  readonly category: AttemptStatus;
  readonly rootCause: string;
  readonly retryStrategy: RetryStrategy;
  readonly suggestedContextAdjustment?: ContextAdjustment;
  readonly suggestedProviderSwitch?: string;
  readonly confidence: number;
}

export interface RetryStrategy {
  readonly action: "retry-same" | "retry-with-context" | "fallback-provider" | "skip" | "abort";
  readonly delayMs?: number;
  readonly maxRetries?: number;
  readonly reason: string;
}

export interface ContextAdjustment {
  readonly addFiles?: readonly string[];
  readonly removeFiles?: readonly string[];
  readonly addMemory?: readonly string[];
  readonly budgetChange?: Partial<{
    maxInputTokens: number;
    maxToolResultTokens: number;
    compression: "none" | "lossless-ish" | "summary" | "aggressive";
  }>;
  readonly promptPatch?: string;
}

export type RepairAction =
  | "retry-same"
  | "retry-with-context"
  | "fallback-provider"
  | "split-node"
  | "escalate"
  | "skip"
  | "abort";

export interface RepairDecision {
  readonly action: RepairAction;
  readonly reason: string;
  readonly adjustment?: ContextAdjustment;
  readonly fallbackProvider?: string;
  readonly splitParts?: number;
  readonly escalateMessage?: string;
}

export function createAttemptId(nodeId: string, attempt: number): string {
  return `${nodeId}__${attempt}`;
}

export function hashContent(content: string): string {
  let h = 0;
  for (let i = 0; i < content.length; i++) {
    h = ((h << 5) - h + content.charCodeAt(i)) | 0;
  }
  return Math.abs(h).toString(36);
}
