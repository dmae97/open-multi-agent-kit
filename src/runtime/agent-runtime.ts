/**
 * AgentRuntime — interface for runtime implementations.
 *
 * Each runtime wraps a specific Kimi/provider invocation mode.
 */

import type { TaskResult } from "../contracts/orchestration.js";
import type { ContextCapsule } from "./context-capsule.js";

export interface TokenUsage {
  readonly inputTokens: number;
  readonly outputTokens: number;
  readonly totalTokens: number;
}

export interface ToolCallRecord {
  readonly name: string;
  readonly input: unknown;
  readonly output: unknown;
  readonly durationMs: number;
  readonly success: boolean;
}

export interface AgentRunResult {
  readonly success: boolean;
  readonly exitCode?: number;
  readonly stdout: string;
  readonly stderr: string;
  readonly metadata?: Record<string, unknown>;
  readonly tokenUsage?: TokenUsage;
  readonly toolCalls?: readonly ToolCallRecord[];
}

export interface AgentRuntime {
  readonly id: string;
  readonly priority: number;
  supports(capsule: ContextCapsule): boolean;
  runNode(capsule: ContextCapsule, signal: AbortSignal): Promise<AgentRunResult>;
}

export function toTaskResult(result: AgentRunResult): TaskResult {
  return {
    success: result.success,
    exitCode: result.exitCode,
    stdout: result.stdout,
    stderr: result.stderr,
    metadata: result.metadata,
  };
}
