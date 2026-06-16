#!/usr/bin/env node
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { decideToolAuthority } from "../dist/safety/tool-authority-gate.js";

const cases = [
  {
    name: "enforce read prompt passes",
    mode: "enforce",
    ctx: { op: "read", writeAuthority: "none", shellAuthority: "none", approvalPolicy: "interactive", sandboxMode: "read-only", tty: false },
    expected: "allow",
  },
  {
    name: "enforce write prompt without authority blocks",
    mode: "enforce",
    ctx: { op: "write", writeAuthority: "none", shellAuthority: "none", approvalPolicy: "auto", sandboxMode: "workspace-write", tty: false },
    expected: "block",
  },
  {
    name: "enforce shell prompt in read-only sandbox blocks",
    mode: "enforce",
    ctx: { op: "shell", writeAuthority: "full", shellAuthority: "full", approvalPolicy: "auto", sandboxMode: "read-only", tty: false },
    expected: "block",
  },
  {
    name: "warn mode would diagnose but pure decision still blocks insufficient authority",
    mode: "warn",
    ctx: { op: "write", writeAuthority: "none", shellAuthority: "none", approvalPolicy: "auto", sandboxMode: "workspace-write", tty: false },
    expected: "block",
  },
  {
    name: "shadow mode records trace only; authority-sufficient auto write allows",
    mode: "shadow",
    ctx: { op: "write", writeAuthority: "full", shellAuthority: "none", approvalPolicy: "auto", sandboxMode: "workspace-write", tty: false },
    expected: "allow",
  },
];

const results = [];
for (const testCase of cases) {
  const actual = decideToolAuthority(testCase.ctx);
  assert.equal(actual, testCase.expected, testCase.name);
  results.push({ ...testCase, actual, passed: true });
}

const outDir = join(process.cwd(), "proof", "authority-smoke");
await mkdir(outDir, { recursive: true });
await writeFile(join(outDir, "authority-smoke.json"), JSON.stringify({ schemaVersion: "omk.authority-smoke.v1", results }, null, 2), "utf8");
console.log(`authority smoke passed (${results.length}/${results.length}); artifact=proof/authority-smoke/authority-smoke.json`);
