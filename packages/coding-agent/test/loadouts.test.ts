import { describe, expect, it } from "vitest";
import {
	applyLoadoutProfile,
	authorityWithinGrant,
	BUILTIN_LOADOUTS,
	type CapabilityInventory,
	deriveSchedulerFields,
	inferLoadoutForRole,
	isSerializeTriggerPath,
	type LoadoutProfile,
	laneDefaultsForRole,
	type NamedResource,
	validateLoadoutProfile,
} from "../src/core/loadouts.ts";

const inventory: CapabilityInventory = {
	tools: ["read", "grep", "find", "ls", "edit", "write", "bash"].map((name) => ({ kind: "tool", name })),
	skills: [
		"adaptorch-route",
		"writing-plans",
		"ddd-software-architecture",
		"test-driven-development",
		"coding-standards",
		"verification-before-completion",
		"code-review",
		"differential-review",
		"security-review",
	].map((name): NamedResource => ({ kind: "skill", name })),
	mcp: ["filesystem", "filesystem-readonly", "memory", "adaptorch", "context7"].map(
		(name): NamedResource => ({ kind: "mcp", name }),
	),
	hooks: [
		"pre-shell-guard",
		"protect-secrets",
		"typecheck-after-edit",
		"stop-verify",
		"subagent-stop-audit",
		"session-context",
		"precompact-checkpoint",
		"npm-audit-summary",
	].map((name): NamedResource => ({ kind: "hook", name })),
};

describe("builtin loadouts", () => {
	it("maps roles to default loadouts", () => {
		expect(inferLoadoutForRole("planner")).toBe("plan");
		expect(inferLoadoutForRole("explorer")).toBe("inspect");
		expect(inferLoadoutForRole("coder")).toBe("code");
		expect(inferLoadoutForRole("tester")).toBe("test");
		expect(inferLoadoutForRole("reviewer")).toBe("review");
		expect(inferLoadoutForRole("security")).toBe("security");
		expect(inferLoadoutForRole("package-maintainer")).toBe("package-maintainer");
		expect(inferLoadoutForRole("synthesizer")).toBe("plan");
	});

	it("derives lane defaults from role authority", () => {
		expect(laneDefaultsForRole("coder")).toMatchObject({
			loadout: "code",
			parallelizable: false,
			writesProductFiles: true,
		});
		expect(laneDefaultsForRole("reviewer")).toMatchObject({ loadout: "review", readOnly: true });
	});

	it("validates every builtin preset", () => {
		for (const profile of Object.values(BUILTIN_LOADOUTS)) {
			expect(validateLoadoutProfile(profile)).toEqual({ valid: true, errors: [] });
		}
	});
});

describe("authority gates", () => {
	it("allows lower authority inside a stronger grant", () => {
		expect(authorityWithinGrant("read-only", "write-scoped")).toBe(true);
		expect(authorityWithinGrant("execute-tests", "write-scoped")).toBe(true);
	});

	it("blocks loadouts that exceed the lane grant", () => {
		expect(authorityWithinGrant("write-scoped", "review-only")).toBe(false);
		const applied = applyLoadoutProfile(BUILTIN_LOADOUTS.code, inventory, { grantAuthority: "review-only" });
		expect(applied.blockers).toContain("loadout authority write-scoped exceeds grant review-only");
	});
});

