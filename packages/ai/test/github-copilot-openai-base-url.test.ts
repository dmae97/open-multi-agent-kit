import { afterEach, describe, expect, it, vi } from "bun:test";
import { getBundledModel } from "../src/models";
import { streamOpenAICompletions } from "../src/providers/openai-completions";
import { streamOpenAIResponses } from "../src/providers/openai-responses";
import type { Context, Model } from "../src/types";

const originalFetch = global.fetch;

afterEach(() => {
	global.fetch = originalFetch;
	vi.restoreAllMocks();
});

const testContext: Context = {
	messages: [{ role: "user", content: "hello", timestamp: Date.now() }],
};

function getRequestUrl(input: string | URL | Request): string {
	if (input instanceof Request) {
		return input.url;
	}
	return typeof input === "string" ? input : input.toString();
}

const enterpriseToken = "tid=2;proxy-ep=proxy.enterprise.githubcopilot.com;exp=9999999999";

describe("GitHub Copilot OpenAI transport base URL", () => {
	it("uses token-derived endpoint for chat completions", async () => {
		const requestedUrls: string[] = [];
		global.fetch = vi.fn(async (input: string | URL | Request) => {
			requestedUrls.push(getRequestUrl(input));
			return new Response(JSON.stringify({ error: { message: "Unauthorized" } }), {
				status: 401,
				headers: { "Content-Type": "application/json" },
			});
		}) as unknown as typeof fetch;

		const model = getBundledModel("github-copilot", "gpt-4o") as Model<"openai-completions">;
		const result = await streamOpenAICompletions(model, testContext, { apiKey: enterpriseToken }).result();

		expect(result.stopReason).toBe("error");
		expect(requestedUrls[0]).toBe("https://api.enterprise.githubcopilot.com/chat/completions");
	});

	it("uses token-derived endpoint for responses API", async () => {
		const requestedUrls: string[] = [];
		global.fetch = vi.fn(async (input: string | URL | Request) => {
			requestedUrls.push(getRequestUrl(input));
			return new Response(JSON.stringify({ error: { message: "Unauthorized" } }), {
				status: 401,
				headers: { "Content-Type": "application/json" },
			});
		}) as unknown as typeof fetch;

		const model = getBundledModel("github-copilot", "gpt-5-mini") as Model<"openai-responses">;
		const result = await streamOpenAIResponses(model, testContext, { apiKey: enterpriseToken }).result();

		expect(result.stopReason).toBe("error");
		expect(requestedUrls[0]).toBe("https://api.enterprise.githubcopilot.com/responses");
	});
});
