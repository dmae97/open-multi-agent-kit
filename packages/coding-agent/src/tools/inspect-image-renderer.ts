import type { Component } from "@oh-my-pi/pi-tui";
import { Text } from "@oh-my-pi/pi-tui";
import type { RenderResultOptions } from "../extensibility/custom-tools/types";
import type { Theme } from "../modes/theme/theme";
import { renderStatusLine } from "../tui";
import { formatExpandHint, replaceTabs, shortenPath, truncateToWidth } from "./render-utils";

interface InspectImageRenderArgs {
	path?: string;
	question?: string;
}

interface InspectImageRendererDetails {
	model: string;
	imagePath: string;
	mimeType: string;
}

interface InspectImageRendererResult {
	content: Array<{ type: string; text?: string }>;
	details?: InspectImageRendererDetails;
	isError?: boolean;
}

const INSPECT_QUESTION_PREVIEW_WIDTH = 100;
const INSPECT_OUTPUT_COLLAPSED_LINES = 4;
const INSPECT_OUTPUT_EXPANDED_LINES = 16;
const INSPECT_OUTPUT_LINE_WIDTH = 120;

export const inspectImageToolRenderer = {
	renderCall(args: InspectImageRenderArgs, _options: RenderResultOptions, uiTheme: Theme): Component {
		const rawPath = args.path ?? "";
		const pathDisplay = rawPath ? shortenPath(rawPath) : "…";
		const header = renderStatusLine({ icon: "pending", title: "Inspect Image", description: pathDisplay }, uiTheme);
		const question = args.question?.trim();
		if (!question) {
			return new Text(header, 0, 0);
		}
		const questionLine = ` ${uiTheme.fg("dim", uiTheme.tree.last)} ${uiTheme.fg("dim", "Question:")} ${uiTheme.fg("accent", truncateToWidth(replaceTabs(question), INSPECT_QUESTION_PREVIEW_WIDTH))}`;
		return new Text(`${header}\n${questionLine}`, 0, 0);
	},

	renderResult(
		result: InspectImageRendererResult,
		options: RenderResultOptions,
		uiTheme: Theme,
		args?: InspectImageRenderArgs,
	): Component {
		const details = result.details;
		const rawPath = details?.imagePath ?? args?.path ?? "";
		const pathDisplay = rawPath ? shortenPath(rawPath) : "image";
		const metaParts: string[] = [];
		if (details?.model) metaParts.push(details.model);
		if (details?.mimeType) metaParts.push(details.mimeType);
		const header = renderStatusLine(
			{
				icon: result.isError ? "error" : "success",
				title: "Inspect Image",
				description: pathDisplay,
			},
			uiTheme,
		);

		const lines: string[] = [header];
		const question = args?.question?.trim();
		if (question) {
			lines.push(
				` ${uiTheme.fg("dim", uiTheme.tree.branch)} ${uiTheme.fg("dim", "Question:")} ${uiTheme.fg("accent", truncateToWidth(replaceTabs(question), INSPECT_QUESTION_PREVIEW_WIDTH))}`,
			);
		}

		const outputText = result.content.find(content => content.type === "text")?.text?.trimEnd() ?? "";
		if (!outputText) {
			lines.push(uiTheme.fg("dim", "(no output)"));
			if (metaParts.length > 0) {
				lines.push("");
				lines.push(uiTheme.fg("dim", metaParts.join(" · ")));
			}
			return new Text(lines.join("\n"), 0, 0);
		}

		lines.push("");
		const outputLines = replaceTabs(outputText).split("\n");
		const maxLines = options.expanded ? INSPECT_OUTPUT_EXPANDED_LINES : INSPECT_OUTPUT_COLLAPSED_LINES;
		for (const line of outputLines.slice(0, maxLines)) {
			lines.push(uiTheme.fg("toolOutput", truncateToWidth(line, INSPECT_OUTPUT_LINE_WIDTH)));
		}

		if (outputLines.length > maxLines) {
			const remaining = outputLines.length - maxLines;
			const hint = formatExpandHint(uiTheme, options.expanded, true);
			lines.push(`${uiTheme.fg("dim", `… ${remaining} more lines`)}${hint ? ` ${hint}` : ""}`);
		}

		if (metaParts.length > 0) {
			lines.push("");
			lines.push(uiTheme.fg("dim", metaParts.join(" · ")));
		}

		return new Text(lines.join("\n"), 0, 0);
	},
	mergeCallAndResult: true,
};
