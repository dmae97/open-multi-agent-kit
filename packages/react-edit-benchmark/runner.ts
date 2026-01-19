/**
 * Edit benchmark runner.
 *
 * Orchestrates benchmark runs by launching RPC clients, sending prompts,
 * and verifying results. Supports parallel runs for reliability measurement.
 */

import { mkdtemp, rm, cp, readdir, appendFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { ThinkingLevel } from "@oh-my-pi/pi-agent-core";
import { RpcClient } from "@oh-my-pi/pi-coding-agent";
import { extractTaskFiles, type EditTask } from "./tasks";
import { formatDirectory } from "./formatter";
import { verifyExpectedFiles } from "./verify";


export interface BenchmarkConfig {
	provider: string;
	model: string;
	thinkingLevel?: ThinkingLevel;
	runsPerTask: number;
	timeout: number;
	taskConcurrency: number;
	requireEditToolCall?: boolean;
	noEditRequired?: boolean;
	autoFormat?: boolean;
	editVariant?: "replace" | "patch" | "auto";
	editFuzzy?: boolean | "auto";
	editFuzzyThreshold?: number | "auto";
}

export interface TokenStats {
	input: number;
	output: number;
	total: number;
}

export interface ToolCallStats {
	read: number;
	edit: number;
	write: number;
	editSuccesses: number;
	editFailures: number;
	totalInputChars: number;
}

export interface EditFailure {
	toolCallId: string;
	args: unknown;
	error: string;
}

export interface TaskRunResult {
	runIndex: number;
	success: boolean;
	patchApplied: boolean;
	verificationPassed: boolean;
	seed?: number;
	mutationType?: string;
	mutationCategory?: string;
	difficultyScore?: number;
	error?: string;
	tokens: TokenStats;
	duration: number;
	indentScore?: number;
	formattedEquivalent?: boolean;
	diffStats?: { linesChanged: number; charsChanged: number };
	agentResponse?: string;
	diff?: string;
	toolCalls: ToolCallStats;
	editFailures: EditFailure[];
}

export interface ProgressEvent {
	taskId: string;
	runIndex: number;
	status: "started" | "completed";
	result?: TaskRunResult;
}

export interface TaskResult {
	id: string;
	name: string;
	files: string[];
	runs: TaskRunResult[];
	successRate: number;
	avgTokens: TokenStats;
	avgDuration: number;
	avgIndentScore: number;
	avgToolCalls: ToolCallStats;
	editSuccessRate: number;
}

export interface BenchmarkSummary {
	totalTasks: number;
	totalRuns: number;
	successfulRuns: number;
	overallSuccessRate: number;
	tasksWithAllPassing: number;
	tasksWithAnyFailing: number;
	totalTokens: TokenStats;
	avgTokensPerRun: TokenStats;
	totalDuration: number;
	avgDurationPerRun: number;
	avgIndentScore: number;
	totalToolCalls: ToolCallStats;
	avgToolCallsPerRun: ToolCallStats;
	editSuccessRate: number;
}

export interface BenchmarkResult {
	config: BenchmarkConfig;
	tasks: TaskResult[];
	summary: BenchmarkSummary;
	startTime: string;
	endTime: string;
}

async function copyFixtures(task: EditTask, destDir: string): Promise<void> {
	if (task.tarballPath) {
		await extractTaskFiles(task.tarballPath, task.id, destDir, "input");
	} else if (task.inputDir) {
		const entries = await readdir(task.inputDir, { withFileTypes: true });
		await Promise.all(
			entries.map((entry) =>
				cp(join(task.inputDir!, entry.name), join(destDir, entry.name), { recursive: true }),
			),
		);
	} else {
		throw new Error(`Task ${task.id} has neither tarballPath nor inputDir`);
	}
}

async function getExpectedDir(task: EditTask): Promise<{ dir: string; cleanup: () => Promise<void> }> {
	if (task.expectedDir) {
		return { dir: task.expectedDir, cleanup: async () => {} };
	}
	if (task.tarballPath) {
		const tempDir = await mkdtemp(join(tmpdir(), `edit-bench-expected-${task.id}-`));
		await extractTaskFiles(task.tarballPath, task.id, tempDir, "expected");
		return {
			dir: tempDir,
			cleanup: async () => {
				await rm(tempDir, { recursive: true, force: true }).catch(() => {});
			},
		};
	}
	throw new Error(`Task ${task.id} has neither tarballPath nor expectedDir`);
}

async function runSingleTask(
	task: EditTask,
	runIndex: number,
	config: BenchmarkConfig,
	workDir: string,
	expectedDir: string,
	cliPath: string,
): Promise<TaskRunResult> {
	const startTime = Date.now();
	let client: RpcClient | null = null;
	let error: string | undefined;
	let patchApplied = false;
	let verificationPassed = false;
	let indentScore: number | undefined;
	let formattedEquivalent: boolean | undefined;
	let diffStats: { linesChanged: number; charsChanged: number } | undefined;
	let tokens: TokenStats = { input: 0, output: 0, total: 0 };
	let agentResponse: string | undefined;
	let diff: string | undefined;
	let editFailures: EditFailure[] = [];
	let toolStats = {
		read: 0,
		edit: 0,
		write: 0,
		editSuccesses: 0,
		editFailures: 0,
		totalInputChars: 0,
	};

	const logFile = `/tmp/bench-${task.id}-run${runIndex}.jsonl`;
	const logEvent = async (event: unknown) => {
		await appendFile(logFile, JSON.stringify(event) + "\n");
	};

	try {
		await appendFile(logFile, `{"type":"meta","task":"${task.id}","run":${runIndex},"workDir":"${workDir}"}\n`);

		const env: Record<string, string> = { OMP_NO_TITLE: "1" };
		if (config.editVariant !== undefined) {
			env.OMP_EDIT_VARIANT = config.editVariant;
		}
		if (config.editFuzzy !== undefined) {
			env.OMP_EDIT_FUZZY = config.editFuzzy === "auto" ? "auto" : config.editFuzzy ? "1" : "0";
		}
		if (config.editFuzzyThreshold !== undefined) {
			env.OMP_EDIT_FUZZY_THRESHOLD = config.editFuzzyThreshold === "auto" ? "auto" : String(config.editFuzzyThreshold);
		}

		client = new RpcClient({
			cliPath,
			cwd: workDir,
			provider: config.provider,
			model: config.model,
			args: [ "--tools", "read,edit,write,ls"],
			env,
		});

		await client.start();

		if (config.thinkingLevel) {
			await client.setThinkingLevel(config.thinkingLevel);
		}

		const promptWithContext = `You are working in a repository with a single edit task.

${task.prompt}

**Important constraints:**
- Make the minimum change necessary. Do not refactor, improve, or "clean up" other code.
- If you see multiple similar patterns, only change the ONE that is buggy.
- Preserve exact code structure. Do not rearrange statements or change formatting.

${config.noEditRequired
			? "Read the relevant files first, then apply the fix."
			: "Read the relevant files first, then use the edit tool to apply the fix."}`;

		await appendFile(logFile, `{"type":"prompt","message":${JSON.stringify(promptWithContext)}}\n`);

		// Collect events with logging
		const events: Array<{ type: string; [key: string]: unknown }> = [];
		const eventsPromise = new Promise<void>((resolve, reject) => {
			const timer = setTimeout(() => {
				reject(new Error("Timeout waiting for agent_end"));
			}, config.timeout);

			let pendingRetry = false;

			client!.onEvent(async (event) => {
				events.push(event);

				// Only log tool calls and complete messages
				if (
					event.type === "tool_execution_start" ||
					event.type === "tool_execution_end" ||
					event.type === "message_end"
				) {
					await logEvent(event);
				}

				// Track retry state
				if ((event.type as string) === "auto_retry_start") {
					pendingRetry = true;
				} else if (event.type === "turn_start" && pendingRetry) {
					pendingRetry = false;
				}

				if (event.type === "agent_end") {
					// If there's a pending retry, don't resolve yet
					if (pendingRetry) {
						return;
					}
					clearTimeout(timer);
					resolve();
				}
			});
		});

		await client.prompt(promptWithContext);
		await eventsPromise;

		const stats = await client.getSessionStats();
		tokens = { input: stats.tokens.input, output: stats.tokens.output, total: stats.tokens.total };
		await logEvent({ type: "stats", ...stats });

		agentResponse = (await client.getLastAssistantText()) ?? undefined;
		await logEvent({ type: "response", text: agentResponse });

		// Count tool calls and track success/failure
		const pendingEdits = new Map<string, unknown>();

		for (const event of events) {
			if (event.type === "tool_execution_start") {
				const e = event as { toolName?: string; toolCallId?: string; args?: unknown };
				const toolName = e.toolName;
				if (toolName === "read") toolStats.read++;
				else if (toolName === "edit") {
					toolStats.edit++;
					if (e.toolCallId) pendingEdits.set(e.toolCallId, e.args);
				} else if (toolName === "write") toolStats.write++;

				// Count input chars from args
				if (e.args) {
					toolStats.totalInputChars += JSON.stringify(e.args).length;
				}
			} else if (event.type === "tool_execution_end") {
				const e = event as { toolName?: string; toolCallId?: string; isError?: boolean; result?: unknown };
				if (e.toolName === "edit" && e.toolCallId && pendingEdits.has(e.toolCallId)) {
					const args = pendingEdits.get(e.toolCallId) ?? null;
					pendingEdits.delete(e.toolCallId);
					if (e.isError) {
						toolStats.editFailures++;
						const error = extractToolErrorMessage(e.result);
						editFailures.push({ toolCallId: e.toolCallId, args, error });
					} else {
						toolStats.editSuccesses++;
					}
				}
			}
		}

		patchApplied = toolStats.edit > 0;

		const verification = await verifyExpectedFiles(expectedDir, workDir);
		if (config.autoFormat) {
			await formatDirectory(workDir);
		}

		verificationPassed = verification.success;
		indentScore = verification.indentScore;
		formattedEquivalent = verification.formattedEquivalent;
		diffStats = verification.diffStats;
		diff = verification.diff;
		if (!verification.success && verification.error) {
			error = verification.error;
		}
	} catch (err) {
		error = err instanceof Error ? err.message : String(err);
		await logEvent({ type: "error", error });
	} finally {
		if (client) {
			try {
				await client.stop();
			} catch {
				// Ignore stop errors
			}
		}
	}

	const duration = Date.now() - startTime;
	const mustUseEditTool = Boolean(config.requireEditToolCall) && !config.noEditRequired;
	const success = verificationPassed && (!mustUseEditTool || patchApplied);
	const metadata = task.metadata;

	await logEvent({ type: "result", success, patchApplied, verificationPassed, error, duration });
	console.log(`  Log: ${logFile}`);

	return {
		runIndex,
		success,
		patchApplied,
		verificationPassed,
		seed: metadata?.seed,
		mutationType: metadata?.mutationType,
		mutationCategory: metadata?.mutationCategory,
		difficultyScore: metadata?.difficultyScore,
		error,
		tokens,
		duration,
		indentScore,
		formattedEquivalent,
		diffStats,
		agentResponse,
		diff,
		toolCalls: toolStats,
		editFailures,
	};
}

function extractToolErrorMessage(result: unknown): string {
	if (typeof result === "string") return result;
	if (!result || typeof result !== "object") return "Unknown error";
	const content = (result as { content?: unknown }).content;
	if (Array.isArray(content)) {
		for (const entry of content) {
			if (!entry || typeof entry !== "object") continue;
			if (!("text" in entry)) continue;
			const text = (entry as { text?: unknown }).text;
			if (typeof text === "string") return text;
		}
	}
	try {
		return JSON.stringify(result);
	} catch {
		return "Unknown error";
	}
}

export async function runTask(
	task: EditTask,
	config: BenchmarkConfig,
	onProgress?: (event: ProgressEvent) => void,
): Promise<TaskResult> {
	const tempDirs: string[] = [];
	const { dir: expectedDir, cleanup: cleanupExpected } = await getExpectedDir(task);

	const cliPath = join(import.meta.dir, "../coding-agent/src/cli.ts");

	try {
		for (let i = 0; i < config.runsPerTask; i++) {
			const tempDir = await mkdtemp(join(tmpdir(), `edit-bench-${task.id}-`));
			tempDirs.push(tempDir);
			await copyFixtures(task, tempDir);
		}

		const runPromises = tempDirs.map(async (workDir, index) => {
			onProgress?.({ taskId: task.id, runIndex: index, status: "started" });
			const result = await runSingleTask(task, index, config, workDir, expectedDir, cliPath);
			onProgress?.({ taskId: task.id, runIndex: index, status: "completed", result });
			return result;
		});

		const runs = await Promise.all(runPromises);
		const n = runs.length;

		const successfulRuns = runs.filter((r) => r.success).length;
		const successRate = successfulRuns / n;

		const avgTokens: TokenStats = {
			input: Math.round(runs.reduce((sum, r) => sum + r.tokens.input, 0) / n),
			output: Math.round(runs.reduce((sum, r) => sum + r.tokens.output, 0) / n),
			total: Math.round(runs.reduce((sum, r) => sum + r.tokens.total, 0) / n),
		};

		const avgDuration = Math.round(runs.reduce((sum, r) => sum + r.duration, 0) / n);
		const indentScores = runs
			.map((run) => run.indentScore)
			.filter((score): score is number => typeof score === "number");
		const avgIndentScore = indentScores.length > 0
			? indentScores.reduce((sum, score) => sum + score, 0) / indentScores.length
			: 0;

		const avgToolCalls: ToolCallStats = {
			read: runs.reduce((sum, r) => sum + r.toolCalls.read, 0) / n,
			edit: runs.reduce((sum, r) => sum + r.toolCalls.edit, 0) / n,
			write: runs.reduce((sum, r) => sum + r.toolCalls.write, 0) / n,
			editSuccesses: runs.reduce((sum, r) => sum + r.toolCalls.editSuccesses, 0) / n,
			editFailures: runs.reduce((sum, r) => sum + r.toolCalls.editFailures, 0) / n,
			totalInputChars: runs.reduce((sum, r) => sum + r.toolCalls.totalInputChars, 0) / n,
		};

		const totalEditAttempts = runs.reduce((sum, r) => sum + r.toolCalls.edit, 0);
		const totalEditSuccesses = runs.reduce((sum, r) => sum + r.toolCalls.editSuccesses, 0);
		const editSuccessRate = totalEditAttempts > 0 ? totalEditSuccesses / totalEditAttempts : 1;

		return {
			id: task.id,
			name: task.name,
			files: task.files,
			runs,
			successRate,
			avgTokens,
			avgDuration,
			avgIndentScore,
			avgToolCalls,
			editSuccessRate,
		};
	} finally {
		await cleanupExpected();
		for (const dir of tempDirs) {
			try {
				await rm(dir, { recursive: true, force: true });
			} catch {
				// Ignore cleanup errors
			}
		}
	}
}

export async function runBenchmark(
	tasks: EditTask[],
	config: BenchmarkConfig,
	onProgress?: (event: ProgressEvent) => void,
): Promise<BenchmarkResult> {
	const startTime = new Date().toISOString();
	const taskResults: TaskResult[] = [];

	const concurrency = Math.max(1, Math.floor(config.taskConcurrency));
	const pendingTasks = [...tasks];
	const running: Promise<void>[] = [];

	const runNext = async (): Promise<void> => {
		const nextTask = pendingTasks.shift();
		if (!nextTask) return;
		const result = await runTask(nextTask, config, onProgress);
		taskResults.push(result);
		await runNext();
	};

	const slots = Math.min(concurrency, pendingTasks.length || 0);
	for (let i = 0; i < slots; i++) {
		running.push(runNext());
	}

	await Promise.all(running);

	const endTime = new Date().toISOString();

	const allRuns = taskResults.flatMap((t) => t.runs);
	const totalRuns = allRuns.length;
	const successfulRuns = allRuns.filter((r) => r.success).length;

	const totalTokens: TokenStats = {
		input: allRuns.reduce((sum, r) => sum + r.tokens.input, 0),
		output: allRuns.reduce((sum, r) => sum + r.tokens.output, 0),
		total: allRuns.reduce((sum, r) => sum + r.tokens.total, 0),
	};

	const totalDuration = allRuns.reduce((sum, r) => sum + r.duration, 0);
	const indentScores = allRuns
		.map((run) => run.indentScore)
		.filter((score): score is number => typeof score === "number");
	const avgIndentScore = indentScores.length > 0
		? indentScores.reduce((sum, score) => sum + score, 0) / indentScores.length
		: 0;

	const totalToolCalls: ToolCallStats = {
		read: allRuns.reduce((sum, r) => sum + r.toolCalls.read, 0),
		edit: allRuns.reduce((sum, r) => sum + r.toolCalls.edit, 0),
		write: allRuns.reduce((sum, r) => sum + r.toolCalls.write, 0),
		editSuccesses: allRuns.reduce((sum, r) => sum + r.toolCalls.editSuccesses, 0),
		editFailures: allRuns.reduce((sum, r) => sum + r.toolCalls.editFailures, 0),
		totalInputChars: allRuns.reduce((sum, r) => sum + r.toolCalls.totalInputChars, 0),
	};

	const editSuccessRate = totalToolCalls.edit > 0
		? totalToolCalls.editSuccesses / totalToolCalls.edit
		: 1;

	const summary: BenchmarkSummary = {
		totalTasks: tasks.length,
		totalRuns,
		successfulRuns,
		overallSuccessRate: successfulRuns / totalRuns,
		tasksWithAllPassing: taskResults.filter((t) => t.successRate === 1).length,
		tasksWithAnyFailing: taskResults.filter((t) => t.successRate < 1).length,
		totalTokens,
		avgTokensPerRun: {
			input: Math.round(totalTokens.input / totalRuns),
			output: Math.round(totalTokens.output / totalRuns),
			total: Math.round(totalTokens.total / totalRuns),
		},
		totalDuration,
		avgDurationPerRun: Math.round(totalDuration / totalRuns),
		avgIndentScore,
		totalToolCalls,
		avgToolCallsPerRun: {
			read: totalToolCalls.read / totalRuns,
			edit: totalToolCalls.edit / totalRuns,
			write: totalToolCalls.write / totalRuns,
			editSuccesses: totalToolCalls.editSuccesses / totalRuns,
			editFailures: totalToolCalls.editFailures / totalRuns,
			totalInputChars: totalToolCalls.totalInputChars / totalRuns,
		},
		editSuccessRate,
	};

	return {
		config,
		tasks: taskResults,
		summary,
		startTime,
		endTime,
	};
}
