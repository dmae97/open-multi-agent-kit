import { mkdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { BeforeToolCallContext } from "omk-agent-core";
import { getModel } from "omk-ai";
import { afterEach, describe, expect, it } from "vitest";
import { AuthStorage } from "../src/core/auth-storage.ts";
import commandSafetyGate from "../src/core/extensions/builtin/command-safety-gate.ts";
import { ModelRegistry } from "../src/core/model-registry.ts";
import { createAgentSession } from "../src/core/sdk.ts";
import { SessionManager } from "../src/core/session-manager.ts";
import { SettingsManager } from "../src/core/settings-manager.ts";
import { createTestExtensionsResult, createTestResourceLoader } from "./utilities.ts";

const tempDirs: string[] = [];

function createTempDir(): string {
	const dir = join(tmpdir(), `omk-agent-command-safety-${Date.now()}-${Math.random().toString(36).slice(2)}`);
	mkdirSync(dir, { recursive: true });
	tempDirs.push(dir);
	return dir;
}

function bashToolCallContext(command: string): BeforeToolCallContext {
	return {
		assistantMessage: {
			role: "assistant",
			content: [{ type: "toolCall", id: "tc-1", name: "bash", arguments: { command } }],
			stopReason: "toolUse",
		},
		toolCall: { type: "toolCall", id: "tc-1", name: "bash", arguments: { command } },
		args: { command },
		context: { systemPrompt: "", messages: [], tools: [] },
	} as unknown as BeforeToolCallContext;
}

afterEach(() => {
	for (const dir of tempDirs.splice(0, tempDirs.length)) {
		rmSync(dir, { recursive: true, force: true });
	}
});

describe("AgentSession command safety hook", () => {
	it("blocks confirm-tier bash tool calls before extension handlers", async () => {
		const cwd = createTempDir();
		const extensionsResult = await createTestExtensionsResult([commandSafetyGate], cwd);
		const { session } = await createAgentSession({
			cwd,
			agentDir: cwd,
			model: getModel("anthropic", "claude-sonnet-4-5")!,
			sessionManager: SessionManager.inMemory(),
			settingsManager: SettingsManager.create(cwd, cwd),
			modelRegistry: ModelRegistry.inMemory(AuthStorage.inMemory()),
			resourceLoader: createTestResourceLoader({ extensionsResult }),
		});

		try {
			const hook = session.agent.beforeToolCall;
			expect(hook).toBeTypeOf("function");
			if (!hook) throw new Error("beforeToolCall hook was not installed");
			await expect(hook(bashToolCallContext("git reset --hard"))).resolves.toMatchObject({
				block: true,
				reason: expect.stringContaining("git.reset_hard"),
			});
		} finally {
			session.dispose();
		}
	});
});
