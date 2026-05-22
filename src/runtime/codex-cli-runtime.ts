/**
 * CodexCliRuntime — wraps createCodexCliAdvisoryTaskRunner into an AgentRuntime.
 */

import type { AgentRuntime, AgentRunResult } from "./agent-runtime.js";
import type { ContextCapsule } from "./context-capsule.js";
import type { DagNode } from "../orchestration/dag.js";
import { createCodexCliAdvisoryTaskRunner } from "../providers/codex-cli-runner.js";

export interface CodexCliRuntimeOptions {
  cwd: string;
  model?: string;
  timeoutMs?: number;
}

export function createCodexCliRuntime(
  options: CodexCliRuntimeOptions
): AgentRuntime {
  const runner = createCodexCliAdvisoryTaskRunner(options);

  return {
    id: "codex-cli",
    displayName: "Codex CLI",
    kind: "cli",
    priority: 60,

    supports(_capsule: ContextCapsule): boolean {
      return true;
    },

    async runNode(
      capsule: ContextCapsule,
      signal: AbortSignal
    ): Promise<AgentRunResult> {
      // Validate capsule task is not empty to prevent runner errors
      if (!capsule.task || capsule.task.trim().length === 0) {
        const errorMsg = `Empty task for node ${capsule.nodeId}`;
        process.stderr.write(`[omk] ${errorMsg}\n`);
        return {
          success: false,
          exitCode: 1,
          stdout: `[ERROR] ${errorMsg}`,
          stderr: errorMsg,
          metadata: { runtime: "codex-cli", error: errorMsg },
        };
      }

      const node: DagNode = {
        ...capsule.node,
        name: capsule.task,
      };

      const env: Record<string, string> = {
        OMK_RUN_ID: capsule.runId,
        OMK_NODE_ID: capsule.nodeId,
        OMK_ROLE: capsule.node.role ?? "",
        OMK_GOAL: capsule.goal,
        OMK_GOAL_CONTEXT: capsule.goal,
        OMK_TASK_TYPE: "general",
        OMK_PROVIDER_AUTHORITY: "advisory",
      };

      const startedAt = Date.now();

      try {
        const result = await runner.run(node, env, signal);

        if (signal.aborted) {
          return {
            success: false,
            exitCode: 130,
            stdout: result.stdout,
            stderr: "Aborted by signal",
            metadata: { runtime: "codex-cli", aborted: true },
          };
        }

        const durationMs = Date.now() - startedAt;
        return {
          success: result.success,
          exitCode: result.exitCode,
          stdout: result.stdout,
          stderr: result.stderr,
          metadata: {
            runtime: "codex-cli",
            durationMs,
            ...result.metadata,
          },
        };
      } catch (err) {
        const errorMsg = String(err);
        return {
          success: false,
          exitCode: 1,
          stdout: `[ERROR] ${errorMsg}`,
          stderr: errorMsg,
          metadata: { runtime: "codex-cli", error: errorMsg },
        };
      }
    },
  };
}
