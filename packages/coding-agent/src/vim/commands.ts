import type { VimExCommand, VimLineRange } from "./types";
import { VimInputError } from "./types";

function parseLineRange(raw: string): { range?: VimLineRange | "all"; rest: string } {
	if (raw.startsWith("%")) {
		return { range: "all", rest: raw.slice(1).trimStart() };
	}

	const match = raw.match(/^(\d+)(?:\s*,\s*(\d+))?/);
	if (!match) {
		return { rest: raw };
	}

	const start = Number.parseInt(match[1] ?? "", 10);
	const end = Number.parseInt(match[2] ?? match[1] ?? "", 10);
	return {
		range: { start, end },
		rest: raw.slice(match[0].length).trimStart(),
	};
}

function parseDelimitedSegments(raw: string): { pattern: string; replacement: string; flags: string } {
	if (raw.length === 0) {
		throw new VimInputError("Missing substitute delimiter");
	}

	const delimiter = raw[0] ?? "/";
	const segments: string[] = [];
	let current = "";
	let escaped = false;

	for (let index = 1; index < raw.length; index += 1) {
		const char = raw[index] ?? "";
		if (escaped) {
			current += char;
			escaped = false;
			continue;
		}
		if (char === "\\") {
			escaped = true;
			current += char;
			continue;
		}
		if (char === delimiter && segments.length < 2) {
			segments.push(current);
			current = "";
			continue;
		}
		current += char;
	}

	if (segments.length !== 2) {
		throw new VimInputError("Substitute command must look like :s/pattern/replacement/flags");
	}

	return {
		pattern: segments[0] ?? "",
		replacement: segments[1] ?? "",
		flags: current.trim(),
	};
}

export function parseExCommand(input: string): VimExCommand {
	const trimmed = input.trim();
	if (trimmed.length === 0) {
		throw new VimInputError("Empty ex command");
	}

	if (/^\d+$/.test(trimmed)) {
		return {
			kind: "goto-line",
			line: Number.parseInt(trimmed, 10),
		};
	}

	if (trimmed === "w") {
		return { kind: "write", force: false };
	}
	if (trimmed === "w!") {
		return { kind: "write", force: true };
	}
	if (trimmed === "wq") {
		return { kind: "write-quit", force: false };
	}
	if (trimmed === "wq!") {
		return { kind: "write-quit", force: true };
	}
	if (trimmed === "q") {
		return { kind: "quit", force: false };
	}
	if (trimmed === "q!") {
		return { kind: "quit", force: true };
	}
	if (trimmed === "e") {
		return { kind: "edit", force: false };
	}
	if (trimmed === "e!") {
		return { kind: "edit", force: true };
	}
	if (trimmed.startsWith("e ")) {
		return { kind: "edit", force: false, path: trimmed.slice(2).trim() };
	}
	if (trimmed.startsWith("e! ")) {
		return { kind: "edit", force: true, path: trimmed.slice(3).trim() };
	}

	const { range, rest } = parseLineRange(trimmed);
	if (range && rest.length === 0) {
		if (range === "all") {
			throw new VimInputError(":% requires a following command");
		}
		return {
			kind: "goto-line",
			line: range.start,
		};
	}

	if (rest.startsWith("s")) {
		const segments = parseDelimitedSegments(rest.slice(1));
		return {
			kind: "substitute",
			range,
			pattern: segments.pattern,
			replacement: segments.replacement,
			flags: segments.flags,
		};
	}

	if (rest === "d" || rest.startsWith("d ")) {
		return {
			kind: "delete",
			range,
		};
	}

	throw new VimInputError(`Unsupported ex command: ${input}`);
}
