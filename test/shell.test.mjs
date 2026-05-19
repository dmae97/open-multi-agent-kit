import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { checkCommand, runShell, runShellStreaming, which } from "../dist/util/shell.js";

test("checkCommand detects node on PATH", async () => {
  assert.equal(await checkCommand("node"), true);
});

test("which resolves node on PATH", async () => {
  const result = await which("node");
  assert.equal(result.failed, false, result.stderr || result.stdout);
  assert.match(result.stdout, /node/i);
});


test("checkCommand and which accept absolute executable paths", async () => {
  assert.equal(await checkCommand(process.execPath), true);
  const result = await which(process.execPath);
  assert.equal(result.failed, false, result.stderr || result.stdout);
  assert.equal(result.stdout, process.execPath);
});

test("checkCommand returns false for missing commands", async () => {
  assert.equal(await checkCommand("omk-command-that-should-not-exist"), false);
});

test("runShellStreaming closes stdin when input is provided", async () => {
  const result = await runShellStreaming(
    process.execPath,
    ["-e", "process.stdin.resume(); process.stdin.on('end', () => console.log('stdin-closed'));"],
    { input: "", timeout: 1000 }
  );

  assert.equal(result.exitCode, 0);
  assert.match(result.stdout, /stdin-closed/);
});

test("runShell redacts secret-looking output in results and logPath", async () => {
  const tempDir = await mkdtemp(join(tmpdir(), "omk-shell-redaction-"));
  const logPath = join(tempDir, "shell.log");
  const fakeToken = ["sk", "123456789012345678901234"].join("-");
  try {
    const result = await runShell(
      process.execPath,
      ["--eval", `console.log(${JSON.stringify(fakeToken)}); console.error("TOKEN=${fakeToken}")`],
      { logPath }
    );
    const logContent = await readFile(logPath, "utf-8");
    assert.equal(result.exitCode, 0);
    assert.doesNotMatch(result.stdout, new RegExp(fakeToken));
    assert.doesNotMatch(logContent, new RegExp(fakeToken));
    assert.match(`${result.stdout}\n${result.stderr}\n${logContent}`, /REDACTED/);
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
});

test("runShell does not inherit ambient secret env by default", async () => {
  const previous = process.env.OMK_FAKE_SECRET_FOR_SHELL_TEST;
  process.env.OMK_FAKE_SECRET_FOR_SHELL_TEST = "fixture-secret-value";
  try {
    const result = await runShell(
      process.execPath,
      ["--eval", "console.log(process.env.OMK_FAKE_SECRET_FOR_SHELL_TEST || 'missing')"],
      { timeout: 1000 }
    );
    assert.equal(result.exitCode, 0);
    assert.equal(result.stdout.trim(), "missing");
  } finally {
    if (previous === undefined) {
      delete process.env.OMK_FAKE_SECRET_FOR_SHELL_TEST;
    } else {
      process.env.OMK_FAKE_SECRET_FOR_SHELL_TEST = previous;
    }
  }
});

test("runShell ignores ambient OMK_SUDO without explicit CLI sudo request", async () => {
  const previousSudo = process.env.OMK_SUDO;
  const previousCliSudo = process.env.OMK_CLI_SUDO_REQUEST;
  process.env.OMK_SUDO = "1";
  delete process.env.OMK_CLI_SUDO_REQUEST;
  try {
    const result = await runShell(
      process.execPath,
      ["--eval", "console.log('ok')"],
      { timeout: 1000 }
    );
    assert.equal(result.exitCode, 0, result.stderr || result.stdout);
    assert.equal(result.stdout.trim(), "ok");
  } finally {
    if (previousSudo === undefined) delete process.env.OMK_SUDO;
    else process.env.OMK_SUDO = previousSudo;
    if (previousCliSudo === undefined) delete process.env.OMK_CLI_SUDO_REQUEST;
    else process.env.OMK_CLI_SUDO_REQUEST = previousCliSudo;
  }
});

test("runShell refuses sudo for scriptable package managers", async () => {
  await assert.rejects(
    () => runShell("npm", ["--version"], { sudo: true }),
    /sudo allowlist/
  );
});
