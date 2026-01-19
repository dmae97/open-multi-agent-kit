import { tmpdir } from "node:os";
import { join } from "node:path";
import { nanoid } from "nanoid";
import stripAnsi from "strip-ansi";
import { sanitizeBinaryOutput } from "../utils/shell";
import { truncateTail } from "./tools/truncate";

interface OutputFileSink {
	write(data: string): number | Promise<number>;
	end(): void;
}

export function createSanitizer(): TransformStream<Uint8Array, string> {
	const decoder = new TextDecoder();
	const sanitizeText = (text: string) => sanitizeBinaryOutput(stripAnsi(text)).replace(/\r/g, "");
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
