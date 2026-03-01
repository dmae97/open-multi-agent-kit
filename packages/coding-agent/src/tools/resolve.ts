import type { AgentTool, AgentToolContext, AgentToolResult, AgentToolUpdateCallback } from "@oh-my-pi/pi-agent-core";
import type { Component } from "@oh-my-pi/pi-tui";
import { Text } from "@oh-my-pi/pi-tui";
import { untilAborted } from "@oh-my-pi/pi-utils";
import { type Static, Type } from "@sinclair/typebox";
import { renderPromptTemplate } from "../config/prompt-templates";
import type { RenderResultOptions } from "../extensibility/custom-tools/types";
import type { Theme } from "../modes/theme/theme";
import resolveDescription from "../prompts/tools/resolve.md" with { type: "text" };
import { CachedOutputBlock, Ellipsis, renderStatusLine, truncateToWidth } from "../tui";
import type { ToolSession } from ".";
import { replaceTabs } from "./render-utils";
import { ToolError } from "./tool-errors";
import { toolResult } from "./tool-result";

const resolveSchema = Type.Object({
	action: Type.Union([Type.Literal("apply"), Type.Literal("discard")]),
	reason: Type.String({ description: "Why you're applying or discarding" }),
});

type ResolveParams = Static<typeof resolveSchema>;

export interface ResolveToolDetails {
	action: "apply" | "discard";
	reason: string;
	sourceToolName?: string;
	label?: string;
}

function resolveReasonPreview(reason?: string): string | undefined {
	const trimmed = reason?.trim();
	if (!trimmed) return undefined;
	return truncateToWidth(trimmed, 72, Ellipsis.Omit);
}

function actionBadge(action: "apply" | "discard", theme: Theme): string {
	const color = action === "apply" ? "success" : "warning";
	const left = theme.format.bracketLeft;
	const right = theme.format.bracketRight;
	return theme.fg(color, `${left}${action}${right}`);
}
export class ResolveTool implements AgentTool<typeof resolveSchema, ResolveToolDetails> {
	readonly name = "resolve";
	readonly label = "Resolve";
	readonly hidden = true;
	readonly description: string;
	readonly parameters = resolveSchema;
	readonly strict = true;

	constructor(private readonly session: ToolSession) {
		this.description = renderPromptTemplate(resolveDescription);
	}

	async execute(
		_toolCallId: string,
		params: ResolveParams,
		signal?: AbortSignal,
		_onUpdate?: AgentToolUpdateCallback<ResolveToolDetails>,
		_context?: AgentToolContext,
	): Promise<AgentToolResult<ResolveToolDetails>> {
		return untilAborted(signal, async () => {
			const store = this.session.pendingActionStore;
			if (!store || !store.hasPending) {
				throw new ToolError("No pending action to resolve. Nothing to apply or discard.");
			}

			const pendingAction = store.get();
			if (!pendingAction) {
				throw new ToolError("No pending action to resolve. Nothing to apply or discard.");
			}

			store.clear();

			const resolveDetails: ResolveToolDetails = {
				action: params.action,
				reason: params.reason,
				sourceToolName: pendingAction.sourceToolName,
				label: pendingAction.label,
			};

			if (params.action === "apply") {
				const applyResult = await pendingAction.apply();
				const appliedText = applyResult.content
					.filter(part => part.type === "text")
					.map(part => part.text)
					.filter(text => text != null && text.length > 0)
					.join("\n");
				const baseResult = toolResult()
					.text(appliedText || `Applied: ${pendingAction.label}.`)
					.done();
				return { ...baseResult, details: resolveDetails };
			}

			const discardResult = toolResult().text(`Discarded: ${pendingAction.label}. Reason: ${params.reason}`).done();
			return { ...discardResult, details: resolveDetails };
		});
	}
}

export const resolveToolRenderer = {
	renderCall(args: ResolveParams, _options: RenderResultOptions, uiTheme: Theme): Component {
		const reason = resolveReasonPreview(args.reason);
		const text = renderStatusLine(
			{
				icon: "pending",
				title: "Resolve",
				description: args.action,
				badge: { label: args.action, color: args.action === "apply" ? "success" : "warning" },
				meta: reason ? [uiTheme.fg("muted", reason)] : undefined,
			},
			uiTheme,
		);
		return new Text(text, 0, 0);
	},

	renderResult(
		result: { content: Array<{ type: string; text?: string }>; details?: ResolveToolDetails; isError?: boolean },
		_options: RenderResultOptions,
		uiTheme: Theme,
	): Component {
		const details = result.details;
		const label = details?.label ?? "pending action";
		const reason = details?.reason?.trim() || "No reason provided";
		const textContent = result.content.find(part => part.type === "text")?.text?.trim();
		const action = details?.action ?? "apply";
		const state = result.isError ? "error" : action === "discard" ? "warning" : "success";
		const headerMeta = details?.sourceToolName ? `from ${details.sourceToolName}` : undefined;
		const actionLine = `${uiTheme.bold("Action")}: ${actionBadge(action, uiTheme)}`;
		const targetLine = `${uiTheme.bold("Target")}: ${uiTheme.fg("accent", replaceTabs(label))}`;
		const reasonLine = `${uiTheme.bold("Reason")}: ${replaceTabs(reason)}`;
		const fallbackEffect = result.isError
			? "Resolve failed. No pending action was changed."
			: action === "discard"
				? `Discarded preview for ${label}.`
				: `Applied preview for ${label}.`;
		const effectLines = (textContent || fallbackEffect).split("\n").map(line => replaceTabs(line.trimEnd()));
		const outputBlock = new CachedOutputBlock();

		return {
			render(width: number) {
				return outputBlock.render(
					{
						header: `${uiTheme.bold("Resolve")}`,
						headerMeta,
						state,
						width,
						sections: [
							{
								label: uiTheme.fg("toolTitle", "Decision"),
								lines: [actionLine, targetLine, reasonLine],
							},
							{
								label: uiTheme.fg("toolTitle", result.isError ? "Error" : "Effect"),
								lines: effectLines,
							},
						],
					},
					uiTheme,
				);
			},
			invalidate() {
				outputBlock.invalidate();
			},
		};
	},

	mergeCallAndResult: true,
};
