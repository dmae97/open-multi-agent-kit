import { describe, expect, test } from "bun:test";
import { formatPromptContent } from "@oh-my-pi/pi-coding-agent/utils/prompt-format";

describe("formatPromptContent renderPhase", () => {
	test("pre-render mode strips indentation from Handlebars block lines", () => {
		const input = "<root>\n  {{#if ok}}\n    value\n  {{/if}}\n</root>";

		const output = formatPromptContent(input, { renderPhase: "pre-render" });

		expect(output).toBe("<root>\n{{#if ok}}\n    value\n{{/if}}\n</root>");
	});

	test("post-render mode preserves indentation on Handlebars-like lines", () => {
		const input = "<root>\n  {{#if ok}}\n    value\n  {{/if}}\n</root>";

		const output = formatPromptContent(input, { renderPhase: "post-render" });

		expect(output).toBe("<root>\n  {{#if ok}}\n    value\n  {{/if}}\n</root>");
	});

	test("pre-render removes blank line before closing Handlebars block while post-render keeps it", () => {
		const input = "<root>\n{{#if ok}}\nvalue\n\n{{/if}}\n</root>";

		const preRender = formatPromptContent(input, { renderPhase: "pre-render" });
		const postRender = formatPromptContent(input, { renderPhase: "post-render" });

		expect(preRender).toBe("<root>\n{{#if ok}}\nvalue\n{{/if}}\n</root>");
		expect(postRender).toBe("<root>\n{{#if ok}}\nvalue\n\n{{/if}}\n</root>");
	});
});
