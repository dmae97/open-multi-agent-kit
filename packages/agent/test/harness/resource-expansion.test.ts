import { describe, expect, it } from "vitest";
import { expandPromptTemplate } from "../../src/harness/prompt-templates.js";
import { expandSkillCommand } from "../../src/harness/skills.js";

describe("resource expansion helpers", () => {
	it("expands skills with additional instructions", () => {
		const skill = {
			name: "inspect",
			description: "Inspect things",
			content: "Use inspection tools.",
			filePath: "/project/.pi/skills/inspect/SKILL.md",
		};

		expect(expandSkillCommand(skill, "Check errors.")).toBe(
			'<skill name="inspect" location="/project/.pi/skills/inspect/SKILL.md">\nReferences are relative to /project/.pi/skills/inspect.\n\nUse inspection tools.\n</skill>\n\nCheck errors.',
		);
	});

	it("expands prompt templates with positional arguments", () => {
		expect(expandPromptTemplate({ name: "review", content: "Review $1 with $ARGUMENTS" }, ["a.ts", "care"])).toBe(
			"Review a.ts with a.ts care",
		);
	});
});
