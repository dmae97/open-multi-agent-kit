import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { buildNativeRootLoopTurnNode } from "../dist/commands/chat/native-root-loop.js";

describe("native prompt payload separation", () => {
  it("uses a redacted display label and private prompt artifact", async () => {
    const root = await mkdtemp(join(tmpdir(), "omk-prompt-payload-"));
    const prevCwd = process.cwd();
    process.chdir(root);
    try {
      const node = buildNativeRootLoopTurnNode({
        bootstrap: {
          ok: true,
          provider: "codex",
          providerPolicy: "codex",
          selectedProvider: "codex",
          selectedRuntimeId: "codex-cli",
          selectedModel: "codex-cli",
          sessionMode: "one-shot-cli",
          authOk: true,
          modelOk: true,
          runtimeOk: true,
          setupHints: [],
        },
        prompt: "implement a tiny patch with placeholder token-placeholder-abcdefghijklmnopqrstuvwxyz",
        nodeId: "turn-1",
        runId: "run-prompt-test",
      });

      assert.match(node.name, /^native turn:/);
      assert.doesNotMatch(node.name, /You are the OMK root coordinator/);
      assert.ok(node.routing?.promptHash);
      assert.equal(node.routing?.promptPayloadPrivate, true);
      assert.ok(node.routing?.promptPayloadRef);
      const artifact = await readFile(join(root, ".omk", "runs", "run-prompt-test", node.routing.promptPayloadRef), "utf8");
      const parsed = JSON.parse(artifact);
      assert.equal(parsed.schemaVersion, "omk.prompt-envelope.v1");
      assert.equal(parsed.promptHash, node.routing.promptHash);
      assert.match(parsed.compiledPrompt, /implement a tiny patch/);
    } finally {
      process.chdir(prevCwd);
      await rm(root, { recursive: true, force: true });
    }
  });
});
