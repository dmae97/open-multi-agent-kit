import { describe, expect, it, vi } from "vitest";
import type { ToolDefinition } from "../src/core/extensions/types.ts";
import { type HookInventory, loadHookInventory } from "../src/core/hook-inventory.ts";
import {
	createLoadoutAccessPolicy,
	decideLoadoutAccess,
	isActiveLoadoutTool,
} from "../src/core/loadout-access-policy.ts";
import {
	applyLoadoutToRuntime,
	buildCapabilityInventory,
	buildLoadoutAccessPolicy,
	buildSubagentLaneGrant,
	type LoadoutRuntimeSession,
} from "../src/core/loadout-runtime.ts";
import { type AppliedLoadout, BUILTIN_LOADOUTS, type LoadoutProfile } from "../src/core/loadouts.ts";
import type { ResourceLoader } from "../src/core/resource-loader.ts";
import type { SourceInfo } from "../src/core/source-info.ts";

vi.mock("../src/core/mcp-inventory.ts", () => ({
	loadMcpInventory: () => ({
		entries: [
			{ name: "filesystem", source: "/project/.omk/mcp.json", commandSummary: "mcp-filesystem", envKeys: [] },
			{ name: "memory", source: "/project/.omk/mcp.json", commandSummary: "mcp-memory", envKeys: ["MEMORY_KEY"] },
		],
		presets: [],
		sources: [],
		errors: [],
	}),
}));

function makeSession(overrides?: {
	baseTools?: string[];
	extensionTools?: Array<{ name: string; sourceInfo: SourceInfo }>;
	customTools?: string[];
}): LoadoutRuntimeSession {
	const base = new Map<string, ToolDefinition>();
	for (const name of overrides?.baseTools ?? ["read", "edit", "bash"]) {
		base.set(name, { name } as unknown as ToolDefinition);
	}

	const extensionTools = overrides?.extensionTools ?? [];
	const customTools = (overrides?.customTools ?? ["custom"]).map((name) => ({ name }) as unknown as ToolDefinition);

	return {
		_baseToolDefinitions: base,
		_extensionRunner: {
			getAllRegisteredTools: () =>
				extensionTools.map((tool) => ({
					definition: { name: tool.name },
					sourceInfo: tool.sourceInfo,
				})),
		},
		_customTools: customTools,
	};
}

function makeResourceLoader(skills: Array<{ name: string; sourceInfo: SourceInfo; filePath: string }>): ResourceLoader {
	return {
		getSkills: () => ({
			skills: skills.map((skill) => ({
				...skill,
				description: "test skill",
				baseDir: "/skills",
				disableModelInvocation: false,
			})),
			diagnostics: [],
		}),
		getExtensions: () => ({ extensions: [], diagnostics: [], errors: [], runtime: {} as never }),
		getPrompts: () => ({ prompts: [], diagnostics: [] }),
		getThemes: () => ({ themes: [], diagnostics: [] }),
		getAgentsFiles: () => ({ agentsFiles: [] }),
		getSystemPrompt: () => undefined,
		getAppendSystemPrompt: () => [],
		extendResources: () => {},
		reload: async () => {},
	};
}

const mockSourceInfo = (source: string, scope: SourceInfo["scope"], origin: SourceInfo["origin"]): SourceInfo => ({
	source,
	scope,
	origin,
	path: `/skills/${source}`,
});

describe("loadHookInventory", () => {
	it("returns the builtin hook manifest", () => {
		const inventory = loadHookInventory();
		expect(inventory.hooks.map((h) => h.name)).toEqual([
			"pre-shell-guard",
			"protect-secrets",
			"session-context",
			"precompact-checkpoint",
			"typecheck-after-edit",
			"stop-verify",
			"subagent-stop-audit",
			"npm-audit-summary",
		]);
		expect(inventory.hooks.every((h) => h.builtin)).toBe(true);
	});
});

