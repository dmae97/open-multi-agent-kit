/**
 * Test web search providers.
 */
import { Args, Command, Flags } from "@oclif/core";
import { type WebSearchCommandArgs, runWebSearchCommand } from "../cli/web-search-cli";
import type { WebSearchProvider } from "../web/search/types";

const PROVIDERS: Array<WebSearchProvider | "auto"> = [
	"auto",
	"anthropic",
	"perplexity",
	"exa",
	"jina",
	"gemini",
	"codex",
];

const RECENCY: NonNullable<WebSearchCommandArgs["recency"]>[] = ["day", "week", "month", "year"];

export default class WebSearch extends Command {
	static description = "Test web search providers";

	static aliases = ["q"];

	static args = {
		query: Args.string({ description: "Search query text", required: false, multiple: true }),
	};

	static flags = {
		provider: Flags.string({ description: "Search provider", options: PROVIDERS }),
		recency: Flags.string({ description: "Recency filter", options: RECENCY }),
		limit: Flags.integer({ char: "l", description: "Max results to return" }),
		compact: Flags.boolean({ description: "Render condensed output" }),
	};

	async run(): Promise<void> {
		const { args, flags } = await this.parse(WebSearch);
		const query = Array.isArray(args.query) ? args.query.join(" ") : args.query ?? "";

		const cmd: WebSearchCommandArgs = {
			query,
			provider: flags.provider as WebSearchProvider | "auto" | undefined,
			recency: flags.recency as WebSearchCommandArgs["recency"],
			limit: flags.limit,
			expanded: !flags.compact,
		};

		await runWebSearchCommand(cmd);
	}
}
