export type AwarenessEvent =
  | {
      type: "appshot.captured";
      payload: {
        appshotId: string;
        imagePath: string;
        metadataPath: string;
        goalId?: string;
        runId?: string;
      };
    }
  | {
      type: "browser.feedback.submitted";
      payload: {
        sessionId: string;
        feedbackText: string;
        observationPath: string;
      };
    }
  | {
      type: "browser.console.error";
      payload: {
        sessionId: string;
        message: string;
        url?: string;
      };
    }
  | {
      type: "browser.network.failed";
      payload: {
        sessionId: string;
        url: string;
      };
    }
  | {
      type: "browser.observation.captured";
      payload: {
        sessionId: string;
        observationPath: string;
        screenshotPath: string;
      };
    }
  | {
      type: "goal.evidence.missing";
      payload: {
        goalId: string;
        missingCriteria: string[];
        evidencePath: string;
      };
    }
  | {
      type: "goal.wakeup";
      payload: {
        goalId: string;
        reason: string;
        suggestedAction: string;
      };
    }
  | {
      type: "run.stalled";
      payload: {
        runId: string;
        goalId?: string;
        lastActivity: string;
        durationMinutes: number;
      };
    }
  | {
      type: "goal.drift.detected";
      payload: {
        goalId: string;
        description: string;
      };
    }
  | {
      type: "duplicate.work.detected";
      payload: {
        goalId: string;
        description: string;
      };
    };
