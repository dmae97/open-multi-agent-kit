import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { capsuleToTask } from "../dist/runtime/context-broker-converter.js";

describe("AgentTask.safety", () => {
  it("injects top-level safety from DAG routing", async () => {
    const task = await capsuleToTask({
      runId: "run-safety-test",
      nodeId: "node-1",
      goal: "verify safety contract",
      system: "system",
      task: "implement a patch",
      dependencySummaries: [],
      relevantFiles: [],
      graphMemory: [],
      priorAttempts: [],
      evidenceRequirements: [{ gate: "summary", required: true }],
      budget: { maxInputTokens: 1000, reservedOutputTokens: 100, maxFileTokens: 100, maxToolResultTokens: 100, maxMemoryFacts: 0, compression: "none" },
      node: {
        id: "node-1",
        name: "implement a patch",
        role: "coder",
        dependsOn: [],
        status: "pending",
        retries: 0,
        maxRetries: 1,
        outputs: [{ name: "summary", gate: "summary", required: true }],
        routing: {
          risk: "write",
          evidenceRequired: true,
          approvalPolicy: "ask",
          sandboxMode: "workspace-write",
          assignedProviderAuthority: "authority",
          assignedProviderCapabilities: ["write", "patch"],
        },
      },
    });

    assert.equal(task.safety.risk, "write");
    assert.equal(task.safety.evidenceRequired, true);
    assert.equal(task.safety.approvalPolicy, "ask");
    assert.equal(task.safety.sandboxMode, "workspace-write");
    assert.equal(task.safety.authorityMode, "authority");
  });
});
