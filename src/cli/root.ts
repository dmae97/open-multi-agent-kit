import type { Command } from "commander";
import { style, status as themeStatus, kimicatCliHero } from "../util/theme.js";
import { t, initI18n } from "../util/i18n.js";
import { buildCustomHelp } from "../util/help-text.js";

export function configureRootProgram(program: Command, OMK_VERSION: string, OMK_VERSION_FOOTER: string): void {
  program
    .name("omk")
    .description(t("cli.description"))
    .usage("[options] [command]")
    .version(OMK_VERSION)
    .option("-r, --run-id <id>", t("cli.runIdOption"))
    .option("--workers <n>", t("cmd.parallelWorkersOption"), "auto")
    .option("--sudo", t("cli.sudoOption"))
    .addHelpText("before", buildCustomHelp)
    .addHelpText("afterAll", `\n  ${style.gray(OMK_VERSION_FOOTER)}\n`)
    .configureOutput({
      writeErr: (str) => process.stderr.write(style.red(str)),
      outputError: (str, write) => write(style.red(`✖ ${str}`)),
    })
    .hook("preAction", (thisCommand) => {
      const opts = thisCommand.opts();
      if (opts.sudo) {
        process.env.OMK_SUDO = "1";
        process.env.OMK_CLI_SUDO_REQUEST = "1";
      }
    })
    .allowUnknownOption(false)
    .argument("[command]", "subcommand to run")
    .action(async (command?: string) => {
      await initI18n();
      const customHelp = buildCustomHelp();
      if (command) {
        console.error(t("cli.unknownCommand", command));
        console.log(customHelp);
        process.exit(1);
      }
      const globalOpts = program.opts();
      const hasTty = Boolean(process.stdout.isTTY && process.stdin.isTTY);

      // Render HUD and check updates concurrently
      const hudPromise = (async () => {
        try {
          const { renderHudDashboard } = await import("../commands/hud.js");
          const hud = await renderHudDashboard({
            runId: globalOpts.runId,
            terminalWidth: process.stdout.columns || 120,
          });
          const lines = hud.split("\n");
          // Use terminal height to show as much HUD as possible (reserve 6 lines for mode selector + prompt)
          const termRows = process.stdout.rows || 24;
          const maxLines = Math.max(10, termRows - 6);
          return lines.slice(0, Math.min(lines.length, maxLines)).join("\n");
        } catch {
          return kimicatCliHero();
        }
      })();

      const updatePromise = (async () => {
        try {
          const { checkUpdates } = await import("../util/update-check.js");
          const updateStatus = await checkUpdates();
          let banner = "";
          if (updateStatus.omk.outdated) {
            banner += `\n  ${style.orange("!")} omk ${updateStatus.omk.current} → ${updateStatus.omk.latest}  |  ${style.gray(updateStatus.omk.installCmd)}`;
          }
          if (updateStatus.kimi.outdated) {
            banner += `\n  ${style.orange("!")} kimi ${updateStatus.kimi.installed} → ${updateStatus.kimi.latest}  |  ${style.gray("omk update kimi")}`;
          }
          return { banner, status: updateStatus };
        } catch {
          return { banner: "", status: null };
        }
      })();

      console.log(await hudPromise);

      const { banner: updateBanner, status } = await updatePromise;
      if (updateBanner) console.log(updateBanner);

      if (!hasTty) {
        const c = (k: string) => t(k).replace(/^.*? — /, "");
        console.log(style.gray(`
    💡 omk chat  — ${c("cli.suggestionChat")}`));
        console.log(style.gray(`  💡 omk hud   — ${c("cli.suggestionHud")}`));
        console.log(style.gray(`  💡 omk menu  — Show interactive menu`));
        console.log(style.gray(`  💡 omk --help — ${c("cli.suggestionHelp")}`));
        return;
      }

      // Interactive update prompt when omk is outdated
      if (status && status.omk.outdated) {
        try {
          const { select } = await import("@inquirer/prompts");
          const answer = await select(
            {
              message: `A new version of oh-my-kimi is available (${status.omk.current} → ${status.omk.latest}). Update now?`,
              choices: [
                { name: `YES — run ${status.omk.installCmd}`, value: "yes" },
                { name: "NO — skip this update", value: "no" },
              ],
            },
            { signal: AbortSignal.timeout(30_000) }
          );
          if (answer === "yes") {
            console.log(style.gray("Running update…"));
            const { runShell } = await import("../util/shell.js");
            const updateResult = await runShell("npm", ["i", "-g", "@oh-my-kimi/cli"], { timeout: 120_000 });
            if (updateResult.failed) {
              console.log(style.red(`✖ Update failed: ${updateResult.stderr.trim() || updateResult.stdout.trim()}`));
              process.exit(1);
            } else {
              console.log(themeStatus.success("Update completed successfully. Restart your terminal to use the new version."));
              process.exit(0);
            }
          }
        } catch (err) {
          if (err instanceof Error && err.name === "ExitPromptError") {
            console.log(style.gray("Update prompt cancelled."));
            process.exit(0);
          }
          // Non-TTY or timeout — silently continue to chat
        }
      }

      // ── Mode selector: Tab to cycle, Enter to confirm ──
      const { promptModeCycle } = await import("../util/mode-selector.js");
      const selectedMode = await promptModeCycle();

      const { getModePreset } = await import("../util/mode-preset.js");
      const preset = getModePreset(selectedMode);
      const launchCmd = preset?.launchCommand ?? "chat";

      const { spawnSync } = await import("child_process");

      if (launchCmd === "menu") {
        const menuArgs = [process.argv[1]!, "menu"];
        if (globalOpts.runId) menuArgs.push("--run-id", globalOpts.runId);
        if (globalOpts.workers) menuArgs.push("--workers", globalOpts.workers);
        const result = spawnSync(process.execPath, menuArgs, { stdio: "inherit" });
        if (result.status && result.status !== 0) {
          process.exitCode = result.status;
        }
      } else if (launchCmd === "chat") {
        const chatArgs = [process.argv[1]!, "chat", "--layout", "auto", "--brand", "kimicat"];
        if (globalOpts.runId) chatArgs.push("--run-id", globalOpts.runId);
        if (globalOpts.workers) chatArgs.push("--workers", globalOpts.workers);
        chatArgs.push("--mode", selectedMode);
        const result = spawnSync(process.execPath, chatArgs, { stdio: "inherit" });
        if (result.status && result.status !== 0) {
          process.exitCode = result.status;
        }
      } else if (launchCmd === "review") {
        const reviewArgs = [process.argv[1]!, "review"];
        if (globalOpts.runId) reviewArgs.push("--run-id", globalOpts.runId);
        const result = spawnSync(process.execPath, reviewArgs, { stdio: "inherit" });
        if (result.status && result.status !== 0) {
          process.exitCode = result.status;
        }
      } else if (launchCmd === "doctor") {
        const doctorArgs = [process.argv[1]!, "doctor"];
        const result = spawnSync(process.execPath, doctorArgs, { stdio: "inherit" });
        if (result.status && result.status !== 0) {
          process.exitCode = result.status;
        }
      }
    });

  program.hook("preAction", async (_thisCommand, _actionCommand) => {
    const globalOpts = program.opts();
    if (globalOpts.runId) {
      process.env.OMK_RUN_ID = globalOpts.runId;
    }
  });

  program.hook("postAction", async (_thisCommand, actionCommand) => {
    try {
      const { maybeAskForGitHubStarAfterCommand } = await import("../util/first-run-star.js");
      await maybeAskForGitHubStarAfterCommand({
        version: OMK_VERSION,
        commandName: actionCommand.name(),
      });
    } catch {
      // Swallow star prompt errors so original command success is preserved.
    }
  });
}
