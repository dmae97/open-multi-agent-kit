/**
 * Chunk-mode read tool.
 */
import { Args, Command, Flags } from "@oh-my-pi/pi-utils/cli";
import { type ReadCommandArgs, runReadCommand } from "../cli/read-cli";
import { initTheme } from "../modes/theme/theme";

export default class Read extends Command {
	static description = "Read a file as a chunk tree";

	static args = {
		path: Args.string({ description: "File path to read", required: true }),
	};

	static flags = {
		sel: Flags.string({
			char: "s",
			description: "Chunk selector or line range (e.g. class_Foo.fn_bar, L10-L20)",
		}),
	};

	async run(): Promise<void> {
		const { args, flags } = await this.parse(Read);

		const cmd: ReadCommandArgs = {
			path: args.path ?? "",
			sel: flags.sel,
		};

		await initTheme();
		await runReadCommand(cmd);
	}
}
