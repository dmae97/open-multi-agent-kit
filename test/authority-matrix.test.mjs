import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  authoritiesForRuntime,
  runtimeIsAdvisory,
  runtimeSatisfiesAuthority,
} from "../dist/runtime/authority-matrix.js";

describe("runtime-mode authority matrix", () => {
  it("marks kimi:api as advisory read/review, not write authority", () => {
    const runtime = {
      id: "kimi-api",
      providerId: "kimi",
      runtimeMode: "api",
      capabilities: { read: true, review: true, write: false, patch: false, shell: false, mcp: false, merge: false, vision: true },
    };
    assert.equal(runtimeIsAdvisory(runtime), true);
    assert.deepEqual(authoritiesForRuntime(runtime), ["read", "review", "vision", "toolCalling"]);
  });

  it("blocks advisory API runtime for write authority", () => {
    const runtime = {
      id: "deepseek-api",
      providerId: "deepseek",
      runtimeMode: "api",
      capabilities: { read: true, review: true, write: false, patch: false, shell: false, mcp: false, merge: false, vision: false },
    };
    const task = {
      capabilities: { read: true, write: true, patch: true, shell: false, mcp: false, merge: false, review: false, vision: false },
    };
    const result = runtimeSatisfiesAuthority(runtime, task);
    assert.equal(result.ok, false);
    assert.ok(result.missing.includes("write"));
    assert.ok(result.missing.includes("patch"));
  });

  it("allows bounded CLI runtime for write/patch/shell but not merge", () => {
    const runtime = {
      id: "codex-cli",
      providerId: "codex",
      runtimeMode: "cli",
      capabilities: { read: true, review: true, write: true, patch: true, shell: true, mcp: false, merge: false, vision: false },
    };
    const writeTask = {
      capabilities: { read: true, write: true, patch: true, shell: true, mcp: false, merge: false, review: false, vision: false },
    };
    assert.equal(runtimeSatisfiesAuthority(runtime, writeTask).ok, true);

    const mergeTask = {
      capabilities: { read: true, write: true, patch: true, shell: true, mcp: false, merge: true, review: false, vision: false },
    };
    assert.equal(runtimeSatisfiesAuthority(runtime, mergeTask).ok, false);
  });
});
