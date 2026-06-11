import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { validateEvidenceBundle } from "../dist/evidence/bundle-validator.js";
import { createOmkCommandEnvelope, commandDiagnostic } from "../dist/util/command-envelope.js";
import { EvidenceBundleSchema, OmkCommandEnvelopeV1Schema } from "../dist/schema/index.js";

async function tempDir() {
  return mkdtemp(join(tmpdir(), "omk-contract-"));
}

function sha256(text) {
  return createHash("sha256").update(text).digest("hex");
}

test("omk.command.v1 envelope validates and carries diagnostics/evidence refs", () => {
  const envelope = createOmkCommandEnvelope({
    command: "provider doctor",
    status: "warn",
    data: { provider: "codex" },
    diagnostics: [commandDiagnostic("warn", "PROVIDER_RUNTIME_MISSING", "Codex CLI is not available", { remediation: "Install Codex CLI" })],
    evidenceRefs: [{ schemaVersion: "omk.evidence.v1", evidenceId: "ev-provider", runId: "run-1" }],
    runId: "run-1",
    commit: "abc123",
    exitCode: 0,
  });

  const parsed = OmkCommandEnvelopeV1Schema.parse(envelope);
  assert.equal(parsed.schemaVersion, "omk.command.v1");
  assert.equal(parsed.status, "warn");
  assert.equal(parsed.diagnostics[0].redacted, true);
  assert.equal(parsed.evidenceRefs[0].evidenceId, "ev-provider");
});

test("evidence bundle validator passes linked artifacts", async () => {
  const root = await tempDir();
  try {
    const artifactText = "tests passed\n";
    await writeFile(join(root, "test-output.log"), artifactText, "utf-8");
    const bundle = {
      schemaVersion: "omk.evidence-bundle.v1",
      runId: "run-1",
      nodeId: "node-1",
      commit: "abc123",
      provider: "codex",
      model: "local-cli",
      runtimeVersion: "v1.2",
      command: { value: "npm test", exitCode: 0 },
      changedFiles: ["src/example.ts"],
      artifacts: [{ path: "test-output.log", sha256: sha256(artifactText), required: true, kind: "log" }],
      verifier: { verdict: "pass", version: "validator-test", checkedAt: "2026-06-11T00:00:00.000Z" },
      redaction: { applied: true, summary: "no secret-shaped values" },
      decisionRefs: [{ schemaVersion: "omk.decision.v1", decisionId: "dec-1", runId: "run-1" }],
    };

    EvidenceBundleSchema.parse(bundle);
    const result = validateEvidenceBundle(bundle, { root, currentCommit: "abc123", requireDecisionRef: true });
    assert.equal(result.ok, true);
    assert.equal(result.verdict, "pass");
    assert.deepEqual(result.issues, []);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("evidence bundle validator fails closed on missing artifact, hash drift, stale commit, and leaked redaction", async () => {
  const root = await tempDir();
  try {
    await writeFile(join(root, "artifact.txt"), "actual", "utf-8");
    const bundle = {
      schemaVersion: "omk.evidence-bundle.v1",
      runId: "run-2",
      commit: "old-commit",
      provider: "deepseek",
      runtimeVersion: "v1.2",
      command: { value: "npm run check", exitCode: 1 },
      changedFiles: [],
      artifacts: [
        { path: "artifact.txt", sha256: sha256("expected"), required: true },
        { path: "missing.txt", sha256: sha256("missing"), required: true },
      ],
      verifier: { verdict: "fail", version: "validator-test" },
      redaction: { applied: true, summary: "leak detected", leakedSecretPatterns: ["api-key"] },
    };

    const result = validateEvidenceBundle(bundle, { root, currentCommit: "new-commit", requireDecisionRef: true });
    assert.equal(result.ok, false);
    assert.equal(result.verdict, "fail");
    assert.ok(result.issues.some((issue) => issue.kind === "hash_mismatch"));
    assert.ok(result.issues.some((issue) => issue.kind === "missing_artifact"));
    assert.ok(result.issues.some((issue) => issue.kind === "stale_commit"));
    assert.ok(result.issues.some((issue) => issue.kind === "redaction_violation"));
    assert.ok(result.issues.some((issue) => issue.kind === "unlinked_decision"));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("evidence bundle validator rejects absolute and traversal artifact paths before hashing", async () => {
  const root = await tempDir();
  try {
    const bundle = {
      schemaVersion: "omk.evidence-bundle.v1",
      runId: "run-3",
      commit: "abc123",
      provider: "codex",
      runtimeVersion: "v1.2",
      command: { value: "npm test", exitCode: 0 },
      changedFiles: [],
      artifacts: [
        { path: "../outside.txt", sha256: sha256("outside") },
        { path: join(root, "absolute.txt"), sha256: sha256("absolute") },
      ],
      verifier: { verdict: "pass", version: "validator-test" },
      redaction: { applied: true, summary: "clean" },
    };

    const result = validateEvidenceBundle(bundle, { root });
    assert.equal(result.ok, false);
    assert.equal(result.verdict, "fail");
    assert.equal(result.issues.filter((issue) => issue.kind === "missing_artifact").length, 2);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
