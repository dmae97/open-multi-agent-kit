import test from "node:test";
import assert from "node:assert/strict";

const {
  resolveOuroborosMode,
  detectOuroborosAvailable,
  resolveOuroborosDecision,
} = await import("../dist/runtime/ouroboros-policy.js");

// ── resolveOuroborosMode ────────────────────────────────────────────

test("mode defaults to always when env is unset", () => {
  assert.equal(resolveOuroborosMode({}), "always");
});

test("mode=off for OMK_OUROBOROS=off/0/false", () => {
  assert.equal(resolveOuroborosMode({ OMK_OUROBOROS: "off" }), "off");
  assert.equal(resolveOuroborosMode({ OMK_OUROBOROS: "0" }), "off");
  assert.equal(resolveOuroborosMode({ OMK_OUROBOROS: "false" }), "off");
  assert.equal(resolveOuroborosMode({ OMK_OUROBOROS: "OFF" }), "off");
});

test("mode=auto for OMK_OUROBOROS=auto", () => {
  assert.equal(resolveOuroborosMode({ OMK_OUROBOROS: "auto" }), "auto");
});

test("mode=always for OMK_OUROBOROS=always or random", () => {
  assert.equal(resolveOuroborosMode({ OMK_OUROBOROS: "always" }), "always");
  assert.equal(resolveOuroborosMode({ OMK_OUROBOROS: "something" }), "always");
});

// ── detectOuroborosAvailable ────────────────────────────────────────

test("detect via mcp: finds ouroboros server in config", async () => {
  // Write a temp config with ouroboros server entry
  const { mkdtemp, writeFile, rm } = await import("node:fs/promises");
  const { join } = await import("node:path");
  const tmp = await mkdtemp("/tmp/omk-ourob-test-");
  const cfgPath = join(tmp, "mcp.json");
  await writeFile(
    cfgPath,
    JSON.stringify({ mcpServers: { ouroboros: { command: "ooo", args: [] } } }),
  );
  try {
    const result = await detectOuroborosAvailable({ mcpConfigPath: cfgPath });
    assert.equal(result.available, true);
    assert.equal(result.via, "mcp");
    assert.match(result.detail, /ouroboros server found/);
  } finally {
    await rm(tmp, { recursive: true, force: true });
  }
});

test("detect via binary: finds ouroboros via which", async () => {
  const result = await detectOuroborosAvailable({
    which: async () => "/usr/local/bin/ouroboros",
  });
  assert.equal(result.available, true);
  assert.equal(result.via, "binary");
});

test("detect returns none when nothing found", async () => {
  const result = await detectOuroborosAvailable({
    which: async () => null,
    mcpConfigPath: "/nonexistent/path/mcp.json",
  });
  assert.equal(result.available, false);
  assert.equal(result.via, "none");
});

test("detect never throws on malformed config", async () => {
  const { mkdtemp, writeFile, rm } = await import("node:fs/promises");
  const { join } = await import("node:path");
  const tmp = await mkdtemp("/tmp/omk-ourob-test-");
  const cfgPath = join(tmp, "bad.json");
  await writeFile(cfgPath, "NOT JSON {{{");
  try {
    const result = await detectOuroborosAvailable({ mcpConfigPath: cfgPath });
    assert.equal(result.available, false);
    assert.equal(result.via, "none");
  } finally {
    await rm(tmp, { recursive: true, force: true });
  }
});

// ── resolveOuroborosDecision ────────────────────────────────────────

test("use=true when always + available + goal intent", async () => {
  const decision = await resolveOuroborosDecision({
    intent: "implement the login feature",
    env: {},
    detect: async () => ({ available: true, via: "mcp", detail: "ok" }),
  });
  assert.equal(decision.use, true);
  assert.equal(decision.mode, "always");
  assert.equal(decision.reason, "ouroboros-routing-active");
});

test("use=false when mode=off regardless of availability", async () => {
  const decision = await resolveOuroborosDecision({
    intent: "plan the architecture",
    env: { OMK_OUROBOROS: "off" },
    detect: async () => ({ available: true, via: "mcp", detail: "ok" }),
  });
  assert.equal(decision.use, false);
  assert.equal(decision.mode, "off");
  assert.equal(decision.reason, "ouroboros-mode-off");
});

test("use=false fallback when always + unavailable", async () => {
  const decision = await resolveOuroborosDecision({
    intent: "build the seed spec",
    env: {},
    detect: async () => ({ available: false, via: "none", detail: "not found" }),
  });
  assert.equal(decision.use, false);
  assert.equal(decision.mode, "always");
  assert.equal(decision.reason, "ouroboros-unavailable-fallback-native");
});

test("use=false for non-goal intent even when available", async () => {
  const decision = await resolveOuroborosDecision({
    intent: "what is the weather today?",
    env: {},
    detect: async () => ({ available: true, via: "mcp", detail: "ok" }),
  });
  assert.equal(decision.use, false);
  assert.equal(decision.reason, "intent-not-goal-like");
});

test("Korean goal intent triggers use=true", async () => {
  const decision = await resolveOuroborosDecision({
    intent: "이 기능의 계획을 세워줘",
    env: {},
    detect: async () => ({ available: true, via: "mcp", detail: "ok" }),
  });
  assert.equal(decision.use, true);
});

test("detection failure never throws — falls back to native", async () => {
  const decision = await resolveOuroborosDecision({
    intent: "implement the feature",
    env: {},
    detect: async () => {
      throw new Error("boom");
    },
  });
  assert.equal(decision.use, false);
  assert.equal(decision.reason, "ouroboros-unavailable-fallback-native");
});

test("auto mode + available + goal intent => use=true", async () => {
  const decision = await resolveOuroborosDecision({
    intent: "spec out the new module",
    env: { OMK_OUROBOROS: "auto" },
    detect: async () => ({ available: true, via: "binary", detail: "/usr/bin/ooo" }),
  });
  assert.equal(decision.use, true);
  assert.equal(decision.mode, "auto");
});
