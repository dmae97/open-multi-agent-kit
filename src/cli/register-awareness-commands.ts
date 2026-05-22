import type { Command } from "commander";

export function registerAwarenessCommands(program: Command): void {
  const appshot = program.command("appshot").description("Capture and manage application screenshots");
  appshot
    .command("capture")
    .description("Capture the active window or full screen")
    .option("--active-window", "Capture the active window")
    .option("--screen", "Capture the full screen")
    .option("--goal <goalId>", "Associate with a goal")
    .option("--run <runId>", "Associate with a run")
    .option("--json", "Output JSON")
    .action(async (options) => {
      const { appshotCaptureCommand } = await import("../commands/appshot.js");
      await appshotCaptureCommand(options);
    });
  appshot
    .command("ask <question>")
    .description("Capture an appshot and attach a question")
    .option("--active-window", "Capture active window")
    .option("--screen", "Capture full screen")
    .option("--goal <goalId>", "Associate with a goal")
    .option("--run <runId>", "Associate with a run")
    .option("--json", "Output JSON")
    .action(async (question, options) => {
      const { appshotAskCommand } = await import("../commands/appshot.js");
      await appshotAskCommand(question, options);
    });
  appshot
    .command("dir")
    .description("Print the appshot directory path")
    .option("--json", "Output JSON")
    .action(async (options) => {
      const { appshotDirCommand } = await import("../commands/appshot.js");
      await appshotDirCommand(options);
    });
  appshot
    .command("list")
    .description("List saved appshots")
    .option("--json", "Output JSON")
    .action(async (options) => {
      const { appshotListCommand } = await import("../commands/appshot.js");
      await appshotListCommand(options);
    });
  appshot
    .command("clean")
    .description("Remove appshots older than N days")
    .option("--days <n>", "Age threshold in days", "7")
    .option("--dry-run", "Show what would be deleted without removing")
    .option("--json", "Output JSON")
    .action(async (options) => {
      const { appshotCleanCommand } = await import("../commands/appshot.js");
      await appshotCleanCommand(options);
    });

  const browser = program
    .command("browser")
    .description("Browser feedback runtime — observe, inspect, and feedback on web pages");
  browser
    .command("open <url>")
    .description("Open a URL and capture an observation")
    .option("--headless", "Run in headless mode")
    .option("--json", "Output JSON")
    .action(async (url, options) => {
      const { browserOpenCommand } = await import("../commands/browser.js");
      await browserOpenCommand(url, options);
    });
  browser
    .command("inspect")
    .description("Re-observe the active browser session")
    .option("--session <sessionId>", "Target session")
    .option("--json", "Output JSON")
    .action(async (options) => {
      const { browserInspectCommand } = await import("../commands/browser.js");
      await browserInspectCommand(options);
    });
  browser
    .command("feedback <text>")
    .description("Submit feedback for the active browser session")
    .option("--session <sessionId>", "Target session")
    .option("--json", "Output JSON")
    .action(async (text, options) => {
      const { browserFeedbackCommand } = await import("../commands/browser.js");
      await browserFeedbackCommand(text, options);
    });
  browser
    .command("repair <instruction>")
    .description("Submit a repair instruction for the active browser session")
    .option("--session <sessionId>", "Target session")
    .option("--json", "Output JSON")
    .action(async (instruction, options) => {
      const { browserRepairCommand } = await import("../commands/browser.js");
      await browserRepairCommand(instruction, options);
    });
  browser
    .command("close")
    .description("Close the active browser session")
    .option("--json", "Output JSON")
    .action(async (options) => {
      const { browserCloseCommand } = await import("../commands/browser.js");
      await browserCloseCommand(options);
    });
  browser
    .command("dir")
    .description("Print the browser session directory path")
    .option("--json", "Output JSON")
    .action(async (options) => {
      const { browserDirCommand } = await import("../commands/browser.js");
      await browserDirCommand(options);
    });

  const notice = program.command("notice").description("Project notices and awareness alerts");
  notice
    .command("list")
    .description("List active notices")
    .option("--json", "Output JSON")
    .action(async (options) => {
      const { noticeListCommand } = await import("../commands/notice.js");
      await noticeListCommand(options);
    });
  notice
    .command("act <notice-id>")
    .description("Act on a notice")
    .option("--json", "Output JSON")
    .action(async (noticeId, options) => {
      const { noticeActCommand } = await import("../commands/notice.js");
      await noticeActCommand(noticeId, options);
    });
  notice
    .command("explain <notice-id>")
    .description("Explain a notice")
    .option("--json", "Output JSON")
    .action(async (noticeId, options) => {
      const { noticeExplainCommand } = await import("../commands/notice.js");
      await noticeExplainCommand(noticeId, options);
    });
}
