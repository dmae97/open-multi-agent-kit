import * as path from "node:path";
import { nanoid } from "nanoid";
import { type CollapseStrategy, collapse } from "../../../../lib/worktree/collapse";
import { WorktreeError, WorktreeErrorCode } from "../../../../lib/worktree/errors";
import { getRepoRoot, git } from "../../../../lib/worktree/git";
import * as worktree from "../../../../lib/worktree/index";
import { createSession, updateSession } from "../../../../lib/worktree/session";
import { formatStats, getStats } from "../../../../lib/worktree/stats";
import type { HookCommandContext } from "../../../hooks/types";
import { discoverAgents, getAgent } from "../../../tools/task/discovery";
import { runSubprocess } from "../../../tools/task/executor";
import { generateTaskName } from "../../../tools/task/name-generator";
import type { AgentDefinition } from "../../../tools/task/types";
import type { CustomCommand, CustomCommandAPI } from "../../types";

interface FlagParseResult {
	positionals: string[];
	flags: Map<string, string | boolean>;
}

interface NewArgs {
	branch: string;
	base?: string;
}

interface MergeArgs {
	source: string;
	target?: string;
	strategy?: CollapseStrategy;
	keep?: boolean;
}

interface RmArgs {
	name: string;
	force?: boolean;
}

interface SpawnArgs {
	task: string;
	scope?: string;
	name?: string;
}

interface ParallelTask {
	task: string;
	scope: string;
}

function parseFlags(args: string[]): FlagParseResult {
	const flags = new Map<string, string | boolean>();
	const positionals: string[] = [];

	for (let i = 0; i < args.length; i++) {
		const arg = args[i];
		if (arg.startsWith("--")) {
			const name = arg.slice(2);
			const next = args[i + 1];
			if (next && !next.startsWith("--")) {
				flags.set(name, next);
				i += 1;
			} else {
				flags.set(name, true);
			}
		} else {
			positionals.push(arg);
		}
	}

	return { positionals, flags };
}

function getFlagValue(flags: Map<string, string | boolean>, name: string): string | undefined {
	const value = flags.get(name);
	if (typeof value === "string") return value;
	return undefined;
}

function getFlagBoolean(flags: Map<string, string | boolean>, name: string): boolean {
	return flags.get(name) === true;
}

function formatUsage(): string {
	return [
		"Usage:",
		"  /wt new <branch> [--base <ref>]",
		"  /wt list",
		"  /wt merge <src> [dst] [--strategy simple|merge-base|rebase] [--keep]",
		"  /wt rm <name> [--force]",
		"  /wt status",
		'  /wt spawn "<task>" [--scope <glob>] [--name <branch>]',
		"  /wt parallel --task <t> --scope <s> [--task <t> --scope <s>]...",
	].join("\n");
}

function formatError(err: unknown): string {
	if (err instanceof WorktreeError) {
		return `${err.code}: ${err.message}`;
	}
	if (err instanceof Error) return err.message;
	return String(err);
}

async function pickAgent(cwd: string): Promise<AgentDefinition> {
	const { agents } = await discoverAgents(cwd);
	// Use the bundled "task" agent as the general-purpose default.
	const agent = getAgent(agents, "task") ?? agents[0];
	if (!agent) {
		throw new Error("No agents available");
	}
	return agent;
}

function parseParallelTasks(args: string[]): ParallelTask[] {
	const tasks: ParallelTask[] = [];
	let current: Partial<ParallelTask> = {};

	for (let i = 0; i < args.length; i++) {
		const arg = args[i];
		if (arg === "--task") {
			const value = args[i + 1];
			if (!value || value.startsWith("--")) {
				throw new Error("Missing value for --task");
			}
			current.task = value;
			i += 1;
		} else if (arg === "--scope") {
			const value = args[i + 1];
			if (!value || value.startsWith("--")) {
				throw new Error("Missing value for --scope");
			}
			current.scope = value;
			i += 1;
		} else {
			throw new Error(`Unknown argument: ${arg}`);
		}

		if (current.task && current.scope) {
			tasks.push({ task: current.task, scope: current.scope });
			current = {};
		}
	}

	if (current.task || current.scope) {
		throw new Error("Each --task must be paired with a --scope");
	}

	return tasks;
}

