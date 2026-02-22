import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { isEnoent } from "@oh-my-pi/pi-utils";
import { validateRelativePath } from "./skill-protocol";
import type { InternalResource, InternalUrl, ProtocolHandler } from "./types";

export interface NotesProtocolOptions {
	getArtifactsDir?: () => string | null;
	getSessionId?: () => string | null;
}

function parseNotesUrl(input: string): InternalUrl {
	let parsed: URL;
	try {
		parsed = new URL(input);
	} catch {
		throw new Error(`Invalid URL: ${input}`);
	}

	const hostMatch = input.match(/^([a-z][a-z0-9+.-]*):\/\/([^/?#]*)/i);
	let rawHost = hostMatch ? hostMatch[2] : parsed.hostname;
	try {
		rawHost = decodeURIComponent(rawHost);
	} catch {
		// Leave rawHost as-is if decoding fails.
	}
	(parsed as InternalUrl).rawHost = rawHost;

	const pathMatch = input.match(/^[a-z][a-z0-9+.-]*:\/\/[^/?#]*(\/[^?#]*)?/i);
	(parsed as InternalUrl).rawPathname = pathMatch?.[1] ?? parsed.pathname;
	return parsed as InternalUrl;
}

function ensureWithinRoot(targetPath: string, rootPath: string): void {
	if (targetPath !== rootPath && !targetPath.startsWith(`${rootPath}${path.sep}`)) {
		throw new Error("notes:// URL escapes notes root");
	}
}

function toNotesValidationError(error: unknown): Error {
	const message = error instanceof Error ? error.message : String(error);
	return new Error(message.replace("skill://", "notes://"));
}

function getContentType(filePath: string): InternalResource["contentType"] {
	const ext = path.extname(filePath).toLowerCase();
	if (ext === ".md") return "text/markdown";
	if (ext === ".json") return "application/json";
	return "text/plain";
}

async function listFilesRecursively(rootPath: string): Promise<string[]> {
	const pending = [""];
	const files: string[] = [];

	while (pending.length > 0) {
		const relativeDir = pending.pop();
		if (relativeDir === undefined) continue;
		const absoluteDir = path.join(rootPath, relativeDir);
		const entries = await fs.readdir(absoluteDir, { withFileTypes: true });

		for (const entry of entries) {
			const entryPath = path.join(relativeDir, entry.name);
			if (entry.isDirectory()) {
				pending.push(entryPath);
				continue;
			}
			if (entry.isFile()) {
				files.push(entryPath.replaceAll(path.sep, "/"));
			}
		}
	}

	return files.sort((a, b) => a.localeCompare(b));
}

async function buildListing(url: InternalUrl, notesRoot: string): Promise<InternalResource> {
	const files = await listFilesRecursively(notesRoot);
	const listing = files.length === 0 ? "(empty)" : files.map(file => `- [${file}](notes://${file})`).join("\n");
	const content =
		`# Notes\n\n` +
		`Session-scoped scratch space for large intermediate data, subagent handoffs, and reusable planning notes.\n\n` +
		`Root: ${notesRoot}\n\n` +
		`${files.length} file${files.length === 1 ? "" : "s"} available:\n\n` +
		`${listing}\n`;

	return {
		url: url.href,
		content,
		contentType: "text/markdown",
		size: Buffer.byteLength(content, "utf-8"),
		sourcePath: notesRoot,
	};
}

function extractRelativePath(url: InternalUrl): string {
	const host = url.rawHost || url.hostname;
	const pathname = url.rawPathname ?? url.pathname;

	const combined = host
		? pathname && pathname !== "/"
			? `${host}${pathname}`
			: host
		: pathname && pathname !== "/"
			? pathname.slice(1)
			: "";

	if (!combined) {
		return "";
	}

	let decoded: string;
	try {
		decoded = decodeURIComponent(combined.replaceAll("\\", "/"));
	} catch {
		throw new Error(`Invalid URL encoding in notes:// path: ${url.href}`);
	}
	try {
		validateRelativePath(decoded);
	} catch (error) {
		throw toNotesValidationError(error);
	}
	return decoded;
}

export function resolveNotesRoot(options: NotesProtocolOptions): string {
	const artifactsDir = options.getArtifactsDir?.();
	if (artifactsDir) {
		return path.resolve(artifactsDir, "notes");
	}

	const sessionId = options.getSessionId?.() ?? "session";
	const safeSessionId = sessionId.replace(/[^a-zA-Z0-9_.-]/g, "_");
	return path.join(os.tmpdir(), "omp-notes", safeSessionId);
}

export function resolveNotesUrlToPath(input: string | InternalUrl, options: NotesProtocolOptions): string {
	const url = typeof input === "string" ? parseNotesUrl(input) : input;
	const notesRoot = path.resolve(resolveNotesRoot(options));
	const relativePath = extractRelativePath(url);

	if (!relativePath) {
		return notesRoot;
	}

	const resolved = path.resolve(notesRoot, relativePath);
	ensureWithinRoot(resolved, notesRoot);
	return resolved;
}

/**
 * Protocol handler for notes:// URLs.
 *
 * URL forms:
 * - notes:// - Lists all session notes
 * - notes://<path> - Reads a file under session notes root
 */
export class NotesProtocolHandler implements ProtocolHandler {
	readonly scheme = "notes";

	constructor(private readonly options: NotesProtocolOptions) {}

	async resolve(url: InternalUrl): Promise<InternalResource> {
		const notesRoot = path.resolve(resolveNotesRoot(this.options));
		await fs.mkdir(notesRoot, { recursive: true });

		let resolvedRoot: string;
		try {
			resolvedRoot = await fs.realpath(notesRoot);
		} catch (error) {
			if (isEnoent(error)) {
				throw new Error("Unable to initialize notes:// root");
			}
			throw error;
		}

		const relativePath = extractRelativePath(url);
		const targetPath = relativePath ? path.resolve(resolvedRoot, relativePath) : resolvedRoot;
		ensureWithinRoot(targetPath, resolvedRoot);

		if (targetPath === resolvedRoot) {
			return buildListing(url, resolvedRoot);
		}

		const parentDir = path.dirname(targetPath);
		try {
			const realParent = await fs.realpath(parentDir);
			ensureWithinRoot(realParent, resolvedRoot);
		} catch (error) {
			if (!isEnoent(error)) {
				throw error;
			}
		}

		let realTargetPath: string;
		try {
			realTargetPath = await fs.realpath(targetPath);
		} catch (error) {
			if (isEnoent(error)) {
				throw new Error(`Notes file not found: ${url.href}`);
			}
			throw error;
		}

		ensureWithinRoot(realTargetPath, resolvedRoot);

		const stat = await fs.stat(realTargetPath);
		if (!stat.isFile()) {
			throw new Error(`notes:// URL must resolve to a file: ${url.href}`);
		}

		const content = await Bun.file(realTargetPath).text();
		return {
			url: url.href,
			content,
			contentType: getContentType(realTargetPath),
			size: Buffer.byteLength(content, "utf-8"),
			sourcePath: realTargetPath,
			notes: ["Use write path notes://<file> to persist large intermediate artifacts across turns."],
		};
	}
}
