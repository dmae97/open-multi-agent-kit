import { describe, expect, it } from "vitest";
import {
	classifyRestorePreflight,
	decideUntrackedDisposition,
	isUnsafeTouchedPath,
	type ObservedWorktree,
	planRestore,
	RECOVERY_CHECKPOINT_SCHEMA_VERSION,
	type RecoveryCheckpoint,
	type RestorePreflightResult,
	validateRecoveryCheckpoint,
	verifyCheckpointLedgerAnchor,
} from "../src/core/recovery-checkpoint.ts";

const HEX_A = "a".repeat(64);
const HEX_B = "b".repeat(64);
const HEX_C = "c".repeat(64);
const HEX_D = "d".repeat(64);
const ZERO = "0".repeat(64);

function makeCheckpoint(overrides: Partial<RecoveryCheckpoint> = {}): RecoveryCheckpoint {
	return {
		schemaVersion: RECOVERY_CHECKPOINT_SCHEMA_VERSION,
		checkpointId: "ckpt-1",
		createdAt: "2026-06-21T00:00:00.000Z",
		session: { leafId: "leaf-9", branchPathIds: ["root", "leaf-9"], contextHash: HEX_A },
		workspace: {
			repoRoot: "/repo",
			vcs: "git",
			head: "deadbeef",
			statusPorcelainSha256: HEX_B,
			touchedFiles: [{ path: "src/a.ts", beforeSha256: HEX_C, afterSha256: HEX_D, mode: "tracked" }],
		},
		ledger: { eventId: "evt-1", previousEventHash: ZERO, eventHash: HEX_A },
		...overrides,
	};
}

describe("validateRecoveryCheckpoint", () => {
	it("accepts a well-formed checkpoint", () => {
		const result = validateRecoveryCheckpoint(makeCheckpoint());
		expect(result.ok).toBe(true);
		expect(result.errors).toEqual([]);
		expect(result.checkpoint?.checkpointId).toBe("ckpt-1");
	});

	it("accepts an optional tool block", () => {
		const result = validateRecoveryCheckpoint(
			makeCheckpoint({ tool: { turnIndex: 3, mutatingTools: ["edit", "write"], beforeToolCallId: "tc-1" } }),
		);
		expect(result.ok).toBe(true);
	});

	it("rejects a wrong schema version", () => {
		const result = validateRecoveryCheckpoint(
			makeCheckpoint({ schemaVersion: "omk.recovery.checkpoint.v2" as never }),
		);
		expect(result.ok).toBe(false);
		expect(result.errors.some((e) => e.includes("schemaVersion"))).toBe(true);
		expect(result.checkpoint).toBeUndefined();
	});

	it("rejects non-hex context and status hashes", () => {
		const checkpoint = makeCheckpoint();
		const broken = {
			...checkpoint,
			session: { ...checkpoint.session, contextHash: "nope" },
			workspace: { ...checkpoint.workspace, statusPorcelainSha256: "nope" },
		};
		const result = validateRecoveryCheckpoint(broken);
		expect(result.ok).toBe(false);
		expect(result.errors.some((e) => e.includes("contextHash"))).toBe(true);
		expect(result.errors.some((e) => e.includes("statusPorcelainSha256"))).toBe(true);
	});

	it("enforces mode/hash consistency for untracked and deleted files", () => {
		const checkpoint = makeCheckpoint();
		const broken = {
			...checkpoint,
			workspace: {
				...checkpoint.workspace,
				touchedFiles: [
					{ path: "new.txt", beforeSha256: HEX_C, mode: "untracked" },
					{ path: "gone.txt", afterSha256: HEX_D, mode: "deleted" },
				],
			},
		};
		const result = validateRecoveryCheckpoint(broken);
		expect(result.ok).toBe(false);
		expect(result.errors.some((e) => e.includes("untracked"))).toBe(true);
		expect(result.errors.some((e) => e.includes("deleted"))).toBe(true);
	});

	it("rejects path traversal in touched files", () => {
		const checkpoint = makeCheckpoint();
		const broken = {
			...checkpoint,
			workspace: {
				...checkpoint.workspace,
				touchedFiles: [{ path: "../escape.ts", afterSha256: HEX_D, mode: "tracked" }],
			},
		};
		const result = validateRecoveryCheckpoint(broken);
		expect(result.ok).toBe(false);
		expect(result.errors.some((e) => e.includes("repo-relative"))).toBe(true);
	});

	it("rejects non-object input", () => {
		expect(validateRecoveryCheckpoint(null).ok).toBe(false);
		expect(validateRecoveryCheckpoint("x").ok).toBe(false);
		expect(validateRecoveryCheckpoint([]).ok).toBe(false);
	});
});

describe("isUnsafeTouchedPath", () => {
	it("flags absolute, traversal, and empty paths", () => {
		expect(isUnsafeTouchedPath("/etc/passwd")).toBe(true);
		expect(isUnsafeTouchedPath("a/../../b")).toBe(true);
		expect(isUnsafeTouchedPath("")).toBe(true);
		expect(isUnsafeTouchedPath(123)).toBe(true);
	});

	it("accepts plain repo-relative paths", () => {
		expect(isUnsafeTouchedPath("src/a.ts")).toBe(false);
		expect(isUnsafeTouchedPath("./src/a.ts")).toBe(false);
	});
});

