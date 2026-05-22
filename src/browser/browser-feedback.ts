import { CliError } from "../util/cli-contract.js";
import { join } from "path";
import {
  createBrowserSession,
  getActiveBrowserSession,
  closeBrowserSession,
  getBrowserSessionDir,
} from "./browser-session.js";
import { observeBrowserPage, writeBrowserFeedback, readBrowserObservation } from "./browser-observer.js";
import type { BrowserObservation } from "./browser-observer.js";

export interface BrowserFeedbackResult {
  ok: boolean;
  observation?: BrowserObservation;
  error?: string;
}

export async function openAndObserve(url: string, headless?: boolean): Promise<BrowserFeedbackResult> {
  try {
    const session = await createBrowserSession({ url, headless });
    const observation = await observeBrowserPage(session);
    return { ok: true, observation };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

export async function submitFeedback(sessionId: string, text: string): Promise<BrowserFeedbackResult> {
  try {
    await writeBrowserFeedback(sessionId, text);
    const observation = await readBrowserObservation(sessionId);

    const observationPath = join(getBrowserSessionDir(undefined, sessionId), "observation.json");
    import("../hooks/hook-bus.js")
      .then(({ emit }) =>
        emit({
          type: "browser.feedback.submitted",
          payload: {
            sessionId,
            feedbackText: text,
            observationPath,
          },
        })
      )
      .catch(() => {
        // ignore hook emission failures
      });

    return { ok: true, observation };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

export async function closeActiveSession(): Promise<BrowserFeedbackResult> {
  try {
    await closeBrowserSession();
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

export async function inspectSession(sessionId?: string): Promise<BrowserFeedbackResult> {
  try {
    const active = getActiveBrowserSession();
    if (active) {
      if (sessionId && active.sessionId !== sessionId) {
        return {
          ok: false,
          error: `Active session (${active.sessionId}) does not match requested session (${sessionId}).`,
        };
      }
      const observation = await observeBrowserPage(active);
      return { ok: true, observation };
    }
    if (!sessionId) {
      throw new CliError("No active browser session. Run: omk browser open <url>");
    }
    const observation = await readBrowserObservation(sessionId);
    if (!observation) {
      throw new CliError(`No observation found for session ${sessionId}`);
    }
    return { ok: true, observation };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
