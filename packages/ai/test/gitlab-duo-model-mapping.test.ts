import { describe, expect, test } from "bun:test";
import { getModelMapping } from "../src/providers/gitlab-duo";

describe("gitlab duo model mapping", () => {
	test("resolves Duo alias IDs", () => {
		const mapping = getModelMapping("duo-chat-gpt-5-codex");
		expect(mapping).toBeDefined();
		expect(mapping?.model).toBe("gpt-5-codex");
	});

	test("resolves canonical model IDs", () => {
		const mapping = getModelMapping("gpt-5-codex");
		expect(mapping).toBeDefined();
		expect(mapping?.model).toBe("gpt-5-codex");
	});

	test("returns undefined for unknown IDs", () => {
		expect(getModelMapping("totally-unknown-model")).toBeUndefined();
	});
});
