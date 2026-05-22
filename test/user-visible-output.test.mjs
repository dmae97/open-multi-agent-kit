import test from "node:test";
import assert from "node:assert/strict";

const {
  CONTROL_PLANE_LEAK_PATTERNS,
  sanitizeUserVisibleOutput,
  isControlPlaneLeak,
  getSafeSummary,
} = await import("../dist/util/user-visible-output.js");

test("CONTROL_PLANE_LEAK_PATTERNS is a non-empty array of RegExp", () => {
  assert.ok(Array.isArray(CONTROL_PLANE_LEAK_PATTERNS));
  assert.ok(CONTROL_PLANE_LEAK_PATTERNS.length > 0);
  assert.ok(CONTROL_PLANE_LEAK_PATTERNS.every((p) => p instanceof RegExp));
});

test("isControlPlaneLeak detects Korean repeated-prompt variants", () => {
  assert.equal(
    isControlPlaneLeak("사용자가 반복적으로 동일한 프롬프트를 복내고 있습니다"),
    true
  );
  assert.equal(
    isControlPlaneLeak("사용자가 반복적으로 동일한 프롬프트를 복사하고 있습니다"),
    true
  );
  assert.equal(
    isControlPlaneLeak("사용자가 반복적으로 동일한 프롬프트를 붙여넣고 있습니다"),
    true
  );
});

test("isControlPlaneLeak detects Korean automated loop", () => {
  assert.equal(isControlPlaneLeak("이는 자동화된 루프입니다"), true);
});

test("isControlPlaneLeak detects Korean STOP instruction", () => {
  assert.equal(isControlPlaneLeak("계속 STOP을 선택해야 합니다"), true);
});

test("isControlPlaneLeak detects Korean task-completed with list", () => {
  assert.equal(
    isControlPlaneLeak("작업은 이미 완료되었습니다\n- 항목 1"),
    true
  );
  assert.equal(
    isControlPlaneLeak("작업은 이미 완료되었습니다\n1. 항목"),
    true
  );
  // Without a list, it should not match
  assert.equal(isControlPlaneLeak("작업은 이미 완료되었습니다"), false);
});

test("isControlPlaneLeak detects Korean standalone STOP selection", () => {
  assert.equal(isControlPlaneLeak("STOP을 선택"), true);
});

test("isControlPlaneLeak detects English meta-text patterns", () => {
  assert.equal(
    isControlPlaneLeak("The model may report evidence of completion"),
    true
  );
  assert.equal(
    isControlPlaneLeak("The runtime decides stop/continue based on context"),
    true
  );
});

test("isControlPlaneLeak detects Loop Guard and Decision JSON lines", () => {
  assert.equal(
    isControlPlaneLeak("Loop Guard: {\"action\": \"stop\"}"),
    true
  );
  assert.equal(
    isControlPlaneLeak("Decision: {\"continue\": false}"),
    true
  );
  // Without braces should not match
  assert.equal(isControlPlaneLeak("Loop Guard: something"), false);
});

test("isControlPlaneLeak returns false for normal user-facing output", () => {
  assert.equal(isControlPlaneLeak("Hello, how can I help you?"), false);
  assert.equal(isControlPlaneLeak("안녕하세요. 무엇을 도와드릴까요?"), false);
  assert.equal(isControlPlaneLeak("The task is complete."), false);
  assert.equal(isControlPlaneLeak("STOP"), false);
});

test("sanitizeUserVisibleOutput returns safe summary when leak detected", () => {
  const safe = getSafeSummary();
  assert.equal(
    sanitizeUserVisibleOutput("사용자가 반복적으로 동일한 프롬프트를 복내고 있습니다"),
    safe
  );
  assert.equal(
    sanitizeUserVisibleOutput("The model may report evidence"),
    safe
  );
  assert.equal(
    sanitizeUserVisibleOutput("Loop Guard: {\"stop\": true}"),
    safe
  );
});

test("sanitizeUserVisibleOutput returns original value when no leak", () => {
  assert.equal(sanitizeUserVisibleOutput("Hello world"), "Hello world");
  assert.equal(
    sanitizeUserVisibleOutput("안녕하세요. 정상적인 출력입니다."),
    "안녕하세요. 정상적인 출력입니다."
  );
});

test("getSafeSummary returns expected Korean safe summary", () => {
  const summary = getSafeSummary();
  assert.ok(summary.includes("검증 완료."));
  assert.ok(summary.includes("이전 작업 상태와 산출물이 확인되어 추가 실행을 중단했습니다."));
});
