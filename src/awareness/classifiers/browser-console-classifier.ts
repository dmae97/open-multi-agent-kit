import { readFile } from "fs/promises";
import { pathExists } from "../../util/fs.js";
import type { BrowserObservation } from "../../browser/browser-observer.js";
import type { Notice } from "../notice.js";

interface ConsoleEvent {
  type: string;
  text: string;
  time: string;
}

function isConsoleEvent(value: unknown): value is ConsoleEvent {
  if (!value || typeof value !== "object") return false;
  const obj = value as Record<string, unknown>;
  return typeof obj.type === "string" && typeof obj.text === "string";
}

export async function classifyBrowserConsole(
  observation: BrowserObservation
): Promise<Notice | null> {
  const path = observation.consoleEventsPath;
  if (!(await pathExists(path))) return null;

  let content: string;
  try {
    content = await readFile(path, "utf-8");
  } catch {
    return null;
  }

  const lines = content.split("\n").filter((line) => line.trim().length > 0);
  let errorCount = 0;

  for (const line of lines) {
    try {
      const parsed = JSON.parse(line) as unknown;
      if (isConsoleEvent(parsed) && (parsed.type === "error" || parsed.type === "pageerror")) {
        errorCount++;
      }
    } catch {
      // skip corrupt lines
    }
  }

  if (errorCount === 0) return null;

  const confidence = Math.min(0.5 + errorCount * 0.1, 0.95);

  return {
    id: `ntc_bc_${Date.now()}`,
    createdAt: new Date().toISOString(),
    source: "browser",
    type: "console-error",
    severity: errorCount > 5 ? "warning" : "info",
    confidence,
    summary: `${errorCount} console error(s) detected on ${observation.url}`,
    evidenceRefs: [observation.consoleEventsPath, observation.screenshotPath],
    suggestedAction: "open-browser-feedback",
  };
}
