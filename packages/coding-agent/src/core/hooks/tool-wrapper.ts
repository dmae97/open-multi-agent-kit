/**
 * Tool wrapper - wraps tools with hook callbacks for interception.
 */

import type { AgentTool, AgentToolContext, AgentToolUpdateCallback } from "@oh-my-pi/pi-agent-core";
import type { HookRunner } from "./runner";
import type { ToolCallEventResult, ToolResultEventResult } from "./types";

/**
 * Wraps an AgentTool with hook callbacks for interception.
 *
 * Features:
 * - Emits tool_call event before execution (can block)
 * - Emits tool_result event after execution (can modify result)
 * - Forwards onUpdate callback to wrapped tool for progress streaming
 */
export class HookToolWrapper<T> implements AgentTool<any, T> {
	name: string;
	label: string;
	description: string;
	parameters: unknown;
	renderCall?: AgentTool["renderCall"];
	renderResult?: AgentTool["renderResult"];

	constructor(
		private tool: AgentTool<any, T>,
		private hookRunner: HookRunner,
	) {
		this.name = tool.name;
		this.label = tool.label ?? "";
		this.description = tool.description;
		this.parameters = tool.parameters;
		this.renderCall = tool.renderCall;
		this.renderResult = tool.renderResult;
	}

	async execute(
		toolCallId: string,
		params: Record<string, unknown>,
		signal?: AbortSignal,
		onUpdate?: AgentToolUpdateCallback<T>,
		context?: AgentToolContext,
	) {
		// Emit tool_call event - hooks can block execution
		// If hook errors/times out, block by default (fail-safe)
		if (this.hookRunner.hasHandlers("tool_call")) {
			try {
				const callResult = (await this.hookRunner.emitToolCall({
					type: "tool_call",
					toolName: this.tool.name,
					toolCallId,
					input: params,
				})) as ToolCallEventResult | undefined;

				if (callResult?.block) {
					const reason = callResult.reason || "Tool execution was blocked by a hook";
					throw new Error(reason);
				}
			} catch (err) {
				// Hook error or block - throw to mark as error
				if (err instanceof Error) {
					throw err;
				}
				throw new Error(`Hook failed, blocking execution: ${String(err)}`);
			}
		}

		// Execute the actual tool, forwarding onUpdate for progress streaming
		try {
			const result = await this.tool.execute(toolCallId, params, signal, onUpdate, context);

			// Emit tool_result event - hooks can modify the result
			if (this.hookRunner.hasHandlers("tool_result")) {
				const resultResult = (await this.hookRunner.emit({
					type: "tool_result",
					toolName: this.tool.name,
					toolCallId,
					input: params,
					content: result.content,
					details: result.details,
					isError: false,
				})) as ToolResultEventResult | undefined;

				// Apply modifications if any
				if (resultResult) {
					return {
						content: resultResult.content ?? result.content,
						details: (resultResult.details ?? result.details) as T,
					};
				}
			}

			return result;
		} catch (err) {
			// Emit tool_result event for errors so hooks can observe failures
			if (this.hookRunner.hasHandlers("tool_result")) {
				await this.hookRunner.emit({
					type: "tool_result",
					toolName: this.tool.name,
					toolCallId,
					input: params,
					content: [{ type: "text", text: err instanceof Error ? err.message : String(err) }],
					details: undefined,
					isError: true,
				});
			}
			throw err; // Re-throw original error for agent-loop
		}
	}
}

/**
 * Wrap all tools with hook callbacks.
 */
export function wrapToolsWithHooks<T>(tools: AgentTool<any, T>[], hookRunner: HookRunner): AgentTool<any, T>[] {
	return tools.map((tool) => new HookToolWrapper(tool, hookRunner));
}

/**
 * Backward compatibility alias - use HookToolWrapper directly.
 * @deprecated Use HookToolWrapper class instead
 */
export function wrapToolWithHooks<T>(tool: AgentTool<any, T>, hookRunner: HookRunner): AgentTool<any, T> {
	return new HookToolWrapper(tool, hookRunner);
}
