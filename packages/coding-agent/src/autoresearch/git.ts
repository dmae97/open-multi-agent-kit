import type { ExtensionAPI } from "../extensibility/extensions";
import { PROTECTED_AUTORESEARCH_FILES } from "./helpers";

const AUTORESEARCH_BRANCH_PREFIX = "autoresearch/";
const BRANCH_NAME_MAX_LENGTH = 48;

export interface EnsureAutoresearchBranchFailure {
	error: string;
	ok: false;
}

export interface EnsureAutoresearchBranchSuccess {
	branchName: string;
	created: boolean;
	ok: true;
}

export type EnsureAutoresearchBranchResult = EnsureAutoresearchBranchFailure | EnsureAutoresearchBranchSuccess;

export async function ensureAutoresearchBranch(
	api: ExtensionAPI,
	workDir: string,
	goal: string | null,
): Promise<EnsureAutoresearchBranchResult> {
	const repoRootResult = await api.exec("git", ["rev-parse", "--show-toplevel"], { cwd: workDir, timeout: 5_000 });
	if (repoRootResult.code !== 0) {
		return {
			error: "Autoresearch requires a git repository so it can isolate experiments and revert failed runs safely.",
			ok: false,
		};
	}

	const currentBranchResult = await api.exec("git", ["branch", "--show-current"], { cwd: workDir, timeout: 5_000 });
	const currentBranch = currentBranchResult.stdout.trim();
	if (currentBranch.startsWith(AUTORESEARCH_BRANCH_PREFIX)) {
		return {
			branchName: currentBranch,
			created: false,
			ok: true,
		};
	}

	const dirtyPathsResult = await api.exec("git", ["status", "--porcelain", "--untracked-files=all"], {
		cwd: workDir,
		timeout: 5_000,
	});
	if (dirtyPathsResult.code !== 0) {
		return {
			error: `Unable to inspect git status before starting autoresearch: ${mergeStdoutStderr(dirtyPathsResult).trim() || `exit ${dirtyPathsResult.code}`}`,
			ok: false,
		};
	}

	const unsafeDirtyPaths = parseUnsafeDirtyPaths(dirtyPathsResult.stdout);
	if (unsafeDirtyPaths.length > 0) {
		const preview = unsafeDirtyPaths.slice(0, 5).join(", ");
		const suffix = unsafeDirtyPaths.length > 5 ? ` (+${unsafeDirtyPaths.length - 5} more)` : "";
		return {
			error:
				"Autoresearch needs a clean git worktree before it can create an isolated branch. " +
				`Commit or stash these paths first: ${preview}${suffix}`,
			ok: false,
		};
	}

	const branchName = await allocateBranchName(api, workDir, goal);
	const checkoutResult = await api.exec("git", ["checkout", "-b", branchName], { cwd: workDir, timeout: 10_000 });
	if (checkoutResult.code !== 0) {
		return {
			error:
				`Failed to create autoresearch branch ${branchName}: ` +
				`${mergeStdoutStderr(checkoutResult).trim() || `exit ${checkoutResult.code}`}`,
			ok: false,
		};
	}

	return {
		branchName,
		created: true,
		ok: true,
	};
}

function parseUnsafeDirtyPaths(statusOutput: string): string[] {
	const unsafePaths = new Set<string>();
	for (const line of statusOutput.split("\n")) {
		const trimmedLine = line.trimEnd();
		if (trimmedLine.length < 4) continue;
		const rawPath = trimmedLine.slice(3).trim();
		if (rawPath.length === 0) continue;
		const renameParts = rawPath.split(" -> ");
		const normalizedPath = normalizeStatusPath(renameParts[renameParts.length - 1] ?? rawPath);
		if (normalizedPath.length === 0) continue;
		if (PROTECTED_AUTORESEARCH_FILES.some(path => path === normalizedPath)) continue;
		unsafePaths.add(normalizedPath);
	}
	return [...unsafePaths];
}

function normalizeStatusPath(path: string): string {
	let normalized = path.trim();
	if (normalized.startsWith('"') && normalized.endsWith('"')) {
		normalized = normalized.slice(1, -1);
	}
	if (normalized.startsWith("./")) {
		normalized = normalized.slice(2);
	}
	return normalized;
}

async function allocateBranchName(api: ExtensionAPI, workDir: string, goal: string | null): Promise<string> {
	const baseName = `${AUTORESEARCH_BRANCH_PREFIX}${slugifyGoal(goal)}-${currentDateStamp()}`;
	let candidate = baseName;
	let suffix = 2;
	while (await branchExists(api, workDir, candidate)) {
		candidate = `${baseName}-${suffix}`;
		suffix += 1;
	}
	return candidate;
}

async function branchExists(api: ExtensionAPI, workDir: string, branchName: string): Promise<boolean> {
	const result = await api.exec("git", ["show-ref", "--verify", "--quiet", `refs/heads/${branchName}`], {
		cwd: workDir,
		timeout: 5_000,
	});
	return result.code === 0;
}

function slugifyGoal(goal: string | null): string {
	const normalized = (goal ?? "")
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "");
	const trimmed = normalized.slice(0, BRANCH_NAME_MAX_LENGTH).replace(/-+$/g, "");
	return trimmed || "session";
}

function currentDateStamp(): string {
	const now = new Date();
	const year = String(now.getFullYear());
	const month = String(now.getMonth() + 1).padStart(2, "0");
	const day = String(now.getDate()).padStart(2, "0");
	return `${year}${month}${day}`;
}

function mergeStdoutStderr(result: { stderr: string; stdout: string }): string {
	return `${result.stdout}${result.stderr}`;
}
