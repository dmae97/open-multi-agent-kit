import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { Settings } from "@oh-my-pi/pi-coding-agent/config/settings";
import { createAgentSession } from "@oh-my-pi/pi-coding-agent/sdk";
import { SessionManager } from "@oh-my-pi/pi-coding-agent/session/session-manager";
import { loadSystemPromptFiles } from "@oh-my-pi/pi-coding-agent/system-prompt";

function escapeRegExp(text: string): string {
	return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

describe("SYSTEM.md prompt assembly", () => {
	let tempDir = "";
	let tempHomeDir = "";
	let originalHome: string | undefined;

	beforeEach(() => {
		tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "pi-system-prompt-"));
		tempHomeDir = fs.mkdtempSync(path.join(os.tmpdir(), "pi-system-home-"));
		originalHome = process.env.HOME;
		process.env.HOME = tempHomeDir;
	});

	afterEach(() => {
		if (tempDir) {
			fs.rmSync(tempDir, { recursive: true, force: true });
		}
		if (tempHomeDir) {
			fs.rmSync(tempHomeDir, { recursive: true, force: true });
		}
		if (originalHome === undefined) {
			delete process.env.HOME;
		} else {
			process.env.HOME = originalHome;
		}
	});

	it("renders SYSTEM.md exactly once when it is used as the custom base prompt", async () => {
		const projectDir = path.join(tempDir, "project");
		const systemDir = path.join(projectDir, ".omp");
		const systemPrompt = "You are the project SYSTEM prompt.";
		fs.mkdirSync(systemDir, { recursive: true });
		fs.writeFileSync(path.join(systemDir, "SYSTEM.md"), systemPrompt);

		const { session } = await createAgentSession({
			cwd: projectDir,
			agentDir: projectDir,
			sessionManager: SessionManager.inMemory(),
			settings: Settings.isolated(),
			systemPrompt,
			disableExtensionDiscovery: true,
			skills: [],
			contextFiles: [],
			promptTemplates: [],
			slashCommands: [],
			enableMCP: false,
			enableLsp: false,
		});

		try {
			const formatted = session.formatSessionAsText();
			const matches = formatted.match(new RegExp(escapeRegExp(systemPrompt), "g")) ?? [];
			expect(matches).toHaveLength(1);
		} finally {
			await session.dispose();
		}
	});

	it("prefers project SYSTEM.md over user SYSTEM.md", async () => {
		const projectDir = path.join(tempDir, "project");
		fs.mkdirSync(path.join(projectDir, ".omp"), { recursive: true });
		fs.mkdirSync(path.join(tempHomeDir, ".omp", "agent"), { recursive: true });
		fs.writeFileSync(path.join(tempHomeDir, ".omp", "agent", "SYSTEM.md"), "User SYSTEM prompt");
		fs.writeFileSync(path.join(projectDir, ".omp", "SYSTEM.md"), "Project SYSTEM prompt");

		await expect(loadSystemPromptFiles({ cwd: projectDir })).resolves.toBe("Project SYSTEM prompt");
	});
});
