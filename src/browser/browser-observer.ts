import { join } from "path";
import { writeFile, appendFile, readFile, mkdir } from "fs/promises";
import { pathExists } from "../util/fs.js";
import type { BrowserSession } from "./browser-session.js";
import { getBrowserSessionDir } from "./browser-session.js";

export interface BrowserObservation {
  sessionId: string;
  url: string;
  title: string;
  viewport: { width: number; height: number; deviceScaleFactor: number };
  screenshotPath: string;
  domSnapshotPath: string;
  consoleEventsPath: string;
  networkEventsPath: string;
  accessibilityPath?: string;
  capturedAt: string;
}

const observedPages = new WeakSet<object>();

export async function observeBrowserPage(session: BrowserSession, projectRoot?: string): Promise<BrowserObservation> {
  const sessionDir = getBrowserSessionDir(projectRoot, session.sessionId);
  await mkdir(sessionDir, { recursive: true });

  const page = session.page as {
    screenshot: (opts: { path: string; fullPage: boolean }) => Promise<Buffer | string>;
    content: () => Promise<string>;
    title: () => Promise<string>;
    viewportSize: () => { width: number; height: number } | null;
    accessibility: { snapshot: () => Promise<unknown> };
    on: (event: string, handler: (...args: unknown[]) => void) => void;
  };

  const consolePath = join(sessionDir, "console.jsonl");
  const networkPath = join(sessionDir, "network.jsonl");

  if (!observedPages.has(page as object)) {
    observedPages.add(page as object);

    page.on("console", async (msg: unknown) => {
      try {
        const { appendFile: append } = await import("fs/promises");
        const text =
          typeof (msg as { text: () => string }).text === "function"
            ? (msg as { text: () => string }).text()
            : String(msg);
        const type =
          typeof (msg as { type: () => string }).type === "function"
            ? (msg as { type: () => string }).type()
            : "log";
        const line = JSON.stringify({ type, text, time: new Date().toISOString() }) + "\n";
        await append(consolePath, line, "utf-8");

        if (type === "error") {
          const location =
            typeof (msg as { location: () => { url?: string } }).location === "function"
              ? (msg as { location: () => { url?: string } }).location()
              : undefined;
          import("../hooks/hook-bus.js")
            .then(({ emit }) =>
              emit({
                type: "browser.console.error",
                payload: {
                  sessionId: session.sessionId,
                  message: text,
                  url: location?.url,
                },
              })
            )
            .catch(() => {
              // ignore hook emission failures
            });
        }
      } catch {
        // ignore write errors
      }
    });

    page.on("pageerror", async (err: unknown) => {
      try {
        const { appendFile: append } = await import("fs/promises");
        const line =
          JSON.stringify({
            type: "pageerror",
            text: err instanceof Error ? err.message : String(err),
            time: new Date().toISOString(),
          }) + "\n";
        await append(consolePath, line, "utf-8");
      } catch {
        // ignore write errors
      }
    });

    page.on("requestfailed", async (req: unknown) => {
      try {
        const { appendFile: append } = await import("fs/promises");
        const url =
          typeof (req as { url: () => string }).url === "function"
            ? (req as { url: () => string }).url()
            : String(req);
        const line = JSON.stringify({ type: "requestfailed", url, time: new Date().toISOString() }) + "\n";
        await append(networkPath, line, "utf-8");

        import("../hooks/hook-bus.js")
          .then(({ emit }) =>
            emit({
              type: "browser.network.failed",
              payload: {
                sessionId: session.sessionId,
                url,
              },
            })
          )
          .catch(() => {
            // ignore hook emission failures
          });
      } catch {
        // ignore write errors
      }
    });
  }

  const screenshotPath = join(sessionDir, "screenshot.png");
  const domSnapshotPath = join(sessionDir, "dom.html");
  const accessibilityPath = join(sessionDir, "accessibility.json");

  await page.screenshot({ path: screenshotPath, fullPage: true });
  const domContent = await page.content();
  await writeFile(domSnapshotPath, domContent, "utf-8");

  let accessibilityData: unknown;
  try {
    accessibilityData = await page.accessibility.snapshot();
    await writeFile(accessibilityPath, JSON.stringify(accessibilityData, null, 2), "utf-8");
  } catch {
    // accessibility optional
  }

  const title = await page.title();
  const viewportSize = page.viewportSize() ?? { width: 1280, height: 720 };
  const viewport = {
    width: viewportSize.width,
    height: viewportSize.height,
    deviceScaleFactor: session.deviceScaleFactor ?? 1,
  };

  const capturedAt = new Date().toISOString();

  const observation: BrowserObservation = {
    sessionId: session.sessionId,
    url: session.url,
    title,
    viewport,
    screenshotPath,
    domSnapshotPath,
    consoleEventsPath: consolePath,
    networkEventsPath: networkPath,
    ...(accessibilityData !== undefined ? { accessibilityPath } : {}),
    capturedAt,
  };

  const manifestPath = join(sessionDir, "observation.json");
  await writeFile(manifestPath, JSON.stringify(observation, null, 2) + "\n", "utf-8");

  import("../hooks/hook-bus.js")
    .then(({ emit }) =>
      emit({
        type: "browser.observation.captured",
        payload: {
          sessionId: session.sessionId,
          observationPath: manifestPath,
          screenshotPath: observation.screenshotPath,
        },
      })
    )
    .catch(() => {
      // ignore hook emission failures
    });

  return observation;
}

export async function writeBrowserFeedback(sessionId: string, feedbackText: string, projectRoot?: string): Promise<void> {
  const sessionDir = getBrowserSessionDir(projectRoot, sessionId);
  const feedbackPath = join(sessionDir, "feedback.md");
  const entry = `## Feedback — ${new Date().toISOString()}\n\n${feedbackText}\n\n`;
  await appendFile(feedbackPath, entry, "utf-8");
}

export async function readBrowserObservation(sessionId: string, projectRoot?: string): Promise<BrowserObservation | undefined> {
  const sessionDir = getBrowserSessionDir(projectRoot, sessionId);
  const manifestPath = join(sessionDir, "observation.json");
  if (!(await pathExists(manifestPath))) return undefined;
  try {
    const content = await readFile(manifestPath, "utf-8");
    return JSON.parse(content) as BrowserObservation;
  } catch {
    return undefined;
  }
}

export async function saveBrowserObservation(observation: BrowserObservation, projectRoot?: string): Promise<void> {
  const sessionDir = getBrowserSessionDir(projectRoot, observation.sessionId);
  const manifestPath = join(sessionDir, "observation.json");
  await writeFile(manifestPath, JSON.stringify(observation, null, 2) + "\n", "utf-8");
}
