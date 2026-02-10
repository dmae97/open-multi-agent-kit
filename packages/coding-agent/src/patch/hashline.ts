/**
 * Hashline edit mode — a line-addressable edit format using content hashes.
 *
 * Each line in a file is identified by its 1-indexed line number and a 4-character
 * hex hash derived from the line content and the line number (xxHash64 with the
 * line number as seed, truncated to 4 hex chars).
 * The combined `LINE:HASH` reference acts as both an address and a staleness check:
 * if the file has changed since the caller last read it, hash mismatches are caught
 * before any mutation occurs.
 *
 * Displayed format: `LINENUM:HASH| CONTENT`
 * Reference format: `"LINENUM:HASH"` (e.g. `"5:a3f2"`)
 */

import type { HashlineEdit, HashMismatch } from "./types";

// ═══════════════════════════════════════════════════════════════════════════
// Source Spec Parsing
// ═══════════════════════════════════════════════════════════════════════════

/** Parsed representation of a `HashlineEdit.src` field. */
type SrcSpec =
	| { kind: "single"; ref: { line: number; hash: string } }
	| { kind: "range"; start: { line: number; hash: string }; end: { line: number; hash: string } }
	| { kind: "insertAfter"; after: { line: number; hash: string } }
	| { kind: "insertBefore"; before: { line: number; hash: string } };

/**
 * Parse a `HashlineEdit.src` string into a structured spec.
 *
 * Accepted forms:
 * - `"5:ab"` — single line reference
 * - `"5:ab..9:ef"` — inclusive range
 * - `"5:ab.."` — insert-after marker
 * - `"..5:ab"` — insert-before marker
 *
 * @throws Error on embedded newlines, commas, or invalid refs
 */
function parseSrc(src: string): SrcSpec {
	if (src.includes("\n")) {
		throw new Error(`src must not contain newlines: "${src}"`);
	}
	if (src.includes(",")) {
		throw new Error(`src must not contain commas: "${src}"`);
	}

	if (src.startsWith("..")) {
		if (src.indexOf("..", 2) !== -1) {
			throw new Error(`Invalid src "${src}": insert-before form must be exactly "..LINE:HASH"`);
		}
		return { kind: "insertBefore", before: parseLineRef(src.slice(2)) };
	}

	const dotIdx = src.indexOf("..");
	if (dotIdx !== -1) {
		const lhs = src.slice(0, dotIdx);
		const rhs = src.slice(dotIdx + 2);
		if (rhs === "") {
			return { kind: "insertAfter", after: parseLineRef(lhs) };
		}
		return { kind: "range", start: parseLineRef(lhs), end: parseLineRef(rhs) };
	}

	return { kind: "single", ref: parseLineRef(src) };
}

/** Split dst into lines; empty string means delete (no lines). */
function splitDstLines(dst: string): string[] {
	return dst === "" ? [] : dst.split("\n");
}

/** Pattern matching hashline display format: `LINE:HASH| CONTENT` */
const HASHLINE_PREFIX_RE = /^\d+:[0-9a-fA-F]{1,16}\| /;

/** Pattern matching a unified-diff `+` prefix (but not `++`) */
const DIFF_PLUS_RE = /^\+(?!\+)/;

/**
 * Compare two strings ignoring all whitespace differences.
 *
 * Returns true when the non-whitespace characters are identical — meaning
 * the only differences are in spaces, tabs, or other whitespace.
 */
function equalsIgnoringWhitespace(a: string, b: string): boolean {
	// Fast path: identical strings
	if (a === b) return true;
	// Compare with all whitespace removed
	return a.replace(/\s+/g, "") === b.replace(/\s+/g, "");
}

function stripAllWhitespace(s: string): string {
	return s.replace(/\s+/g, "");
}

/**
 * For replace edits (N old → N new), preserve original content on lines where
 * the only difference is whitespace.
 *
 * Models frequently reformat code (e.g., removing spaces inside import braces)
 * when making targeted edits. This detects lines that changed only in
 * whitespace and keeps the original, preventing spurious formatting diffs.
 */