describe("verifyCheckpointLedgerAnchor", () => {
	it("passes when the observed anchor matches", () => {
		const checkpoint = makeCheckpoint();
		const result = verifyCheckpointLedgerAnchor(checkpoint, {
			eventId: "evt-1",
			previousEventHash: ZERO,
			eventHash: HEX_A,
		});
		expect(result.ok).toBe(true);
		expect(result.mismatches).toEqual([]);
	});

	it("fails closed on eventHash divergence", () => {
		const checkpoint = makeCheckpoint();
		const result = verifyCheckpointLedgerAnchor(checkpoint, {
			eventId: "evt-1",
			previousEventHash: ZERO,
			eventHash: HEX_B,
		});
		expect(result.ok).toBe(false);
		expect(result.mismatches.some((m) => m.includes("eventHash"))).toBe(true);
	});
});

describe("classifyRestorePreflight", () => {
	function cleanObserved(): ObservedWorktree {
		return {
			head: "deadbeef",
			statusPorcelainSha256: HEX_B,
			dirtyPaths: ["src/a.ts"],
			touchedFiles: [{ path: "src/a.ts", exists: true, sha256: HEX_D }],
		};
	}

	it("returns clean when only recorded files are dirty and hashes match", () => {
		const result = classifyRestorePreflight(makeCheckpoint(), cleanObserved());
		expect(result.verdict).toBe("clean");
		expect(result.issues).toEqual([]);
	});

	it("blocks when an unrelated path is dirty", () => {
		const observed = cleanObserved();
		const result = classifyRestorePreflight(makeCheckpoint(), {
			...observed,
			dirtyPaths: ["src/a.ts", "src/other.ts"],
		});
		expect(result.verdict).toBe("blocked");
		expect(result.unrelatedDirtyPaths).toEqual(["src/other.ts"]);
		expect(result.issues.some((i) => i.code === "unrelated-dirty-path")).toBe(true);
	});

	it("blocks when a touched file hash differs from the recorded post-edit hash", () => {
		const observed = cleanObserved();
		const result = classifyRestorePreflight(makeCheckpoint(), {
			...observed,
			touchedFiles: [{ path: "src/a.ts", exists: true, sha256: HEX_C }],
		});
		expect(result.verdict).toBe("blocked");
		expect(result.hashMismatches).toEqual(["src/a.ts"]);
		expect(result.issues.some((i) => i.code === "touched-hash-mismatch")).toBe(true);
	});

	it("blocks when a touched file symlink escapes the repo", () => {
		const observed = cleanObserved();
		const result = classifyRestorePreflight(makeCheckpoint(), {
			...observed,
			touchedFiles: [{ path: "src/a.ts", exists: true, sha256: HEX_D, isSymlink: true, escapesRepo: true }],
		});
		expect(result.verdict).toBe("blocked");
		expect(result.symlinkEscapes).toEqual(["src/a.ts"]);
		expect(result.issues.some((i) => i.code === "symlink-escape")).toBe(true);
	});

	it("blocks on HEAD move unless allowNonHeadRestore is set", () => {
		const observed = { ...cleanObserved(), head: "cafef00d" };
		const blocked = classifyRestorePreflight(makeCheckpoint(), observed);
		expect(blocked.verdict).toBe("blocked");
		expect(blocked.headChanged).toBe(true);
		expect(blocked.issues.some((i) => i.code === "head-mismatch")).toBe(true);

		const allowed = classifyRestorePreflight(makeCheckpoint(), observed, { allowNonHeadRestore: true });
		expect(allowed.headChanged).toBe(true);
		expect(allowed.issues.some((i) => i.code === "head-mismatch")).toBe(false);
		expect(allowed.verdict).toBe("clean");
	});

	it("treats a deleted file as clean when absent and mismatch when present", () => {
		const checkpoint = makeCheckpoint({
			workspace: {
				repoRoot: "/repo",
				vcs: "git",
				head: "deadbeef",
				statusPorcelainSha256: HEX_B,
				touchedFiles: [{ path: "gone.txt", beforeSha256: HEX_C, mode: "deleted" }],
			},
		});
		const absent = classifyRestorePreflight(checkpoint, {
			head: "deadbeef",
			dirtyPaths: ["gone.txt"],
			touchedFiles: [{ path: "gone.txt", exists: false }],
		});
		expect(absent.verdict).toBe("clean");

		const present = classifyRestorePreflight(checkpoint, {
			head: "deadbeef",
			dirtyPaths: ["gone.txt"],
			touchedFiles: [{ path: "gone.txt", exists: true, sha256: HEX_C }],
		});
		expect(present.verdict).toBe("blocked");
		expect(present.issues.some((i) => i.code === "touched-hash-mismatch")).toBe(true);
	});

	it("blocks when a recorded touched file has no observed state", () => {
		const result = classifyRestorePreflight(makeCheckpoint(), {
			head: "deadbeef",
			dirtyPaths: [],
			touchedFiles: [],
		});
		expect(result.verdict).toBe("blocked");
		expect(result.issues.some((i) => i.code === "missing-touched-file")).toBe(true);
	});

	it("ignores HEAD differences when the checkpoint vcs is none", () => {
		const checkpoint = makeCheckpoint({
			workspace: {
				repoRoot: "/repo",
				vcs: "none",
				statusPorcelainSha256: HEX_B,
				touchedFiles: [{ path: "src/a.ts", afterSha256: HEX_D, mode: "tracked" }],
			},
		});
		const result = classifyRestorePreflight(checkpoint, {
			head: "anything",
			dirtyPaths: ["src/a.ts"],
			touchedFiles: [{ path: "src/a.ts", exists: true, sha256: HEX_D }],
		});
		expect(result.headChanged).toBe(false);
		expect(result.verdict).toBe("clean");
	});
});