describe("applyLoadoutProfile", () => {
	it("activates allowed tools and discovered resources", () => {
		const applied = applyLoadoutProfile(BUILTIN_LOADOUTS.code, inventory, { grantAuthority: "write-scoped" });
		expect(applied.blockers).toEqual([]);
		expect(applied.activeTools).toEqual(["bash", "edit", "find", "grep", "ls", "read", "write"]);
		expect(applied.activeMcp).toContain("filesystem");
		expect(applied.activeSkills).toEqual(["coding-standards", "test-driven-development"]);
		expect(applied.activeHooks).toEqual(["pre-shell-guard", "protect-secrets", "typecheck-after-edit"]);
	});

	it("applies tool exclude after allow", () => {
		const profile: LoadoutProfile = {
			...BUILTIN_LOADOUTS.code,
			name: "code-no-bash",
			tools: { allow: ["read", "bash", "edit"], exclude: ["bash"] },
		};
		expect(applyLoadoutProfile(profile, inventory).activeTools).toEqual(["edit", "read"]);
	});

	it("applies capability exclude after allow", () => {
		const profile: LoadoutProfile = {
			...BUILTIN_LOADOUTS.code,
			name: "code-no-context7",
			mcp: {
				allow: [{ kind: "mcp", names: ["filesystem", "context7", "memory"] }],
				exclude: [{ kind: "mcp", names: ["context7"] }],
			},
		};
		expect(applyLoadoutProfile(profile, inventory).activeMcp).toEqual(["filesystem", "memory"]);
	});

	it("reports required missing capabilities as blockers in deterministic order", () => {
		const profile: LoadoutProfile = {
			...BUILTIN_LOADOUTS.review,
			name: "review-strict",
			tools: { allow: ["read"], require: ["missing-tool"] },
			skills: { require: [{ kind: "skill", names: ["missing-skill"] }] },
			mcp: { require: [{ kind: "mcp", names: ["missing-mcp"] }] },
			hooks: { require: [{ kind: "hook", names: ["missing-hook"] }] },
		};
		const applied = applyLoadoutProfile(profile, inventory);
		expect(applied.blockers).toEqual([
			"missing required tool: missing-tool",
			"missing required skill: missing-skill",
			"missing required mcp: missing-mcp",
			"missing required hook: missing-hook",
		]);
	});

	it("orders authority blocker before capability blockers", () => {
		const profile: LoadoutProfile = {
			...BUILTIN_LOADOUTS.code,
			name: "code-strict",
			tools: { allow: ["read"], require: ["missing-tool"] },
			skills: { require: [{ kind: "skill", names: ["missing-skill"] }] },
		};
		const applied = applyLoadoutProfile(profile, inventory, { grantAuthority: "review-only" });
		expect(applied.blockers).toEqual([
			"loadout authority write-scoped exceeds grant review-only",
			"missing required tool: missing-tool",
			"missing required skill: missing-skill",
		]);
	});

	it("warns on optional named capabilities that are absent", () => {
		const profile: LoadoutProfile = {
			...BUILTIN_LOADOUTS.review,
			name: "review-optional",
			skills: { allow: [{ kind: "skill", names: ["code-review", "ghost-skill"] }] },
		};
		const applied = applyLoadoutProfile(profile, inventory);
		expect(applied.blockers).toEqual([]);
		expect(applied.activeSkills).toEqual(["code-review"]);
		expect(applied.warnings).toContain("optional skill not available: ghost-skill");
	});

	it("none preset disables tools", () => {
		expect(applyLoadoutProfile(BUILTIN_LOADOUTS.none, inventory).activeTools).toEqual([]);
	});
});

describe("selector criteria matching", () => {
	const scoped: CapabilityInventory = {
		tools: [],
		skills: [
			{ kind: "skill", name: "trusted-skill", source: "trusted-pkg", scope: "project", origin: "package" },
			{ kind: "skill", name: "user-skill", source: "untrusted-pkg", scope: "user", origin: "package" },
			{ kind: "skill", name: "local-skill", source: "local", scope: "project", origin: "top-level" },
		],
		mcp: [],
		hooks: [],
	};

	it("matches by source glob", () => {
		const profile: LoadoutProfile = {
			schemaVersion: "omk.loadout.v1",
			name: "trusted-only",
			authority: "read-only",
			tools: { allow: [] },
			skills: { allow: [{ kind: "skill", sources: ["trusted-*"] }] },
		};
		expect(applyLoadoutProfile(profile, scoped).activeSkills).toEqual(["trusted-skill"]);
	});

	it("matches by scope and origin", () => {
		const profile: LoadoutProfile = {
			schemaVersion: "omk.loadout.v1",
			name: "project-package-only",
			authority: "read-only",
			tools: { allow: [] },
			skills: { allow: [{ kind: "skill", scopes: ["project"], origins: ["package"] }] },
		};
		expect(applyLoadoutProfile(profile, scoped).activeSkills).toEqual(["trusted-skill"]);
	});

	it("blocks criteria-only required selectors with a descriptor when unmatched", () => {
		const profile: LoadoutProfile = {
			schemaVersion: "omk.loadout.v1",
			name: "require-temporary",
			authority: "read-only",
			tools: { allow: [] },
			skills: { require: [{ kind: "skill", scopes: ["temporary"] }] },
		};
		const applied = applyLoadoutProfile(profile, scoped);
		expect(applied.blockers).toEqual(["missing required skill: kind=skill scopes=temporary"]);
	});
});

