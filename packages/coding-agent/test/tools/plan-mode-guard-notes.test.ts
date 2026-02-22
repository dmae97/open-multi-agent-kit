import { describe, expect, it } from "bun:test";
import * as os from "node:os";
import * as path from "node:path";
import type { ToolSession } from "../../src/tools";
import { resolvePlanPath } from "../../src/tools/plan-mode-guard";

function makeSession(overrides: {
	artifactsDir?: string | null;
	sessionId?: string | null;
	cwd?: string;
}): ToolSession {
	return {
		cwd: overrides.cwd ?? "/repo",
		hasUI: false,
		getSessionFile: () => null,
		getSessionSpawns: () => "*",
		settings: {
			getPlansDirectory: () => "/plans",
		},
		getArtifactsDir: () => overrides.artifactsDir ?? null,
		getSessionId: () => overrides.sessionId ?? null,
	} as unknown as ToolSession;
}

describe("resolvePlanPath notes:// support", () => {
	it("resolves notes:// paths under session artifacts notes root", () => {
		const session = makeSession({ artifactsDir: "/tmp/agent-artifacts", sessionId: "abc" });
		expect(resolvePlanPath(session, "notes://handoffs/result.json")).toBe(
			path.join("/tmp/agent-artifacts", "notes", "handoffs", "result.json"),
		);
	});

	it("falls back to os tmp root when artifacts dir is unavailable", () => {
		const session = makeSession({ artifactsDir: null, sessionId: "session-42" });
		expect(resolvePlanPath(session, "notes://memo.txt")).toBe(
			path.join(os.tmpdir(), "omp-notes", "session-42", "memo.txt"),
		);
	});
});
