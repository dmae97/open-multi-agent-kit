import { sanitizeText } from "@oh-my-pi/pi-natives";
import type { ToolSession } from "../tools";
import { formatBytes } from "../tools/render-utils";

// =============================================================================
// Constants
// =============================================================================

export const DEFAULT_MAX_LINES = 3000;
export const DEFAULT_MAX_BYTES = 50 * 1024; // 50KB
export const DEFAULT_MAX_COLUMN = 1024; // Max chars per grep match line

// =============================================================================
// Interfaces
// =============================================================================

export interface OutputSummary {
	output: string;
	truncated: boolean;
	totalLines: number;
	totalBytes: number;
	outputLines: number;
	outputBytes: number;
	/** Artifact ID for internal URL access (artifact://<id>) when truncated */
	artifactId?: string;
}

export interface OutputSinkOptions {
	artifactPath?: string;
	artifactId?: string;
	spillThreshold?: number;
	onChunk?: (chunk: string) => void;
}

export interface TruncationResult {
	content: string;
	truncated: boolean;
	truncatedBy: "lines" | "bytes" | null;
	totalLines: number;
	totalBytes: number;
	outputLines: number;
	outputBytes: number;
	lastLinePartial: boolean;
	firstLineExceedsLimit: boolean;
	maxLines: number;
	maxBytes: number;
}

export interface TruncationOptions {
	/** Maximum number of lines (default: 3000) */
	maxLines?: number;
	/** Maximum number of bytes (default: 50KB) */
	maxBytes?: number;
}

/** Result from byte-level truncation helpers. */
export interface ByteTruncationResult {
	text: string;
	bytes: number;
}

export interface TailTruncationNoticeOptions {
	fullOutputPath?: string;
	originalContent?: string;
	suffix?: string;
}

export interface HeadTruncationNoticeOptions {
	startLine?: number;
	totalFileLines?: number;
}

// =============================================================================
// Low-level byte utilities
//
// Both use a "windowed encoding" strategy for strings: instead of encoding the
// entire input with Buffer.from(), we encode a window of at most `maxBytes`
// code units from the relevant end. Every JS code unit produces ≥1 UTF-8 byte,
// so this window is guaranteed to contain ≥ maxBytes encoded bytes (unless the
// input is shorter), avoiding O(N) encoding cost on large strings.
// =============================================================================

/** Advance past UTF-8 continuation bytes (10xxxxxx) to a leading byte. */
function findUtf8BoundaryForward(buf: Buffer, pos: number): number {
	while (pos < buf.length && (buf[pos] & 0xc0) === 0x80) pos++;
	return pos;
}

/** Retreat past UTF-8 continuation bytes to land on a leading byte. */
function findUtf8BoundaryBackward(buf: Buffer, pos: number): number {
	while (pos > 0 && (buf[pos] & 0xc0) === 0x80) pos--;
	return pos;
}

/**
 * Truncate a string/buffer to fit within a byte limit, keeping the tail.
 * Handles multi-byte UTF-8 boundaries correctly.
 */
export function truncateTailBytes(data: string | Uint8Array, maxBytes: number): ByteTruncationResult {
	if (typeof data === "string") {
		const len = Buffer.byteLength(data, "utf-8");
		if (len <= maxBytes) return { text: data, bytes: len };

		// Windowed: encode only the last `maxBytes` code units (≥ maxBytes bytes).
		const window = data.substring(Math.max(0, data.length - maxBytes));
		const buf = Buffer.from(window, "utf-8");
		const start = findUtf8BoundaryForward(buf, buf.length - maxBytes);
		const slice = buf.subarray(start);
		return { text: slice.toString("utf-8"), bytes: slice.length };
	}

	// Uint8Array / Buffer path
	if (data.length <= maxBytes) return { text: Buffer.from(data).toString("utf-8"), bytes: data.length };
	const buf = Buffer.isBuffer(data) ? data : Buffer.from(data);
	const start = findUtf8BoundaryForward(buf, buf.length - maxBytes);
	const slice = buf.subarray(start);
	return { text: slice.toString("utf-8"), bytes: slice.length };
}

/**
 * Truncate a string/buffer to fit within a byte limit, keeping the head.
 * Handles multi-byte UTF-8 boundaries correctly.
 */