function preserveWhitespaceOnlyLines(oldLines: string[], newLines: string[]): string[] {
	if (oldLines.length !== newLines.length) return newLines;
	let anyPreserved = false;
	const result = new Array<string>(newLines.length);
	for (let i = 0; i < newLines.length; i++) {
		if (oldLines[i] !== newLines[i] && equalsIgnoringWhitespace(oldLines[i], newLines[i])) {
			result[i] = oldLines[i];
			anyPreserved = true;
		} else {
			result[i] = newLines[i];
		}
	}
	return anyPreserved ? result : newLines;
}

/**
 * A weaker variant of {@link preserveWhitespaceOnlyLines} that can preserve
 * whitespace even when the replacement line counts don't match.
 */
function preserveWhitespaceOnlyLinesLoose(oldLines: string[], newLines: string[]): string[] {
	const canonToOld = new Map<string, string[]>();
	for (const oldLine of oldLines) {
		const canon = stripAllWhitespace(oldLine);
		const bucket = canonToOld.get(canon);
		if (bucket) bucket.push(oldLine);
		else canonToOld.set(canon, [oldLine]);
	}

	let anyPreserved = false;
	const result = new Array<string>(newLines.length);
	for (let i = 0; i < newLines.length; i++) {
		const newLine = newLines[i];
		const bucket = canonToOld.get(stripAllWhitespace(newLine));
		if (bucket) {
			const oldLine = bucket.find(l => l !== newLine && equalsIgnoringWhitespace(l, newLine));
			if (oldLine) {
				result[i] = oldLine;
				anyPreserved = true;
				continue;
			}
		}
		result[i] = newLine;
	}
	return anyPreserved ? result : newLines;
}

function stripInsertAnchorEchoAfter(anchorLine: string, dstLines: string[]): string[] {
	if (dstLines.length <= 1) return dstLines;
	if (equalsIgnoringWhitespace(dstLines[0], anchorLine)) {
		return dstLines.slice(1);
	}
	return dstLines;
}

function stripInsertAnchorEchoBefore(anchorLine: string, dstLines: string[]): string[] {
	if (dstLines.length <= 1) return dstLines;
	if (equalsIgnoringWhitespace(dstLines[dstLines.length - 1], anchorLine)) {
		return dstLines.slice(0, -1);
	}
	return dstLines;
}

function stripRangeBoundaryEcho(fileLines: string[], startLine: number, endLine: number, dstLines: string[]): string[] {
	// Only strip when the model replaced with multiple lines and grew the edit.
	// This avoids turning a single-line replacement into a deletion.
	const count = endLine - startLine + 1;
	if (dstLines.length <= 1 || dstLines.length <= count) return dstLines;

	let out = dstLines;
	const beforeIdx = startLine - 2;
	if (beforeIdx >= 0 && equalsIgnoringWhitespace(out[0], fileLines[beforeIdx])) {
		out = out.slice(1);
	}

	const afterIdx = endLine;
	if (
		afterIdx < fileLines.length &&
		out.length > 0 &&
		equalsIgnoringWhitespace(out[out.length - 1], fileLines[afterIdx])
	) {
		out = out.slice(0, -1);
	}

	return out;
}

/**
 * Strip hashline display prefixes and diff `+` markers from replacement lines.
 *
 * Models frequently copy the `LINE:HASH| ` prefix from read output into their
 * replacement content, or include unified-diff `+` prefixes. Both corrupt the
 * output file. This strips them heuristically before application.
 */
