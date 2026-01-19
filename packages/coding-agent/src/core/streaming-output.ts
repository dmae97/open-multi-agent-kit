import { tmpdir } from "node:os";
import { join } from "node:path";
import { nanoid } from "nanoid";
import stripAnsi from "strip-ansi";
import { truncateTail } from "./tools/truncate";

/**
 * Sanitize binary output for display/storage.
 * Removes characters that crash string-width or cause display issues:
 * - Control characters (except tab, newline, carriage return)
 * - Lone surrogates
 * - Unicode Format characters (crash string-width due to a bug)
 * - Characters with undefined code points
 */
export function sanitizeBinaryOutput(str: string): string {
	// Use Array.from to properly iterate over code points (not code units)
	// This handles surrogate pairs correctly and catches edge cases where
	// codePointAt() might return undefined
	return Array.from(str)
		.filter((char) => {
			// Filter out characters that cause string-width to crash
			// This includes:
			// - Unicode format characters
			// - Lone surrogates (already filtered by Array.from)
			// - Control chars except \t \n \r
			// - Characters with undefined code points

			const code = char.codePointAt(0);

			// Skip if code point is undefined (edge case with invalid strings)
			if (code === undefined) return false;

			// Allow tab, newline, carriage return
			if (code === 0x09 || code === 0x0a || code === 0x0d) return true;

			// Filter out control characters (0x00-0x1F, except 0x09, 0x0a, 0x0x0d)
			if (code <= 0x1f) return false;

			// Filter out Unicode format characters
			if (code >= 0xfff9 && code <= 0xfffb) return false;

			return true;
		})
		.join("");
}

/**
 * Sanitize text output: strip ANSI codes, remove binary garbage, normalize line endings.
 */
export function sanitizeText(text: string): string {
	return sanitizeBinaryOutput(stripAnsi(text)).replace(/\r/g, "");
}

interface OutputFileSink {
	write(data: string): number | Promise<number>;
	end(): void;
}

export function createSanitizer(): TransformStream<Uint8Array, string> {
	const decoder = new TextDecoder();
	return new TransformStream({
		transform(chunk, controller) {
			const text = sanitizeText(decoder.decode(chunk, { stream: true }));
			if (text) {
				controller.enqueue(text);
			}
		},
		flush(controller) {
			const text = sanitizeText(decoder.decode());
			if (text) {
				controller.enqueue(text);
			}
		},
	});
}

export async function pumpStream(readable: ReadableStream<Uint8Array>, writer: WritableStreamDefaultWriter<string>) {
	const reader = readable.pipeThrough(createSanitizer()).getReader();
	try {
		while (true) {
			const { done, value } = await reader.read();
			if (done) break;
			await writer.write(value);
		}
	} finally {
		reader.releaseLock();
	}
}

export interface OutputSinkDump {
	output: string;
	truncated: boolean;
	fullOutputPath?: string;
}

export class OutputSink {
	private readonly stream: WritableStream<string>;
	private readonly chunks: Array<{ text: string; bytes: number }> = [];
	private chunkBytes = 0;
	private totalBytes = 0;
	private fullOutputPath: string | undefined;
	private fullOutputStream: OutputFileSink | undefined;

	constructor(
		private readonly spillThreshold: number,
		private readonly maxBuffer: number,
		private readonly onChunk?: (text: string) => void,
	) {
		this.stream = new WritableStream<string>({
			write: (text) => {
				const bytes = Buffer.byteLength(text, "utf-8");
				this.totalBytes += bytes;

				if (this.totalBytes > this.spillThreshold && !this.fullOutputPath) {
					this.fullOutputPath = join(tmpdir(), `omp-${nanoid()}.buffer`);
					const stream = Bun.file(this.fullOutputPath).writer();
					for (const chunk of this.chunks) {
						stream.write(chunk.text);
					}
					this.fullOutputStream = stream;
				}
				this.fullOutputStream?.write(text);

				this.chunks.push({ text, bytes });
				this.chunkBytes += bytes;
				while (this.chunkBytes > this.maxBuffer && this.chunks.length > 1) {
					const removed = this.chunks.shift();
					if (removed) {
						this.chunkBytes -= removed.bytes;
					}
				}

				this.onChunk?.(text);
			},
			close: () => {
				this.fullOutputStream?.end();
			},
		});
	}

	getWriter(): WritableStreamDefaultWriter<string> {
		return this.stream.getWriter();
	}

	dump(annotation?: string): OutputSinkDump {
		if (annotation) {
			const text = `\n\n${annotation}`;
			this.chunks.push({ text, bytes: Buffer.byteLength(text, "utf-8") });
		}
		const full = this.chunks.map((chunk) => chunk.text).join("");
		const { content, truncated } = truncateTail(full);
		return { output: truncated ? content : full, truncated, fullOutputPath: this.fullOutputPath };
	}
}
