export type NoticeSource =
  | "appshot"
  | "browser"
  | "goal"
  | "run"
  | "git"
  | "test"
  | "user";

export type NoticeType =
  | "visual-regression"
  | "console-error"
  | "network-failure"
  | "evidence-gap"
  | "stalled-run"
  | "goal-drift"
  | "duplicate-work"
  | "missing-test"
  | "possible-secret"
  | "user-feedback";

export type NoticeSeverity = "info" | "warning" | "blocker";

export type SuggestedAction =
  | "continue-goal"
  | "replan-goal"
  | "open-browser-feedback"
  | "capture-appshot"
  | "run-tests"
  | "ask-human"
  | "block";

export interface Notice {
  id: string;
  createdAt: string;
  source: NoticeSource;
  type: NoticeType;
  severity: NoticeSeverity;
  confidence: number; // 0-1
  summary: string;
  evidenceRefs: string[]; // file paths or URLs
  suggestedAction: SuggestedAction;
  resolved?: boolean;
  resolvedAt?: string;
}
