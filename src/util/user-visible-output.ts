/**
 * Last-line-of-defense output sanitizer.
 * Strips control-plane leakage from text before it reaches the user.
 */

export const CONTROL_PLANE_LEAK_PATTERNS: RegExp[] = [
  // Korean: user repeatedly pasting the same prompt (with variants)
  /사용자가\s+반복적으로\s+동일한\s+프롬프트를\s+복내고\s+있습니다/,
  /사용자가\s+반복적으로\s+동일한\s+프롬프트를\s+복사하고\s+있습니다/,
  /사용자가\s+반복적으로\s+동일한\s+프롬프트를\s+붙여넣고\s+있습니다/,

  // Korean: this is an automated loop
  /이는\s+자동화된\s+루프입니다/,

  // Korean: must keep choosing STOP
  /계속\s+STOP을\s+선택해야\s+합니다/,

  // Korean: task already completed, followed by list pattern
  /작업은\s+이미\s+완료되었습니다[\s\S]*?(?:\n\s*[-*]\s|\n\s*\d+\.\s)/,

  // Korean: choose STOP (standalone)
  /STOP을\s+선택/,

  // English meta-text patterns
  /The model may report evidence/,
  /The runtime decides stop\/continue/,

  // Line starting with Loop Guard: or Decision: followed by JSON-like braces
  /^(?:Loop Guard|Decision):\s*\{.*\}/m,
];

/**
 * Returns true if the value contains any control-plane leak pattern.
 */
export function isControlPlaneLeak(value: string): boolean {
  return CONTROL_PLANE_LEAK_PATTERNS.some((pattern) => pattern.test(value));
}

/**
 * Returns a safe Korean summary to display when a leak is detected.
 */
export function getSafeSummary(): string {
  return (
    "검증 완료.\n" +
    "\n" +
    "이전 작업 상태와 산출물이 확인되어 추가 실행을 중단했습니다."
  );
}

/**
 * Sanitizes user-visible output.
 * If a control-plane leak is detected, returns a safe summary.
 * Otherwise returns the original value unchanged.
 */
export function sanitizeUserVisibleOutput(value: string): string {
  if (isControlPlaneLeak(value)) {
    return getSafeSummary();
  }
  return value;
}
