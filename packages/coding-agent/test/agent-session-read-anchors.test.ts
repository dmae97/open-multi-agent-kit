import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { getModel } from "@earendil-works/omk-ai";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { ExtensionContext } from "../src/core/extensions/types.ts";
import { DefaultResourceLoader } from "../src/core/resource-loader.ts";
import { createAgentSession } from "../src/core/sdk.ts";
import { SessionManager } from "../src/core/session-manager.ts";
import { SettingsManager } from "../src/core/settings-manager.ts";
import type { ReadToolDetails } from "../src/core/tools/read.ts";

describe("AgentSession read-anchor injection", () => {
	let tempDir: string;
	let agentDir: string;

	beforeEach(() => {
		tempDir = join(tmpdir(), `pi-read-anchor-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
		agentDir = join(tempDir, "agent");
		mkdirSync(agentDir, { recursive: true });
	});

	afterEach(() => {
		if (tempDir && existsSync(tempDir)) {
			rmSync(tempDir, { recursive: true, force: true });
		}
	});

	async function makeSession() {
		const settingsManager = SettingsManager.create(tempDir, agentDir);
		const sessionManager = SessionManager.inMemory();
		const resourceLoader = new DefaultResourceLoader({ cwd: tempDir, agentDir, settingsManager });
		await resourceLoader.reload();
		return createAgentSession({
			cwd: tempDir,
			agentDir,
			model: getModel("anthropic", "claude-sonnet-4-5")!,
			settingsManager,
			sessionManager,
			resourceLoader,
		});
	}

	it("wires built-in read and edit tools to a shared per-session read-anchor registry", async () => {
		const filePath = join(tempDir, "sample.txt");
		writeFileSync(filePath, "line1\nline2\nline3\n");

		const { session } = await makeSession();
		try {
			const readDef = session.getToolDefinition("read");
			const editDef = session.getToolDefinition("edit");
			expect(readDef).toBeDefined();
			expect(editDef).toBeDefined();

			// Edit before any read is rejected: the built-in edit tool shares the
			// per-session anchor registry and runs in strict mode, so it requires a
			// prior read anchor for the file.
			await expect(
				editDef!.execute(
					"call-edit-stale",
					{ path: filePath, edits: [{ oldText: "line2", newText: "LINE2" }] },
					undefined,
					undefined,
					{} as ExtensionContext,
				),
			).rejects.toThrow(/stale read/i);
			expect(readFileSync(filePath, "utf-8")).toContain("line2");

			// Reading registers an anchor in the per-session registry and surfaces it
			// via details.readAnchors (proves the read tool got the registry).
			const readResult = await readDef!.execute(
				"call-read",
				{ path: filePath },
				undefined,
				undefined,
				{} as ExtensionContext,
			);
			const details = readResult.details as ReadToolDetails | undefined;
			expect(details?.readAnchors?.length).toBe(1);

			// Edit after read succeeds: read and edit share the SAME registry, so the
			// anchor registered by read is visible to edit.
			const editResult = await editDef!.execute(
				"call-edit",
				{ path: filePath, edits: [{ oldText: "line2", newText: "LINE2" }] },
				undefined,
				undefined,
				{} as ExtensionContext,
			);
			const editText = editResult.content
				.filter((c) => c.type === "text")
				.map((c) => (c as { text?: string }).text ?? "")
				.join("\n");
			expect(editText).toContain("Successfully replaced");
			expect(readFileSync(filePath, "utf-8")).toContain("LINE2");
		} finally {
			session.dispose();
		}
	});
});
