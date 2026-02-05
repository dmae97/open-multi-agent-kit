/**
 * View usage statistics dashboard.
 */
import { Command, Flags } from "@oclif/core";
import { type StatsCommandArgs, runStatsCommand } from "../cli/stats-cli";
import { initTheme } from "../modes/theme/theme";

export default class Stats extends Command {
	static description = "View usage statistics";

	static flags = {
		port: Flags.integer({ char: "p", description: "Port for the dashboard server", default: 3847 }),
		json: Flags.boolean({ char: "j", description: "Output stats as JSON" }),
		summary: Flags.boolean({ char: "s", description: "Print summary to console" }),
	};

	async run(): Promise<void> {
		const { flags } = await this.parse(Stats);

		const cmd: StatsCommandArgs = {
			port: flags.port,
			json: flags.json,
			summary: flags.summary,
		};

		await initTheme();
		await runStatsCommand(cmd);
	}
}
