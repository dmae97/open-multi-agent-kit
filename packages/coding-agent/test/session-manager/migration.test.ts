import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { ENV_AGENT_DIR } from "../../src/config.ts";
import { type FileEntry, migrateSessionEntries } from "../../src/core/session-manager.ts";
import { runMigrations } from "../../src/migrations.ts";

const tempDirs: string[] = [];

afterEach(() => {
	for (const dir of tempDirs.splice(0)) {
		fs.rmSync(dir, { recursive: true, force: true });
	}
});

function createTempDir(prefix: string): string {
	const dir = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
	tempDirs.push(dir);
	return dir;
}

function withAgentDir(agentDir: string, fn: () => void): void {
	const previousAgentDir = process.env[ENV_AGENT_DIR];
	process.env[ENV_AGENT_DIR] = agentDir;
	try {
		fn();
	} finally {
		if (previousAgentDir === undefined) {
			delete process.env[ENV_AGENT_DIR];
		} else {
			process.env[ENV_AGENT_DIR] = previousAgentDir;
		}
	}
}

function sessionDirName(cwd: string): string {
	return `--${cwd.replace(/^[/\\]/, "").replace(/[/\\:]/g, "-")}--`;
}

describe("migrateSessionEntries", () => {
	it("should add id/parentId to v1 entries", () => {
		const entries: FileEntry[] = [
			{ type: "session", id: "sess-1", timestamp: "2025-01-01T00:00:00Z", cwd: "/tmp" },
			{ type: "message", timestamp: "2025-01-01T00:00:01Z", message: { role: "user", content: "hi", timestamp: 1 } },
			{
				type: "message",
				timestamp: "2025-01-01T00:00:02Z",
				message: {
					role: "assistant",
					content: [{ type: "text", text: "hello" }],
					api: "test",
					provider: "test",
					model: "test",
					usage: { input: 1, output: 1, cacheRead: 0, cacheWrite: 0 },
					stopReason: "stop",
					timestamp: 2,
				},
			},
		] as FileEntry[];

		migrateSessionEntries(entries);

		// Header should have version set (v3 is current after hookMessage->custom migration)
		expect((entries[0] as { version?: number }).version).toBe(3);

		// Entries should have id/parentId
		const msg1 = entries[1] as { id?: string; parentId?: string | null };
		const msg2 = entries[2] as { id?: string; parentId?: string | null };

		expect(msg1.id).toBeDefined();
		expect(msg1.id?.length).toBe(8);
		expect(msg1.parentId).toBeNull();

		expect(msg2.id).toBeDefined();
		expect(msg2.id?.length).toBe(8);
		expect(msg2.parentId).toBe(msg1.id);
	});

	it("should be idempotent (skip already migrated)", () => {
		const entries: FileEntry[] = [
			{ type: "session", id: "sess-1", version: 2, timestamp: "2025-01-01T00:00:00Z", cwd: "/tmp" },
			{
				type: "message",
				id: "abc12345",
				parentId: null,
				timestamp: "2025-01-01T00:00:01Z",
				message: { role: "user", content: "hi", timestamp: 1 },
			},
			{
				type: "message",
				id: "def67890",
				parentId: "abc12345",
				timestamp: "2025-01-01T00:00:02Z",
				message: {
					role: "assistant",
					content: [{ type: "text", text: "hello" }],
					api: "test",
					provider: "test",
					model: "test",
					usage: { input: 1, output: 1, cacheRead: 0, cacheWrite: 0 },
					stopReason: "stop",
					timestamp: 2,
				},
			},
		] as FileEntry[];

		migrateSessionEntries(entries);

		// IDs should be unchanged
		expect((entries[1] as { id?: string }).id).toBe("abc12345");
		expect((entries[2] as { id?: string }).id).toBe("def67890");
		expect((entries[2] as { parentId?: string | null }).parentId).toBe("abc12345");
	});
});

describe("legacy root session file migration", () => {
	it("moves root .jsonl sessions into the canonical cwd-scoped sessions directory", () => {
		const agentDir = createTempDir("omk-root-session-migration-test-");
		const cwd = path.join(createTempDir("omk-root-session-cwd-test-"), "project");
		const legacyFile = path.join(agentDir, "legacy-session.jsonl");
		const sessionContent = [
			{ type: "session", id: "legacy-session", timestamp: "2025-01-01T00:00:00Z", cwd },
			{
				type: "message",
				id: "msg-1",
				parentId: null,
				timestamp: "2025-01-01T00:00:01Z",
				message: { role: "user", content: "hello", timestamp: 1 },
			},
		]
			.map((entry) => JSON.stringify(entry))
			.join("\n");
		fs.writeFileSync(legacyFile, `${sessionContent}\n`, "utf-8");

		withAgentDir(agentDir, () => runMigrations(cwd));

		const canonicalFile = path.join(agentDir, "sessions", sessionDirName(cwd), "legacy-session.jsonl");
		expect(fs.existsSync(legacyFile)).toBe(false);
		expect(fs.readFileSync(canonicalFile, "utf-8")).toBe(`${sessionContent}\n`);
	});

	it("does not overwrite an existing canonical session when a legacy root file collides", () => {
		const agentDir = createTempDir("omk-root-session-collision-test-");
		const cwd = path.join(createTempDir("omk-root-session-collision-cwd-test-"), "project");
		const legacyFile = path.join(agentDir, "same-name.jsonl");
		const canonicalDir = path.join(agentDir, "sessions", sessionDirName(cwd));
		const canonicalFile = path.join(canonicalDir, "same-name.jsonl");
		const legacyContent = `${JSON.stringify({
			type: "session",
			id: "legacy-session",
			timestamp: "2025-01-01T00:00:00Z",
			cwd,
		})}\n`;
		const canonicalContent = `${JSON.stringify({
			type: "session",
			id: "canonical-session",
			version: 3,
			timestamp: "2025-01-02T00:00:00Z",
			cwd,
		})}\n`;
		fs.mkdirSync(canonicalDir, { recursive: true });
		fs.writeFileSync(legacyFile, legacyContent, "utf-8");
		fs.writeFileSync(canonicalFile, canonicalContent, "utf-8");

		withAgentDir(agentDir, () => runMigrations(cwd));

		expect(fs.readFileSync(legacyFile, "utf-8")).toBe(legacyContent);
		expect(fs.readFileSync(canonicalFile, "utf-8")).toBe(canonicalContent);
	});
});