export function truncateHeadBytes(data: string | Uint8Array, maxBytes: number): ByteTruncationResult {
	if (typeof data === "string") {
		const len = Buffer.byteLength(data, "utf-8");
		if (len <= maxBytes) return { text: data, bytes: len };

		// Windowed: encode only the first `maxBytes` code units.
		const window = data.substring(0, maxBytes);
		const buf = Buffer.from(window, "utf-8");
		const end = findUtf8BoundaryBackward(buf, maxBytes);
		if (end <= 0) return { text: "", bytes: 0 };
		const slice = buf.subarray(0, end);
		return { text: slice.toString("utf-8"), bytes: slice.length };
	}

	if (data.length <= maxBytes) return { text: Buffer.from(data).toString("utf-8"), bytes: data.length };
	const buf = Buffer.isBuffer(data) ? data : Buffer.from(data);
	const end = findUtf8BoundaryBackward(buf, maxBytes);
	if (end <= 0) return { text: "", bytes: 0 };
	const slice = buf.subarray(0, end);
	return { text: slice.toString("utf-8"), bytes: slice.length };
}

// =============================================================================
// Line-level utilities
// =============================================================================

/**
 * Count newline characters. Uses indexOf for V8-optimized native string scanning.
 */
function countNewlines(text: string): number {
	let count = 0;
	let pos = text.indexOf("\n", 0);
	while (pos !== -1) {
		count++;
		pos = text.indexOf("\n", pos + 1);
	}
	return count;
}

/**
 * Truncate a single line to max characters, appending '…' if truncated.
 */
export function truncateLine(
	line: string,
	maxChars: number = DEFAULT_MAX_COLUMN,
): { text: string; wasTruncated: boolean } {
	if (line.length <= maxChars) return { text: line, wasTruncated: false };
	return { text: `${line.slice(0, maxChars)}…`, wasTruncated: true };
}

// =============================================================================
// Content truncation (line + byte aware)
//
// Both truncateHead and truncateTail encode the content to a Buffer once and
// collect newline byte-offsets in a single forward pass, avoiding split("\n")
// which would allocate N intermediate strings for N lines.
// =============================================================================

/** Shared helper to build a no-truncation result. */
function noTruncResult(
	content: string,
	totalLines: number,
	totalBytes: number,
	maxLines: number,
	maxBytes: number,
): TruncationResult {
	return {
		content,
		truncated: false,
		truncatedBy: null,
		totalLines,
		totalBytes,
		outputLines: totalLines,
		outputBytes: totalBytes,
		lastLinePartial: false,
		firstLineExceedsLimit: false,
		maxLines,
		maxBytes,
	};
}

/**
 * Collect byte-offsets of every 0x0a in a Buffer. Avoids re-scanning.
 *
 * For a buffer with lines [L0 \n L1 \n L2]:
 *   nlOffsets = [offset_of_first_\n, offset_of_second_\n]
 *   Line k starts at (k === 0 ? 0 : nlOffsets[k-1] + 1)
 *   Line k ends at (k < nlOffsets.length ? nlOffsets[k] - 1 : buf.length - 1)
 */
function collectNewlineOffsets(buf: Buffer): number[] {
	const offsets: number[] = [];
	let pos = Bun.indexOfLine(buf, 0);
	while (pos !== -1) {
		offsets.push(pos);
		pos = Bun.indexOfLine(buf, pos + 1);
	}
	return offsets;
}

/**
 * Truncate content from the head (keep first N lines/bytes).
 * Suitable for file reads where you want to see the beginning.
 *
 * Uses indexOfLine to scan forward incrementally — stops as soon as the
 * line or byte limit is hit without ever collecting all newline positions.
 *
 * Never returns partial lines. If the first line exceeds the byte limit,
 * returns empty content with firstLineExceedsLimit=true.
 */
