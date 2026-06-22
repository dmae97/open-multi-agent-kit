import type Anthropic from "@anthropic-ai/sdk";
import { Type } from "typebox";
import { describe, expect, it } from "vitest";
import { getModel } from "../src/models.ts";
import { streamAnthropic } from "../src/providers/anthropic.ts";
import type { Context, ToolCall } from "../src/types.ts";

function createSseResponse(events: Array<{ event: string; data: string }>): Response {
	const body = events.map(({ event, data }) => `event: ${event}\ndata: ${data}\n`).join("\n");
	return new Response(body, {
		status: 200,
		headers: { "content-type": "text/event-stream" },
	});
}

const minimalAnthropicEvents = [
	{
		event: "message_start",
		data: JSON.stringify({
			type: "message_start",
			message: {
				id: "msg_test",
				usage: {
					input_tokens: 12,
					output_tokens: 0,
					cache_read_input_tokens: 0,
					cache_creation_input_tokens: 0,
				},
			},
		}),
	},
	{
		event: "content_block_start",
		data: JSON.stringify({
			type: "content_block_start",
			index: 0,
			content_block: { type: "text", text: "" },
		}),
	},
	{
		event: "content_block_delta",
		data: JSON.stringify({
			type: "content_block_delta",
			index: 0,
			delta: { type: "text_delta", text: "Hello" },
		}),
	},
	{
		event: "content_block_stop",
		data: JSON.stringify({ type: "content_block_stop", index: 0 }),
	},
	{
		event: "message_delta",
		data: JSON.stringify({
			type: "message_delta",
			delta: { stop_reason: "end_turn" },
			usage: {
				input_tokens: 12,
				output_tokens: 5,
				cache_read_input_tokens: 0,
				cache_creation_input_tokens: 0,
			},
		}),
	},
	{
		event: "message_stop",
		data: JSON.stringify({ type: "message_stop" }),
	},
];

function createFakeAnthropicClient(response: Response): Anthropic {
	return createFakeAnthropicClientFromResponses([response]);
}

function createFakeAnthropicClientFromResponses(responses: Array<Response | Error>): Anthropic {
	let index = 0;
	return {
		messages: {
			create: () => ({
				asResponse: async () => {
					const next = responses[index++];
					if (!next) throw new Error("No fake Anthropic response queued");
					if (next instanceof Error) throw next;
					return next;
				},
			}),
		},
	} as unknown as Anthropic;
}

function createAnthropicError(
	message: string,
	options: { status?: number; type?: string; retryAfterMs?: number } = {},
): Error {
	const error = new Error(message) as Error & {
		status?: number;
		type?: string;
		headers?: Headers;
		error?: { type?: string; message?: string };
	};
	error.status = options.status;
	error.type = options.type;
	error.error = { type: options.type, message };
	if (options.retryAfterMs !== undefined) {
		error.headers = new Headers({ "retry-after-ms": String(options.retryAfterMs) });
	}
	return error;
}

describe("Anthropic raw SSE parsing", () => {
	it("repairs malformed SSE JSON and malformed streamed tool JSON", async () => {
		const model = getModel("anthropic", "claude-haiku-4-5");
		const context: Context = {
			messages: [{ role: "user", content: "Use the edit tool.", timestamp: Date.now() }],
			tools: [
				{
					name: "edit",
					description: "Edit a file.",
					parameters: Type.Object({
						path: Type.String(),
						text: Type.String(),
					}),
				},
			],
		};

		const malformedToolJsonDelta = String.raw`{"type":"content_block_delta","index":0,"delta":{"type":"input_json_delta","partial_json":"{\"path\":\"A\H\",\"text\":\"col1	col2\"}"}}`;

		const response = createSseResponse([
			{
				event: "message_start",
				data: JSON.stringify({
					type: "message_start",
					message: {
						id: "msg_test",
						usage: {
							input_tokens: 12,
							output_tokens: 0,
							cache_read_input_tokens: 0,
							cache_creation_input_tokens: 0,
						},
					},
				}),
			},
			{
				event: "content_block_start",
				data: JSON.stringify({
					type: "content_block_start",
					index: 0,
					content_block: {
						type: "tool_use",
						id: "toolu_test",
						name: "edit",
						input: {},
					},
				}),
			},
			{ event: "content_block_delta", data: malformedToolJsonDelta },
			{
				event: "content_block_stop",
				data: JSON.stringify({ type: "content_block_stop", index: 0 }),
			},
			{
				event: "message_delta",
				data: JSON.stringify({
					type: "message_delta",
					delta: { stop_reason: "tool_use" },
					usage: {
						input_tokens: 12,
						output_tokens: 5,
						cache_read_input_tokens: 0,
						cache_creation_input_tokens: 0,
					},
				}),
			},
			{
				event: "message_stop",
				data: JSON.stringify({ type: "message_stop" }),
			},
		]);

		const stream = streamAnthropic(model, context, {
			client: createFakeAnthropicClient(response),
		});
		const result = await stream.result();

		expect(result.stopReason).toBe("toolUse");
		expect(result.errorMessage).toBeUndefined();

		const toolCall = result.content.find((block): block is ToolCall => block.type === "toolCall");
		expect(toolCall).toBeDefined();
		expect(toolCall?.arguments).toEqual({
			path: "A\\H",
			text: "col1\tcol2",
		});
	});

	it("ignores unknown SSE events after message_stop", async () => {
		const model = getModel("anthropic", "claude-haiku-4-5");
		const context: Context = {
			messages: [{ role: "user", content: "Say hello.", timestamp: Date.now() }],
		};
		const response = createSseResponse([
			...minimalAnthropicEvents,
			{ event: "done", data: "[DONE]" },
			{ event: "proxy.stats", data: "not json" },
		]);

		const stream = streamAnthropic(model, context, {
			client: createFakeAnthropicClient(response),
		});
		const result = await stream.result();

		expect(result.stopReason).toBe("stop");
		expect(result.errorMessage).toBeUndefined();
		expect(result.content).toEqual([{ type: "text", text: "Hello" }]);
	});

	it("retries Anthropic overloaded errors before surfacing an assistant error", async () => {
		const model = getModel("anthropic", "claude-opus-4-8");
		const context: Context = {
			messages: [{ role: "user", content: "Say hello.", timestamp: Date.now() }],
		};
		const stream = streamAnthropic(model, context, {
			client: createFakeAnthropicClientFromResponses([
				createAnthropicError('{"type":"error","error":{"type":"overloaded_error","message":"Overloaded"}}', {
					status: 529,
					type: "overloaded_error",
					retryAfterMs: 0,
				}),
				createSseResponse(minimalAnthropicEvents),
			]),
		});
		const result = await stream.result();

		expect(result.stopReason).toBe("stop");
		expect(result.errorMessage).toBeUndefined();
		expect(result.content).toEqual([{ type: "text", text: "Hello" }]);
	});

	it("respects maxRetries zero for Anthropic overloaded errors", async () => {
		const model = getModel("anthropic", "claude-opus-4-8");
		const context: Context = {
			messages: [{ role: "user", content: "Say hello.", timestamp: Date.now() }],
		};
		const stream = streamAnthropic(model, context, {
			client: createFakeAnthropicClientFromResponses([
				createAnthropicError("Overloaded", { status: 529, type: "overloaded_error", retryAfterMs: 0 }),
				createSseResponse(minimalAnthropicEvents),
			]),
			maxRetries: 0,
		});
		const result = await stream.result();

		expect(result.stopReason).toBe("error");
		expect(result.errorMessage).toContain("Overloaded");
	});
});
