import { describe, expect, it } from "bun:test";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import {
	InternalUrlRouter,
	NotesProtocolHandler,
	resolveNotesRoot,
	resolveNotesUrlToPath,
} from "../../src/internal-urls";

async function withTempDir<T>(fn: (dir: string) => Promise<T>): Promise<T> {
	const dir = await fs.mkdtemp(path.join(os.tmpdir(), "notes-protocol-"));
	try {
		return await fn(dir);
	} finally {
		await fs.rm(dir, { recursive: true, force: true });
	}
}

function createRouter(options: { artifactsDir?: string | null; sessionId?: string | null }): InternalUrlRouter {
	const router = new InternalUrlRouter();
	router.register(
		new NotesProtocolHandler({
			getArtifactsDir: () => options.artifactsDir ?? null,
			getSessionId: () => options.sessionId ?? null,
		}),
	);
	return router;
}

describe("NotesProtocolHandler", () => {
	it("lists files at notes://", async () => {
		await withTempDir(async tempDir => {
			const artifactsDir = path.join(tempDir, "artifacts");
			await fs.mkdir(path.join(artifactsDir, "notes"), { recursive: true });
			await Bun.write(path.join(artifactsDir, "notes", "handoff.json"), '{"ok":true}');

			const router = createRouter({ artifactsDir, sessionId: "session-a" });
			const resource = await router.resolve("notes://");

			expect(resource.contentType).toBe("text/markdown");
			expect(resource.content).toContain("handoff.json");
		});
	});

	it("reads a note file from session notes root", async () => {
		await withTempDir(async tempDir => {
			const artifactsDir = path.join(tempDir, "artifacts");
			const notesFile = path.join(artifactsDir, "notes", "subtasks", "trace.txt");
			await fs.mkdir(path.dirname(notesFile), { recursive: true });
			await Bun.write(notesFile, "trace");

			const router = createRouter({ artifactsDir, sessionId: "session-b" });
			const resource = await router.resolve("notes://subtasks/trace.txt");

			expect(resource.content).toBe("trace");
			expect(resource.contentType).toBe("text/plain");
		});
	});

	it("blocks path traversal attempts", async () => {
		await withTempDir(async tempDir => {
			const router = createRouter({ artifactsDir: path.join(tempDir, "artifacts"), sessionId: "session-c" });
			await expect(router.resolve("notes://../secret.txt")).rejects.toThrow(
				"Path traversal (..) is not allowed in notes:// URLs",
			);
			await expect(router.resolve("notes://%2E%2E/secret.txt")).rejects.toThrow(
				"Path traversal (..) is not allowed in notes:// URLs",
			);
		});
	});

	it("uses session id fallback root when artifacts dir is unavailable", async () => {
		const root = resolveNotesRoot({ getSessionId: () => "session-fallback", getArtifactsDir: () => null });
		expect(root).toContain(path.join("omp-notes", "session-fallback"));
		expect(resolveNotesUrlToPath("notes://memo.txt", { getSessionId: () => "session-fallback" })).toBe(
			path.join(root, "memo.txt"),
		);
	});

	it("blocks symlink escapes outside notes root", async () => {
		if (process.platform === "win32") return;

		await withTempDir(async tempDir => {
			const artifactsDir = path.join(tempDir, "artifacts");
			const notesRoot = path.join(artifactsDir, "notes");
			const outsideDir = path.join(tempDir, "outside");
			await fs.mkdir(notesRoot, { recursive: true });
			await fs.mkdir(outsideDir, { recursive: true });
			await Bun.write(path.join(outsideDir, "secret.txt"), "secret");
			await fs.symlink(outsideDir, path.join(notesRoot, "linked"));

			const router = createRouter({ artifactsDir, sessionId: "session-d" });
			await expect(router.resolve("notes://linked/secret.txt")).rejects.toThrow("notes:// URL escapes notes root");
		});
	});
});
