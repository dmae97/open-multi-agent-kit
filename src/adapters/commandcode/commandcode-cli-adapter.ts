/**
 * CommandCodeCliAdapter — wraps the `cmd` CLI as an AgentRuntime.
 */

import { createExternalCliAdapter } from "../../runtime/external-cli-adapter.js";
import type { ContextCapsule } from "../../runtime/context-capsule.js";

const COMMANDCODE_BIN = process.env.COMMANDCODE_BIN ?? "commandcode";

export function createCommandcodeCliAdapter() {
  return createExternalCliAdapter({
    id: "commandcode-cli",
    displayName: "Command Code",
    bin: COMMANDCODE_BIN,
    priority: 80,
    capabilities: {
      read: true,
      write: true,
      shell: true,
      mcp: false,
      patch: true,
      review: true,
      merge: false,
      vision: false,
    },
    buildArgs(capsule: ContextCapsule): string[] {
      const args = ["-p", capsule.task, "--skip-onboarding", "--trust"];
      const maxTurns = (capsule.node as unknown as { maxTurns?: number }).maxTurns;
      if (maxTurns != null && maxTurns > 0) {
        args.push("--max-turns", String(maxTurns));
      }
      return args;
    },
    buildEnv(): Record<string, string> {
      const nested = parseInt(process.env.OMK_NESTED_LEVEL ?? "0", 10);
      return {
        OMK_NESTED_LEVEL: String(nested + 1),
      };
    },
    parseResult(shellResult) {
      return {
        success: shellResult.exitCode === 0,
        exitCode: shellResult.exitCode,
        stdout: shellResult.stdout,
        stderr: shellResult.stderr,
        metadata: {
          runtime: "commandcode-cli",
          aborted: shellResult.exitCode === 130,
        },
      };
    },
  });
}