describe("validateLoadoutProfile", () => {
	it("rejects an unknown schema version", () => {
		const profile = { ...BUILTIN_LOADOUTS.plan, schemaVersion: "omk.loadout.v0" } as unknown as LoadoutProfile;
		const result = validateLoadoutProfile(profile);
		expect(result.valid).toBe(false);
		expect(result.errors).toContain("unknown schemaVersion: omk.loadout.v0");
	});

	it("rejects an unknown authority", () => {
		const profile = { ...BUILTIN_LOADOUTS.plan, authority: "god-mode" } as unknown as LoadoutProfile;
		expect(validateLoadoutProfile(profile).errors).toContain("unknown authority: god-mode");
	});

	it("rejects a mismatched selector kind", () => {
		const profile: LoadoutProfile = {
			...BUILTIN_LOADOUTS.review,
			name: "bad-selector",
			skills: { allow: [{ kind: "mcp", names: ["memory"] }] },
		};
		expect(validateLoadoutProfile(profile).errors).toContain(
			"mismatched selector kind in skills.allow: expected skill, got mcp",
		);
	});

	it("rejects an unknown resource kind", () => {
		const profile: LoadoutProfile = {
			...BUILTIN_LOADOUTS.review,
			name: "bad-kind",
			hooks: { require: [{ kind: "widget" as never, names: ["x"] }] },
		};
		expect(validateLoadoutProfile(profile).errors).toContain("unknown resource kind in hooks.require: widget");
	});

	it("rejects scoped-shell under non-write authority", () => {
		const profile: LoadoutProfile = {
			...BUILTIN_LOADOUTS.review,
			name: "review-with-shell",
			commands: { mode: "scoped-shell" },
		};
		expect(validateLoadoutProfile(profile).errors).toContain(
			"command mode scoped-shell requires write-scoped authority, got review-only",
		);
	});

	it("rejects an unknown tool defaultMode", () => {
		const profile: LoadoutProfile = {
			...BUILTIN_LOADOUTS.none,
			name: "bad-default",
			tools: { allow: [], defaultMode: "all-tools" as never },
		};
		expect(validateLoadoutProfile(profile).errors).toContain("unknown tool defaultMode: all-tools");
	});
});

describe("deriveSchedulerFields", () => {
	it("derives read-only planner with empty writeSet and parallelizable", () => {
		const fields = deriveSchedulerFields({
			role: "planner",
			assignedReadPaths: ["specs/plan.md", "docs/a.md"],
		});
		expect(fields.writeSet).toEqual([]);
		expect(fields.readSet).toEqual([{ path: "docs/a.md" }, { path: "specs/plan.md" }]);
		expect(fields.parallelizable).toBe(true);
	});

	it("drops write paths for non-writing roles", () => {
		const fields = deriveSchedulerFields({
			role: "reviewer",
			assignedReadPaths: ["src/changed.ts"],
			assignedWritePaths: ["src/changed.ts"],
		});
		expect(fields.writeSet).toEqual([]);
		expect(fields.parallelizable).toBe(true);
	});

	it("serializes write-scoped coder lanes that write files", () => {
		const fields = deriveSchedulerFields({
			role: "coder",
			assignedReadPaths: ["src/lib.ts"],
			assignedWritePaths: ["src/feature.ts", "src/feature.ts"],
		});
		expect(fields.writeSet).toEqual([{ path: "src/feature.ts" }]);
		expect(fields.parallelizable).toBe(false);
	});

	it("keeps a coder lane parallelizable when it writes nothing", () => {
		const fields = deriveSchedulerFields({ role: "coder", assignedReadPaths: ["src/lib.ts"] });
		expect(fields.writeSet).toEqual([]);
		expect(fields.parallelizable).toBe(true);
	});

	it("keeps tester parallelizable for ordinary log writes", () => {
		const fields = deriveSchedulerFields({
			role: "tester",
			assignedWritePaths: ["test-results/run.log"],
		});
		expect(fields.parallelizable).toBe(true);
	});

	it("serializes tester lanes that touch lockfiles or snapshots", () => {
		const lock = deriveSchedulerFields({ role: "tester", assignedWritePaths: ["package-lock.json"] });
		expect(lock.parallelizable).toBe(false);
		const snap = deriveSchedulerFields({ role: "tester", assignedWritePaths: ["test/__snapshots__/a.snap"] });
		expect(snap.parallelizable).toBe(false);
	});

	it("keeps security evidence writes parallelizable", () => {
		const fields = deriveSchedulerFields({
			role: "security",
			assignedReadPaths: ["package.json"],
			assignedWritePaths: [".omk/runs/g/security.md"],
		});
		expect(fields.writeSet).toEqual([{ path: ".omk/runs/g/security.md" }]);
		expect(fields.parallelizable).toBe(true);
	});
});

describe("isSerializeTriggerPath", () => {
	it("flags lockfiles, package config, snapshots, and git index", () => {
		expect(isSerializeTriggerPath("package-lock.json")).toBe(true);
		expect(isSerializeTriggerPath("a/b/pnpm-lock.yaml")).toBe(true);
		expect(isSerializeTriggerPath("packages/x/package.json")).toBe(true);
		expect(isSerializeTriggerPath("test/__snapshots__/x.snap")).toBe(true);
		expect(isSerializeTriggerPath(".git/index")).toBe(true);
		expect(isSerializeTriggerPath("worktree/.git/HEAD")).toBe(true);
	});

	it("does not flag ordinary source files", () => {
		expect(isSerializeTriggerPath("src/feature.ts")).toBe(false);
		expect(isSerializeTriggerPath(".omk/runs/g/lane.md")).toBe(false);
	});
});