function validateDisjointScopes(scopes: string[]): void {
	for (let i = 0; i < scopes.length; i++) {
		for (let j = i + 1; j < scopes.length; j++) {
			const a = scopes[i].replace(/\*.*$/, "");
			const b = scopes[j].replace(/\*.*$/, "");
			if (a.startsWith(b) || b.startsWith(a)) {
				throw new WorktreeError(
					`Overlapping scopes: "${scopes[i]}" and "${scopes[j]}"`,
					WorktreeErrorCode.OVERLAPPING_SCOPES,
				);
			}
		}
	}
}

async function handleNew(args: NewArgs): Promise<string> {
	const wt = await worktree.create(args.branch, { base: args.base });

	return [`Created worktree: ${wt.path}`, `Branch: ${wt.branch ?? "detached"}`, "", `To switch: cd ${wt.path}`].join(
		"\n",
	);
}

async function handleList(ctx: HookCommandContext): Promise<string> {
	const worktrees = await worktree.list();
	const cwd = path.resolve(ctx.cwd);
	const mainPath = await getRepoRoot();

	const lines: string[] = [];

	for (const wt of worktrees) {
		const stats = await getStats(wt.path);
		const isCurrent = cwd === wt.path || cwd.startsWith(wt.path + path.sep);
		const isMain = wt.path === mainPath;

		const marker = isCurrent ? "->" : "  ";
		const mainTag = isMain ? " [main]" : "";
		const branch = wt.branch ?? "detached";
		const statsStr = formatStats(stats);

		lines.push(`${marker} ${branch}${mainTag} (${statsStr})`);
	}

	return lines.join("\n") || "No worktrees found";
}

async function handleMerge(args: MergeArgs): Promise<string> {
	const target = args.target ?? "main";
	const strategy = args.strategy ?? "rebase";

	const result = await collapse(args.source, target, {
		strategy,
		keepSource: args.keep,
	});

	const lines = [
		`Collapsed ${args.source} -> ${target}`,
		`Strategy: ${strategy}`,
		`Changes: +${result.insertions} -${result.deletions} in ${result.filesChanged} files`,
	];

	if (!args.keep) {
		lines.push("Source worktree removed");
	}

	return lines.join("\n");
}

async function handleRm(args: RmArgs): Promise<string> {
	const wt = await worktree.find(args.name);
	await worktree.remove(args.name, { force: args.force });

	const mainPath = await getRepoRoot();
	if (wt.branch) {
		await git(["branch", "-D", wt.branch], mainPath);
		return `Removed worktree and branch: ${wt.branch}`;
	}

	return `Removed worktree: ${wt.path}`;
}

async function handleStatus(): Promise<string> {
	const worktrees = await worktree.list();
	const sections: string[] = [];

	for (const wt of worktrees) {
		const branch = wt.branch ?? "detached";
		const name = path.basename(wt.path);

		const statusResult = await git(["status", "--short"], wt.path);
		const status = statusResult.stdout.trim() || "(clean)";

		sections.push(`${name} (${branch})\n${"-".repeat(40)}\n${status}`);
	}

	return sections.join("\n\n");
}

async function handleSpawn(args: SpawnArgs, ctx: HookCommandContext): Promise<string> {
	const branch = args.name ?? `wt-agent-${nanoid(6)}`;
	const wt = await worktree.create(branch);

	const session = await createSession({
		branch,
		path: wt.path,
		scope: args.scope ? [args.scope] : undefined,
		task: args.task,
	});
	await updateSession(session.id, { status: "active" });

	const agent = await pickAgent(ctx.cwd);
	const context = args.scope ? `Scope: ${args.scope}` : undefined;

	// Command context doesn't expose a spawn API, so run the task subprocess directly.
	const result = await runSubprocess({
		cwd: wt.path,
		agent,
		task: args.task,
		index: 0,
		taskId: generateTaskName(),
		context,
	});

	await updateSession(session.id, {
		status: result.exitCode === 0 ? "completed" : "failed",
		completedAt: Date.now(),
	});

	if (result.exitCode !== 0) {
		return [
			`Agent failed in worktree: ${branch}`,
			result.stderr.trim() ? `Error: ${result.stderr.trim()}` : "Error: agent execution failed",
			"",
			"Actions:",
			`  /wt merge ${branch}     - Apply changes to main`,
			"  /wt status              - Inspect changes",
			`  /wt rm ${branch}        - Discard changes`,
		].join("\n");
	}

	return [
		`Agent completed in worktree: ${branch}`,
		"",
		"Actions:",
		`  /wt merge ${branch}     - Apply changes to main`,
		"  /wt status              - Inspect changes",
		`  /wt rm ${branch}        - Discard changes`,
	].join("\n");
}

