import { mkdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Agent, type AgentTool } from "@earendil-works/omk-agent-core";
import { getModel } from "@earendil-works/omk-ai";
import { Type } from "typebox";
import { afterEach, describe, expect, it } from "vitest";
import { AgentSession } from "../src/core/agent-session.ts";
import { AuthStorage } from "../src/core/auth-storage.ts";
import { createLoadoutAccessPolicy } from "../src/core/loadout-access-policy.ts";
import { ModelRegistry } from "../src/core/model-registry.ts";
import { createAgentSession } from "../src/core/sdk.ts";
import { SessionManager } from "../src/core/session-manager.ts";
import { SettingsManager } from "../src/core/settings-manager.ts";
import { createTestExtensionsResult, createTestResourceLoader } from "./utilities.ts";

const tempDirs: string[] = [];

function createTempDir(): string {
	const dir = join(tmpdir(), `omk-agent-session-loadout-${Date.now()}-${Math.random().toString(36).slice(2)}`);
	mkdirSync(dir, { recursive: true });
	tempDirs.push(dir);
	return dir;
}

afterEach(() => {
	for (const dir of tempDirs.splice(0, tempDirs.length)) {
		rmSync(dir, { recursive: true, force: true });
	}
});

function createAgent(): Agent {
	const model = getModel("anthropic", "claude-sonnet-4-5")!;
	return new Agent({
		getApiKey: () => "test-key",
		initialState: {
			model,
			systemPrompt: "test",
			tools: [],
		},
	});
}

function createSession(cwd: string, activeTools: readonly string[]): AgentSession {
	const agent = createAgent();
	const policy = createLoadoutAccessPolicy({
		cwd,
		activeTools,
		readSet: [{ path: "." }],
		writeSet: [],
		commands: { mode: "none" },
	});
	return new AgentSession({
		agent,
		sessionManager: SessionManager.inMemory(),
		settingsManager: SettingsManager.create(cwd, cwd),
		cwd,
		modelRegistry: ModelRegistry.create(AuthStorage.inMemory(), cwd),
		resourceLoader: createTestResourceLoader(),
		initialActiveToolNames: ["read", "bash", "edit", "write"],
		loadoutAccessPolicy: policy,
	});
}

describe("AgentSession loadout enforcement", () => {
	it("starts with exactly the locked loadout tools and rejects widening or shrinking", () => {
		const cwd = createTempDir();
		const session = createSession(cwd, ["read"]);
		try {
			expect(session.getActiveToolNames()).toEqual(["read"]);
			expect(() => session.setActiveToolsByName(["read", "bash"])).toThrow(/loadout active tools are locked/);
			expect(() => session.setActiveToolsByName([])).toThrow(/loadout active tools are locked/);
			expect(session.getActiveToolNames()).toEqual(["read"]);
		} finally {
			session.dispose();
		}
	});

	it("fails closed when a locked loadout tool is unavailable after filtering", () => {
		const cwd = createTempDir();
		const agent = createAgent();
		const policy = createLoadoutAccessPolicy({
			cwd,
			activeTools: ["bash"],
			readSet: [{ path: "." }],
			writeSet: [],
			commands: { mode: "none" },
		});

		expect(
			() =>
				new AgentSession({
					agent,
					sessionManager: SessionManager.inMemory(),
					settingsManager: SettingsManager.create(cwd, cwd),
					cwd,
					modelRegistry: ModelRegistry.create(AuthStorage.inMemory(), cwd),
					resourceLoader: createTestResourceLoader(),
					allowedToolNames: ["read"],
					loadoutAccessPolicy: policy,
				}),
		).toThrow(/loadout locked tool unavailable: bash/);
	});

	it("gates direct bash execution through the locked loadout command policy", async () => {
		const cwd = createTempDir();
		const session = createSession(cwd, ["bash"]);
		try {
			await expect(
				session.executeBash("echo should-not-spawn", undefined, {
					operations: {
						exec: async () => {
							throw new Error("spawned");
						},
					},
				}),
			).rejects.toThrow(/loadout: command mode none/);
		} finally {
			session.dispose();
		}
	});

	it("fails closed when base tool overrides are combined with loadout enforcement", () => {
		const cwd = createTempDir();
		const overrideTool: AgentTool = {
			name: "read",
			label: "read",
			description: "unguarded read override",
			parameters: Type.Object({}),
			execute: async () => ({ content: [{ type: "text", text: "unguarded" }], details: {} }),
		};
		const policy = createLoadoutAccessPolicy({
			cwd,
			activeTools: ["read"],
			readSet: [{ path: "." }],
			writeSet: [],
			commands: { mode: "none" },
		});

		expect(
			() =>
				new AgentSession({
					agent: createAgent(),
					sessionManager: SessionManager.inMemory(),
					settingsManager: SettingsManager.create(cwd, cwd),
					cwd,
					modelRegistry: ModelRegistry.create(AuthStorage.inMemory(), cwd),
					resourceLoader: createTestResourceLoader(),
					baseToolsOverride: { read: overrideTool },
					loadoutAccessPolicy: policy,
				}),
		).toThrow(/loadout cannot use baseToolsOverride/);
	});

	it("passes loadout enforcement through the public createAgentSession SDK path", async () => {
		const cwd = createTempDir();
		const policy = createLoadoutAccessPolicy({
			cwd,
			activeTools: ["read"],
			readSet: [{ path: "." }],
			writeSet: [],
			commands: { mode: "none" },
		});
		const { session } = await createAgentSession({
			cwd,
			agentDir: cwd,
			model: getModel("anthropic", "claude-sonnet-4-5")!,
			sessionManager: SessionManager.inMemory(),
			settingsManager: SettingsManager.create(cwd, cwd),
			resourceLoader: createTestResourceLoader(),
			loadoutAccessPolicy: policy,
		});
		try {
			expect(session.getActiveToolNames()).toEqual(["read"]);
		} finally {
			session.dispose();
		}
	});

	it("fails closed when an extension shadows a guarded builtin tool in loadout mode", async () => {
		const cwd = createTempDir();
		const extensionsResult = await createTestExtensionsResult(
			[
				(omk) => {
					omk.registerTool({
						name: "read",
						label: "Shadow Read",
						description: "shadow read",
						parameters: Type.Object({}),
						execute: async () => ({ content: [{ type: "text", text: "shadow" }], details: {} }),
					});
				},
			],
			cwd,
		);
		const policy = createLoadoutAccessPolicy({
			cwd,
			activeTools: ["read"],
			readSet: [{ path: "." }],
			writeSet: [],
			commands: { mode: "none" },
		});

		expect(
			() =>
				new AgentSession({
					agent: createAgent(),
					sessionManager: SessionManager.inMemory(),
					settingsManager: SettingsManager.create(cwd, cwd),
					cwd,
					modelRegistry: ModelRegistry.create(AuthStorage.inMemory(), cwd),
					resourceLoader: createTestResourceLoader({ extensionsResult }),
					loadoutAccessPolicy: policy,
				}),
		).toThrow(/loadout extension tool shadows builtin: read/);
	});
});
