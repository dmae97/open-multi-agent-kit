import type { AssistantMessage, Context, Model, ToolResultMessage, Usage, UserMessage } from "@earendil-works/omk-ai";
import { describe, expect, it, vi } from "vitest";
import { createHeadroomBeforeProviderSend, type HeadroomCompressTextInput } from "../src/core/headroom-middleware.ts";

const TEST_MODEL = {
	id: "m",
	name: "test model",
	api: "test-api",
	provider: "test-provider",
	baseUrl: "https://example.invalid",
	reasoning: false,
	input: ["text"],
	cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
	contextWindow: 1,
	maxTokens: 1,
} satisfies Model<"test-api">;

const ZERO_USAGE: Usage = {
	input: 0,
	output: 0,
	cacheRead: 0,
	cacheWrite: 0,
	totalTokens: 0,
	cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 },
};

function toolResult(content: string, details?: unknown): ToolResultMessage<unknown> {
	return {
		role: "toolResult",
		toolCallId: "call-1",
		toolName: "read",
		content: [{ type: "text", text: content }],
		details,
		isError: true,
		timestamp: 1,
	};
}

function userMessage(content: string): UserMessage {
	return { role: "user", content, timestamp: 1 };
}

function assistantMessage(content: string): AssistantMessage {
	return {
		role: "assistant",
		api: "test-api",
		provider: "test-provider",
		model: "m",
		content: [
			{ type: "text", text: content },
			{ type: "toolCall", id: "call-1", name: "read", arguments: { path: "src/example.ts" } },
		],
		usage: ZERO_USAGE,
		stopReason: "toolUse",
		timestamp: 1,
	};
}

function runMiddleware(context: Context, compressText: (input: HeadroomCompressTextInput) => string | undefined) {
	const middleware = createHeadroomBeforeProviderSend({ compressText, thresholdTokens: 2 });
	return middleware.beforeProviderSend({ model: TEST_MODEL, context, options: {}, mode: "stream" });
}

describe("createHeadroomBeforeProviderSend", () => {
	it("compresses only tool result text blocks above the token threshold", () => {
		const shortText = "short";
		const longText = "alpha beta gamma delta epsilon zeta eta theta iota kappa lambda";
		const details = { path: "src/example.ts" };
		const message: ToolResultMessage<unknown> = {
			...toolResult(shortText, details),
			content: [
				{ type: "text", text: shortText },
				{ type: "text", text: longText },
			],
		};
		const context: Context = { messages: [message] };
		const compressText = vi.fn((input: HeadroomCompressTextInput) => `[compressed:${input.estimatedTokens}]`);

		const middleware = createHeadroomBeforeProviderSend({ compressText, thresholdTokens: 2 });
		const replacement = middleware.beforeProviderSend({ model: TEST_MODEL, context, options: {}, mode: "stream" });

		expect(replacement).toBeDefined();
		const replaced = replacement?.messages[0];
		expect(replaced?.role).toBe("toolResult");
		if (replaced?.role === "toolResult") {
			expect(replaced.toolCallId).toBe("call-1");
			expect(replaced.toolName).toBe("read");
			expect(replaced.isError).toBe(true);
			expect(replaced.details).toBe(details);
			expect(replaced.content).toEqual([
				{ type: "text", text: shortText },
				{ type: "text", text: expect.stringMatching(/^\[compressed:\d+]$/) },
			]);
		}
		expect(compressText).toHaveBeenCalledTimes(1);
		expect(compressText.mock.calls[0]?.[0]).toMatchObject({
			text: longText,
			toolCallId: "call-1",
			toolName: "read",
			contentIndex: 1,
		});
		expect(middleware.getStats()).toMatchObject({ compressedBlocks: 1, skippedBelowThresholdBlocks: 1 });
	});

	it("does not mutate the caller-owned context", () => {
		const original: Context = {
			messages: [toolResult("alpha beta gamma delta epsilon zeta", { path: "src/example.ts" })],
		};
		const snapshot = structuredClone(original);
		const compressText = vi.fn((_input: HeadroomCompressTextInput) => "compressed");

		const replacement = runMiddleware(original, compressText);

		expect(replacement).toBeDefined();
		expect(replacement).not.toBe(original);
		expect(original).toEqual(snapshot);
	});

	it("leaves user and assistant text and tool-call metadata untouched", () => {
		const user = userMessage("user text that is intentionally long enough to exceed the compression threshold");
		const assistant = assistantMessage(
			"assistant text that is intentionally long enough to exceed the compression threshold",
		);
		const tool = toolResult("alpha beta gamma delta epsilon zeta", { path: "src/example.ts" });
		const context: Context = { systemPrompt: "system prompt", messages: [user, assistant, tool] };
		const compressText = vi.fn((_input: HeadroomCompressTextInput) => "compressed tool result");

		const replacement = runMiddleware(context, compressText);

		expect(replacement).toBeDefined();
		expect(replacement?.systemPrompt).toBe("system prompt");
		expect(replacement?.messages[0]).toBe(user);
		expect(replacement?.messages[1]).toBe(assistant);
		expect(compressText).toHaveBeenCalledTimes(1);
	});

	it("skips text blocks that match secret patterns", () => {
		const text = "command output\npassword=placeholder-secret-value\n".repeat(4);
		const context: Context = { messages: [toolResult(text, { path: "logs/tool.txt" })] };
		const compressText = vi.fn((_input: HeadroomCompressTextInput) => "compressed");
		const middleware = createHeadroomBeforeProviderSend({ compressText, thresholdTokens: 1 });

		const replacement = middleware.beforeProviderSend({ model: TEST_MODEL, context, options: {}, mode: "stream" });

		expect(replacement).toBeUndefined();
		expect(compressText).not.toHaveBeenCalled();
		expect(middleware.getStats()).toMatchObject({ skippedSecretBlocks: 1 });
	});

	it("skips lean-context stubs", () => {
		const text =
			"[lean-context] read result for src/example.ts unchanged; omitted 1000 estimated tokens (sha256:abc123).";
		const context: Context = { messages: [toolResult(text, { path: "src/example.ts" })] };
		const compressText = vi.fn((_input: HeadroomCompressTextInput) => "compressed");
		const middleware = createHeadroomBeforeProviderSend({ compressText, thresholdTokens: 1 });

		const replacement = middleware.beforeProviderSend({ model: TEST_MODEL, context, options: {}, mode: "stream" });

		expect(replacement).toBeUndefined();
		expect(compressText).not.toHaveBeenCalled();
		expect(middleware.getStats()).toMatchObject({ skippedLeanContextBlocks: 1 });
	});

	it("fails open when the compressor throws", () => {
		const context: Context = {
			messages: [toolResult("alpha beta gamma delta epsilon zeta", { path: "src/example.ts" })],
		};
		const compressText = vi.fn((_input: HeadroomCompressTextInput) => {
			throw new Error("compressor unavailable");
		});
		const middleware = createHeadroomBeforeProviderSend({ compressText, thresholdTokens: 1 });

		const replacement = middleware.beforeProviderSend({ model: TEST_MODEL, context, options: {}, mode: "stream" });

		expect(replacement).toBeUndefined();
		expect(context.messages[0]).toEqual(
			toolResult("alpha beta gamma delta epsilon zeta", { path: "src/example.ts" }),
		);
		expect(middleware.getStats()).toMatchObject({ failedOpenBlocks: 1, compressedBlocks: 0 });
	});
});
