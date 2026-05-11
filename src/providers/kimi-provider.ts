import type {
  AgentProvider,
  AgentRunInput,
  AgentRunResult,
  ProviderHealth,
  ProviderKind,
} from "./provider.js";
import type { TaskRunner, TaskResult } from "../contracts/orchestration.js";
import type { DagNode } from "../orchestration/dag.js";

export interface KimiProviderOptions {
  runner: TaskRunner;
  priority?: number;
}

export function createKimiProvider(options: KimiProviderOptions): AgentProvider {
  const { runner, priority = 100 } = options;

  return {
    id: "kimi",
    kind: "kimi-native" as ProviderKind,
    priority,

    supports(_task: DagNode): boolean {
      return true;
    },

    async run(input: AgentRunInput): Promise<AgentRunResult> {
      const result: TaskResult = await runner.run(input.node, input.env);
      return {
        success: result.success,
        exitCode: result.exitCode,
        stdout: result.stdout,
        stderr: result.stderr,
        metadata: result.metadata,
      };
    },

    async health(): Promise<ProviderHealth> {
      return {
        available: true,
        lastCheckedAt: Date.now(),
      };
    },
  };
}
