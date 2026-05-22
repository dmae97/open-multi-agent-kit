import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { runShellStreaming } from "../dist/util/shell.js";

test("runShellStreaming reactive stdin sends enter on continue prompt", async () => {
  const tempDir = await mkdtemp(join(tmpdir(), "omk-shell-continue-"));
  const scriptPath = join(tempDir, "fake-script.js");
  try {
    await writeFile(
      scriptPath,
      `process.stdout.write("Working...\\n");
process.stdout.write("Press ENTER to continue...");
process.stdin.once("data", () => {
  process.stdout.write("\\ncontinued\\n");
  process.exit(0);
});
setInterval(() => {}, 5000);
`
    );

    let sentEnter = false;
    const result = await runShellStreaming(
      process.execPath,
      [scriptPath],
      {
        timeout: 5000,
        onStdout(line, io) {
          if (line.includes("Press ENTER to continue...") && io && !sentEnter) {
            sentEnter = true;
            io.writeStdin("\n");
          }
        },
      }
    );

    assert.equal(result.exitCode, 0, result.stderr || result.stdout);
    assert.match(result.stdout, /continued/);
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
});