describe("decideUntrackedDisposition", () => {
	it("deletes when the current hash matches the OMK-created hash", () => {
		const decision = decideUntrackedDisposition(
			{ path: "new.txt", afterSha256: HEX_D, mode: "untracked" },
			{ exists: true, sha256: HEX_D },
		);
		expect(decision.disposition).toBe("delete");
	});

	it("quarantines when the current hash differs", () => {
		const decision = decideUntrackedDisposition(
			{ path: "new.txt", afterSha256: HEX_D, mode: "untracked" },
			{ exists: true, sha256: HEX_C },
		);
		expect(decision.disposition).toBe("quarantine");
	});

	it("skips when the file is already gone", () => {
		const decision = decideUntrackedDisposition(
			{ path: "new.txt", afterSha256: HEX_D, mode: "untracked" },
			{ exists: false },
		);
		expect(decision.disposition).toBe("skip");
	});

	it("skips non-untracked files", () => {
		const decision = decideUntrackedDisposition(
			{ path: "src/a.ts", afterSha256: HEX_D, mode: "tracked" },
			{ exists: true, sha256: HEX_D },
		);
		expect(decision.disposition).toBe("skip");
	});
});

describe("planRestore", () => {
	const cleanPreflight: RestorePreflightResult = {
		verdict: "clean",
		issues: [],
		unrelatedDirtyPaths: [],
		hashMismatches: [],
		symlinkEscapes: [],
		headChanged: false,
	};
	const blockedPreflight: RestorePreflightResult = {
		verdict: "blocked",
		issues: [{ code: "unrelated-dirty-path", path: "src/other.ts", detail: "dirty" }],
		unrelatedDirtyPaths: ["src/other.ts"],
		hashMismatches: [],
		symlinkEscapes: [],
		headChanged: false,
	};

	it("plans a conversation-only restore with no file phases", () => {
		const plan = planRestore({ mode: "conversation", checkpoint: makeCheckpoint() });
		expect(plan.status).toBe("ready");
		expect(plan.phases).toHaveLength(1);
		expect(plan.phases[0]).toMatchObject({ phase: "conversation", action: "navigate-tree", targetLeafId: "leaf-9" });
		expect(plan.phases.some((p) => p.phase === "code")).toBe(false);
	});

	it("plans a code-only restore when the preflight is clean", () => {
		const plan = planRestore({ mode: "code", checkpoint: makeCheckpoint(), preflight: cleanPreflight });
		expect(plan.status).toBe("ready");
		expect(plan.phases).toHaveLength(1);
		expect(plan.phases[0]).toMatchObject({ phase: "code", action: "apply-reverse-patch" });
		expect(plan.phases[0].recordedPaths).toEqual(["src/a.ts"]);
	});

	it("blocks a code restore when the preflight is missing or blocked", () => {
		const missing = planRestore({ mode: "code", checkpoint: makeCheckpoint() });
		expect(missing.status).toBe("blocked");
		expect(missing.blockers.length).toBeGreaterThan(0);

		const blocked = planRestore({ mode: "code", checkpoint: makeCheckpoint(), preflight: blockedPreflight });
		expect(blocked.status).toBe("blocked");
		expect(blocked.blockers.some((b) => b.includes("unrelated-dirty-path"))).toBe(true);
	});

	it("plans both phases code-first and preserves the previous leaf for in-doubt recovery", () => {
		const plan = planRestore({
			mode: "both",
			checkpoint: makeCheckpoint(),
			preflight: cleanPreflight,
			currentLeafId: "leaf-current",
		});
		expect(plan.status).toBe("ready");
		expect(plan.phases.map((p) => p.phase)).toEqual(["code", "conversation"]);
		expect(plan.preservePreviousLeafId).toBe("leaf-current");
		expect(plan.inDoubtPolicy).toBe("preserve-previous-leaf");
	});

	it("blocks both when the preflight is blocked but still records the previous leaf", () => {
		const plan = planRestore({
			mode: "both",
			checkpoint: makeCheckpoint(),
			preflight: blockedPreflight,
			currentLeafId: "leaf-current",
		});
		expect(plan.status).toBe("blocked");
		expect(plan.phases).toEqual([]);
		expect(plan.preservePreviousLeafId).toBe("leaf-current");
	});
});
