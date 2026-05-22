/**
 * ExternalCliAdapter — generic factory for AgentRuntime implementations
 * that delegate to an external CLI tool.
 */

import type {
  AgentRuntime,
  AgentRunResult,
  RuntimeCapabilities,
  RuntimeHealth,
} from "./agent-runtime.js";
import type { ContextCapsule } from "./context-capsule.js";
import {
  checkCommand,
  runShellStreaming,
  type ShellResult,
} from "../util/shell.js";

export interface ExternalCliAdapterOptions {
  id: string;
  displayName: string;
  bin: string;
  priority: number;
  capabilities: RuntimeCapabilities;
  buildArgs: (capsule: ContextCapsule) => string[];
  buildEnv?: (capsule: ContextCapsule) => Record<string, string>;
  parseResult?: (
    shellResult: ShellResult,
    capsule: ContextCapsule
  ) => AgentRunResult;
}

export function createExternalCliAdapter(
  options: ExternalCliAdapterOptions
): AgentRuntime {
  return {
    id: options.id,
    displayName: options.displayName,
    kind: "cli",
    priority: options.priority,
    capabilities: options.capabilities,

    supports(_capsule: ContextCapsule): boolean {
      return true;
    },

    async health(): Promise<RuntimeHealth> {
      const available = await checkCommand(options.bin);
      return {
        runtimeId: options.id,
        available,
        reason: available ? undefined : `Command not found: ${options.bin}`,
        checkedAt: new Date().toISOString(),
      };
    },

    async runNode(
      capsule: ContextCapsule,
      signal: AbortSignal
    ): Promise<AgentRunResult> {
      // Validate capsule task is not empty to prevent CLI errors
      if (!capsule.task || capsule.task.trim().length === 0) {
        const errorMsg = `Empty task for node ${capsule.nodeId}`;
        process.stderr.write(`[omk] ${errorMsg}\n`);
        return {
          success: false,
          exitCode: 1,
          stdout: `[ERROR] ${errorMsg}`,
          stderr: errorMsg,
          metadata: { runtime: options.id, error: errorMsg },
        };
      }

      const args = options.buildArgs(capsule);
      const env = options.buildEnv ? options.buildEnv(capsule) : undefined;
      const startedAt = Date.now();

      try {
        const shellResult = await runShellStreaming(options.bin, args, {
          env,
          signal,
          inheritEnv: false,
        });

        if (signal.aborted) {
          return {
            success: false,
            exitCode: 130,
            stdout: shellResult.stdout,
            stderr: "Aborted by signal",
            metadata: { runtime: options.id, aborted: true },
          };
        }

        const durationMs = Date.now() - startedAt;

        if (options.parseResult) {
          return options.parseResult(shellResult, capsule);
        }

        return {
          success: !shellResult.failed,
          exitCode: shellResult.exitCode,
          stdout: shellResult.stdout,
          stderr: shellResult.stderr,
          metadata: { runtime: options.id, durationMs },
        };
      } catch (err) {
        const errorMsg = String(err);
        return {
          success: false,
          exitCode: 1,
          stdout: `[ERROR] ${errorMsg}`,
          stderr: errorMsg,
          metadata: { runtime: options.id, error: errorMsg },
        };
      }
    },
  };
}
