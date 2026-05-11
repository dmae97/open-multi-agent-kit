import { describe, it } from "node:test";
import assert from "node:assert";
import { mkdtempSync, readFileSync, rmSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";

// ESM dynamic import for src modules (compiled to dist/)
const { createDecisionTraceStore } = await import("../dist/evidence/decision-trace.js");

describe("decision-trace", () => {
  it("records and loads decision traces", () => {
    const dir = mkdtempSync(join(tmpdir(), "omk-decision-"));
    const store = createDecisionTraceStore(dir);
    const runId = "test-run-1";

    store.record(runId, {
      component: "provider-router",
      inputSummary: "node=test role=coder",
      outputDecision: "provider=kimi",
      reason: "Kimi authority role",
      scores: { confidence: 0.9 },
      nodeId: "node-1",
      attemptId: "node-1__1",
    });

    store.record(runId, {
      component: "scheduler",
      inputSummary: "node=node-1 previous=running",
      outputDecision: "status=done",
      reason: "Node completed successfully",
      nodeId: "node-1",
      attemptId: "node-1__1",
    });

    const all = store.load(runId);
    assert.strictEqual(all.length, 2);
    assert.strictEqual(all[0].component, "provider-router");
    assert.strictEqual(all[1].component, "scheduler");

    const nodeTraces = store.loadForNode(runId, "node-1");
    assert.strictEqual(nodeTraces.length, 2);

    const attemptTraces = store.loadForAttempt(runId, "node-1__1");
    assert.strictEqual(attemptTraces.length, 2);

    rmSync(dir, { recursive: true, force: true });
  });
});
