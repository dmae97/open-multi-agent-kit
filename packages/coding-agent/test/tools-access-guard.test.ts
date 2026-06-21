import { mkdir, mkdtemp, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import type { ExtensionContext } from "../src/core/extensions/types.ts";
import {
	createLoadoutAccessPolicy,
	decideLoadoutAccess,
	type LoadoutAccessPolicy,
} from "../src/core/loadout-access-policy.ts";
import { createBashToolDefinition } from "../src/core/tools/bash.ts";
import { createEditToolDefinition } from "../src/core/tools/edit.ts";
import { createFindToolDefinition } from "../src/core/tools/find.ts";
import { createGrepToolDefinition } from "../src/core/tools/grep.ts";
import { createLsToolDefinition } from "../src/core/tools/ls.ts";
import { createReadToolDefinition } from "../src/core/tools/read.ts";
import { createWriteToolDefinition } from "../src/core/tools/write.ts";

const tempDirs: string[] = [];

async function createTempDir(): Promise<string> {
	const dir = await mkdtemp(join(tmpdir(), "omk-tools-access-guard-"));
	tempDirs.push(dir);
	return dir;
}

afterEach(async () => {
	await Promise.all(tempDirs.splice(0, tempDirs.length).map((dir) => rm(dir, { recursive: true, force: true })));
});

function makeGuard(policy: LoadoutAccessPolicy) {
	return (request: Parameters<typeof decideLoadoutAccess>[1]) => decideLoadoutAccess(policy, request);
}

describe("built-in tool access guards", () => {
	it("denies read access outside the loadout read/write set before filesystem read", async () => {
		const root = await createTempDir();
		const outside = await createTempDir();
		await writeFile(join(outside, "outside.txt"), "outside", "utf8");
		const policy = createLoadoutAccessPolicy({
			cwd: root,
			activeTools: ["read"],
			readSet: [{ path: "allowed" }],
			writeSet: [],
		});
		const read = createReadToolDefinition(root, { accessGuard: makeGuard(policy) });

		await expect(
			read.execute(
				"read-outside",
				{ path: join(outside, "outside.txt") },
				undefined,
				undefined,
				{} as ExtensionContext,
			),
		).rejects.toThrow(/loadout: outside read scope/);
	});

	it("denies write, edit, and directory tools outside their loadout scopes", async () => {
		const root = await createTempDir();
		await writeFile(join(root, "read-only.txt"), "alpha\n", "utf8");
		const policy = createLoadoutAccessPolicy({
			cwd: root,
			activeTools: ["write", "edit", "ls", "find", "grep"],
			readSet: [{ path: "." }],
			writeSet: [{ path: "owned" }],
		});
		const guard = makeGuard(policy);

		const write = createWriteToolDefinition(root, { accessGuard: guard });
		await expect(
			write.execute(
				"write-outside",
				{ path: "read-only.txt", content: "new" },
				undefined,
				undefined,
				{} as ExtensionContext,
			),
		).rejects.toThrow(/loadout: outside write scope/);

		const edit = createEditToolDefinition(root, { accessGuard: guard });
		await expect(
			edit.execute(
				"edit-outside",
				{
					path: "read-only.txt",
					edits: [{ oldText: "alpha", newText: "ALPHA" }],
				},
				undefined,
				undefined,
				{} as ExtensionContext,
			),
		).rejects.toThrow(/loadout: outside write scope/);

		const ls = createLsToolDefinition(root, { accessGuard: guard });
		await expect(
			ls.execute("ls-blocked", { path: ".git" }, undefined, undefined, {} as ExtensionContext),
		).rejects.toThrow(/loadout: blocked path/);

		const find = createFindToolDefinition(root, { accessGuard: guard });
		await expect(
			find.execute("find-blocked", { path: ".git", pattern: "*" }, undefined, undefined, {} as ExtensionContext),
		).rejects.toThrow(/loadout: blocked path/);

		const grep = createGrepToolDefinition(root, { accessGuard: guard });
		await expect(
			grep.execute("grep-blocked", { path: ".git", pattern: "token" }, undefined, undefined, {} as ExtensionContext),
		).rejects.toThrow(/loadout: blocked path/);
	});

	it("denies symlink escapes outside the loadout read scope", async () => {
		const root = await createTempDir();
		const outside = await createTempDir();
		await mkdir(join(root, "allowed"), { recursive: true });
		await writeFile(join(outside, "public.txt"), "outside", "utf8");
		await symlink(outside, join(root, "allowed", "escape"), "dir");
		const policy = createLoadoutAccessPolicy({
			cwd: root,
			activeTools: ["read"],
			readSet: [{ path: "allowed" }],
			writeSet: [],
		});
		const read = createReadToolDefinition(root, { accessGuard: makeGuard(policy) });

		await expect(
			read.execute(
				"read-symlink-escape",
				{ path: "allowed/escape/public.txt" },
				undefined,
				undefined,
				{} as ExtensionContext,
			),
		).rejects.toThrow(/loadout: outside read scope/);
	});

	it("does not expand symbol-scoped access entries to whole-file access", () => {
		const root = join("/tmp", "omk-symbol-scope");
		const policy = createLoadoutAccessPolicy({
			cwd: root,
			activeTools: ["read"],
			readSet: [{ path: "src/allowed.ts", symbols: ["allowedSymbol"] }],
			writeSet: [],
		});

		expect(
			decideLoadoutAccess(policy, { operation: "read", toolName: "read", path: "src/allowed.ts" }),
		).toMatchObject({ allowed: false, reason: "outside read scope: empty read/write set" });
	});

	it("denies bash execution when loadout command mode has no explicit allow pattern", async () => {
		const root = await createTempDir();
		const policy = createLoadoutAccessPolicy({
			cwd: root,
			activeTools: ["bash"],
			readSet: [{ path: "." }],
			writeSet: [],
			commands: { mode: "none" },
		});
		const bash = createBashToolDefinition(root, {
			accessGuard: makeGuard(policy),
			operations: {
				exec: async () => ({ exitCode: 0 }),
			},
		});

		await expect(
			bash.execute("bash-denied", { command: "echo ok" }, undefined, undefined, {} as ExtensionContext),
		).rejects.toThrow(/loadout: command mode none/);
	});
});
