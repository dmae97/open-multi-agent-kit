import { describe, expect, it } from "vitest";
import { formatSkillsForSystemPrompt } from "../../src/harness/system-prompt.js";

describe("formatSkillsForSystemPrompt", () => {
	it("formats visible skills and skips model-disabled skills", () => {
		expect(
			formatSkillsForSystemPrompt([
				{
					name: "visible",
					description: "Use <this> & that",
					content: "visible content",
					filePath: "/skills/visible/SKILL.md",
				},
				{
					name: "hidden",
					description: "Hidden",
					content: "hidden content",
					filePath: "/skills/hidden/SKILL.md",
					disableModelInvocation: true,
				},
			]),
		).toContain("<name>visible</name>");
		expect(
			formatSkillsForSystemPrompt([
				{
					name: "visible",
					description: "Use <this> & that",
					content: "visible content",
					filePath: "/skills/visible/SKILL.md",
				},
			]),
		).toContain("Use &lt;this&gt; &amp; that");
		expect(
			formatSkillsForSystemPrompt([
				{
					name: "hidden",
					description: "Hidden",
					content: "hidden content",
					filePath: "/skills/hidden/SKILL.md",
					disableModelInvocation: true,
				},
			]),
		).toBe("");
	});
});
