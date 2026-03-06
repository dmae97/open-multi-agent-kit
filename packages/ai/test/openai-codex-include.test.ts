import { describe, expect, it } from "bun:test";
import { enrichModelThinking } from "@oh-my-pi/pi-ai/model-thinking";
import { type RequestBody, transformRequestBody } from "@oh-my-pi/pi-ai/providers/openai-codex/request-transformer";
import type { Model } from "@oh-my-pi/pi-ai/types";

function createCodexModel(id: string): Model<"openai-codex-responses"> {
	return enrichModelThinking({
		id,
		name: id,
		api: "openai-codex-responses",
		provider: "openai-codex",
		baseUrl: "https://api.openai.com/v1",
		reasoning: true,
		input: ["text"],
		cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
		contextWindow: 272000,
		maxTokens: 128000,
	});
}

describe("openai-codex include handling", () => {
	it("always includes reasoning.encrypted_content when caller include is custom", async () => {
		const body: RequestBody = {
			model: "gpt-5.1-codex",
		};

		const transformed = await transformRequestBody(body, createCodexModel(body.model), { include: ["foo"] });
		expect(transformed.include).toEqual(["foo", "reasoning.encrypted_content"]);
	});

	it("does not duplicate reasoning.encrypted_content", async () => {
		const body: RequestBody = {
			model: "gpt-5.1-codex",
		};

		const transformed = await transformRequestBody(body, createCodexModel(body.model), {
			include: ["foo", "reasoning.encrypted_content"],
		});
		expect(transformed.include).toEqual(["foo", "reasoning.encrypted_content"]);
	});
});