describe("buildCapabilityInventory", () => {
	it("returns tools with correct provenance metadata", () => {
		const session = makeSession({
			baseTools: ["read"],
			extensionTools: [
				{
					name: "ext-tool",
					sourceInfo: mockSourceInfo("pkg-a", "project", "package"),
				},
			],
			customTools: ["sdk-tool"],
		});
		const loader = makeResourceLoader([
			{
				name: "test-skill",
				sourceInfo: mockSourceInfo("local", "project", "top-level"),
				filePath: "/skills/test-skill/SKILL.md",
			},
		]);
		const hookInventory: HookInventory = { hooks: [{ name: "pre-shell-guard", builtin: true }] };

		const inventory = buildCapabilityInventory(session, loader, "/project", hookInventory);

		expect(inventory.tools).toEqual([
			{ kind: "tool", name: "read", source: "builtin", scope: "temporary", origin: "top-level" },
			{
				kind: "tool",
				name: "ext-tool",
				source: "pkg-a",
				scope: "project",
				origin: "package",
				path: "/skills/pkg-a",
			},
			{ kind: "tool", name: "sdk-tool", source: "sdk", scope: "temporary", origin: "top-level" },
		]);
	});

	it("never includes MCP env values in the inventory", () => {
		const session = makeSession({ baseTools: [] });
		const loader = makeResourceLoader([]);
		const inventory = buildCapabilityInventory(session, loader, "/project", { hooks: [] });

		const memory = inventory.mcp.find((resource) => resource.name === "memory");
		expect(memory).toBeDefined();
		expect(memory).not.toHaveProperty("env");
		expect(memory).not.toHaveProperty("envKeys");
		expect(memory).toEqual({
			kind: "mcp",
			name: "memory",
			source: "/project/.omk/mcp.json",
			scope: "project",
			origin: "top-level",
		});
	});

	it("includes skill provenance and paths", () => {
		const session = makeSession({ baseTools: [] });
		const loader = makeResourceLoader([
			{
				name: "skill-a",
				sourceInfo: mockSourceInfo("trusted", "user", "package"),
				filePath: "/skills/skill-a/SKILL.md",
			},
		]);
		const inventory = buildCapabilityInventory(session, loader, "/project", { hooks: [] });

		expect(inventory.skills).toEqual([
			{
				kind: "skill",
				name: "skill-a",
				source: "trusted",
				scope: "user",
				origin: "package",
				path: "/skills/skill-a/SKILL.md",
			},
		]);
	});

	it("includes hooks as builtin-scoped resources", () => {
		const session = makeSession({ baseTools: [] });
		const loader = makeResourceLoader([]);
		const hookInventory: HookInventory = {
			hooks: [
				{ name: "pre-shell-guard", builtin: true },
				{ name: "custom-hook", scriptPath: "/hooks/custom-hook.sh", builtin: false },
			],
		};
		const inventory = buildCapabilityInventory(session, loader, "/project", hookInventory);

		expect(inventory.hooks).toEqual([
			{ kind: "hook", name: "pre-shell-guard", source: "builtin", scope: "builtin", origin: "top-level" },
			{ kind: "hook", name: "custom-hook", source: "/hooks/custom-hook.sh", scope: "builtin", origin: "top-level" },
		]);
	});
});

