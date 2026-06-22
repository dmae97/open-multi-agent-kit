import type { Context, Model, ToolResultMessage } from "@earendil-works/omk-ai";
import { describe, expect, it } from "vitest";
import { createLeanContextBeforeProviderSend } from "../src/core/lean-context-middleware.ts";

const TEST_MODEL = {
	id: "m",
	name: "test model",
	provider: "openai",
	api: "test-api",
	baseUrl: "https://example.invalid",
	reasoning: false,
	input: ["text"],
	cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
	maxTokens: 1,
	contextWindow: 1,
} satisfies Model<"test-api">;

function toolResult(content: string, details?: unknown): ToolResultMessage {
	return {
		role: "toolResult",
		toolCallId: "call-1",
		toolName: "read",
		content: [{ type: "text", text: content }],
		isError: false,
		timestamp: 1,
		...(details === undefined ? {} : { details }),
	};
}

function context(message: ToolResultMessage): Context {
	return { messages: [{ role: "user", content: "inspect", timestamp: 1 }, message] };
}

describe("createLeanContextBeforeProviderSend", () => {
	it("records first tool result without replacing the caller context", () => {
		const middleware = createLeanContextBeforeProviderSend({ minStubTokens: 1 });
		const original = context(toolResult("same output", { path: "src/example.ts" }));

		const replacement = middleware.beforeProviderSend({
			model: TEST_MODEL,
			context: original,
			options: {},
			mode: "stream",
		});

		expect(replacement).toBeUndefined();
		expect(original.messages[1]).toEqual(toolResult("same output", { path: "src/example.ts" }));
	});

	it("replaces repeated unchanged text tool results with a stub", () => {
		const middleware = createLeanContextBeforeProviderSend({ minStubTokens: 1 });
		const first = context(toolResult("same output", { path: "src/example.ts" }));
		const second = context(toolResult("same output", { path: "src/example.ts" }));

		middleware.beforeProviderSend({
			model: TEST_MODEL,
			context: first,
			options: {},
			mode: "stream",
		});
		const replacement = middleware.beforeProviderSend({
			model: TEST_MODEL,
			context: second,
			options: {},
			mode: "stream",
		});

		expect(replacement).toBeDefined();
		const replaced = replacement?.messages[1];
		expect(replaced?.role).toBe("toolResult");
		if (replaced?.role === "toolResult") {
			expect(replaced.content).toEqual([
				expect.objectContaining({ type: "text", text: expect.stringContaining("[lean-context]") }),
			]);
		}
		expect(second.messages[1]).toEqual(toolResult("same output", { path: "src/example.ts" }));
	});

	it("keeps changed or secret-containing outputs full", () => {
		const middleware = createLeanContextBeforeProviderSend({ minStubTokens: 1 });
		middleware.beforeProviderSend({
			model: TEST_MODEL,
			context: context(toolResult("first", { path: "src/example.ts" })),
			options: {},
			mode: "stream",
		});

		expect(
			middleware.beforeProviderSend({
				model: TEST_MODEL,
				context: context(toolResult("changed", { path: "src/example.ts" })),
				options: {},
				mode: "stream",
			}),
		).toBeUndefined();

		middleware.beforeProviderSend({
			model: TEST_MODEL,
			context: context(toolResult("password=placeholder-secret-value", { path: "logs/tool.txt" })),
			options: {},
			mode: "stream",
		});
		expect(
			middleware.beforeProviderSend({
				model: TEST_MODEL,
				context: context(toolResult("password=placeholder-secret-value", { path: "logs/tool.txt" })),
				options: {},
				mode: "stream",
			}),
		).toBeUndefined();
	});
});