export function truncateHead(content: string, options: TruncationOptions = {}): TruncationResult {
	const maxLines = options.maxLines ?? DEFAULT_MAX_LINES;
	const maxBytes = options.maxBytes ?? DEFAULT_MAX_BYTES;
	const totalBytes = Buffer.byteLength(content, "utf-8");

	// Fast path: if under byte limit, only need a string-level newline count
	if (totalBytes <= maxBytes) {
		const totalLines = countNewlines(content) + 1;
		if (totalLines <= maxLines) {
			return noTruncResult(content, totalLines, totalBytes, maxLines, maxBytes);
		}
	}

	// Slow path: encode once, scan with native indexOfLine
	const totalLines = countNewlines(content) + 1;
	if (totalLines <= maxLines && totalBytes <= maxBytes) {
		return noTruncResult(content, totalLines, totalBytes, maxLines, maxBytes);
	}

	// Forward scan: include complete lines that fit within both limits.
	// Uses indexOfLine incrementally — no offset array needed.
	let includedLines = 0;
	let cutByte = 0;
	let truncatedBy: "lines" | "bytes" = "lines";
	let scanPos = 0;

	const buf = Buffer.from(content, "utf-8");
	while (includedLines < maxLines) {
		const nlPos = Bun.indexOfLine(buf, scanPos);
		// Byte position right after this line's trailing \n, or end-of-buffer
		const lineEnd = nlPos === -1 ? buf.length : nlPos + 1;
		// Output strips a trailing \n from the final slice; enforce limit on displayed bytes
		const outputEnd = nlPos === -1 ? lineEnd : lineEnd - 1;

		if (outputEnd > maxBytes) {
			truncatedBy = "bytes";
			if (includedLines === 0) {
				return {
					content: "",
					truncated: true,
					truncatedBy: "bytes",
					totalLines,
					totalBytes,
					outputLines: 0,
					outputBytes: 0,
					lastLinePartial: false,
					firstLineExceedsLimit: true,
					maxLines,
					maxBytes,
				};
			}
			break;
		}

		cutByte = lineEnd;
		includedLines++;

		if (nlPos === -1) break; // no more lines
		scanPos = nlPos + 1;
	}

	if (includedLines >= maxLines && cutByte <= maxBytes) {
		truncatedBy = "lines";
	}

	// Strip trailing \n so output matches join("\n") semantics
	const sliceEnd = cutByte > 0 && buf[cutByte - 1] === 0x0a ? cutByte - 1 : cutByte;
	const outputContent = buf.subarray(0, sliceEnd).toString("utf-8");

	return {
		content: outputContent,
		truncated: true,
		truncatedBy,
		totalLines,
		totalBytes,
		outputLines: includedLines,
		outputBytes: sliceEnd,
		lastLinePartial: false,
		firstLineExceedsLimit: false,
		maxLines,
		maxBytes,
	};
}

/**
 * Truncate content from the tail (keep last N lines/bytes).
 * Suitable for bash output where you want to see the end (errors, final results).
 *
 * May return a partial first line if the last line exceeds the byte limit.
 */
export function truncateTail(content: string, options: TruncationOptions = {}): TruncationResult {
	const maxLines = options.maxLines ?? DEFAULT_MAX_LINES;
	const maxBytes = options.maxBytes ?? DEFAULT_MAX_BYTES;
	const totalBytes = Buffer.byteLength(content, "utf-8");
	const totalLines = countNewlines(content) + 1;

	if (totalLines <= maxLines && totalBytes <= maxBytes) {
		return noTruncResult(content, totalLines, totalBytes, maxLines, maxBytes);
	}

	const buf = Buffer.from(content, "utf-8");
	const nlOffsets = collectNewlineOffsets(buf);
	const lineCount = nlOffsets.length + 1;

	// Walk backward, accumulating complete lines that fit.
	let includedLines = 0;
	let startByte = buf.length;
	let truncatedBy: "lines" | "bytes" = "lines";

	for (let lineIdx = lineCount - 1; lineIdx >= 0 && includedLines < maxLines; lineIdx--) {
		const lineStart = lineIdx === 0 ? 0 : nlOffsets[lineIdx - 1] + 1;
		const spanBytes = buf.length - lineStart;

		if (spanBytes > maxBytes) {
			truncatedBy = "bytes";
			if (includedLines === 0) {
				// Last line alone exceeds byte limit — take its tail
				const tailResult = truncateTailBytes(buf, maxBytes);
				return {
					content: tailResult.text,
					truncated: true,
					truncatedBy: "bytes",
					totalLines,
					totalBytes,
					outputLines: 1,
					outputBytes: tailResult.bytes,
					lastLinePartial: true,
					firstLineExceedsLimit: false,
					maxLines,
					maxBytes,
				};
			}
			break;
		}

		startByte = lineStart;
		includedLines++;
	}

	if (includedLines >= maxLines && buf.length - startByte <= maxBytes) {
		truncatedBy = "lines";
	}

	const outputBytes = buf.length - startByte;
	const outputContent = buf.subarray(startByte).toString("utf-8");

	return {
		content: outputContent,
		truncated: true,
		truncatedBy,
		totalLines,
		totalBytes,
		outputLines: includedLines,
		outputBytes,
		lastLinePartial: false,
		firstLineExceedsLimit: false,
		maxLines,
		maxBytes,
	};
}

