import { beforeAll, describe, expect, it, vi } from "bun:test";
import { type AgentMessage, ThinkingLevel } from "@oh-my-pi/pi-agent-core";
import type { AssistantMessage, Message, Usage } from "@oh-my-pi/pi-ai";
import { getBundledModel } from "@oh-my-pi/pi-ai";
import { AssistantMessageEventStream } from "@oh-my-pi/pi-ai/utils/event-stream";
import { BtwController } from "@oh-my-pi/pi-coding-agent/modes/controllers/btw-controller";
import { initTheme } from "@oh-my-pi/pi-coding-agent/modes/theme/theme";
import type { InteractiveModeContext } from "@oh-my-pi/pi-coding-agent/modes/types";
import { Container, type TUI } from "@oh-my-pi/pi-tui";

const usage: Usage = {
	input: 0,
	output: 0,
	cacheRead: 0,
	cacheWrite: 0,
	totalTokens: 0,
	cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 },
};

function createAssistantMessage(text: string): AssistantMessage {
	return {
		role: "assistant",
		content: [{ type: "text", text }],
		api: "anthropic-messages",
		provider: "anthropic",
		model: "claude-sonnet-4-5",
		usage,
		stopReason: "stop",
		timestamp: Date.now(),
	};
}

function createUserMessage(text: string): Message {
	return {
		role: "user",
		content: [{ type: "text", text }],
		attribution: "user",
		timestamp: Date.now(),
	};
}

beforeAll(async () => {
	await initTheme();
});

