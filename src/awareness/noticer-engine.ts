import type { BrowserObservation } from "../browser/browser-observer.js";
import type { GoalEvidence, GoalSpec } from "../contracts/goal.js";
import type { Notice } from "./notice.js";
import { classifyBrowserConsole } from "./classifiers/browser-console-classifier.js";
import { classifyEvidenceGap } from "./classifiers/evidence-gap-classifier.js";
import { classifyStalledRun } from "./classifiers/stalled-run-classifier.js";

export interface BrowserObservationEvent {
  kind: "browser-observation";
  observation: BrowserObservation;
}

export interface GoalEvidenceEvent {
  kind: "goal-evidence";
  goal: GoalSpec;
  evidence: GoalEvidence[];
}

export interface RunStateEvent {
  kind: "run-state";
  runId: string;
  status: string;
  lastActivity: string; // ISO timestamp
}

export interface GitDiffEvent {
  kind: "git-diff";
  diff: string;
  ref?: string;
}

export interface TestOutputEvent {
  kind: "test-output";
  output: string;
  passed: boolean;
  suiteName?: string;
}

export interface UserFeedbackEvent {
  kind: "user-feedback";
  text: string;
  context?: string;
}

export type NoticerEvent =
  | BrowserObservationEvent
  | GoalEvidenceEvent
  | RunStateEvent
  | GitDiffEvent
  | TestOutputEvent
  | UserFeedbackEvent;

export type Classifier = (event: NoticerEvent) => Promise<Notice | Notice[] | null | undefined> | Notice | Notice[] | null | undefined;

export interface NoticerEngine {
  ingest(event: NoticerEvent): Promise<Notice[]>;
  getNotices(): Notice[];
  addClassifier(classifier: Classifier): void;
}

export function createNoticerEngine(): NoticerEngine {
  const notices: Notice[] = [];
  const classifiers: Classifier[] = [
    defaultClassifier,
  ];

  async function defaultClassifier(event: NoticerEvent): Promise<Notice | Notice[] | null | undefined> {
    switch (event.kind) {
      case "browser-observation":
        return classifyBrowserConsole(event.observation);
      case "goal-evidence":
        return classifyEvidenceGap(event.goal, event.evidence);
      case "run-state":
        return classifyStalledRun(event.runId, event.status, event.lastActivity);
      case "user-feedback":
        return classifyUserFeedback(event);
      default:
        return null;
    }
  }

  function classifyUserFeedback(event: UserFeedbackEvent): Notice | null {
    return {
      id: `ntc_uf_${Date.now()}`,
      createdAt: new Date().toISOString(),
      source: "user",
      type: "user-feedback",
      severity: "info",
      confidence: 1.0,
      summary: event.text.slice(0, 200),
      evidenceRefs: event.context ? [event.context] : [],
      suggestedAction: "ask-human",
    };
  }

  return {
    addClassifier(classifier: Classifier): void {
      classifiers.push(classifier);
    },

    async ingest(event: NoticerEvent): Promise<Notice[]> {
      const produced: Notice[] = [];
      for (const classifier of classifiers) {
        try {
          const result = await classifier(event);
          if (!result) continue;
          const batch = Array.isArray(result) ? result : [result];
          for (const notice of batch) {
            notices.push(notice);
            produced.push(notice);
          }
        } catch {
          // classifier errors are swallowed to keep engine resilient
        }
      }
      return produced;
    },

    getNotices(): Notice[] {
      return [...notices];
    },
  };
}
