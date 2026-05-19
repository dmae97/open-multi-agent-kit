import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { createEvidenceRecorder } from "../dist/evidence/evidence-recorder.js";
import { createAttemptRecorder } from "../dist/providers/attempt-recorder.js";
import { createStatePersister } from "../dist/orchestration/state-persister.js";
import { appendEvent, readEvents } from "../dist/util/events-logger.js";

test("runtime state, evidence, attempts, and events redact secret-looking strings", async () => {
  const tempDir = await mkdtemp(join(tmpdir(), "omk-runtime-redaction-"));
  const runsDir = join(tempDir, "runs");
  const runId = "run-redaction";
  const token = ["sk", "123456789012345678901234"].join("-");
  try {
    const statePersister = createStatePersister(runsDir);
    await statePersister.save({
      runId,
      nodes: { n1: { thinking: `OPENAI_API_KEY=${token}` } },
      schemaVersion: 1,
    });
    const stateRaw = await readFile(join(runsDir, runId, "state.json"), "utf-8");
    assert.doesNotMatch(stateRaw, new RegExp(token));
    const loaded = await statePersister.load(runId);
    assert.doesNotMatch(JSON.stringify(loaded), new RegExp(token));

    const evidence = createEvidenceRecorder({ runsDir });
    evidence.recordAttempt({ runId, nodeId: "n1", attempt: 1, provider: "kimi", status: "failed", failureSummary: token });
    evidence.recordEvidence(runId, "n1", "a1", [{ gate: "command-pass", passed: false, message: token }]);
    evidence.saveContextSnapshot(runId, "n1", "a1", { task: token });

    const attempts = createAttemptRecorder({ runsDir });
    attempts.record({ runId, nodeId: "n1", attempt: 2, providerId: "kimi", startedAt: new Date().toISOString(), success: false, fallbackReason: token });

    const runDir = join(runsDir, runId);
    await appendEvent(runDir, { type: "state-change", runId, data: { thinking: token } });
    const events = await readEvents(runDir);

    for (const relativePath of [
      "attempts.jsonl",
      "evidence.jsonl",
      join("context-capsules", "n1-a1.json"),
      "events.jsonl",
    ]) {
      const content = await readFile(join(runDir, relativePath), "utf-8");
      assert.doesNotMatch(content, new RegExp(token), relativePath);
      assert.match(content, /REDACTED|\*\*\*/, relativePath);
    }
    assert.doesNotMatch(JSON.stringify(events), new RegExp(token));
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
});