describe("applyLoadoutToRuntime", () => {
	it("activates expected capabilities for the code builtin profile", () => {
		const session = makeSession({
			baseTools: ["read", "grep", "find", "ls", "edit", "write", "bash"],
		});
		const loader = makeResourceLoader([
			{
				name: "test-driven-development",
				sourceInfo: mockSourceInfo("local", "project", "top-level"),
				filePath: "/skills/tdl/SKILL.md",
			},
			{
				name: "coding-standards",
				sourceInfo: mockSourceInfo("local", "project", "top-level"),
				filePath: "/skills/cs/SKILL.md",
			},
		]);

		const state = applyLoadoutToRuntime(session, loader, "/project", "/agent", {
			profile: BUILTIN_LOADOUTS.code,
			role: "coder",
			grantAuthority: "write-scoped",
			assignedReadPaths: ["src/lib.ts"],
			assignedWritePaths: ["src/feature.ts"],
		});

		expect(state.blockers).toEqual([]);
		expect(state.activeTools).toEqual(["bash", "edit", "find", "grep", "ls", "read", "write"]);
		expect(state.activeSkills).toEqual(["coding-standards", "test-driven-development"]);
		expect(state.activeMcp).toEqual(["filesystem"]);
		expect(state.activeHooks).toEqual(["pre-shell-guard", "protect-secrets", "typecheck-after-edit"]);
		expect(state.schedulerFields).toEqual({
			readSet: [{ path: "src/lib.ts" }],
			writeSet: [{ path: "src/feature.ts" }],
			parallelizable: false,
		});
	});

	it("returns blockers when the grant authority is too weak", () => {
		const session = makeSession({ baseTools: ["read", "edit", "bash"] });
		const loader = makeResourceLoader([]);

		const state = applyLoadoutToRuntime(session, loader, "/project", "/agent", {
			profile: BUILTIN_LOADOUTS.code,
			role: "coder",
			grantAuthority: "review-only",
		});

		expect(state.blockers).toContain("loadout authority write-scoped exceeds grant review-only");
		expect(state.schedulerFields).toEqual({ readSet: [], writeSet: [], parallelizable: true });
	});

	it("returns validation errors for an invalid profile", () => {
		const session = makeSession({ baseTools: [] });
		const loader = makeResourceLoader([]);
		const invalid = {
			...BUILTIN_LOADOUTS.plan,
			name: "invalid",
			schemaVersion: "omk.loadout.v0",
		} as unknown as LoadoutProfile;

		const state = applyLoadoutToRuntime(session, loader, "/project", "/agent", {
			profile: invalid,
			role: "planner",
		});

		expect(state.blockers).toContain("unknown schemaVersion: omk.loadout.v0");
		expect(state.schedulerFields).toEqual({ readSet: [], writeSet: [], parallelizable: true });
	});
});

describe("loadout access policy", () => {
	it("denies inactive tools even when path is allowed", () => {
		const policy = createLoadoutAccessPolicy({
			cwd: "/repo",
			activeTools: ["read"],
			readSet: [{ path: "src" }],
			writeSet: [{ path: "src" }],
		});

		const decision = decideLoadoutAccess(policy, {
			operation: "write",
			toolName: "edit",
			path: "src/file.ts",
		});

		expect(isActiveLoadoutTool(policy, "edit")).toBe(false);
		expect(decision.allowed).toBe(false);
		expect(decision.reason).toContain("inactive tool");
	});

	it("allows reads within readSet and rejects sibling-prefix escapes", () => {
		const policy = createLoadoutAccessPolicy({
			cwd: "/repo",
			activeTools: ["read"],
			readSet: [{ path: "src/allowed" }],
		});

		expect(
			decideLoadoutAccess(policy, {
				operation: "read",
				toolName: "read",
				path: "src/allowed/file.ts",
			}).allowed,
		).toBe(true);

		const siblingDecision = decideLoadoutAccess(policy, {
			operation: "read",
			toolName: "read",
			path: "src/allowed-sibling/file.ts",
		});

		expect(siblingDecision.allowed).toBe(false);
		expect(siblingDecision.reason).toContain("outside read scope");
	});

	it("allows writes only within writeSet", () => {
		const policy = createLoadoutAccessPolicy({
			cwd: "/repo",
			activeTools: ["edit", "read"],
			readSet: [{ path: "src" }],
			writeSet: [{ path: "src/writable" }],
		});

		expect(
			decideLoadoutAccess(policy, {
				operation: "write",
				toolName: "edit",
				path: "src/writable/file.ts",
			}).allowed,
		).toBe(true);

		const readOnlyDecision = decideLoadoutAccess(policy, {
			operation: "write",
			toolName: "edit",
			path: "src/readonly/file.ts",
		});

		expect(readOnlyDecision.allowed).toBe(false);
		expect(readOnlyDecision.reason).toContain("outside write scope");
	});

	it("denies blocked secret/env/key paths before set matching", () => {
		const policy = createLoadoutAccessPolicy({
			cwd: "/repo",
			activeTools: ["read"],
			readSet: [{ path: "." }],
		});

		for (const blockedPath of [".env.local", "src/secret-plan.md", "src/api.key"]) {
			const decision = decideLoadoutAccess(policy, {
				operation: "read",
				toolName: "read",
				path: blockedPath,
			});

			expect(decision.allowed).toBe(false);
			expect(decision.reason).toContain("blocked path");
		}
	});

	it("denies read and write operations when their access sets are empty", () => {
		const policy = createLoadoutAccessPolicy({
			cwd: "/repo",
			activeTools: ["edit", "read"],
		});

		expect(
			decideLoadoutAccess(policy, {
				operation: "read",
				toolName: "read",
				path: "src/file.ts",
			}).allowed,
		).toBe(false);
		expect(
			decideLoadoutAccess(policy, {
				operation: "write",
				toolName: "edit",
				path: "src/file.ts",
			}).allowed,
		).toBe(false);
	});

	it("denies bash when command mode is none", () => {
		const policy = createLoadoutAccessPolicy({
			cwd: "/repo",
			activeTools: ["bash"],
			commands: { mode: "none" },
		});

		const decision = decideLoadoutAccess(policy, {
			operation: "execute",
			toolName: "bash",
			command: "npm test",
		});

		expect(decision.allowed).toBe(false);
		expect(decision.reason).toContain("command mode none");
	});
});

