import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import type { ExtensionContext } from "../src/core/extensions/types.ts";
import { createMonotonicReadIdFactory, createReadAnchorRegistry } from "../src/core/read-anchor-registry.ts";
import { createReadContentCache } from "../src/core/read-content-cache.ts";
import { createEditToolDefinition } from "../src/core/tools/edit.ts";
import { createReadToolDefinition } from "../src/core/tools/read.ts";

const tempDirs: string[] = [];

async function createTempDir(): Promise<string> {
	const dir = await mkdtemp(join(tmpdir(), "omk-read-anchor-edit-"));
	tempDirs.push(dir);
	return dir;
}

afterEach(async () => {
	await Promise.all(tempDirs.splice(0, tempDirs.length).map((dir) => rm(dir, { recursive: true, force: true })));
});

describe("read/edit anchor integration", () => {
	it("read registers an anchor and returns it in tool details", async () => {
		const dir = await createTempDir();
		await writeFile(join(dir, "file.txt"), "alpha\nbeta\ngamma\n", "utf8");
		const registry = createReadAnchorRegistry();
		const contentCache = createReadContentCache();
		const readIdFactory = createMonotonicReadIdFactory();
		const read = createReadToolDefinition(dir, { anchorRegistry: registry, contentCache, readIdFactory });

		const result = await read.execute(
			"read-1",
			{ path: "file.txt", offset: 2, limit: 1 },
			undefined,
			undefined,
			{} as ExtensionContext,
		);

		expect(result.content[0]).toEqual({
			type: "text",
			text: "beta\n\n[2 more lines in file. Use offset=3 to continue.]",
		});
		expect(result.details?.readAnchors).toHaveLength(1);
		const anchor = result.details!.readAnchors![0];
		expect(anchor.readId).toBe("ra-000000000001");
		expect(anchor.range).toEqual({ offset: 2, limit: 1, endLine: 2 });
		expect(registry.get(anchor.readId)?.content).toBe("alpha\nbeta\ngamma\n");
		expect(contentCache.get(anchor.fileSha256)).toBe("alpha\nbeta\ngamma\n");
	});

	it("edit rejects stale writes before changing the file in strict mode", async () => {
		const dir = await createTempDir();
		const filePath = join(dir, "file.txt");
		await writeFile(filePath, "alpha\nbeta\n", "utf8");
		const registry = createReadAnchorRegistry();
		const contentCache = createReadContentCache();
		const read = createReadToolDefinition(dir, {
			anchorRegistry: registry,
			contentCache,
			readIdFactory: createMonotonicReadIdFactory(),
		});
		const edit = createEditToolDefinition(dir, { anchorRegistry: registry, contentCache, anchorMode: "strict" });

		await read.execute("read-1", { path: "file.txt" }, undefined, undefined, {} as ExtensionContext);
		await writeFile(filePath, "alpha\nbeta\nexternal\n", "utf8");

		await expect(
			edit.execute(
				"edit-1",
				{ path: "file.txt", edits: [{ oldText: "beta", newText: "BETA" }] },
				undefined,
				undefined,
				{} as ExtensionContext,
			),
		).rejects.toThrow(/stale read/);
		expect(await readFile(filePath, "utf8")).toBe("alpha\nbeta\nexternal\n");
	});

	it("edit permits lenient stale writes when the anchored block is uniquely relocated", async () => {
		const dir = await createTempDir();
		const filePath = join(dir, "file.txt");
		await writeFile(filePath, "alpha\nbeta\ngamma\n", "utf8");
		const registry = createReadAnchorRegistry();
		const contentCache = createReadContentCache();
		const read = createReadToolDefinition(dir, {
			anchorRegistry: registry,
			contentCache,
			readIdFactory: createMonotonicReadIdFactory(),
		});
		const edit = createEditToolDefinition(dir, { anchorRegistry: registry, contentCache, anchorMode: "lenient" });

		await read.execute(
			"read-1",
			{ path: "file.txt", offset: 2, limit: 1 },
			undefined,
			undefined,
			{} as ExtensionContext,
		);
		await writeFile(filePath, "prefix\nalpha\nbeta\ngamma\n", "utf8");

		const result = await edit.execute(
			"edit-1",
			{ path: "file.txt", edits: [{ oldText: "beta", newText: "BETA" }] },
			undefined,
			undefined,
			{} as ExtensionContext,
		);

		expect(result.content[0]).toEqual({ type: "text", text: "Successfully replaced 1 block(s) in file.txt." });
		expect(await readFile(filePath, "utf8")).toBe("prefix\nalpha\nBETA\ngamma\n");
		expect(registry.getByPath(filePath)).toEqual([]);
		expect(contentCache.size).toBe(0);
	});

	it("edit rejects lenient stale writes when the anchored block is ambiguous", async () => {
		const dir = await createTempDir();
		const filePath = join(dir, "file.txt");
		await writeFile(filePath, "alpha\nbeta\n", "utf8");
		const registry = createReadAnchorRegistry();
		const read = createReadToolDefinition(dir, {
			anchorRegistry: registry,
			readIdFactory: createMonotonicReadIdFactory(),
		});
		const edit = createEditToolDefinition(dir, { anchorRegistry: registry, anchorMode: "lenient" });

		await read.execute(
			"read-1",
			{ path: "file.txt", offset: 2, limit: 1 },
			undefined,
			undefined,
			{} as ExtensionContext,
		);
		await writeFile(filePath, "alpha\nbeta\nbeta\n", "utf8");

		await expect(
			edit.execute(
				"edit-1",
				{ path: "file.txt", edits: [{ oldText: "beta", newText: "BETA" }] },
				undefined,
				undefined,
				{} as ExtensionContext,
			),
		).rejects.toThrow(/ambiguous/);
		expect(await readFile(filePath, "utf8")).toBe("alpha\nbeta\nbeta\n");
	});
});