function stripNewLinePrefixes(lines: string[]): string[] {
	// Detect whether the *majority* of non-empty lines carry a prefix —
	// if only one line out of many has a match it's likely real content.
	let hashPrefixCount = 0;
	let diffPlusCount = 0;
	let nonEmpty = 0;
	for (const l of lines) {
		if (l.length === 0) continue;
		nonEmpty++;
		if (HASHLINE_PREFIX_RE.test(l)) hashPrefixCount++;
		if (DIFF_PLUS_RE.test(l)) diffPlusCount++;
	}
	if (nonEmpty === 0) return lines;

	const stripHash = hashPrefixCount > 0 && hashPrefixCount >= nonEmpty * 0.5;
	const stripPlus = !stripHash && diffPlusCount > 0 && diffPlusCount >= nonEmpty * 0.5;

	if (!stripHash && !stripPlus) return lines;

	return lines.map(l => {
		if (stripHash) return l.replace(HASHLINE_PREFIX_RE, "");
		if (stripPlus) return l.replace(DIFF_PLUS_RE, "");
		return l;
	});
}

const HASH_LEN = 2;
const HASH_MASK = BigInt((1 << (HASH_LEN * 4)) - 1);

const HEX_DICT = Array.from({ length: Number(HASH_MASK) + 1 }, (_, i) => i.toString(16).padStart(HASH_LEN, "0"));

/**
 * Compute the 4-character hex hash of a single line.
 *
 * Uses xxHash64 truncated to the first 4 hex characters.
 * The line number is included as a seed so the same content on different lines
 * produces different hashes.
 * The line input should not include a trailing newline.
 */
export function computeLineHash(idx: number, line: string): string {
	if (line.endsWith("\r")) {
		line = line.slice(0, -1);
	}
	return HEX_DICT[Number(Bun.hash.xxHash64(line, BigInt(idx)) & HASH_MASK)];
}

/**
 * Format file content with hashline prefixes for display.
 *
 * Each line becomes `LINENUM:HASH| CONTENT` where LINENUM is 1-indexed.
 *
 * @param content - Raw file content string
 * @param startLine - First line number (1-indexed, defaults to 1)
 * @returns Formatted string with one hashline-prefixed line per input line
 *
 * @example
 * ```
 * formatHashLines("function hi() {\n  return;\n}")
 * // "1:a3f2| function hi() {\n2:b1c0|   return;\n3:de45| }"
 * ```
 */
export function formatHashLines(content: string, startLine = 1): string {
	const lines = content.split("\n");
	return lines
		.map((line, i) => {
			const num = startLine + i;
			const hash = computeLineHash(num, line);
			return `${num}:${hash}| ${line}`;
		})
		.join("\n");
}

/**
 * Parse a line reference string like `"5:abcd"` into structured form.
 *
 * @throws Error if the format is invalid (not `NUMBER:HEXHASH`)
 */
export function parseLineRef(ref: string): { line: number; hash: string } {
	// Strip display-format suffix: "5:ab| some content" → "5:ab"
	// Models often copy the full display format from read output.
	const cleaned = ref.replace(/\|.*$/, "").trim();
	const match = cleaned.match(/^(\d+):([0-9a-fA-F]{1,16})$/);
	if (!match) {
		throw new Error(`Invalid line reference "${ref}". Expected format "LINE:HASH" (e.g. "5:a3f2").`);
	}
	const line = Number.parseInt(match[1], 10);
	if (line < 1) {
		throw new Error(`Line number must be >= 1, got ${line} in "${ref}".`);
	}
	return { line, hash: match[2] };
}

// ═══════════════════════════════════════════════════════════════════════════
// Hash Mismatch Error
// ═══════════════════════════════════════════════════════════════════════════

/** Number of context lines shown above/below each mismatched line */
const MISMATCH_CONTEXT = 2;

/**
 * Error thrown when one or more hashline references have stale hashes.
 *
 * Displays grep-style output with `>>>` markers on mismatched lines,
 * showing the correct `LINE:HASH` so the caller can fix all refs at once.
 */
export class HashlineMismatchError extends Error {
	constructor(
		public readonly mismatches: HashMismatch[],
		public readonly fileLines: string[],
	) {
		super(HashlineMismatchError.formatMessage(mismatches, fileLines));
		this.name = "HashlineMismatchError";
	}

