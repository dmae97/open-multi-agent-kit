import { describe, expect, it } from "bun:test";
import { buildHotkeysMarkdown } from "../../../src/modes/utils/hotkeys-markdown";

describe("buildHotkeysMarkdown", () => {
	it("emits flush-left markdown so headings and tables are parsed instead of treated as indented text", () => {
		const displayStrings: Record<string, string> = {
			copyLine: "Alt+Shift+L",
			copyPrompt: "Ctrl+Shift+P",
			togglePlanMode: "Alt+M",
			expandTools: "Ctrl+O",
			interrupt: "Esc",
			clear: "Ctrl+C",
			exit: "Ctrl+D",
			suspend: "Ctrl+Z",
			cycleThinkingLevel: "Shift+Tab",
			cycleModelForward: "Ctrl+P",
			cycleModelBackward: "Shift+Ctrl+P",
			selectModel: "Ctrl+L",
			historySearch: "Ctrl+R",
			toggleThinking: "Ctrl+T",
			externalEditor: "Ctrl+G",
			pasteImage: "Ctrl+V",
			toggleSTT: "Alt+H",
		};
		const markdown = buildHotkeysMarkdown({
			keybindings: {
				getDisplayString(action) {
					return displayStrings[action] ?? "Disabled";
				},
			},
		});

		const lines = markdown.split("\n");
		expect(lines[0]).toBe("**Navigation**");
		expect(markdown).toContain("| `Ctrl+Shift+P` | Copy whole prompt |");
		expect(markdown).toContain("| `Alt+M` | Toggle plan mode |");
		expect(markdown).toContain("| `#` | Open prompt actions |");
		for (const line of lines) {
			if (line.length === 0) continue;
			expect(line.startsWith(" ")).toBe(false);
			expect(line.startsWith("\t")).toBe(false);
		}
	});
});
