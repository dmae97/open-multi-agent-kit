import { afterEach, describe, expect, it } from "vitest";
import { clearApiProviders, registerApiProvider } from "../src/api-registry.ts";
import { complete, completeSimple } from "../src/stream.ts";
import type { AssistantMessage, Context, Model, ProviderStreamOptions } from "../src/types.ts";
import { AssistantMessageEventStream } from "../src/utils/event-stream.ts";

function createDoneStream(message: AssistantMessage): AssistantMessageEventStream {
	const stream = new AssistantMessageEventStream();
	queueMicrotask(() => stream.push({ type: "done", reason: "stop", message }));
	return stream;
}

const model: Model<"middleware-test-api"> = {
	id: "middleware-test-model",
	name: "Middleware test model",
	provider: "openai",
	api: "middleware-test-api",
	baseUrl: "https://example.invalid/v1",
	reasoning: false,
	input: ["text"],
	cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
	maxTokens: 128,
	contextWindow: 4096,
};

function registerMiddlewareTestProvider(): void {
	registerApiProvider(
		{
			api: "middleware-test-api",
			stream: (_model, context) => createDoneStream(buildMessage(context)),
			streamSimple: (_model, context) => createDoneStream(buildMessage(context)),
		},
		"provider-send-middleware-test",
	);
}

function buildMessage(context: Context): AssistantMessage {
	const text = context.messages
		.map((message) => {
			if (message.role !== "user") return "";
			return typeof message.content === "string" ? message.content : "";
		})
		.join("\n");
	return {
		role: "assistant",
		api: model.api,
		provider: model.provider,
		model: model.id,
		content: [{ type: "text", text }],
		usage: {
			input: 0,
			output: 0,
			cacheRead: 0,
			cacheWrite: 0,
			totalTokens: 0,
			cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 },
		},
		stopReason: "stop",
		timestamp: Date.now(),
	};
}

describe("beforeProviderSend middleware", () => {
	afterEach(() => clearApiProviders());

	it("can replace the provider context for stream calls without mutating the caller context", async () => {
		registerMiddlewareTestProvider();
		const context: Context = {
			messages: [{ role: "user", content: "original", timestamp: 1 }],
		};
		const options: ProviderStreamOptions = {
			beforeProviderSend: ({ context: providerContext, mode }) => {
				expect(mode).toBe("stream");
				return {
					...providerContext,
					messages: [{ role: "user", content: "rewritten", timestamp: 2 }],
				};
			},
		};

		const response = await complete(model, context, options);

		expect(response.content).toEqual([{ type: "text", text: "rewritten" }]);
		expect(context.messages).toEqual([{ role: "user", content: "original", timestamp: 1 }]);
	});

	it("can replace the provider context for simple stream calls", async () => {
		registerMiddlewareTestProvider();
		const response = await completeSimple(
			model,
			{ messages: [{ role: "user", content: "simple-original", timestamp: 1 }] },
			{
				beforeProviderSend: ({ context: providerContext, mode }) => {
					expect(mode).toBe("streamSimple");
					return {
						...providerContext,
						messages: [{ role: "user", content: "simple-rewritten", timestamp: 2 }],
					};
				},
			},
		);

		expect(response.content).toEqual([{ type: "text", text: "simple-rewritten" }]);
	});

	it("keeps the original context when middleware returns undefined", async () => {
		registerMiddlewareTestProvider();
		const response = await complete(
			model,
			{ messages: [{ role: "user", content: "unchanged", timestamp: 1 }] },
			{
				beforeProviderSend: () => undefined,
			},
		);

		expect(response.content).toEqual([{ type: "text", text: "unchanged" }]);
	});
});
