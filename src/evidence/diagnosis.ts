/**
 * DiagnosisEngine — classifies failures and recommends retry strategies.
 *
 * Maps AttemptStatus + error context → DiagnosisResult with:
 *   - root cause classification
 *   - retry strategy (same/context/switch/skip/abort)
 *   - optional context adjustment (add files, change budget, patch prompt)
 *   - confidence score
 */

import type {
  AttemptRecord,
  AttemptStatus,
  DiagnosisResult,
} from "./attempt-record.js";

export interface DiagnosisEngine {
  diagnose(record: AttemptRecord): DiagnosisResult;
  classifyError(error: string, exitCode?: number): AttemptStatus;
}

export function createDiagnosisEngine(): DiagnosisEngine {
  function classifyError(error: string, exitCode?: number): AttemptStatus {
    const lower = error.toLowerCase();

    // Timeout signals
    if (lower.includes("timeout") || lower.includes("timed out") || exitCode === 124) {
      return "timeout";
    }

    // Cancel signals
    if (lower.includes("cancel") || lower.includes("abort") || exitCode === 130) {
      return "cancelled";
    }

    // Context overflow signals
    if (
      lower.includes("context length") ||
      lower.includes("token limit") ||
      lower.includes("context window") ||
      lower.includes("too long") ||
      lower.includes("max_tokens") ||
      lower.includes("context_overflow")
    ) {
      return "context_overflow";
    }

    // Tool failure signals
    if (
      lower.includes("tool") && lower.includes("fail") ||
      lower.includes("mcp") && lower.includes("error") ||
      lower.includes("tool_execution") ||
      lower.includes("function_call")
    ) {
      return "tool_failed";
    }

    // Runtime failure (everything else)
    return "runtime_failed";
  }

  function diagnose(record: AttemptRecord): DiagnosisResult {
    // If evidence failed, that's the primary signal
    if (record.status === "evidence_failed") {
      return diagnoseEvidenceFailure(record);
    }

    switch (record.status) {
      case "timeout":
        return diagnoseTimeout(record);
      case "context_overflow":
        return diagnoseContextOverflow(record);
      case "cancelled":
        return diagnoseCancelled(record);
      case "tool_failed":
        return diagnoseToolFailure(record);
      case "runtime_failed":
        return diagnoseRuntimeFailure(record);
      case "success":
        return {
          category: "success",
          rootCause: "No failure — attempt succeeded",
          retryStrategy: { action: "retry-same", reason: "No retry needed" },
          confidence: 1.0,
        };
    }
  }

  function diagnoseTimeout(record: AttemptRecord): DiagnosisResult {
    const inputTokens = record.inputTokensEstimated;

    // Large context → reduce context
    if (inputTokens > 6000) {
      return {
        category: "timeout",
        rootCause: `Timeout with large context (${inputTokens} tokens) — likely context-bound`,
        retryStrategy: {
          action: "retry-with-context",
          delayMs: 1000,
          reason: "Reduce context size and retry with aggressive compression",
        },
        suggestedContextAdjustment: {
          budgetChange: { maxInputTokens: Math.floor(inputTokens * 0.6), compression: "aggressive" },
        },
        confidence: 0.8,
      };
    }

    // Small context → runtime issue, try different provider
    return {
      category: "timeout",
      rootCause: `Timeout with small context (${inputTokens} tokens) — runtime performance issue`,
      retryStrategy: {
        action: "fallback-provider",
        delayMs: 2000,
        reason: "Switch to faster runtime",
      },
      suggestedProviderSwitch: record.runtime === "kimi-wire" ? "kimi-print" : undefined,
      confidence: 0.7,
    };
  }

  function diagnoseContextOverflow(record: AttemptRecord): DiagnosisResult {
    return {
      category: "context_overflow",
      rootCause: `Context exceeded limit (${record.inputTokensEstimated} tokens estimated)`,
      retryStrategy: {
        action: "retry-with-context",
        delayMs: 500,
        reason: "Shrink context and retry",
      },
      suggestedContextAdjustment: {
        budgetChange: {
          maxInputTokens: Math.floor(record.inputTokensEstimated * 0.5),
          maxToolResultTokens: 1024,
          compression: "aggressive",
        },
      },
      confidence: 0.95,
    };
  }

  function diagnoseCancelled(_record: AttemptRecord): DiagnosisResult {
    // User cancel → don't auto-retry
    return {
      category: "cancelled",
      rootCause: "Attempt was cancelled by user or abort signal",
      retryStrategy: { action: "abort", reason: "User-initiated cancel — do not auto-retry" },
      confidence: 1.0,
    };
  }

  function diagnoseToolFailure(record: AttemptRecord): DiagnosisResult {
    const hasEvidenceFailure = record.evidenceResults.some((e) => !e.passed);

    if (hasEvidenceFailure) {
      return {
        category: "tool_failed",
        rootCause: `Tool execution failed and evidence gates did not pass`,
        retryStrategy: {
          action: "retry-with-context",
          delayMs: 1000,
          reason: "Add error context and retry with adjusted prompt",
        },
        suggestedContextAdjustment: {
          promptPatch: `Previous attempt failed tool execution. Error: ${record.error ?? "unknown"}. Focus on working tool calls.`,
        },
        confidence: 0.7,
      };
    }

    return {
      category: "tool_failed",
      rootCause: `Tool execution failed but evidence gates passed — transient tool issue`,
      retryStrategy: {
        action: "retry-same",
        delayMs: 2000,
        reason: "Transient tool failure — retry as-is",
      },
      confidence: 0.6,
    };
  }

  function diagnoseRuntimeFailure(record: AttemptRecord): DiagnosisResult {
    const error = record.error ?? "";

    // API/auth errors → switch provider
    if (
      error.includes("402") ||
      error.includes("401") ||
      error.includes("429") ||
      error.includes("balance") ||
      error.includes("payment")
    ) {
      return {
        category: "runtime_failed",
        rootCause: `Provider error (${error.slice(0, 100)}) — likely availability/billing issue`,
        retryStrategy: {
          action: "fallback-provider",
          delayMs: 5000,
          reason: "Provider unavailable — switch to fallback",
        },
        confidence: 0.9,
      };
    }

    // Empty output → might be context issue
    if (record.summary.trim().length === 0) {
      return {
        category: "runtime_failed",
        rootCause: "Runtime produced empty output — possible context or prompt issue",
        retryStrategy: {
          action: "retry-with-context",
          delayMs: 1000,
          reason: "Adjust prompt and retry",
        },
        suggestedContextAdjustment: {
          promptPatch: "Previous attempt produced no output. Ensure you provide a complete response.",
        },
        confidence: 0.6,
      };
    }

    // Generic runtime failure → retry same
    return {
      category: "runtime_failed",
      rootCause: `Runtime failure: ${error.slice(0, 200)}`,
      retryStrategy: {
        action: "retry-same",
        delayMs: 3000,
        maxRetries: 2,
        reason: "Generic runtime failure — retry with backoff",
      },
      confidence: 0.5,
    };
  }

  function diagnoseEvidenceFailure(record: AttemptRecord): DiagnosisResult {
    const failedEvidence = record.evidenceResults.filter((e) => !e.passed);
    const gateTypes = failedEvidence.map((e) => e.gate);

    // Command-pass failure → likely code issue
    if (gateTypes.includes("command-pass")) {
      return {
        category: "evidence_failed",
        rootCause: `Evidence gate failed: command-pass (${failedEvidence.map((e) => e.message).join("; ")})`,
        retryStrategy: {
          action: "retry-with-context",
          delayMs: 1000,
          reason: "Add failing command output to context and retry",
        },
        suggestedContextAdjustment: {
          promptPatch: `Previous attempt failed evidence: ${failedEvidence.map((e) => e.message).join("; ")}. Fix the failing checks.`,
        },
        confidence: 0.85,
      };
    }

    // File-exists failure → wrong output path
    if (gateTypes.includes("file-exists")) {
      return {
        category: "evidence_failed",
        rootCause: `Evidence gate failed: file-exists (${failedEvidence.map((e) => e.ref).join(", ")})`,
        retryStrategy: {
          action: "retry-with-context",
          delayMs: 500,
          reason: "Add expected file paths to context",
        },
        suggestedContextAdjustment: {
          promptPatch: `Required files not created: ${failedEvidence.map((e) => e.ref).join(", ")}. Ensure these files exist.`,
        },
        confidence: 0.9,
      };
    }

    // Diff-nonempty → no changes produced
    if (gateTypes.includes("diff-nonempty")) {
      return {
        category: "evidence_failed",
        rootCause: "Evidence gate failed: diff-nonempty — no code changes produced",
        retryStrategy: {
          action: "retry-with-context",
          delayMs: 500,
          reason: "Emphasize need for code changes in prompt",
        },
        suggestedContextAdjustment: {
          promptPatch: "Previous attempt produced no code changes. You MUST modify files to implement the requested feature.",
        },
        confidence: 0.85,
      };
    }

    // Summary-present failure → incomplete output
    if (gateTypes.includes("summary-present")) {
      return {
        category: "evidence_failed",
        rootCause: "Evidence gate failed: summary-present — output too short or missing summary",
        retryStrategy: {
          action: "retry-with-context",
          delayMs: 500,
          reason: "Request explicit summary in prompt",
        },
        suggestedContextAdjustment: {
          promptPatch: "Include a ## Summary section in your response with key findings and changes.",
        },
        confidence: 0.8,
      };
    }

    return {
      category: "evidence_failed",
      rootCause: `Evidence gates failed: ${gateTypes.join(", ")}`,
      retryStrategy: {
        action: "retry-with-context",
        delayMs: 1000,
        reason: "Add evidence failure context and retry",
      },
      confidence: 0.7,
    };
  }

  return { diagnose, classifyError };
}
