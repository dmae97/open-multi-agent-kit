import { writeFileSync } from "node:fs";
import { style, header, status, label } from "../util/theme.js";
import { emitJson, CliError } from "../util/cli-contract.js";
import { getBrowserSessionDir } from "../browser/browser-session.js";
import type { BrowserFeedbackResult } from "../browser/browser-feedback.js";

interface BrowserOptions {
  json?: boolean;
  headless?: boolean;
  session?: string;
}

function printObservation(result: BrowserFeedbackResult): void {
  if (!result.observation) return;
  const obs = result.observation;
  console.log(header("Browser Observation"));
  console.log(label("Session", obs.sessionId));
  console.log(label("URL", obs.url));
  console.log(label("Title", obs.title));
  console.log(label("Viewport", `${obs.viewport.width}x${obs.viewport.height} @ ${obs.viewport.deviceScaleFactor}x`));
  console.log(label("Screenshot", obs.screenshotPath));
  console.log(label("DOM", obs.domSnapshotPath));
  console.log(label("Console", obs.consoleEventsPath));
  console.log(label("Network", obs.networkEventsPath));
  if (obs.accessibilityPath) {
    console.log(label("Accessibility", obs.accessibilityPath));
  }
  console.log(label("Captured", obs.capturedAt));
}

export async function browserOpenCommand(url: string, options: BrowserOptions): Promise<void> {
  const { openAndObserve } = await import("../browser/browser-feedback.js");
  const result = await openAndObserve(url, options.headless);
  if (!result.ok) {
    throw new CliError(result.error ?? "Failed to open browser");
  }
  if (options.json) {
    emitJson(result);
    return;
  }
  printObservation(result);
  console.log("");
  console.log(status.success(`Browser session opened for ${style.cream(url)}`));
}

export async function browserInspectCommand(options: BrowserOptions & { session?: string }): Promise<void> {
  const { inspectSession } = await import("../browser/browser-feedback.js");
  const result = await inspectSession(options.session);
  if (!result.ok) {
    throw new CliError(result.error ?? "Failed to inspect browser");
  }
  if (options.json) {
    emitJson(result);
    return;
  }
  printObservation(result);
}

export async function browserFeedbackCommand(text: string, options: BrowserOptions & { session?: string }): Promise<void> {
  const { submitFeedback } = await import("../browser/browser-feedback.js");
  const { getActiveBrowserSession } = await import("../browser/browser-session.js");
  const sessionId = options.session ?? getActiveBrowserSession()?.sessionId;
  if (!sessionId) {
    throw new CliError("No active session. Use --session or run `omk browser open <url>` first.");
  }
  const result = await submitFeedback(sessionId, text);
  if (!result.ok) {
    throw new CliError(result.error ?? "Failed to submit feedback");
  }
  if (options.json) {
    emitJson(result);
    return;
  }
  console.log(status.success(`Feedback recorded for session ${style.cream(sessionId)}`));
}

export async function browserRepairCommand(
  instruction: string,
  options: BrowserOptions & { session?: string }
): Promise<void> {
  const { getActiveBrowserSession } = await import("../browser/browser-session.js");
  const { readBrowserObservation } = await import("../browser/browser-observer.js");

  const sessionId = options.session ?? getActiveBrowserSession()?.sessionId;
  if (!sessionId) {
    throw new CliError("No active session. Use --session or run `omk browser open <url>` first.");
  }

  const observation = await readBrowserObservation(sessionId);
  const sessionDir = getBrowserSessionDir(undefined, sessionId);

  const content = `# Proposed Fix\n\nInstruction: ${instruction}\n\nSession: ${sessionId}\n${observation ? `URL: ${observation.url}\nTitle: ${observation.title}\nCaptured: ${observation.capturedAt}\n` : "No observation available.\n"}\nSubmitted: ${new Date().toISOString()}\n`;

  const fixPath = `${sessionDir}/proposed-fix.md`;
  writeFileSync(fixPath, content, "utf-8");

  if (options.json) {
    emitJson({ ok: true, sessionId, fixPath, instruction });
    return;
  }

  console.log(status.success(`Repair instruction recorded for session ${style.cream(sessionId)}`));
  console.log(label("Fix file", fixPath));
}

export async function browserCloseCommand(options: BrowserOptions): Promise<void> {
  const { getActiveBrowserSession, closeBrowserSession } = await import("../browser/browser-session.js");
  const session = getActiveBrowserSession();
  if (!session) {
    if (options.json) {
      emitJson({ ok: true, message: "No active session to close" });
      return;
    }
    console.log(status.info("No active browser session to close"));
    return;
  }
  await closeBrowserSession(session);
  if (options.json) {
    emitJson({ ok: true, sessionId: session.sessionId });
    return;
  }
  console.log(status.success(`Closed browser session ${style.cream(session.sessionId)}`));
}

export async function browserDirCommand(options: BrowserOptions): Promise<void> {
  const dir = getBrowserSessionDir();
  if (options.json) {
    emitJson({ dir });
    return;
  }
  console.log(label("Browser session directory", dir));
}