	static formatMessage(mismatches: HashMismatch[], fileLines: string[]): string {
		const mismatchSet = new Map<number, HashMismatch>();
		for (const m of mismatches) {
			mismatchSet.set(m.line, m);
		}

		// Collect line ranges to display (mismatch lines + context)
		const displayLines = new Set<number>();
		for (const m of mismatches) {
			const lo = Math.max(1, m.line - MISMATCH_CONTEXT);
			const hi = Math.min(fileLines.length, m.line + MISMATCH_CONTEXT);
			for (let i = lo; i <= hi; i++) {
				displayLines.add(i);
			}
		}

		const sorted = [...displayLines].sort((a, b) => a - b);
		const lines: string[] = [];

		lines.push(
			`${mismatches.length} line${mismatches.length > 1 ? "s have" : " has"} changed since last read. Re-read the file.`,
		);
		lines.push("");

		let prevLine = -1;
		for (const lineNum of sorted) {
			// Gap separator between non-contiguous regions
			if (prevLine !== -1 && lineNum > prevLine + 1) {
				lines.push("    ...");
			}
			prevLine = lineNum;

			const content = fileLines[lineNum - 1];
			const hash = computeLineHash(lineNum, content);
			const prefix = `${lineNum}:${hash}`;

			if (mismatchSet.has(lineNum)) {
				lines.push(`>>> ${prefix}| ${content}`);
			} else {
				lines.push(`    ${prefix}| ${content}`);
			}
		}

		return lines.join("\n");
	}
}

/**
 * Validate that a line reference points to an existing line with a matching hash.
 *
 * @param ref - Parsed line reference (1-indexed line number + expected hash)
 * @param fileLines - Array of file lines (0-indexed)
 * @throws HashlineMismatchError if the hash doesn't match (includes correct hashes in context)
 * @throws Error if the line is out of range
 */
export function validateLineRef(ref: { line: number; hash: string }, fileLines: string[]): void {
	if (ref.line < 1 || ref.line > fileLines.length) {
		throw new Error(`Line ${ref.line} does not exist (file has ${fileLines.length} lines)`);
	}
	const actualHash = computeLineHash(ref.line, fileLines[ref.line - 1]);
	if (actualHash !== ref.hash.toLowerCase()) {
		throw new HashlineMismatchError([{ line: ref.line, expected: ref.hash, actual: actualHash }], fileLines);
	}
}

// ═══════════════════════════════════════════════════════════════════════════
// Edit Application
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Apply an array of hashline edits to file content.
 *
 * Each edit's `src` field is parsed as one of:
 * - `"5:ab"` — replace exactly that line
 * - `"5:ab..9:ef"` — replace/delete the inclusive range
 * - `"5:ab.."` — insert after line 5 (line 5 unchanged)
 * - `"..5:ab"` — insert before line 5 (line 5 unchanged)
 *
 * Edits are sorted bottom-up (highest effective line first) so earlier
 * splices don't invalidate later line numbers.
 *
 * @returns The modified content and the 1-indexed first changed line number
 */
