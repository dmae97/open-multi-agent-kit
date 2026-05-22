import test from "node:test";
import assert from "node:assert/strict";
import { KimiContinuePromptGuard } from "../dist/adapters/kimi/continue-prompt-guard.js";

test("detects safe continue prompt and returns sendEnter=true", () => {
  const guard = new KimiContinuePromptGuard();
  const result = guard.process("Press ENTER to continue...");
  assert.equal(result.sendEnter, true);
});

test("does not auto-enter unsafe prompts", () => {
  const guard = new KimiContinuePromptGuard();
  const result = guard.process("Approve this command? [y/n]");
  assert.equal(result.sendEnter, false);
});

test("exceeds maxAutoEnters after repeated prompts", () => {
  const guard = new KimiContinuePromptGuard({ maxAutoEnters: 2, cooldownMs: 0 });
  const r1 = guard.process("Press ENTER to continue...");
  assert.equal(r1.sendEnter, true);
  const r2 = guard.process("Press ENTER to continue...");
  assert.equal(r2.sendEnter, true);
  const r3 = guard.process("Press ENTER to continue...");
  assert.equal(r3.sendEnter, false);
  assert.equal(r3.exceeded, true);
});

test("respects cooldown between auto-enters", () => {
  let now = 2000;
  const guard = new KimiContinuePromptGuard({
    cooldownMs: 1000,
    now: () => now,
  });
  const r1 = guard.process("Press ENTER to continue...");
  assert.equal(r1.sendEnter, true);
  now = 2500;
  const r2 = guard.process("Press ENTER to continue...");
  assert.equal(r2.sendEnter, false);
});

test("strips ANSI before pattern matching", () => {
  const guard = new KimiContinuePromptGuard();
  const result = guard.process("\x1b[31mPress ENTER to continue...\x1b[0m");
  assert.equal(result.sendEnter, true);
});

test("resets tail after successful enter", () => {
  const guard = new KimiContinuePromptGuard();
  guard.process("Press ENTER to continue...");
  // If tail were not cleared, the combined string would still match the safe
  // pattern before the unsafe check, returning sendEnter=true.
  const result = guard.process("Approve?");
  assert.equal(result.sendEnter, false);
});
