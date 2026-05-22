import { writeFileSync } from "node:fs";
import { getProjectRoot } from "../util/fs.js";
import {
  captureAppShot,
  getAppShotDir,
  listAppShots,
  cleanAppShots,
} from "../util/appshot-store.js";
import { style, status, header, label } from "../util/theme.js";

interface AppShotOptions {
  json?: boolean;
  activeWindow?: boolean;
  screen?: boolean;
  goalId?: string;
  runId?: string;
  days?: string;
  dryRun?: boolean;
}

function output(data: unknown, json: boolean | undefined, human: string): void {
  if (json) {
    console.log(JSON.stringify(data));
  } else {
    console.log(human);
  }
}

export async function appshotCaptureCommand(options: AppShotOptions): Promise<void> {
  const root = getProjectRoot();
  let captureType: "active-window" | "screen" = "active-window";
  if (options.screen) {
    captureType = "screen";
  }
  const result = captureAppShot(root, {
    captureType,
    goalId: options.goalId,
    runId: options.runId,
  });
  if (!result.ok) {
    if (options.json) {
      console.log(JSON.stringify({ ok: false, error: result.error }));
    } else {
      console.error(status.error(result.error ?? "Failed to capture appshot"));
    }
    process.exit(1);
  }
  output(
    {
      ok: true,
      path: result.path,
      relativePath: result.relativePath,
      metadataPath: result.metadataPath,
    },
    options.json,
    status.ok(`Appshot saved: ${result.relativePath}`)
  );
}

export async function appshotAskCommand(question: string, options: AppShotOptions): Promise<void> {
  const root = getProjectRoot();
  let captureType: "active-window" | "screen" = "active-window";
  if (options.screen) {
    captureType = "screen";
  }
  const result = captureAppShot(root, {
    captureType,
    goalId: options.goalId,
    runId: options.runId,
  });
  if (!result.ok) {
    if (options.json) {
      console.log(JSON.stringify({ ok: false, error: result.error }));
    } else {
      console.error(status.error(result.error ?? "Failed to capture appshot"));
    }
    process.exit(1);
  }

  const visionPromptPath = result.path
    ? result.path.replace(/\.[^.]+$/, "") + "-vision-prompt.md"
    : undefined;

  if (visionPromptPath && result.path) {
    const content = `# Vision Prompt\n\nQuestion: ${question}\n\nImage: ${result.relativePath ?? result.path}\nCaptured: ${new Date().toISOString()}\n`;
    writeFileSync(visionPromptPath, content, "utf-8");
  }

  output(
    {
      ok: true,
      path: result.path,
      relativePath: result.relativePath,
      metadataPath: result.metadataPath,
      visionPromptPath,
      question,
    },
    options.json,
    status.ok(`Appshot saved with question: ${style.cream(question)}`)
  );
}

export async function appshotDirCommand(options: AppShotOptions): Promise<void> {
  const dir = getAppShotDir();
  output({ dir }, options.json, label("Appshot directory", dir));
}

export async function appshotListCommand(options: AppShotOptions): Promise<void> {
  const entries = listAppShots();
  if (options.json) {
    console.log(JSON.stringify({ entries }));
    return;
  }
  if (entries.length === 0) {
    console.log(style.gray("No appshots found."));
    return;
  }
  console.log(header("Appshots"));
  for (const e of entries) {
    const sizeKb = (e.size / 1024).toFixed(1);
    const date = new Date(e.mtimeMs).toISOString().slice(0, 19).replace("T", " ");
    console.log(`  ${date}  ${sizeKb.padStart(6)} KB  ${e.relativePath}`);
  }
}

export async function appshotCleanCommand(options: AppShotOptions): Promise<void> {
  const days = Math.max(0, parseInt(options.days ?? "7", 10));
  const dryRun = Boolean(options.dryRun);
  const result = cleanAppShots(days, dryRun);

  if (options.json) {
    console.log(JSON.stringify({ days, dryRun, ...result }));
    return;
  }

  if (dryRun) {
    console.log(header(`Dry run — would delete appshots older than ${days} days`));
  } else {
    console.log(header(`Deleted appshots older than ${days} days`));
  }

  if (result.deleted.length === 0) {
    console.log(style.gray("No appshots to delete."));
  } else {
    for (const p of result.deleted) {
      console.log(`  ${dryRun ? "[would delete]" : "[deleted]"} ${p}`);
    }
  }

  if (result.skipped.length > 0) {
    console.log(style.gray(`\n  Kept ${result.skipped.length} newer appshot(s).`));
  }
}
