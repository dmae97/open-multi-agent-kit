import { parse } from "yaml";
import type { ExecutionEnv, FileInfo, PromptTemplate } from "./types.js";

interface PromptTemplateFrontmatter {
	description?: string;
	"argument-hint"?: string;
	[key: string]: unknown;
}

export async function loadPromptTemplates(env: ExecutionEnv, paths: string | string[]): Promise<PromptTemplate[]> {
	const templates: PromptTemplate[] = [];
	for (const path of Array.isArray(paths) ? paths : [paths]) {
		const info = await safeFileInfo(env, path);
		if (!info) continue;
		const kind = await resolveKind(env, info);
		if (kind === "directory") {
			templates.push(...(await loadTemplatesFromDir(env, info.path)));
		} else if (kind === "file" && info.name.endsWith(".md")) {
			const template = await loadTemplateFromFile(env, info.path);
			if (template) templates.push(template);
		}
	}
	return templates;
}

async function loadTemplatesFromDir(env: ExecutionEnv, dir: string): Promise<PromptTemplate[]> {
	const templates: PromptTemplate[] = [];
	let entries: FileInfo[];
	try {
		entries = await env.listDir(dir);
	} catch {
		return templates;
	}

	for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
		const kind = await resolveKind(env, entry);
		if (kind !== "file" || !entry.name.endsWith(".md")) continue;
		const template = await loadTemplateFromFile(env, entry.path);
		if (template) templates.push(template);
	}
	return templates;
}

async function loadTemplateFromFile(env: ExecutionEnv, filePath: string): Promise<PromptTemplate | null> {
	try {
		const rawContent = await env.readTextFile(filePath);
		const { frontmatter, body } = parseFrontmatter<PromptTemplateFrontmatter>(rawContent);
		const firstLine = body.split("\n").find((line) => line.trim());
		let description = typeof frontmatter.description === "string" ? frontmatter.description : "";
		if (!description && firstLine) {
			description = firstLine.slice(0, 60);
			if (firstLine.length > 60) description += "...";
		}
		return {
			name: basenameEnvPath(filePath).replace(/\.md$/i, ""),
			description,
			content: body,
		};
	} catch {
		return null;
	}
}

async function safeFileInfo(env: ExecutionEnv, path: string): Promise<FileInfo | undefined> {
	try {
		return await env.fileInfo(path);
	} catch {
		return undefined;
	}
}

async function resolveKind(env: ExecutionEnv, info: FileInfo): Promise<"file" | "directory" | undefined> {
	if (info.kind === "file" || info.kind === "directory") return info.kind;
	try {
		const realPath = await env.realPath(info.path);
		const target = await env.fileInfo(realPath);
		return target.kind === "file" || target.kind === "directory" ? target.kind : undefined;
	} catch {
		return undefined;
	}
}

function parseFrontmatter<T extends Record<string, unknown>>(content: string): { frontmatter: T; body: string } {
	const normalized = content.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
	if (!normalized.startsWith("---")) return { frontmatter: {} as T, body: normalized };
	const endIndex = normalized.indexOf("\n---", 3);
	if (endIndex === -1) return { frontmatter: {} as T, body: normalized };
	const yamlString = normalized.slice(4, endIndex);
	const body = normalized.slice(endIndex + 4).trim();
	return { frontmatter: (parse(yamlString) ?? {}) as T, body };
}

function basenameEnvPath(path: string): string {
	const normalized = path.replace(/\/+$/, "");
	const slashIndex = normalized.lastIndexOf("/");
	return slashIndex === -1 ? normalized : normalized.slice(slashIndex + 1);
}

export function parseCommandArgs(argsString: string): string[] {
	const args: string[] = [];
	let current = "";
	let inQuote: string | null = null;

	for (let i = 0; i < argsString.length; i++) {
		const char = argsString[i]!;
		if (inQuote) {
			if (char === inQuote) inQuote = null;
			else current += char;
		} else if (char === '"' || char === "'") {
			inQuote = char;
		} else if (char === " " || char === "\t") {
			if (current) {
				args.push(current);
				current = "";
			}
		} else {
			current += char;
		}
	}
	if (current) args.push(current);
	return args;
}

export function substituteArgs(content: string, args: string[]): string {
	let result = content;
	result = result.replace(/\$(\d+)/g, (_, num: string) => args[parseInt(num, 10) - 1] ?? "");
	result = result.replace(/\$\{@:(\d+)(?::(\d+))?\}/g, (_, startStr: string, lengthStr?: string) => {
		let start = parseInt(startStr, 10) - 1;
		if (start < 0) start = 0;
		if (lengthStr) return args.slice(start, start + parseInt(lengthStr, 10)).join(" ");
		return args.slice(start).join(" ");
	});
	const allArgs = args.join(" ");
	result = result.replace(/\$ARGUMENTS/g, allArgs);
	result = result.replace(/\$@/g, allArgs);
	return result;
}

export function expandPromptTemplate(text: string, templates: PromptTemplate[]): string {
	if (!text.startsWith("/")) return text;
	const spaceIndex = text.indexOf(" ");
	const commandName = spaceIndex === -1 ? text.slice(1) : text.slice(1, spaceIndex);
	const argsString = spaceIndex === -1 ? "" : text.slice(spaceIndex + 1);
	const template = templates.find((candidate) => candidate.name === commandName);
	if (!template) return text;
	return substituteArgs(template.content, parseCommandArgs(argsString));
}
