import type * as fsTypes from "node:fs";
import * as fs from "node:fs/promises";
import * as path from "node:path";

export interface GlobPathsOptions {
	/** Base directory for glob patterns. Defaults to process.cwd(). */
	cwd?: string;
	/** Glob exclusion patterns. */
	exclude?: string[];
	/** Abort signal to cancel the glob. */
	signal?: AbortSignal;
	/** Timeout in milliseconds for the glob operation. */
	timeoutMs?: number;
	/** Include dotfiles when true. */
	dot?: boolean;
	/** Only return files (skip directories). Default: true. */
	onlyFiles?: boolean;
	/** Respect .gitignore files when true. Walks up directory tree to find all applicable .gitignore files. */
	gitignore?: boolean;
}

function createGlobSignal(signal?: AbortSignal, timeoutMs?: number): AbortSignal | undefined {
	const timeoutSignal = timeoutMs ? AbortSignal.timeout(timeoutMs) : undefined;
	if (signal && timeoutSignal) {
		return AbortSignal.any([signal, timeoutSignal]);
	}
	return signal ?? timeoutSignal;
}

/** Patterns always excluded (.git is never useful in glob results). */
const ALWAYS_IGNORED = ["**/.git", "**/.git/**"];

/** node_modules exclusion patterns (skipped if pattern explicitly references node_modules). */
const NODE_MODULES_IGNORED = ["**/node_modules", "**/node_modules/**"];

/**
 * Parse a single .gitignore file and return glob-compatible exclude patterns.
 * @param content - Raw content of the .gitignore file
 * @param gitignoreDir - Absolute path to the directory containing the .gitignore
 * @param baseDir - Absolute path to the glob's cwd (for relativizing rooted patterns)
 */
function parseGitignorePatterns(content: string, gitignoreDir: string, baseDir: string): string[] {
	const patterns: string[] = [];

	for (const rawLine of content.split("\n")) {
		const line = rawLine.trim();
		// Skip empty lines and comments
		if (!line || line.startsWith("#")) {
			continue;
		}
		// Skip negation patterns (unsupported for simple exclude)
		if (line.startsWith("!")) {
			continue;
		}

		let pattern = line;

		// Handle trailing slash (directory-only match)
		// For glob exclude, we treat it as matching the dir and its contents
		const isDirectoryOnly = pattern.endsWith("/");
		if (isDirectoryOnly) {
			pattern = pattern.slice(0, -1);
		}

		// Handle rooted patterns (start with /)
		if (pattern.startsWith("/")) {
			// Rooted pattern: relative to the .gitignore location
			const absolutePattern = path.join(gitignoreDir, pattern.slice(1));
			const relativeToBase = path.relative(baseDir, absolutePattern);
			if (relativeToBase.startsWith("..")) {
				// Pattern is outside the search directory, skip
				continue;
			}
			pattern = relativeToBase.replace(/\\/g, "/");
			if (isDirectoryOnly) {
				patterns.push(pattern);
				patterns.push(`${pattern}/**`);
			} else {
				patterns.push(pattern);
			}
		} else {
			// Unrooted pattern: match anywhere in the tree
			if (pattern.includes("/")) {
				// Contains slash: match from any directory level
				patterns.push(`**/${pattern}`);
				if (isDirectoryOnly) {
					patterns.push(`**/${pattern}/**`);
				}
			} else {
				// No slash: match file/dir name anywhere
				patterns.push(`**/${pattern}`);
				if (isDirectoryOnly) {
					patterns.push(`**/${pattern}/**`);
				}
			}
		}
	}

	return patterns;
}

/**
 * Load .gitignore patterns from a directory and its parents.
 * Walks up the directory tree to find all applicable .gitignore files.
 * Returns glob-compatible exclude patterns.
 */
export async function loadGitignorePatterns(baseDir: string): Promise<string[]> {
	const patterns: string[] = [];
	const absoluteBase = path.resolve(baseDir);

	let current = absoluteBase;
	const maxDepth = 50; // Prevent infinite loops

	for (let i = 0; i < maxDepth; i++) {
		const gitignorePath = path.join(current, ".gitignore");

		try {
			const content = await Bun.file(gitignorePath).text();
			const filePatterns = parseGitignorePatterns(content, current, absoluteBase);
			patterns.push(...filePatterns);
		} catch {
			// .gitignore doesn't exist or can't be read, continue
		}

		const parent = path.dirname(current);
		if (parent === current) {
			// Reached filesystem root
			break;
		}
		current = parent;
	}

	return patterns;
}

function isAsyncIterable<T>(value: unknown): value is AsyncIterable<T> {
	return typeof (value as { [Symbol.asyncIterator]?: unknown })?.[Symbol.asyncIterator] === "function";
}

async function collectGlobResults(result: unknown): Promise<string[]> {
	const resolved = await Promise.resolve(result);
	if (!resolved) {
		return [];
	}
	if (Array.isArray(resolved)) {
		return resolved.filter((entry): entry is string => typeof entry === "string");
	}
	if (isAsyncIterable<string>(resolved)) {
		const entries: string[] = [];
		for await (const entry of resolved) {
			if (typeof entry === "string") {
				entries.push(entry);
			}
		}
		return entries;
	}
	return [];
}

/**
 * Resolve filesystem paths matching glob patterns with optional exclude filters.
 * Returns paths relative to the provided cwd (or process.cwd()).
 * Errors and abort/timeouts are surfaced to the caller.
 */
export async function globPaths(patterns: string | string[], options: GlobPathsOptions = {}): Promise<string[]> {
	const { cwd, exclude, signal, timeoutMs, dot, onlyFiles = true, gitignore } = options;

	// Build exclude list: always exclude .git, exclude node_modules unless pattern references it
	const patternArray = Array.isArray(patterns) ? patterns : [patterns];
	const mentionsNodeModules = patternArray.some(p => p.includes("node_modules"));

	const baseExclude = mentionsNodeModules ? [...ALWAYS_IGNORED] : [...ALWAYS_IGNORED, ...NODE_MODULES_IGNORED];
	let effectiveExclude = exclude ? [...baseExclude, ...exclude] : baseExclude;

	if (gitignore) {
		const gitignorePatterns = await loadGitignorePatterns(cwd ?? process.cwd());
		effectiveExclude = [...effectiveExclude, ...gitignorePatterns];
	}

	const globOptions = {
		cwd,
		exclude: effectiveExclude,
		signal: createGlobSignal(signal, timeoutMs),
		dot,
		nodir: onlyFiles,
	} as fsTypes.GlobOptions;

	const result = fs.glob(patterns, globOptions);
	const entries = await collectGlobResults(result);
	const base = cwd ?? process.cwd();

	return entries.map(entry => (path.isAbsolute(entry) ? path.relative(base, entry) : entry));
}