async function handleParallel(args: ParallelTask[], ctx: HookCommandContext): Promise<string> {
	validateDisjointScopes(args.map((t) => t.scope));

	const sessionId = `parallel-${nanoid()}`;
	const agent = await pickAgent(ctx.cwd);

	const worktrees: Array<{ task: ParallelTask; wt: worktree.Worktree; session: worktree.WorktreeSession }> = [];
	for (let i = 0; i < args.length; i++) {
		const task = args[i];
		const branch = `wt-parallel-${sessionId}-${i}`;
		const wt = await worktree.create(branch);
		const session = await createSession({
			branch,
			path: wt.path,
			scope: [task.scope],
			task: task.task,
		});
		worktrees.push({ task, wt, session });
	}

	const agentPromises = worktrees.map(async ({ task, wt, session }, index) => {
		await updateSession(session.id, { status: "active" });
		const result = await runSubprocess({
			cwd: wt.path,
			agent,
			task: task.task,
			index,
			taskId: generateTaskName(),
			context: `Scope: ${task.scope}`,
		});
		await updateSession(session.id, {
			status: result.exitCode === 0 ? "completed" : "failed",
			completedAt: Date.now(),
		});
		return { wt, session, result };
	});

	const results = await Promise.all(agentPromises);

	const mergeResults: string[] = [];

	for (const { wt, session } of results) {
		try {
			await updateSession(session.id, { status: "merging" });
			const collapseResult = await collapse(wt.branch ?? wt.path, "main", {
				strategy: "simple",
				keepSource: false,
			});
			await updateSession(session.id, { status: "merged" });
			mergeResults.push(
				`ok ${wt.branch ?? path.basename(wt.path)}: +${collapseResult.insertions} -${collapseResult.deletions}`,
			);
		} catch (err) {
			await updateSession(session.id, { status: "failed" });
			mergeResults.push(`err ${wt.branch ?? path.basename(wt.path)}: ${formatError(err)}`);
		}
	}

	return [`Parallel execution complete (${args.length} agents)`, "", "Results:", ...mergeResults].join("\n");
}

export class WorktreeCommand implements CustomCommand {
	name = "wt";
	description = "Git worktree management";

	// biome-ignore lint/complexity/noUselessConstructor: interface conformance - loader passes API to all commands
	constructor(_api: CustomCommandAPI) {}

	async execute(args: string[], ctx: HookCommandContext): Promise<string | undefined> {
		if (args.length === 0) return formatUsage();

		const subcommand = args[0];
		const rest = args.slice(1);

		try {
			switch (subcommand) {
				case "new": {
					const parsed = parseFlags(rest);
					const branch = parsed.positionals[0];
					if (!branch) return formatUsage();
					const base = getFlagValue(parsed.flags, "base");
					if (parsed.flags.get("base") === true) {
						return "Missing value for --base";
					}
					return await handleNew({ branch, base });
				}
				case "list":
					return await handleList(ctx);
				case "merge": {
					const parsed = parseFlags(rest);
					const source = parsed.positionals[0];
					const target = parsed.positionals[1];
					if (!source) return formatUsage();
					const strategyRaw = getFlagValue(parsed.flags, "strategy");
					if (parsed.flags.get("strategy") === true) {
						return "Missing value for --strategy";
					}
					const strategy = strategyRaw as CollapseStrategy | undefined;
					const keep = getFlagBoolean(parsed.flags, "keep");
					return await handleMerge({ source, target, strategy, keep });
				}
				case "rm": {
					const parsed = parseFlags(rest);
					const name = parsed.positionals[0];
					if (!name) return formatUsage();
					const force = getFlagBoolean(parsed.flags, "force");
					return await handleRm({ name, force });
				}
				case "status":
					return await handleStatus();
				case "spawn": {
					const parsed = parseFlags(rest);
					const task = parsed.positionals[0];
					if (!task) return formatUsage();
					const scope = getFlagValue(parsed.flags, "scope");
					if (parsed.flags.get("scope") === true) {
						return "Missing value for --scope";
					}
					const name = getFlagValue(parsed.flags, "name");
					return await handleSpawn({ task, scope, name }, ctx);
				}
				case "parallel": {
					const tasks = parseParallelTasks(rest);
					if (tasks.length === 0) return formatUsage();
					return await handleParallel(tasks, ctx);
				}
				default:
					return formatUsage();
			}
		} catch (err) {
			return formatError(err);
		}
	}
}

export default WorktreeCommand;
