import type { Notice, SuggestedAction } from "./notice.js";

const ACTION_DESCRIPTIONS: Record<SuggestedAction, string> = {
  "continue-goal": "Continue working on the current goal.",
  "replan-goal": "Replan the current goal based on new information.",
  "open-browser-feedback": "Open browser feedback to inspect the page.",
  "capture-appshot": "Capture an appshot for visual verification.",
  "run-tests": "Run the test suite to verify behavior.",
  "ask-human": "Ask a human for guidance or confirmation.",
  block: "Block further progress until this notice is resolved.",
};

const ROUTE_MESSAGES: Record<Notice["type"], string> = {
  "visual-regression": "A visual change was detected. Review the screenshot or capture a new appshot.",
  "console-error": "Console errors were detected during browser observation. Inspect the browser session for details.",
  "network-failure": "Network failures were detected. Check connectivity and retry.",
  "evidence-gap": "Required goal evidence is missing. Continue the goal to gather missing evidence.",
  "stalled-run": "A run appears to be stalled. Consider replanning or asking a human.",
  "goal-drift": "The current work may have drifted from the original goal. Review and replan if needed.",
  "duplicate-work": "Possible duplicate work detected. Review existing artifacts before continuing.",
  "missing-test": "Tests are missing for recent changes. Run tests or add coverage.",
  "possible-secret": "A possible secret was detected in output. Review and rotate if confirmed.",
  "user-feedback": "User feedback received. Review and decide on next steps.",
};

export function routeNotice(notice: Notice): string {
  const base = ROUTE_MESSAGES[notice.type] ?? "Review this notice and take appropriate action.";
  const action = ACTION_DESCRIPTIONS[notice.suggestedAction];
  return `${base}\nSuggested action: ${action}`;
}

export function noticeToAction(notice: Notice): { command: string; args: string[] } | null {
  switch (notice.suggestedAction) {
    case "continue-goal":
      return { command: "omk", args: ["goal", "continue"] };
    case "replan-goal":
      return { command: "omk", args: ["goal", "replan"] };
    case "open-browser-feedback":
      return { command: "omk", args: ["browser", "inspect"] };
    case "capture-appshot":
      return { command: "omk", args: ["appshot", "capture"] };
    case "run-tests":
      return { command: "omk", args: ["test"] };
    case "ask-human":
      return null;
    case "block":
      return null;
    default:
      return null;
  }
}