// =============================================================================
// TailBuffer — ring-style tail buffer with lazy joining
//
// Uses windowed truncateTailBytes for trimming, so only a suffix of the
// accumulated string is ever encoded — not the entire buffer.
// =============================================================================

const MAX_PENDING = 10;

export class TailBuffer {
	#pending: string[] = [];
	#pos = 0; // tracked byte count (approximate after trims)

	constructor(readonly maxBytes: number) {}

	append(text: string): void {
		if (!text) return;
		const n = Buffer.byteLength(text, "utf-8");
		this.#pos += n;

		if (this.#pending.length > 0) {
			this.#pending.push(text);
			if (this.#pending.length > MAX_PENDING) this.#compact();
			// Trim when we exceed 2× budget to amortise cost
			if (this.#pos > this.maxBytes * 2) this.#trim();
		} else {
			this.#pending[0] = text;
			this.#pending.length = 1;
		}
	}

	text(): string {
		return this.#trim();
	}

	bytes(): number {
		return this.#pos;
	}

	// -- private ---------------------------------------------------------------

	#compact(): void {
		this.#pending[0] = this.#pending.join("");
		this.#pending.length = 1;
	}

	#flush(): string {
		if (this.#pending.length === 0) return "";
		if (this.#pending.length > 1) this.#compact();
		return this.#pending[0];
	}

	/** Trim the buffer to maxBytes using windowed tail truncation. */
	#trim(): string {
		if (this.#pos <= this.maxBytes) return this.#flush();

		const joined = this.#flush();
		const { text, bytes } = truncateTailBytes(joined, this.maxBytes);
		this.#pos = bytes;
		this.#pending[0] = text;
		this.#pending.length = 1;
		return text;
	}
}

// =============================================================================
// OutputSink — line-buffered output with file spill support
//
// Uses a string buffer with byte tracking. When the spill threshold is
// exceeded, all data is written to a file sink and the in-memory buffer is
// trimmed to a tail window via windowed truncateTailBytes.
// =============================================================================

export class OutputSink {
	#buffer = "";
	#bufferBytes = 0;
	#totalLines = 0;
	#totalBytes = 0;
	#sawData = false;
	#truncated = false;

	#file?: {
		path: string;
		artifactId?: string;
		sink: Bun.FileSink;
	};

	readonly #artifactPath?: string;
	readonly #artifactId?: string;
	readonly #spillThreshold: number;
	readonly #onChunk?: (chunk: string) => void;

	constructor(options?: OutputSinkOptions) {
		const { artifactPath, artifactId, spillThreshold = DEFAULT_MAX_BYTES, onChunk } = options ?? {};
		this.#artifactPath = artifactPath;
		this.#artifactId = artifactId;
		this.#spillThreshold = spillThreshold;
		this.#onChunk = onChunk;
	}

	async push(chunk: string): Promise<void> {
		chunk = sanitizeText(chunk);
		this.#onChunk?.(chunk);

		const dataBytes = Buffer.byteLength(chunk, "utf-8");
		this.#totalBytes += dataBytes;

		if (chunk.length > 0) {
			this.#sawData = true;
			this.#totalLines += countNewlines(chunk);
		}

		const willOverflow = this.#bufferBytes + dataBytes > this.#spillThreshold;

		// Write to file if already spilling or about to overflow
		if (this.#file != null || willOverflow) {
			const sink = await this.#ensureFileSink();
			await sink?.write(chunk);
		}

		this.#buffer += chunk;
		this.#bufferBytes += dataBytes;

		// Keep only a tail window in memory when overflowing
		if (willOverflow) {
			this.#truncated = true;
			const { text, bytes } = truncateTailBytes(this.#buffer, this.#spillThreshold);
			this.#buffer = text;
			this.#bufferBytes = bytes;
		}

		if (this.#file) this.#truncated = true;
	}

	createInput(): WritableStream<Uint8Array | string> {
		const dec = new TextDecoder("utf-8", { ignoreBOM: true });
		const finalize = async () => {
			await this.push(dec.decode());
		};
		return new WritableStream({
			write: async chunk => {
				await this.push(typeof chunk === "string" ? chunk : dec.decode(chunk, { stream: true }));
			},
			close: finalize,
			abort: finalize,
		});
	}

	async dump(notice?: string): Promise<OutputSummary> {
		const noticeLine = notice ? `[${notice}]\n` : "";
		const outputLines = this.#buffer.length > 0 ? countNewlines(this.#buffer) + 1 : 0;
		const totalLines = this.#sawData ? this.#totalLines + 1 : 0;

		if (this.#file) await this.#file.sink.end();

		return {
			output: `${noticeLine}${this.#buffer}`,
			truncated: this.#truncated,
			totalLines,
			totalBytes: this.#totalBytes,
			outputLines,
			outputBytes: this.#bufferBytes,
			artifactId: this.#file?.artifactId,
		};
	}

	// -- private ---------------------------------------------------------------

	async #ensureFileSink(): Promise<Bun.FileSink | null> {
		if (!this.#artifactPath) return null;
		if (this.#file) return this.#file.sink;

		try {
			const sink = Bun.file(this.#artifactPath).writer();
			this.#file = { path: this.#artifactPath, artifactId: this.#artifactId, sink };
			// Flush existing buffer to file BEFORE it gets trimmed
			await sink.write(this.#buffer);
			return sink;
		} catch {
			try {
				await this.#file?.sink?.end();
			} catch {
				/* ignore */
			}
			this.#file = undefined;
			return null;
		}
	}
}

// =============================================================================
// Session helpers
// =============================================================================

const kEmpty = Object.freeze({} as { id?: string; path?: string });

/** Allocate a new artifact path and ID without writing content. */
export async function allocateOutputArtifact(session: ToolSession, toolType: string) {
	const manager = session.getArtifactManager?.();
	if (!manager) return kEmpty;

	try {
		return await manager.allocatePath(toolType);
	} catch {
		return kEmpty;
	}
}

// =============================================================================
// Truncation notice formatting
// =============================================================================

/**
 * Format a truncation notice for tail-truncated output (bash, python, ssh).
 * Returns empty string if not truncated.
 */
export function formatTailTruncationNotice(
	truncation: TruncationResult,
	options: TailTruncationNoticeOptions = {},
): string {
	if (!truncation.truncated) return "";

	const { fullOutputPath, originalContent, suffix = "" } = options;
	const startLine = truncation.totalLines - truncation.outputLines + 1;
	const endLine = truncation.totalLines;
	const fullOutputPart = fullOutputPath ? `. Full output: ${fullOutputPath}` : "";

	let notice: string;
	if (truncation.lastLinePartial) {
		let lastLineSizePart = "";
		if (originalContent) {
			const lastNl = originalContent.lastIndexOf("\n");
			const lastLine = lastNl === -1 ? originalContent : originalContent.substring(lastNl + 1);
			lastLineSizePart = ` (line is ${formatBytes(Buffer.byteLength(lastLine, "utf-8"))})`;
		}
		notice = `[Showing last ${formatBytes(truncation.outputBytes)} of line ${endLine}${lastLineSizePart}${fullOutputPart}${suffix}]`;
	} else if (truncation.truncatedBy === "lines") {
		notice = `[Showing lines ${startLine}-${endLine} of ${truncation.totalLines}${fullOutputPart}${suffix}]`;
	} else {
		notice = `[Showing lines ${startLine}-${endLine} of ${truncation.totalLines} (${formatBytes(truncation.maxBytes)} limit)${fullOutputPart}${suffix}]`;
	}

	return `\n\n${notice}`;
}

/**
 * Format a truncation notice for head-truncated output (read tool).
 * Returns empty string if not truncated.
 */
export function formatHeadTruncationNotice(
	truncation: TruncationResult,
	options: HeadTruncationNoticeOptions = {},
): string {
	if (!truncation.truncated) return "";

	const startLineDisplay = options.startLine ?? 1;
	const totalFileLines = options.totalFileLines ?? truncation.totalLines;
	const endLineDisplay = startLineDisplay + truncation.outputLines - 1;
	const nextOffset = endLineDisplay + 1;

	const notice =
		truncation.truncatedBy === "lines"
			? `[Showing lines ${startLineDisplay}-${endLineDisplay} of ${totalFileLines}. Use offset=${nextOffset} to continue]`
			: `[Showing lines ${startLineDisplay}-${endLineDisplay} of ${totalFileLines} (${formatBytes(truncation.maxBytes)} limit). Use offset=${nextOffset} to continue]`;

	return `\n\n${notice}`;
}
