/**
 * OpenCodeCliAdapter — wraps the `opencode` CLI as an AgentRuntime.
 */

import { createExternalCliAdapter } from "../../runtime/external-cli-adapter.js";
import type { ContextCapsule } from "../../runtime/context-capsule.js";

const OPENCODE_BIN = process.env.OPENCODE_BIN ?? "opencode";

export function createOpencodeCliAdapter() {
  return createExternalCliAdapter({
    id: "opencode-cli",
    displayName: "OpenCode CLI",
    bin: OPENCODE_BIN,
    priority: 70,
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
      return ["run", "--print", capsule.task];
    },
  });
}
