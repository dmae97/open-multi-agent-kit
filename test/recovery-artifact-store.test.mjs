import test from "node:test";
import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { createRecoveryArtifactStore } from "../dist/runtime/recovery-artifact-store.js";

async function tempRoot() {
  return mkdtemp(join(tmpdir(), "omk-recovery-"));
}

test("RecoveryArtifactStore captures redacted failure artifacts", async () => {
  const root = await tempRoot();
  try {
    const sessionFile = join(root, "session.txt");
    await writeFile(sessionFile, "session-state", "utf8");
    const token = ["sk", "123456789012345678901234"].join("-");
    const store = createRecoveryArtifactStore({ root, maxLogBytes: 4096 });

    const ref = await store.captureFailure({
      runId: "run-1",
      provider: "codex/cli",
      nodeId: "node:1",
      attemptId: "attempt/1",
      failureKind: "provider_error",
      exitCode: 1,
      cwd: root,
      command: ["codex", "exec", `--token=${token}`],
      stdout: `hello ${token}`,
      stderr: `boom ${token}`,
      sessionPaths: [sessionFile],
      metadata: { providerMessage: token },
    });

    assert.equal(ref.schemaVersion, "omk.recovery-artifact.v1");
    assert.equal(ref.provider, "codex-cli");
    assert.equal(ref.nodeId, "node-1");

    const manifestRaw = await readFile(ref.manifestPath, "utf8");
    const stdoutRaw = await readFile(join(ref.dir, "stdout.log"), "utf8");
    const stderrRaw = await readFile(join(ref.dir, "stderr.redacted.log"), "utf8");
    assert.doesNotMatch(manifestRaw, new RegExp(token));
    assert.doesNotMatch(stdoutRaw, new RegExp(token));
    assert.doesNotMatch(stderrRaw, new RegExp(token));

    const manifest = JSON.parse(manifestRaw);
    assert.equal(manifest.failureKind, "provider_error");
    assert.equal(manifest.logs.stdout.path, "stdout.log");
    assert.equal(manifest.logs.stderr.redacted, true);
    assert.equal(manifest.sessionHandle.count, 1);

    const session = JSON.parse(await readFile(ref.sessionHandlePath, "utf8"));
    assert.equal(session.schemaVersion, "omk.recovery-session.v1");
    assert.equal(session.sessionPaths[0].kind, "file");
    assert.equal(session.sessionPaths[0].copied, false);
    assert.match(session.sessionPaths[0].sha256, /^[a-f0-9]{64}$/u);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("RecoveryArtifactStore records symlink session handles without dereferencing", async () => {
  const root = await tempRoot();
  try {
    const outside = join(root, "outside-secret.txt");
    const link = join(root, "session-link");
    await writeFile(outside, "outside", "utf8");
    await symlink(outside, link);

    const store = createRecoveryArtifactStore({ root });
    const ref = await store.captureFailure({
      runId: "run-2",
      provider: "kimi",
      nodeId: "n1",
      failureKind: "quota",
      sessionPaths: [link],
    });

    const session = JSON.parse(await readFile(ref.sessionHandlePath, "utf8"));
    assert.equal(session.sessionPaths[0].kind, "symlink");
    assert.equal(session.sessionPaths[0].copied, false);
    assert.equal(session.sessionPaths[0].sha256, undefined);
    assert.equal(session.sessionPaths[0].target, outside);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("RecoveryArtifactStore cleanup removes scoped recovery artifacts", async () => {
  const root = await tempRoot();
  try {
    await mkdir(join(root, ".omk"), { recursive: true });
    const store = createRecoveryArtifactStore({ root });
    const ref = await store.captureFailure({
      runId: "run-3",
      provider: "deepseek",
      nodeId: "n1",
      failureKind: "timeout",
      stdout: "partial",
    });

    assert.ok(await readFile(ref.manifestPath, "utf8"));
    await store.cleanup({ runId: "run-3", provider: "deepseek", nodeId: "n1" });
    await assert.rejects(readFile(ref.manifestPath, "utf8"));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("RecoveryArtifactStore rejects invalid run IDs", async () => {
  const root = await tempRoot();
  try {
    const store = createRecoveryArtifactStore({ root });
    await assert.rejects(
      store.captureFailure({ runId: "../bad", provider: "codex", nodeId: "n1", failureKind: "unknown" }),
      /Invalid runId/u,
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