describe("buildLoadoutAccessPolicy", () => {
	it("builds an access policy from activeTools and scheduler fields", () => {
		const policy = buildLoadoutAccessPolicy(
			{
				profileName: "code",
				authority: "write-scoped",
				activeTools: ["edit", "read"],
				activeSkills: [],
				activeMcp: [],
				activeHooks: [],
				schedulerFields: {
					readSet: [{ path: "src/readable" }],
					writeSet: [{ path: "src/writable" }],
					parallelizable: false,
				},
				blockers: [],
				warnings: [],
			},
			{ cwd: "/repo", commands: { mode: "none" } },
		);

		expect(isActiveLoadoutTool(policy, "edit")).toBe(true);
		expect(
			decideLoadoutAccess(policy, {
				operation: "read",
				toolName: "read",
				path: "src/readable/file.ts",
			}).allowed,
		).toBe(true);
		expect(
			decideLoadoutAccess(policy, {
				operation: "write",
				toolName: "edit",
				path: "src/writable/file.ts",
			}).allowed,
		).toBe(true);
		expect(
			decideLoadoutAccess(policy, {
				operation: "write",
				toolName: "edit",
				path: "src/readable/file.ts",
			}).allowed,
		).toBe(false);
	});
});

describe("buildSubagentLaneGrant", () => {
	it("includes active capabilities and scheduler fields", () => {
		const applied: AppliedLoadout = {
			profileName: "code",
			authority: "write-scoped",
			activeTools: ["edit"],
			activeSkills: ["coding-standards"],
			activeMcp: ["filesystem"],
			activeHooks: ["pre-shell-guard"],
			blockers: [],
			warnings: [],
		};
		const schedulerFields = {
			readSet: [{ path: "src/lib.ts" }],
			writeSet: [{ path: "src/feature.ts" }],
			parallelizable: false,
		};

		const grant = buildSubagentLaneGrant("T01", "coder", "implement feature", applied, schedulerFields, {
			allowedReadPaths: ["src/lib.ts"],
			allowedWritePaths: ["src/feature.ts"],
			evidenceOutputPattern: ".omk/runs/<goal>/lane.md",
			runId: "g-123",
			profile: BUILTIN_LOADOUTS.code,
		});

		expect(grant).toEqual({
			laneId: "T01",
			agent: "omk-coder",
			task: "implement feature",
			scope: "loadout-derived lane grant",
			authority: "write-scoped",
			allowedPaths: ["src/feature.ts", "src/lib.ts"],
			blockedPaths: ["**/.env*", "**/*secret*", "**/*key*", "**/.git/*"],
			skills: ["coding-standards"],
			mcp: ["filesystem"],
			hooks: ["pre-shell-guard"],
			commands: { mode: "scoped-shell" },
			evidenceOutput: ".omk/runs/g-123/lane.md",
			scheduler: schedulerFields,
		});
	});

	it("falls back to a none command mode when no profile is provided", () => {
		const applied: AppliedLoadout = {
			profileName: "review",
			authority: "review-only",
			activeTools: ["read"],
			activeSkills: ["code-review"],
			activeMcp: [],
			activeHooks: [],
			blockers: [],
			warnings: [],
		};
		const schedulerFields = { readSet: [], writeSet: [], parallelizable: true };

		const grant = buildSubagentLaneGrant("T02", "reviewer", "review code", applied, schedulerFields);

		expect(grant.commands).toEqual({ mode: "none" });
		expect(grant.evidenceOutput).toBeUndefined();
	});
});
