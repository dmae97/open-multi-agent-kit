import { access, chmod, realpath, symlink } from "node:fs/promises";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { FileError, NodeExecutionEnv } from "../../src/harness/execution-env.js";
import { createTempDir } from "./session-test-utils.js";

const chmodRestorePaths: string[] = [];

afterEach(async () => {
	for (const path of chmodRestorePaths.splice(0)) {
		try {
			await access(path);
			await chmod(path, 0o700);
		} catch {}
	}
});

describe("NodeExecutionEnv", () => {
	it("reads, writes, lists, and removes files and directories", async () => {
		const root = createTempDir();
		const env = new NodeExecutionEnv({ cwd: root });
		await env.createDir("nested", { recursive: true });
		await env.writeFile("nested/file.txt", "hello");
		expect(await env.readTextFile("nested/file.txt")).toBe("hello");
		expect(Buffer.from(await env.readBinaryFile("nested/file.txt")).toString("utf8")).toBe("hello");

		const entries = await env.listDir("nested");
		expect(entries).toHaveLength(1);
		expect(entries[0]).toMatchObject({
			name: "file.txt",
			path: join(root, "nested/file.txt"),
			kind: "file",
			size: 5,
		});
		expect(typeof entries[0]!.mtimeMs).toBe("number");

		expect(await env.exists("nested/file.txt")).toBe(true);
		await env.remove("nested/file.txt");
		expect(await env.exists("nested/file.txt")).toBe(false);
	});

	it("returns fileInfo for files, directories, and symlinks without following symlinks", async () => {
		const root = createTempDir();
		const env = new NodeExecutionEnv({ cwd: root });
		await env.createDir("dir", { recursive: true });
		await env.writeFile("dir/file.txt", "hello");
		await symlink(join(root, "dir/file.txt"), join(root, "file-link"));
		await symlink(join(root, "dir"), join(root, "dir-link"));

		expect(await env.fileInfo("dir")).toMatchObject({ name: "dir", path: join(root, "dir"), kind: "directory" });
		expect(await env.fileInfo("dir/file.txt")).toMatchObject({
			name: "file.txt",
			path: join(root, "dir/file.txt"),
			kind: "file",
			size: 5,
		});
		expect(await env.fileInfo("file-link")).toMatchObject({
			name: "file-link",
			path: join(root, "file-link"),
			kind: "symlink",
		});
		expect(await env.fileInfo("dir-link")).toMatchObject({
			name: "dir-link",
			path: join(root, "dir-link"),
			kind: "symlink",
		});
		expect(await env.realPath("file-link")).toBe(await realpath(join(root, "dir/file.txt")));
	});

	it("lists symlinks as symlinks", async () => {
		const root = createTempDir();
		const env = new NodeExecutionEnv({ cwd: root });
		await env.writeFile("target.txt", "hello");
		await symlink(join(root, "target.txt"), join(root, "link.txt"));

		const entries = await env.listDir(".");
		expect(
			entries.map((entry) => ({ name: entry.name, kind: entry.kind })).sort((a, b) => a.name.localeCompare(b.name)),
		).toEqual([
			{ name: "link.txt", kind: "symlink" },
			{ name: "target.txt", kind: "file" },
		]);
	});

	it("throws FileError for missing paths and keeps exists false for missing paths", async () => {
		const root = createTempDir();
		const env = new NodeExecutionEnv({ cwd: root });
		await expect(env.fileInfo("missing.txt")).rejects.toMatchObject({
			name: "FileError",
			code: "not_found",
			path: join(root, "missing.txt"),
		});
		expect(await env.exists("missing.txt")).toBe(false);
	});

	it("throws FileError for listing non-directories", async () => {
		const root = createTempDir();
		const env = new NodeExecutionEnv({ cwd: root });
		await env.writeFile("file.txt", "hello");
		await expect(env.listDir("file.txt")).rejects.toBeInstanceOf(FileError);
		await expect(env.listDir("file.txt")).rejects.toMatchObject({ code: "not_directory" });
	});

	it("creates temporary directories and files", async () => {
		const root = createTempDir();
		const env = new NodeExecutionEnv({ cwd: root });
		const tempDir = await env.createTempDir("node-env-test-");
		await expect(access(tempDir)).resolves.toBeUndefined();
		const tempFile = await env.createTempFile({ prefix: "prefix-", suffix: ".txt" });
		await expect(access(tempFile)).resolves.toBeUndefined();
		expect(tempFile.endsWith(".txt")).toBe(true);
	});

	it("executes commands in cwd with env overrides", async () => {
		const root = createTempDir();
		const env = new NodeExecutionEnv({ cwd: root });
		const result = await env.exec('printf \'%s:%s\' "$PWD" "$NODE_ENV_TEST"', {
			env: { NODE_ENV_TEST: "ok" },
		});
		expect(result).toEqual({ stdout: `${await realpath(root)}:ok`, stderr: "", exitCode: 0 });
	});

	it("streams stdout and stderr chunks", async () => {
		const root = createTempDir();
		const env = new NodeExecutionEnv({ cwd: root });
		let stdout = "";
		let stderr = "";
		const result = await env.exec("printf out; printf err >&2", {
			onStdout: (chunk) => {
				stdout += chunk;
			},
			onStderr: (chunk) => {
				stderr += chunk;
			},
		});
		expect(result).toEqual({ stdout: "out", stderr: "err", exitCode: 0 });
		expect(stdout).toBe("out");
		expect(stderr).toBe("err");
	});

	it("rejects aborted commands", async () => {
		const root = createTempDir();
		const env = new NodeExecutionEnv({ cwd: root });
		const controller = new AbortController();
		const promise = env.exec("sleep 5", { signal: controller.signal });
		controller.abort();
		await expect(promise).rejects.toThrow("aborted");
	});
});
