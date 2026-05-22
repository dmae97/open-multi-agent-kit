import { createHash } from "crypto";
import { readFile } from "fs/promises";
import { join } from "path";

export type LoopGuardAction = "new-run" | "continue" | "verify-only" | "stop";

export interface LoopGuardDecision {
  action: LoopGuardAction;
  reason:
    | "new-intent"
    | "explicit-continue"
    | "explicit-verification"
    | "duplicate-prompt"
    | "duplicate-confirmation-after-completed-run"
    | "completed-goal-no-new-intent"
    | "max-loop-guard";
  confidence: number;
  visibleMessage?: string;
  checks?: Array<{
    kind: "file-exists" | "grep" | "command";
    target: string;
    expected?: string;
  }>;
}

export interface LoopGuardInput {
  root: string;
  rawPrompt: string;
  sourceCommand?: string;
  goalId?: string;
  runId?: string;
  previousPrompts?: Array<{ hash: string; normalized: string; at: string }>;
}

const KOREAN_PREFIXES = /^(다시|한번|또|계속)\s+/;
const TRAILING_PUNCTUATION = /[\p{P}\p{S}]+$/u;
const WHITESPACE_COLLAPSE = /\s+/g;

export function normalizePromptForLoopGuard(value: string): string {
  let normalized = value.trim();
  normalized = normalized.replace(WHITESPACE_COLLAPSE, " ");
  normalized = normalized.replace(KOREAN_PREFIXES, "");
  normalized = normalized.replace(TRAILING_PUNCTUATION, "");
  normalized = normalized.trim();
  normalized = normalized.toLowerCase();
  return normalized;
}

const VERIFICATION_SUBSTRINGS = [
  "제대로 고쳐졌는지 확인",
  "확인해줘",
  "검증해줘",
  "타입체크 확인",
  "제대로 됐는지 봐줘",
  "잘 되었는지 확인",
];

export function isVerificationPrompt(value: string): boolean {
  const normalized = normalizePromptForLoopGuard(value);
  return VERIFICATION_SUBSTRINGS.some((substr) => normalized.includes(substr));
}

export function hashPrompt(value: string): string {
  const normalized = normalizePromptForLoopGuard(value);
  return createHash("sha256").update(normalized, "utf-8").digest("hex");
}

async function hasCompletedSentinel(root: string, goalId?: string, runId?: string): Promise<boolean> {
  const paths: string[] = [];
  if (runId) {
    paths.push(join(root, ".omk", "runs", runId, "completion-sentinel.json"));
  }
  if (goalId) {
    paths.push(join(root, ".omk", "goals", goalId, "completion-sentinel.json"));
  }
  for (const p of paths) {
    try {
      const content = await readFile(p, "utf-8");
      const parsed = JSON.parse(content) as unknown;
      if (
        parsed &&
        typeof parsed === "object" &&
        "status" in parsed &&
        (parsed as { status?: string }).status === "completed"
      ) {
        return true;
      }
    } catch {
      // ignore missing or unreadable files
    }
  }
  return false;
}

export async function evaluatePreOrchestrationGuard(input: LoopGuardInput): Promise<LoopGuardDecision> {
  const normalized = normalizePromptForLoopGuard(input.rawPrompt);
  const promptHash = hashPrompt(input.rawPrompt);
  const isVerification = isVerificationPrompt(input.rawPrompt);
  const completed = await hasCompletedSentinel(input.root, input.goalId, input.runId);
  const hasDuplicate = (input.previousPrompts ?? []).some((p) => p.hash === promptHash);

  if (hasDuplicate && completed) {
    return {
      action: "stop",
      reason: "duplicate-confirmation-after-completed-run",
      confidence: 0.95,
      visibleMessage: "검증 완료 상태입니다. 추가 실행 없음.",
    };
  }

  if (isVerification && completed) {
    return {
      action: "verify-only",
      reason: "explicit-verification",
      confidence: 0.9,
    };
  }

  if (isVerification && !completed) {
    return {
      action: "continue",
      reason: "explicit-verification",
      confidence: 0.7,
    };
  }

  if (normalized === "계속해" || normalized === "continue") {
    return {
      action: "continue",
      reason: "explicit-continue",
      confidence: 0.9,
    };
  }

  if (hasDuplicate && !completed) {
    return {
      action: "continue",
      reason: "duplicate-prompt",
      confidence: 0.8,
    };
  }

  return {
    action: "new-run",
    reason: "new-intent",
    confidence: 0.9,
  };
}
