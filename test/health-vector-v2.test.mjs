import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createRuntimeRouter } from "../dist/runtime/runtime-router.js";

describe("Runtime health vector v2", () => {
  it("penalizes unknown health less than fail and filters failed hard dimensions", async () => {
    const calls = [];
    const unknown = fakeRuntime("unknown-cli", calls, {
      runtimeId: "unknown-cli",
      available: true,
      checkedAt: new Date().toISOString(),
      vector: {
        runtime: "unknown",
        auth: "unknown",
        model: "unknown",
        quota: "unknown",
        rateLimit: "unknown",
        lastProbeKind: "none",
        checkedAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 60_000).toISOString(),
      },
    });
    const failed = fakeRuntime("failed-cli", calls, {
      runtimeId: "failed-cli",
      available: true,
      checkedAt: new Date().toISOString(),
      vector: {
        runtime: "fail",
        auth: "pass",
        model: "pass",
        quota: "pass",
        rateLimit: "pass",
        lastProbeKind: "static",
        checkedAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 60_000).toISOString(),
      },
    });

    const router = createRuntimeRouter({ runtimes: [failed, unknown] });
    const result = await router.execute(fakeTask());
    assert.equal(result.exitCode, 0);
    assert.equal(result.metadata.selectedRuntime, "unknown-cli");
    assert.deepEqual(calls, ["unknown-cli"]);
  });
});

function fakeRuntime(id, calls, health) {
  return {
    id,
    providerId: id.split("-")[0],
    runtimeMode: "cli",
    priority: 50,
    capabilities: { read: true, write: false, shell: false, mcp: false, patch: false, review: true, merge: false, vision: false },
    supports: () => true,
    health: async () => health,
    async runNode() {
      return { success: true, exitCode: 0, stdout: id, stderr: "", metadata: { runtime: id } };
    },
    async execute() {
      calls.push(id);
      return { output: id, exitCode: 0, metadata: { runtime: id } };
    },
  };
}

function fakeTask() {
  return {
    prompt: "review this change",
    context: { runId: "health-v2", nodeId: "node", role: "reviewer", goal: "health", system: "", cwd: process.cwd() },
    tools: { available: [] },
    providerPolicy: { strategy: "priority-first", preferredProviders: [], fallbackChain: [] },
    capabilities: { read: true, write: false, shell: false, mcp: false, patch: false, review: true, merge: false, vision: false },
    safety: { risk: "read", approvalPolicy: "ask", sandboxMode: "read-only", evidenceRequired: false, authorityMode: "advisory" },
  };
}
