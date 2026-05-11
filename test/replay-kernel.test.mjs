import { describe, it } from "node:test";
import assert from "node:assert";
import { mkdtempSync, writeFileSync, mkdirSync, rmSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";

const { createManifestBuilder } = await import("../dist/replay/manifest-builder.js");
const { diffRuns } = await import("../dist/replay/differ.js");

describe("replay-kernel", () => {
  it("builds a manifest from run artifacts", async () => {
    const dir = mkdtempSync(join(tmpdir(), "omk-replay-"));
    const runId = "test-run-2024";
    const runDir = join(dir, ".omk", "runs", runId);
    mkdirSync(runDir, { recursive: true });
    mkdirSync(join(runDir, "context-capsules"), { recursive: true });

    writeFileSync(join(runDir, "run.json"), JSON.stringify({ startedAt: "2024-01-01T00:00:00Z", status: "completed" }));
    writeFileSync(join(runDir, "dag.json"), JSON.stringify({ nodes: [{ id: "node-1" }] }));
    writeFileSync(
      join(runDir, "attempts.jsonl"),
      JSON.stringify({
        runId,
        nodeId: "node-1",
        attemptId: "node-1__1",
        runtime: "kimi-wire",
        model: "kimi-opus-4",
        startedAt: "2024-01-01T00:00:01Z",
        latencyMs: 1234,
        inputTokensEstimated: 1000,
        outputTokensEstimated: 500,
        toolResultTokensEstimated: 0,
        status: "success",
        contextHash: "abc",
        promptHash: "def",
        evidenceResults: [{ gate: "summary", passed: true }],
        changedFiles: ["src/foo.ts"],
        summary: "done",
        totalTokensEstimated: 1500,
        evidencePassCount: 1,
        evidenceFailCount: 0,
        evidencePassRate: 1,
        evidencePassRatePerToken: 0.00067,
      }) + "\n"
    );
    writeFileSync(join(runDir, "context-capsules", "node-1-node-1__1.json"), JSON.stringify({ files: [] }));

    const builder = createManifestBuilder({ runsDir: join(dir, ".omk", "runs") });
    const manifest = await builder.build(runId);

    assert.strictEqual(manifest.runId, runId);
    assert.strictEqual(manifest.nodes.length, 1);
    assert.strictEqual(manifest.nodes[0].nodeId, "node-1");
    assert.strictEqual(manifest.nodes[0].finalStatus, "success");
    assert.strictEqual(manifest.nodes[0].attempts.length, 1);
    assert.strictEqual(manifest.nodes[0].attempts[0].model, "kimi-opus-4");
    assert.strictEqual(manifest.summary.successCount, 1);

    rmSync(dir, { recursive: true, force: true });
  });

  it("validates a run directory", async () => {
    const dir = mkdtempSync(join(tmpdir(), "omk-replay-"));
    const runId = "test-run-2024";
    const runDir = join(dir, ".omk", "runs", runId);
    mkdirSync(runDir, { recursive: true });

    writeFileSync(join(runDir, "run.json"), JSON.stringify({}));
    writeFileSync(join(runDir, "dag.json"), JSON.stringify({}));
    writeFileSync(join(runDir, "attempts.jsonl"), "\n");

    const builder = createManifestBuilder({ runsDir: join(dir, ".omk", "runs") });
    const validation = await builder.validate(runId);
    assert.strictEqual(validation.valid, true);
    assert.strictEqual(validation.errors.length, 0);

    rmSync(dir, { recursive: true, force: true });
  });

  it("diffs two manifests", async () => {
    const report = await diffRuns("run-a", "run-b", "/tmp/omk-runs");
    assert.strictEqual(report.runA, "run-a");
    assert.strictEqual(report.runB, "run-b");
    assert.strictEqual(typeof report.dagHashMatch, "boolean");
    assert.ok(Array.isArray(report.entries));
  });
});