describe("BtwController", () => {
	it("builds a tool-less side request from the current session prefix and preserves payload hooks", async () => {
		const model = getBundledModel("anthropic", "claude-sonnet-4-5")!;
		const convertMessagesToLlm = vi.fn(async (messages: AgentMessage[]) => {
			const question = messages.at(-1);
			if (!question || !("content" in question)) {
				throw new Error("Expected the /btw question to be present in the conversion pipeline");
			}
			const questionText =
				typeof question.content === "string"
					? question.content
					: question.content
							.filter(content => content.type === "text")
							.map(content => content.text)
							.join("");
			return [createUserMessage(sessionMessages[0].content), createUserMessage(questionText)];
		});
		const getApiKey = vi.fn(async () => "key");
		const onPayload = vi.fn(async payload => payload);
		const prepareSimpleStreamOptions = vi.fn(options => ({ ...options, onPayload }));
		const prompt = vi.fn();
		const requestRender = vi.fn();
		const btwContainer = new Container();
		const sessionMessages = [{ role: "user" as const, content: "hello", timestamp: Date.now() }];
		const streamFn = vi.fn((_model, _context, _options) => {
			const stream = new AssistantMessageEventStream();
			queueMicrotask(() => {
				stream.push({ type: "done", reason: "stop", message: createAssistantMessage("Answer") });
			});
			return stream;
		});
		const ctx = {
			ui: { requestRender } as unknown as TUI,
			btwContainer,
			session: {
				model,
				messages: sessionMessages,
				isStreaming: false,
				sessionId: "session-1",
				serviceTier: "priority",
				thinkingLevel: ThinkingLevel.High,
				systemPrompt: "system prompt",
				modelRegistry: { getApiKey } as unknown as InteractiveModeContext["session"]["modelRegistry"],
				convertMessagesToLlm,
				prepareSimpleStreamOptions,
				prompt,
			} as unknown as InteractiveModeContext["session"],
			streamingMessage: undefined,
			extractAssistantText: (message: AssistantMessage) =>
				message.content
					.filter(content => content.type === "text")
					.map(content => content.text)
					.join(""),
			showStatus: vi.fn(),
			showError: vi.fn(),
		} as unknown as InteractiveModeContext;
		const controller = new BtwController(ctx, { streamFn });

		await controller.start("What changed?");
		await Bun.sleep(0);

		const convertCall = convertMessagesToLlm.mock.calls[0] as unknown as [AgentMessage[], AbortSignal];
		expect(convertCall).toBeDefined();
		expect(convertCall[0]).toHaveLength(2);
		expect(convertCall[0][0]).toEqual(ctx.session.messages[0]);
		expect(convertCall[0][1]?.role).toBe("user");
		expect(convertCall[1]).toBeInstanceOf(AbortSignal);
		const appendedQuestion = convertCall[0][1] as {
			role: "user";
			content: Array<{ type: string; text?: string }>;
		};
		expect(appendedQuestion.content[0]?.type).toBe("text");
		expect(appendedQuestion.content[0]?.text).toContain("What changed?");

		expect(getApiKey).toHaveBeenCalledWith(model, "session-1");
		expect(prepareSimpleStreamOptions).toHaveBeenCalledTimes(1);
		expect(streamFn).toHaveBeenCalledTimes(1);
		const [, context, options] = streamFn.mock.calls[0] as [
			unknown,
			{ systemPrompt?: string; messages: Message[] },
			Record<string, unknown>,
		];
		expect(context.systemPrompt).toBe("system prompt");
		expect(context.messages).toHaveLength(2);
		expect((context.messages[1]?.content as Array<{ type: string; text?: string }>)[0]?.text).toContain(
			"What changed?",
		);
		expect(options.apiKey).toBe("key");
		expect(options.sessionId).toBe("session-1");
		expect(options.serviceTier).toBe("priority");
		expect(options.reasoning).toBe(ThinkingLevel.High);
		expect(options.toolChoice).toBe("none");
		expect(options.onPayload).toBe(onPayload);
		expect("providerSessionState" in options).toBe(false);
		expect(prompt).not.toHaveBeenCalled();
		expect(ctx.session.messages).toEqual(sessionMessages);
		expect(btwContainer.children).toHaveLength(1);
		expect(controller.hasActiveRequest()).toBe(true);
	});

	it("appends the active streaming assistant snapshot when session history still ends with the user message", async () => {
		const model = getBundledModel("anthropic", "claude-sonnet-4-5")!;
		const convertMessagesToLlm = vi.fn(async () => []);
		const streamFn = vi.fn((_model, _context, _options) => {
			const stream = new AssistantMessageEventStream();
			queueMicrotask(() => {
				stream.push({ type: "done", reason: "stop", message: createAssistantMessage("ok") });
			});
			return stream;
		});
		const streamingMessage = {
			...createAssistantMessage("partial answer"),
			content: [
				{ type: "text", text: "partial answer" },
				{ type: "toolCall", id: "tool-1", name: "read", arguments: {} },
			],
		} as AssistantMessage;
		const ctx = {
			ui: { requestRender: vi.fn() } as unknown as TUI,
			btwContainer: new Container(),
			session: {
				model,
				messages: [createUserMessage("latest user")],
				isStreaming: true,
				sessionId: "session-1",
				serviceTier: undefined,
				thinkingLevel: ThinkingLevel.Off,
				systemPrompt: "system prompt",
				modelRegistry: {
					getApiKey: async () => "key",
				} as unknown as InteractiveModeContext["session"]["modelRegistry"],
				convertMessagesToLlm,
				prepareSimpleStreamOptions: (options =>
					options) as InteractiveModeContext["session"]["prepareSimpleStreamOptions"],
			} as unknown as InteractiveModeContext["session"],
			streamingMessage,
			extractAssistantText: () => "partial answer",
			showStatus: vi.fn(),
			showError: vi.fn(),
		} as unknown as InteractiveModeContext;
		const controller = new BtwController(ctx, { streamFn });

		await controller.start("Why?");
		await Bun.sleep(0);

		const firstCall = convertMessagesToLlm.mock.calls[0] as unknown as [AgentMessage[], AbortSignal];
		expect(firstCall).toBeDefined();
		expect(firstCall[1]).toBeInstanceOf(AbortSignal);
		const snapshot = firstCall[0];
		expect(snapshot).toHaveLength(3);
		expect(snapshot[0]?.role).toBe("user");
		const normalizedAssistant = snapshot[1] as AssistantMessage;
		expect(normalizedAssistant.role).toBe("assistant");
		expect(normalizedAssistant.content).toEqual([{ type: "text", text: "partial answer" }]);
		const appendedQuestion = snapshot[2] as { role: "user"; content: Array<{ type: string; text?: string }> };
		expect(appendedQuestion.role).toBe("user");
		expect(appendedQuestion.content[0]?.text).toContain("Why?");
	});

	it("replaces an existing request by aborting the previous btw stream and keeping one panel", async () => {
		const model = getBundledModel("anthropic", "claude-sonnet-4-5")!;
		const firstStream = new AssistantMessageEventStream();
		const secondStream = new AssistantMessageEventStream();
		const btwContainer = new Container();
		const streamFn = vi
			.fn()
			.mockImplementationOnce((_model, _context, _options) => firstStream)
			.mockImplementationOnce((_model, _context, _options) => {
				queueMicrotask(() => {
					secondStream.push({ type: "done", reason: "stop", message: createAssistantMessage("Second") });
				});
				return secondStream;
			});
		const ctx = {
			ui: { requestRender: vi.fn() } as unknown as TUI,
			btwContainer,
			session: {
				model,
				messages: [],
				isStreaming: false,
				sessionId: "session-1",
				serviceTier: undefined,
				thinkingLevel: ThinkingLevel.Off,
				systemPrompt: "system prompt",
				modelRegistry: {
					getApiKey: async () => "key",
				} as unknown as InteractiveModeContext["session"]["modelRegistry"],
				convertMessagesToLlm: async () => [],
				prepareSimpleStreamOptions: (options =>
					options) as InteractiveModeContext["session"]["prepareSimpleStreamOptions"],
			} as unknown as InteractiveModeContext["session"],
			streamingMessage: undefined,
			extractAssistantText: vi.fn(),
			showStatus: vi.fn(),
			showError: vi.fn(),
		} as unknown as InteractiveModeContext;
		const controller = new BtwController(ctx, { streamFn });

		await controller.start("First?");
		await controller.start("Second?");
		await Bun.sleep(0);

		const firstOptions = streamFn.mock.calls[0]?.[2] as { signal: AbortSignal };
		expect(firstOptions.signal.aborted).toBe(true);
		expect(streamFn).toHaveBeenCalledTimes(2);
		expect(btwContainer.children).toHaveLength(1);
		expect(controller.hasActiveRequest()).toBe(true);
	});

	it("clears the btw panel when the active request is dismissed", async () => {
		const model = getBundledModel("anthropic", "claude-sonnet-4-5")!;
		const btwContainer = new Container();
		const streamFn = vi.fn((_model, _context, _options) => new AssistantMessageEventStream());
		const ctx = {
			ui: { requestRender: vi.fn() } as unknown as TUI,
			btwContainer,
			session: {
				model,
				messages: [],
				isStreaming: false,
				sessionId: "session-1",
				serviceTier: undefined,
				thinkingLevel: ThinkingLevel.Off,
				systemPrompt: "system prompt",
				modelRegistry: {
					getApiKey: async () => "key",
				} as unknown as InteractiveModeContext["session"]["modelRegistry"],
				convertMessagesToLlm: async () => [],
				prepareSimpleStreamOptions: (options =>
					options) as InteractiveModeContext["session"]["prepareSimpleStreamOptions"],
			} as unknown as InteractiveModeContext["session"],
			streamingMessage: undefined,
			extractAssistantText: vi.fn(),
			showStatus: vi.fn(),
			showError: vi.fn(),
		} as unknown as InteractiveModeContext;
		const controller = new BtwController(ctx, { streamFn });

		await controller.start("Question?");

		expect(btwContainer.children).toHaveLength(1);
		expect(controller.handleEscape()).toBe(true);
		expect(btwContainer.children).toHaveLength(0);
		expect(controller.hasActiveRequest()).toBe(false);
	});
});
