/**
 * Tarball utilities for reading fixtures directly from .tar.gz archives.
 */

import { createReadStream } from "node:fs";
import { mkdir } from "node:fs/promises";
import { join, dirname, basename } from "node:path";
import { createGunzip } from "node:zlib";
import { extract, type Headers } from "tar-stream";

export interface TarballTask {
	id: string;
	prompt: string;
	metadata: Record<string, unknown>;
	inputFiles: string[];
	expectedFiles: string[];
}

export interface TarballEntry {
	path: string;
	content: Buffer;
}

export interface FixtureValidationIssue {
	taskId: string;
	message: string;
}

interface ParsedTarballTask {
	id: string;
	prompt?: string;
	metadata?: Record<string, unknown>;
	inputFiles: Map<string, number>;
	expectedFiles: Map<string, number>;
}

export async function readTarball(tarballPath: string): Promise<TarballEntry[]> {
	return new Promise((resolve, reject) => {
		const entries: TarballEntry[] = [];
		const extractor = extract();

		extractor.on("entry", (header: Headers, stream, next) => {
			const chunks: Buffer[] = [];
			stream.on("data", (chunk: Buffer) => chunks.push(chunk));
			stream.on("end", () => {
				if (header.type === "file") {
					entries.push({
						path: header.name,
						content: Buffer.concat(chunks),
					});
				}
				next();
			});
			stream.resume();
		});

		extractor.on("finish", () => resolve(entries));
		extractor.on("error", reject);

		createReadStream(tarballPath).pipe(createGunzip()).pipe(extractor);
	});
}

function parseTarballEntries(entries: TarballEntry[]): {
	tasks: ParsedTarballTask[];
	issues: FixtureValidationIssue[];
} {
	const taskMap = new Map<string, ParsedTarballTask>();
	const issues: FixtureValidationIssue[] = [];

	for (const entry of entries) {
		const parts = entry.path.split("/");
		if (parts.length < 3) continue;

		const taskId = parts[1];
		const task = taskMap.get(taskId) ?? {
			id: taskId,
			inputFiles: new Map<string, number>(),
			expectedFiles: new Map<string, number>(),
		};
		if (!taskMap.has(taskId)) {
			taskMap.set(taskId, task);
		}

		const subPath = parts.slice(2).join("/");
		if (subPath === "prompt.md") {
			task.prompt = entry.content.toString("utf-8");
			continue;
		}
		if (subPath === "metadata.json") {
			const raw = entry.content.toString("utf-8");
			try {
				task.metadata = JSON.parse(raw) as Record<string, unknown>;
			} catch (err) {
				const error = err instanceof Error ? err.message : String(err);
				issues.push({ taskId, message: `metadata.json is invalid JSON: ${error}` });
			}
			continue;
		}
		if (subPath.startsWith("input/")) {
			const name = subPath.slice(6);
			task.inputFiles.set(name, entry.content.length);
			continue;
		}
		if (subPath.startsWith("expected/")) {
			const name = subPath.slice(9);
			task.expectedFiles.set(name, entry.content.length);
		}
	}

	for (const task of taskMap.values()) {
		issues.push(...validateParsedTarballTask(task));
	}

	return { tasks: Array.from(taskMap.values()), issues };
}

function validateParsedTarballTask(task: ParsedTarballTask): FixtureValidationIssue[] {
	const issues: FixtureValidationIssue[] = [];
	const prompt = task.prompt?.trim() ?? "";
	if (!prompt) {
		issues.push({ taskId: task.id, message: "prompt.md is missing or empty" });
	}
	if (!task.metadata) {
		issues.push({ taskId: task.id, message: "metadata.json is missing" });
	}
	if (task.inputFiles.size === 0) {
		issues.push({ taskId: task.id, message: "input directory is empty" });
	}
	if (task.expectedFiles.size === 0) {
		issues.push({ taskId: task.id, message: "expected directory is empty" });
	}
	for (const [name, size] of task.inputFiles) {
		if (size <= 0) {
			issues.push({ taskId: task.id, message: `input/${name} is empty` });
		}
	}
	for (const [name, size] of task.expectedFiles) {
		if (size <= 0) {
			issues.push({ taskId: task.id, message: `expected/${name} is empty` });
		}
	}
	if (task.metadata && typeof task.metadata.file_path === "string") {
		const fileName = basename(task.metadata.file_path);
		if (!task.inputFiles.has(fileName)) {
			issues.push({
				taskId: task.id,
				message: `metadata file_path ${task.metadata.file_path} not found in input files`,
			});
		}
		if (!task.expectedFiles.has(fileName)) {
			issues.push({
				taskId: task.id,
				message: `metadata file_path ${task.metadata.file_path} not found in expected files`,
			});
		}
	} else {
		issues.push({ taskId: task.id, message: "metadata.json missing file_path" });
	}
	return issues;
}

export async function validateTarballFixtures(tarballPath: string): Promise<FixtureValidationIssue[]> {
	const entries = await readTarball(tarballPath);
	const { issues } = parseTarballEntries(entries);
	return issues;
}

export async function loadTasksFromTarball(tarballPath: string): Promise<TarballTask[]> {
	const entries = await readTarball(tarballPath);
	const { tasks, issues } = parseTarballEntries(entries);
	if (issues.length > 0) {
		const details = issues
			.map((issue) => `- ${issue.taskId}: ${issue.message}`)
			.join("\n");
		throw new Error(`Fixture tarball validation failed:\n${details}`);
	}

	const normalized: TarballTask[] = tasks.map((task) => ({
		id: task.id,
		prompt: task.prompt?.trim() ?? "",
		metadata: task.metadata ?? {},
		inputFiles: Array.from(task.inputFiles.keys()).sort(),
		expectedFiles: Array.from(task.expectedFiles.keys()).sort(),
	}));

	return normalized.sort((a, b) => a.id.localeCompare(b.id));
}

export async function extractTaskFiles(
	tarballPath: string,
	taskId: string,
	destDir: string,
	type: "input" | "expected",
): Promise<void> {
	const prefix = `fixtures/${taskId}/${type}/`;

	await new Promise<void>((resolve, reject) => {
		const extractor = extract();
		let failed = false;
		const fail = (err: Error): void => {
			if (failed) return;
			failed = true;
			reject(err);
			extractor.destroy(err);
		};

		extractor.on("entry", async (header: Headers, stream, next) => {
			if (header.type === "file" && header.name.startsWith(prefix)) {
				const relativePath = header.name.slice(prefix.length);
				const destPath = join(destDir, relativePath);

				try {
					await mkdir(dirname(destPath), { recursive: true });
				} catch (err) {
					const error = err instanceof Error ? err : new Error(String(err));
					fail(error);
					return;
				}

				const chunks: Buffer[] = [];
				stream.on("data", (chunk: Buffer) => chunks.push(chunk));
				stream.on("error", (err) => {
					fail(err instanceof Error ? err : new Error(String(err)));
				});
				stream.on("end", () => {
					Bun.write(destPath, Buffer.concat(chunks))
						.then(() => {
							if (!failed) {
								next();
							}
						})
						.catch((err) => {
							const error = err instanceof Error ? err : new Error(String(err));
							fail(new Error(`Failed to write ${destPath}: ${error.message}`));
						});
				});
				stream.resume();
			} else {
				stream.resume();
				next();
			}
		});

		extractor.on("finish", () => {
			if (!failed) {
				resolve();
			}
		});
		extractor.on("error", (err) => {
			fail(err instanceof Error ? err : new Error(String(err)));
		});

		createReadStream(tarballPath).pipe(createGunzip()).pipe(extractor);
	});
}
