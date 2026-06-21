import { describe, expect, it } from "vitest";
import { getModel } from "../src/models.ts";

describe("DuckCoding model metadata", () => {
	it("registers claude-fable-5 as an Anthropic Messages compatible model", () => {
		const model = getModel("duckcoding", "claude-fable-5");

		expect(model).toMatchObject({
			id: "claude-fable-5",
			name: "Claude Fable 5",
			api: "anthropic-messages",
			provider: "duckcoding",
			baseUrl: "https://www.duckcoding.ai",
			input: ["text"],
		});
	});
});
