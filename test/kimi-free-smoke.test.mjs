/**
 * Kimi-free smoke tests — verify OMK core structures work without Kimi CLI.
 */

import { describe, it } from "node:test";
import assert from "node:assert";

// These tests exercise the new runtime infrastructure directly.
// They do not spawn Kimi CLI subprocesses.

describe("RuntimeRegistry without Kimi", async () => {
  const { createRuntimeRegistry } = await import(
    "../dist/runtime/runtime-registry.js"
  );

  it("creates an empty registry", () => {
    const registry = createRuntimeRegistry();
    assert.deepStrictEqual(registry.list(), []);
  });

  it("registers and lists a mock runtime", () => {
    const registry = createRuntimeRegistry();
    const mock = {
      id: "mock-cli",
      priority: 50,
      supports() {
        return true;
      },
      async runNode() {
        return {
          success: true,
          exitCode: 0,
          stdout: "ok",
          stderr: "",
        };
      },
    };
    registry.register(mock);
    const listed = registry.list();
    assert.strictEqual(listed.length, 1);
    assert.strictEqual(listed[0].id, "mock-cli");
  });

  it("filters disabled runtimes", () => {
    const registry = createRuntimeRegistry();
    registry.register({
      id: "enabled-runtime",
      priority: 50,
      supports() {
        return true;
      },
      async runNode() {
        return { success: true, exitCode: 0, stdout: "", stderr: "" };
      },
    });
    registry.register({
      id: "disabled-runtime",
      priority: 40,
      supports() {
        return true;
      },
      async runNode() {
        return { success: true, exitCode: 0, stdout: "", stderr: "" };
      },
    });
    registry.disable("disabled-runtime");
    const listed = registry.list();
    assert.strictEqual(listed.length, 1);
    assert.strictEqual(listed[0].id, "enabled-runtime");
  });
});

describe("External CLI adapter factory", async () => {
  const { createExternalCliAdapter } = await import(
    "../dist/runtime/external-cli-adapter.js"
  );

  it("returns an AgentRuntime-shaped object", () => {
    const adapter = createExternalCliAdapter({
      id: "test-cli",
      displayName: "Test CLI",
      bin: "echo",
      priority: 50,
      capabilities: {
        read: true,
        write: false,
        shell: false,
        mcp: false,
        patch: false,
        review: false,
        merge: false,
        vision: false,
      },
      buildArgs(capsule) {
        return [capsule.task];
      },
    });

    assert.strictEqual(adapter.id, "test-cli");
    assert.strictEqual(adapter.displayName, "Test CLI");
    assert.strictEqual(adapter.priority, 50);
    assert.strictEqual(typeof adapter.health, "function");
    assert.strictEqual(typeof adapter.supports, "function");
    assert.strictEqual(typeof adapter.runNode, "function");
  });

  it("health reports unavailable for missing binary", async () => {
    const adapter = createExternalCliAdapter({
      id: "missing-cli",
      displayName: "Missing CLI",
      bin: "/definitely/not/a/real/binary-" + Date.now(),
      priority: 50,
      capabilities: {
        read: true,
        write: false,
        shell: false,
        mcp: false,
        patch: false,
        review: false,
        merge: false,
        vision: false,
      },
      buildArgs() {
        return [];
      },
    });

    const health = await adapter.health();
    assert.strictEqual(health.available, false);
    assert.strictEqual(health.runtimeId, "missing-cli");
    assert.ok(health.checkedAt);
  });
});

describe("Codex CLI runtime", async () => {
  const { createCodexCliRuntime } = await import(
    "../dist/runtime/codex-cli-runtime.js"
  );

  it("returns an AgentRuntime with correct id", () => {
    const runtime = createCodexCliRuntime({ cwd: "/tmp" });
    assert.strictEqual(runtime.id, "codex-cli");
    assert.strictEqual(runtime.priority, 60);
    assert.strictEqual(typeof runtime.supports, "function");
    assert.strictEqual(typeof runtime.runNode, "function");
  });
});

describe("OpenCode CLI adapter", async () => {
  const { createOpencodeCliAdapter } = await import(
    "../dist/adapters/opencode/opencode-cli-adapter.js"
  );

  it("returns an AgentRuntime with correct id", () => {
    const adapter = createOpencodeCliAdapter();
    assert.strictEqual(adapter.id, "opencode-cli");
    assert.strictEqual(adapter.priority, 70);
    assert.strictEqual(typeof adapter.health, "function");
    assert.strictEqual(typeof adapter.supports, "function");
    assert.strictEqual(typeof adapter.runNode, "function");
  });
});

describe("ProviderTaskRunner without kimiRunner", async () => {
  const { createProviderTaskRunner } = await import(
    "../dist/providers/provider-task-runner.js"
  );

  it("creates a runner when kimiRunner is omitted", () => {
    const runner = createProviderTaskRunner({
      deepseekRunner: undefined,
      providerRunners: {},
      providerPolicy: "auto",
    });
    assert.ok(runner);
    assert.strictEqual(typeof runner.run, "function");
  });
});
