import test from "node:test";
import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const {
  normalizePromptForLoopGuard,
  isVerificationPrompt,
  hashPrompt,
  evaluatePreOrchestrationGuard,
} = await import("../dist/orchestration/loop-guard.js");

test("normalizePromptForLoopGuard trims, collapses whitespace, removes prefixes and trailing punctuation, lowercases", () => {
  assert.equal(normalizePromptForLoopGuard("  Hello   World  "), "hello world");
  assert.equal(normalizePromptForLoopGuard("다시 확인해줘!"), "확인해줘");
  assert.equal(normalizePromptForLoopGuard("한번 더 합시다."), "더 합시다");
  assert.equal(normalizePromptForLoopGuard("또 테스트??"), "테스트");
  assert.equal(normalizePromptForLoopGuard("계속해!!!"), "계속해");
  assert.equal(normalizePromptForLoopGuard("CONTINUE"), "continue");
});

test("isVerificationPrompt returns true for known verification phrases", () => {
  assert.equal(isVerificationPrompt("제대로 고쳐졌는지 확인"), true);
  assert.equal(isVerificationPrompt("확인해줘"), true);
  assert.equal(isVerificationPrompt("검증해줘"), true);
  assert.equal(isVerificationPrompt("타입체크 확인"), true);
  assert.equal(isVerificationPrompt("제대로 됐는지 봐줘"), true);
  assert.equal(isVerificationPrompt("잘 되었는지 확인"), true);
  assert.equal(isVerificationPrompt("그냥 계속해"), false);
  assert.equal(isVerificationPrompt("새로운 기능 추가"), false);
});

test("hashPrompt is stable for identical inputs", () => {
  const h1 = hashPrompt("  Hello   World  ");
  const h2 = hashPrompt("Hello World");
  assert.equal(h1, h2);
  assert.equal(typeof h1, "string");
  assert.equal(h1.length, 64);
});

test("evaluatePreOrchestrationGuard returns new-run for fresh prompt", async () => {
  const root = await mkdtemp(join(tmpdir(), "omk-loop-guard-"));
  try {
    const decision = await evaluatePreOrchestrationGuard({
      root,
      rawPrompt: "implement new feature",
    });
    assert.equal(decision.action, "new-run");
    assert.equal(decision.reason, "new-intent");
    assert.equal(decision.confidence, 0.9);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("evaluatePreOrchestrationGuard returns continue for explicit continue", async () => {
  const root = await mkdtemp(join(tmpdir(), "omk-loop-guard-"));
  try {
    for (const prompt of ["계속해", "continue", "계속해!!!"]) {
      const decision = await evaluatePreOrchestrationGuard({
        root,
        rawPrompt: prompt,
      });
      assert.equal(decision.action, "continue");
      assert.equal(decision.reason, "explicit-continue");
      assert.equal(decision.confidence, 0.9);
    }
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("evaluatePreOrchestrationGuard returns verify-only for verification prompt with completed sentinel", async () => {
  const root = await mkdtemp(join(tmpdir(), "omk-loop-guard-"));
  try {
    const runId = "run-1";
    const sentinelDir = join(root, ".omk", "runs", runId);
    await mkdir(sentinelDir, { recursive: true });
    await writeFile(join(sentinelDir, "completion-sentinel.json"), JSON.stringify({ status: "completed" }), "utf-8");

    const decision = await evaluatePreOrchestrationGuard({
      root,
      rawPrompt: "확인해줘",
      runId,
    });
    assert.equal(decision.action, "verify-only");
    assert.equal(decision.reason, "explicit-verification");
    assert.equal(decision.confidence, 0.9);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("evaluatePreOrchestrationGuard returns continue for verification prompt without completed sentinel", async () => {
  const root = await mkdtemp(join(tmpdir(), "omk-loop-guard-"));
  try {
    const decision = await evaluatePreOrchestrationGuard({
      root,
      rawPrompt: "확인해줘",
    });
    assert.equal(decision.action, "continue");
    assert.equal(decision.reason, "explicit-verification");
    assert.equal(decision.confidence, 0.7);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("evaluatePreOrchestrationGuard returns continue for duplicate prompt without completed sentinel", async () => {
  const root = await mkdtemp(join(tmpdir(), "omk-loop-guard-"));
  try {
    const rawPrompt = "fix the bug";
    const previousPrompts = [{ hash: hashPrompt(rawPrompt), normalized: normalizePromptForLoopGuard(rawPrompt), at: new Date().toISOString() }];
    const decision = await evaluatePreOrchestrationGuard({
      root,
      rawPrompt,
      previousPrompts,
    });
    assert.equal(decision.action, "continue");
    assert.equal(decision.reason, "duplicate-prompt");
    assert.equal(decision.confidence, 0.8);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("evaluatePreOrchestrationGuard returns stop for duplicate prompt with completed sentinel", async () => {
  const root = await mkdtemp(join(tmpdir(), "omk-loop-guard-"));
  try {
    const runId = "run-1";
    const sentinelDir = join(root, ".omk", "runs", runId);
    await mkdir(sentinelDir, { recursive: true });
    await writeFile(join(sentinelDir, "completion-sentinel.json"), JSON.stringify({ status: "completed" }), "utf-8");

    const rawPrompt = "fix the bug";
    const previousPrompts = [{ hash: hashPrompt(rawPrompt), normalized: normalizePromptForLoopGuard(rawPrompt), at: new Date().toISOString() }];
    const decision = await evaluatePreOrchestrationGuard({
      root,
      rawPrompt,
      runId,
      previousPrompts,
    });
    assert.equal(decision.action, "stop");
    assert.equal(decision.reason, "duplicate-confirmation-after-completed-run");
    assert.equal(decision.confidence, 0.95);
    assert.equal(decision.visibleMessage, "검증 완료 상태입니다. 추가 실행 없음.");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("evaluatePreOrchestrationGuard checks goal sentinel", async () => {
  const root = await mkdtemp(join(tmpdir(), "omk-loop-guard-"));
  try {
    const goalId = "goal-1";
    const sentinelDir = join(root, ".omk", "goals", goalId);
    await mkdir(sentinelDir, { recursive: true });
    await writeFile(join(sentinelDir, "completion-sentinel.json"), JSON.stringify({ status: "completed" }), "utf-8");

    const decision = await evaluatePreOrchestrationGuard({
      root,
      rawPrompt: "확인해줘",
      goalId,
    });
    assert.equal(decision.action, "verify-only");
    assert.equal(decision.reason, "explicit-verification");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