export function applyHashlineEdits(
	content: string,
	edits: HashlineEdit[],
): { content: string; firstChangedLine: number | undefined } {
	if (edits.length === 0) {
		return { content, firstChangedLine: undefined };
	}

	const fileLines = content.split("\n");
	let firstChangedLine: number | undefined;

	// Parse src specs and dst lines up front
	const parsed = edits.map(e => ({
		spec: parseSrc(e.src),
		dstLines: stripNewLinePrefixes(splitDstLines(e.dst)),
	}));

	// Pre-validate: collect all hash mismatches before mutating
	const mismatches: HashMismatch[] = [];

	for (const { spec, dstLines } of parsed) {
		const refsToValidate: { line: number; hash: string }[] = [];
		switch (spec.kind) {
			case "single":
				refsToValidate.push(spec.ref);
				break;
			case "range":
				if (spec.start.line > spec.end.line) {
					throw new Error(`Range start line ${spec.start.line} must be <= end line ${spec.end.line}`);
				}
				refsToValidate.push(spec.start, spec.end);
				break;
			case "insertAfter":
				if (dstLines.length === 0) {
					throw new Error('Insert-after edit (src "N:HH..") requires non-empty dst');
				}
				refsToValidate.push(spec.after);
				break;
			case "insertBefore":
				if (dstLines.length === 0) {
					throw new Error('Insert-before edit (src "..N:HH") requires non-empty dst');
				}
				refsToValidate.push(spec.before);
				break;
		}

		for (const ref of refsToValidate) {
			if (ref.line < 1 || ref.line > fileLines.length) {
				throw new Error(`Line ${ref.line} does not exist (file has ${fileLines.length} lines)`);
			}
			const actualHash = computeLineHash(ref.line, fileLines[ref.line - 1]);
			if (actualHash !== ref.hash.toLowerCase()) {
				mismatches.push({ line: ref.line, expected: ref.hash, actual: actualHash });
			}
		}
	}

	if (mismatches.length > 0) {
		throw new HashlineMismatchError(mismatches, fileLines);
	}

	// Compute sort key (descending) — bottom-up application
	const annotated = parsed.map((p, idx) => {
		let sortLine: number;
		let precedence: number;
		switch (p.spec.kind) {
			case "single":
				sortLine = p.spec.ref.line;
				precedence = 0;
				break;
			case "range":
				sortLine = p.spec.end.line;
				precedence = 0;
				break;
			case "insertAfter":
				sortLine = p.spec.after.line;
				precedence = 1;
				break;
			case "insertBefore":
				sortLine = p.spec.before.line;
				precedence = 2;
				break;
		}
		return { ...p, idx, sortLine, precedence };
	});

	annotated.sort((a, b) => b.sortLine - a.sortLine || a.precedence - b.precedence || a.idx - b.idx);

	// Apply edits bottom-up
	for (const { spec, dstLines } of annotated) {
		switch (spec.kind) {
			case "single": {
				const count = 1;
				const origLines = fileLines.slice(spec.ref.line - 1, spec.ref.line);
				const stripped = stripRangeBoundaryEcho(fileLines, spec.ref.line, spec.ref.line, dstLines);
				const preserved =
					stripped.length === count
						? preserveWhitespaceOnlyLines(origLines, stripped)
						: preserveWhitespaceOnlyLinesLoose(origLines, stripped);
				const newLines = preserved;
				fileLines.splice(spec.ref.line - 1, count, ...newLines);
				trackFirstChanged(spec.ref.line);
				break;
			}
			case "range": {
				const count = spec.end.line - spec.start.line + 1;
				const origLines = fileLines.slice(spec.start.line - 1, spec.start.line - 1 + count);
				const stripped = stripRangeBoundaryEcho(fileLines, spec.start.line, spec.end.line, dstLines);
				const preserved =
					stripped.length === count
						? preserveWhitespaceOnlyLines(origLines, stripped)
						: preserveWhitespaceOnlyLinesLoose(origLines, stripped);
				const newLines = preserved;
				fileLines.splice(spec.start.line - 1, count, ...newLines);
				trackFirstChanged(spec.start.line);
				break;
			}
			case "insertAfter": {
				const anchorLine = fileLines[spec.after.line - 1];
				const inserted = stripInsertAnchorEchoAfter(anchorLine, dstLines);
				fileLines.splice(spec.after.line, 0, ...inserted);
				trackFirstChanged(spec.after.line + 1);
				break;
			}
			case "insertBefore": {
				const anchorLine = fileLines[spec.before.line - 1];
				const inserted = stripInsertAnchorEchoBefore(anchorLine, dstLines);
				fileLines.splice(spec.before.line - 1, 0, ...inserted);
				trackFirstChanged(spec.before.line);
				break;
			}
		}
	}

	return {
		content: fileLines.join("\n"),
		firstChangedLine,
	};

	function trackFirstChanged(line: number): void {
		if (firstChangedLine === undefined || line < firstChangedLine) {
			firstChangedLine = line;
		}
	}
}
