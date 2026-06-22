import type { BeforeProviderSend, Context, TextContent, ToolResultMessage } from "@earendil-works/omk-ai";
import {
	createLeanContextPolicyState,
	decideLeanContextEmission,
	type LeanContextPolicyOptions,
	type LeanContextPolicyState,
} from "./lean-context-policy.ts";

export interface LeanContextBeforeProviderSendOptions extends LeanContextPolicyOptions {
	readonly enabled?: boolean;
}

export interface LeanContextBeforeProviderSend {
	readonly beforeProviderSend: BeforeProviderSend;
	getState(): LeanContextPolicyState;
	reset(): void;
}

export function createLeanContextBeforeProviderSend(
	options: LeanContextBeforeProviderSendOptions = {},
): LeanContextBeforeProviderSend {
	let state = createLeanContextPolicyState();

	return {
		beforeProviderSend(input) {
			if (options.enabled === false) return undefined;
			const result = transformContext(input.context, state, options);
			state = result.nextState;
			return result.changed ? result.context : undefined;
		},
		getState() {
			return state;
		},
		reset() {
			state = createLeanContextPolicyState();
		},
	};
}

interface ContextTransformResult {
	readonly context: Context;
	readonly nextState: LeanContextPolicyState;
	readonly changed: boolean;
}

function transformContext(
	context: Context,
	initialState: LeanContextPolicyState,
	options: LeanContextBeforeProviderSendOptions,
): ContextTransformResult {
	let nextState = initialState;
	let changed = false;
	const messages = context.messages.map((message) => {
		if (message.role !== "toolResult") return message;
		const result = transformToolResult(message, nextState, options);
		nextState = result.nextState;
		changed = changed || result.changed;
		return result.message;
	});

	return {
		context: changed ? { ...context, messages } : context,
		nextState,
		changed,
	};
}

interface ToolResultTransformResult {
	readonly message: ToolResultMessage;
	readonly nextState: LeanContextPolicyState;
	readonly changed: boolean;
}

function transformToolResult(
	message: ToolResultMessage,
	initialState: LeanContextPolicyState,
	options: LeanContextBeforeProviderSendOptions,
): ToolResultTransformResult {
	let nextState = initialState;
	let changed = false;
	const content = message.content.map((block, index) => {
		if (block.type !== "text") return block;
		const key = extractLeanContextKey(message, index);
		const decision = decideLeanContextEmission({
			state: nextState,
			tool: message.toolName,
			key,
			path: key,
			content: block.text,
			minStubTokens: options.minStubTokens,
			neverStubFilenames: options.neverStubFilenames,
			secretPatterns: options.secretPatterns,
		});
		nextState = decision.nextState;
		if (decision.emit !== "stub" || decision.stub === undefined) return block;
		changed = true;
		return { type: "text", text: decision.stub } satisfies TextContent;
	});

	return {
		message: changed ? { ...message, content } : message,
		nextState,
		changed,
	};
}

function extractLeanContextKey(message: ToolResultMessage, contentIndex: number): string {
	const details = asRecord(message.details);
	const detailKey = firstStringValue(details, ["leanContextKey", "path", "filePath", "command", "query"]);
	return detailKey ?? `${message.toolName}:${message.toolCallId}:${contentIndex}`;
}

function firstStringValue(record: Record<string, unknown> | undefined, keys: readonly string[]): string | undefined {
	if (!record) return undefined;
	for (const key of keys) {
		const value = record[key];
		if (typeof value === "string" && value.trim().length > 0) {
			return value;
		}
	}
	return undefined;
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
	return typeof value === "object" && value !== null && !Array.isArray(value)
		? (value as Record<string, unknown>)
		: undefined;
}
