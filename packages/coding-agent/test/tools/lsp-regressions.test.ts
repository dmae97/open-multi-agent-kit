import { describe, expect, it } from "bun:test";
import type { RenderResultOptions } from "@oh-my-pi/pi-agent-core";
import { renderCall, renderResult } from "@oh-my-pi/pi-coding-agent/lsp/render";
import type { CodeAction } from "@oh-my-pi/pi-coding-agent/lsp/types";
import { applyCodeAction, hasGlobPattern, resolveSymbolColumn } from "@oh-my-pi/pi-coding-agent/lsp/utils";
import { getThemeByName } from "@oh-my-pi/pi-coding-agent/modes/theme/theme";
import { sanitizeText } from "@oh-my-pi/pi-natives";
import { TempDir } from "@oh-my-pi/pi-utils";

describe("lsp regressions", () => {
	it("detects bracket-style glob patterns", () => {
		expect(hasGlobPattern("src/[ab].ts")).toBe(true);
		expect(hasGlobPattern("src/**/*.ts")).toBe(true);
		expect(hasGlobPattern("src/main.ts")).toBe(false);
	});

	it("resolves the requested symbol occurrence on a line", async () => {
		const tempDir = TempDir.createSync("@omp-lsp-regression-");
		try {
			const filePath = `${tempDir.path()}/symbol.ts`;
			await Bun.write(filePath, "foo(bar(foo));\n");

			expect(await resolveSymbolColumn(filePath, 1, "foo")).toBe(0);
			expect(await resolveSymbolColumn(filePath, 1, "foo", 2)).toBe(8);
		} finally {
			tempDir.removeSync();
		}
	});

	it("applies command-only code actions by executing workspace commands", async () => {
		const executedCommands: string[] = [];
		const result = await applyCodeAction(
			{ title: "Organize Imports", command: "source.organizeImports" },
			{
				applyWorkspaceEdit: async () => [],
				executeCommand: async command => {
					executedCommands.push(command.command);
				},
			},
		);

		expect(executedCommands).toEqual(["source.organizeImports"]);
		expect(result).toEqual({
			title: "Organize Imports",
			edits: [],
			executedCommands: ["source.organizeImports"],
		});
	});

	it("resolves code actions before applying edits", async () => {
		const unresolvedAction: CodeAction = { title: "Add import" };
		const appliedEdits: string[] = [];
		const result = await applyCodeAction(unresolvedAction, {
			resolveCodeAction: async action => ({
				...action,
				edit: {
					changes: {
						"file:///tmp/example.ts": [
							{
								range: {
									start: { line: 0, character: 0 },
									end: { line: 0, character: 0 },
								},
								newText: "import x from 'y';\n",
							},
						],
					},
				},
			}),
			applyWorkspaceEdit: async () => {
				appliedEdits.push("example.ts: 1 edit");
				return ["example.ts: 1 edit"];
			},
			executeCommand: async () => {},
		});

		expect(appliedEdits).toEqual(["example.ts: 1 edit"]);
		expect(result).toEqual({
			title: "Add import",
			edits: ["example.ts: 1 edit"],
			executedCommands: [],
		});
	});

	it("sanitizes symbol metadata in renderer output", async () => {
		const theme = await getThemeByName("dark");
		expect(theme).toBeDefined();
		const uiTheme = theme!;
		const renderOptions: RenderResultOptions = { expanded: false, isPartial: false };

		const call = renderCall(
			{ action: "definition", file: "src/example.ts", line: 10, symbol: "foo\tbar\nbaz" },
			renderOptions,
			uiTheme,
		);
		const callText = sanitizeText(call.render(120).join("\n"));
		const normalizedCallText = callText.replace(/\s+/g, " ");
		expect(normalizedCallText).toContain("foo bar baz");
		expect(callText).not.toContain("\t");
		const result = renderResult(
			{
				content: [{ type: "text", text: "No definition found" }],
				details: {
					action: "definition",
					success: true,
					request: {
						action: "definition",
						file: "src/example.ts",
						line: 10,
						symbol: "foo\tbar\nbaz",
						occurrence: 2,
					},
				},
			},
			renderOptions,
			uiTheme,
		);
		const resultText = sanitizeText(result.render(120).join("\n"));
		const normalizedResultText = resultText.replace(/\s+/g, " ");
		expect(normalizedResultText).toContain("symbol: foo bar baz");
		expect(normalizedResultText).toContain("occurrence: 2");
		expect(resultText).not.toContain("\t");
	});
});
