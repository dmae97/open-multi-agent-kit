/**
 * Check for and install updates.
 */
import { Command, Flags } from "@oclif/core";
import { runUpdateCommand } from "../cli/update-cli";
import { initTheme } from "../modes/theme/theme";

export default class Update extends Command {
	static description = "Check for and install updates";

	static flags = {
		force: Flags.boolean({ char: "f", description: "Force update" }),
		check: Flags.boolean({ char: "c", description: "Check for updates without installing" }),
	};

	async run(): Promise<void> {
		const { flags } = await this.parse(Update);
		await initTheme();
		await runUpdateCommand({ force: flags.force, check: flags.check });
	}
}
