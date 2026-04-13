import type { AgentTool, AgentToolContext, AgentToolResult, AgentToolUpdateCallback } from "@oh-my-pi/pi-agent-core";
import type { Component } from "@oh-my-pi/pi-tui";
import { Text } from "@oh-my-pi/pi-tui";
import { isEnoent, prompt, untilAborted } from "@oh-my-pi/pi-utils";
import { type Static, Type } from "@sinclair/typebox";
import * as Diff from "diff";
import type { RenderResultOptions } from "../extensibility/custom-tools/types";
import { createLspWritethrough, type FileDiagnosticsResult, type WritethroughCallback, writethroughNoop } from "../lsp";
import { getLanguageFromPath, highlightCode, type Theme } from "../modes/theme/theme";
import vimDescription from "../prompts/tools/vim.md" with { type: "text" };
import { CachedOutputBlock } from "../tui/output-block";
import { renderStatusLine } from "../tui/status-line";
import { VimBuffer } from "../vim/buffer";
import { VimEngine, type VimEngineCallbacks, type VimSaveResult } from "../vim/engine";
import { parseKeySequences } from "../vim/parser";
import {
	buildDetails,
	computeViewport,
	renderVimDetails,
	VIM_DEFAULT_VIEWPORT_LINES,
	VIM_OPEN_VIEWPORT_LINES,
} from "../vim/render";
import type { VimFingerprint, VimKeyToken, VimLoadedFile, VimToolDetails } from "../vim/types";
import { VimInputError } from "../vim/types";
import type { ToolSession } from ".";
import { parseArchivePathCandidates } from "./archive-reader";
import { assertEditableFile } from "./auto-generated-guard";
import { isReadableUrlPath } from "./fetch";
import { normalizePathLikeInput, resolveToCwd } from "./path-utils";
import { enforcePlanModeWrite } from "./plan-mode-guard";
import { formatDiagnostics, replaceTabs } from "./render-utils";
import { isSqliteFile, parseSqlitePathCandidates } from "./sqlite-reader";
import { ToolError } from "./tool-errors";
import { toolResult } from "./tool-result";

const INTERNAL_URL_PREFIX = /^(agent|artifact|skill|rule|local|mcp):\/\//;
const utf8Decoder = new TextDecoder("utf-8", { fatal: true });

const vimSchema = Type.Object({
	file: Type.String({ description: "File path to edit." }),
	kbd: Type.Optional(
		Type.Array(Type.String(), {
			description: "Vim key sequences to execute against the buffer. Null when just viewing the file.",
		}),
	),
	insert: Type.Optional(
		Type.String({
			description:
				"Raw text to type into the buffer. kbd must leave INSERT mode active first (e.g. via o, O, i, cc). Null when not inserting.",
		}),
	),
	pause: Type.Optional(
		Type.Boolean({
			description: "If true, skip auto-save and keep current mode. Null or false for normal auto-save.",
		}),
	),
});

type VimParams = Static<typeof vimSchema>;

export interface VimRenderArgs {
	file?: string;
	kbd?: string[];
	insert?: string;
	pause?: boolean;
	__partialJson?: string;
	__toolCallId?: string;
	__cwd?: string;
}

interface VimCallPreviewState {
	key: string;
	details?: VimToolDetails;
}

function fingerprintEqual(left: VimFingerprint | null, right: VimFingerprint | null): boolean {
	if (left === null || right === null) {
		return left === right;
	}
	return (
		left.exists === right.exists &&
		left.size === right.size &&
		left.mtimeMs === right.mtimeMs &&
		left.hash === right.hash
	);
}

function renderText(text: string): Component {
	return new Text(replaceTabs(text), 0, 0);
}

function serializeBufferText(buffer: Pick<VimBuffer, "getText" | "trailingNewline">): string {
	return `${buffer.getText()}${buffer.trailingNewline ? "\n" : ""}`;
}

function buildModelDiff(beforeText: string, afterText: string): string | undefined {
	if (beforeText === afterText) {
		return undefined;
	}
	const patch = Diff.structuredPatch("", "", beforeText, afterText, "", "", { context: 3 });
	const diff = patch.hunks
		.flatMap(hunk => [`@@ -${hunk.oldStart},${hunk.oldLines} +${hunk.newStart},${hunk.newLines} @@`, ...hunk.lines])
		.join("\n");
	return diff.length > 0 ? diff : undefined;
}

function splitTokensBySequence(kbd: string[]): Array<{ sequence: string; tokens: VimKeyToken[] }> {
	const groups = new Map<number, VimKeyToken[]>();
	for (const token of parseKeySequences(kbd)) {
		const group = groups.get(token.sequenceIndex);
		if (group) {
			group.push(token);
			continue;
		}
		groups.set(token.sequenceIndex, [token]);
	}
	return kbd.map((sequence, sequenceIndex) => ({ sequence, tokens: groups.get(sequenceIndex) ?? [] }));
}

async function executeKeySequences(
	engine: VimEngine,
	groups: Array<{ sequence: string; tokens: VimKeyToken[] }>,
	commandText: string,
	onStep?: () => Promise<void>,
): Promise<void> {
	for (let index = 0; index < groups.length; index += 1) {
		const group = groups[index]!;
		if (group.tokens.length === 0) {
			continue;
		}
		await engine.executeTokens(group.tokens, commandText, onStep);
		if (index < groups.length - 1 && engine.inputMode === "insert") {
			// Roll back partial changes to prevent buffer corruption across calls.
			engine.rollbackPendingInsert();
			const nextSeq = groups[index + 1]?.sequence ?? "";
			const looksLikeText = nextSeq.length > 0 && /\s/.test(nextSeq) && !/^[:/%]/.test(nextSeq);
			let hint =
				"Use the insert field for inserted text, or include <Esc> to return to NORMAL mode before the next kbd entry.";
			if (looksLikeText) {
				hint += ` The next entry (\`${nextSeq.length > 40 ? `${nextSeq.slice(0, 37)}...` : nextSeq}\`) looks like text content — put it in the \`insert\` field instead. For multi-location edits, replace the entire file: {"kbd": ["ggdGi"], "insert": "full new content"}.`;
			}
			throw new VimInputError(
				`Sequence ${index + 1} (\`${group.sequence}\`) entered INSERT mode — changes rolled back. ${hint}`,
				group.tokens[group.tokens.length - 1],
			);
		}
	}
}

// Module-level cache of the last rendered VimToolDetails so that renderCall can
// show the current buffer viewport while the LLM is still streaming tool arguments.
let lastVimDetails: VimToolDetails | undefined;
const previewEnginesByFile = new Map<string, VimEngine>();
const previewStatesByToolCall = new Map<string, VimCallPreviewState>();

function clearStoredPreviewEngine(file: string): void {
	previewEnginesByFile.delete(file);
}

function storePreviewEngine(engine: VimEngine): void {
	const snapshot = engine.clone();
	previewEnginesByFile.set(engine.buffer.displayPath, snapshot);
	previewEnginesByFile.set(engine.buffer.filePath, snapshot);
}

function buildLoadedFileFromBuffer(buffer: VimBuffer): VimLoadedFile {
	return {
		absolutePath: buffer.filePath,
		displayPath: buffer.displayPath,
		lines: [...buffer.lines],
		trailingNewline: buffer.trailingNewline,
		fingerprint: buffer.baseFingerprint ? { ...buffer.baseFingerprint } : null,
	};
}

function createPreviewCallbacks(): VimEngineCallbacks {
	return {
		beforeMutate: async () => {},
		loadBuffer: async inputPath => ({
			absolutePath: inputPath,
			displayPath: inputPath,
			lines: [""],
			trailingNewline: false,
			fingerprint: null,
		}),
		saveBuffer: async buffer => ({
			loaded: buildLoadedFileFromBuffer(buffer),
		}),
	};
}

async function loadPreviewBaseEngine(args: VimRenderArgs): Promise<VimEngine | undefined> {
	if (!args.file || !args.__cwd) {
		return undefined;
	}

	try {
		const { absolutePath, displayPath } = normalizeTargetPath(args.file, args.__cwd);
		const loaded = await readTextFile(absolutePath);
		const engine = new VimEngine(
			new VimBuffer({
				absolutePath,
				displayPath,
				lines: loaded.lines,
				trailingNewline: loaded.trailingNewline,
				fingerprint: loaded.fingerprint,
			}),
			createPreviewCallbacks(),
		);
		storePreviewEngine(engine);
		return engine;
	} catch {
		return undefined;
	}
}

function buildToolDetailsFromEngine(
	engine: VimEngine,
	viewportLines: number,
	preferredStart?: number,
	closed = false,
	errorLocation?: VimToolDetails["errorLocation"],
	statusMessage?: string,
): VimToolDetails {
	const cursorLine = engine.buffer.cursor.line + 1;
	const cursorCol = engine.buffer.cursor.col + 1;
	const viewport = computeViewport(cursorLine, engine.buffer.lineCount(), viewportLines, preferredStart);
	const details = buildDetails({
		file: engine.buffer.displayPath,
		mode: engine.getPublicMode(),
		cursor: { line: cursorLine, col: cursorCol },
		totalLines: engine.buffer.lineCount(),
		modified: engine.buffer.modified,
		lines: engine.buffer.lines,
		viewport,
		selection: engine.getSelection(),
		lastCommand: engine.lastCommand,
		statusMessage: statusMessage ?? engine.statusMessage,
		pendingInput: engine.getPendingInput(),
		errorLocation,
		closed,
	});
	details.diagnostics = engine.diagnostics;
	return details;
}

function buildPreviewKey(args: VimRenderArgs): string {
	return JSON.stringify({
		file: args.file,
		kbd: args.kbd ?? [],
		insert: getInsertForDisplay(args) ?? "",
		pause: args.pause === true,
	});
}

function splitInsertIntoChunks(text: string): string[] {
	const maxChunkChars = 32;
	if (text.length <= maxChunkChars) {
		return text.length === 0 ? [] : [text];
	}

	const chunks: string[] = [];
	let start = 0;
	while (start < text.length) {
		let end = Math.min(start + maxChunkChars, text.length);
		if (end < text.length) {
			const lastNewline = text.lastIndexOf("\n", end - 1);
			if (lastNewline >= start) {
				end = lastNewline + 1;
			} else {
				const lastSpace = Math.max(text.lastIndexOf(" ", end - 1), text.lastIndexOf("\t", end - 1));
				if (lastSpace >= start + Math.floor(maxChunkChars / 2)) {
					end = lastSpace + 1;
				}
			}
		}
		if (end <= start) {
			end = Math.min(start + maxChunkChars, text.length);
		}
		chunks.push(text.slice(start, end));
		start = end;
	}
	return chunks;
}

async function applyInsertWithStreaming(
	engine: VimEngine,
	text: string,
	exitInsertMode: boolean,
	onStep?: () => Promise<void>,
): Promise<void> {
	const chunks = splitInsertIntoChunks(text);
	if (chunks.length === 0) {
		await engine.applyLiteralInsert("", exitInsertMode);
		return;
	}

	for (let index = 0; index < chunks.length; index += 1) {
		await engine.applyLiteralInsert(chunks[index]!, exitInsertMode && index === chunks.length - 1);
		await onStep?.();
	}
}

async function statFingerprint(absolutePath: string): Promise<VimFingerprint | null> {
	try {
		const file = Bun.file(absolutePath);
		const stat = await file.stat();
		if (!stat.isFile()) {
			throw new ToolError(`Not a regular file: ${absolutePath}`);
		}
		const bytes = await file.bytes();
		return {
			exists: true,
			size: stat.size,
			mtimeMs: stat.mtimeMs,
			hash: String(Bun.hash(bytes)),
		};
	} catch (error) {
		if (isEnoent(error)) {
			return null;
		}
		throw error;
	}
}

async function readTextFile(
	absolutePath: string,
): Promise<{ lines: string[]; trailingNewline: boolean; fingerprint: VimFingerprint | null }> {
	try {
		const file = Bun.file(absolutePath);
		const stat = await file.stat();
		if (!stat.isFile()) {
			throw new ToolError(`Not a regular file: ${absolutePath}`);
		}
		const bytes = await file.bytes();
		for (const byte of bytes) {
			if (byte === 0) {
				throw new ToolError("Vim only supports UTF-8 text files in v1");
			}
		}
		const text = utf8Decoder.decode(bytes);
		const trailingNewline = text.endsWith("\n");
		const body = trailingNewline ? text.slice(0, -1) : text;
		return {
			lines: body.length === 0 ? [""] : body.split("\n"),
			trailingNewline,
			fingerprint: {
				exists: true,
				size: stat.size,
				mtimeMs: stat.mtimeMs,
				hash: String(Bun.hash(bytes)),
			},
		};
	} catch (error) {
		if (isEnoent(error)) {
			return {
				lines: [""],
				trailingNewline: false,
				fingerprint: null,
			};
		}
		if (error instanceof TypeError) {
			throw new ToolError("Vim only supports UTF-8 text files in v1");
		}
		throw error;
	}
}

function normalizeTargetPath(inputPath: string, cwd: string): { absolutePath: string; displayPath: string } {
	const normalized = normalizePathLikeInput(inputPath);
	if (INTERNAL_URL_PREFIX.test(normalized)) {
		throw new ToolError("Vim only supports regular filesystem paths in v1");
	}
	if (isReadableUrlPath(normalized)) {
		throw new ToolError("Vim only supports local filesystem paths in v1");
	}
	if (parseArchivePathCandidates(normalized).some(candidate => candidate.archivePath === normalized)) {
		throw new ToolError("Vim does not support archive targets in v1");
	}
	if (parseSqlitePathCandidates(normalized).some(candidate => candidate.sqlitePath === normalized)) {
		throw new ToolError("Vim does not support SQLite targets in v1");
	}
	return {
		absolutePath: resolveToCwd(normalized, cwd),
		displayPath: normalized,
	};
}

export class VimTool implements AgentTool<typeof vimSchema, VimToolDetails> {
	readonly name = "vim";
	readonly label = "Vim";
	readonly description: string;
	readonly parameters = vimSchema;
	readonly concurrency = "exclusive";

	#engines = new Map<string, VimEngine>();
	#writethrough: WritethroughCallback;

	constructor(private readonly session: ToolSession) {
		const enableLsp = session.enableLsp ?? true;
		const enableFormat = enableLsp && session.settings.get("lsp.formatOnWrite");
		const enableDiagnostics = enableLsp && session.settings.get("lsp.diagnosticsOnWrite");
		this.#writethrough = enableLsp
			? createLspWritethrough(session.cwd, { enableFormat, enableDiagnostics })
			: writethroughNoop;
		this.description = prompt.render(vimDescription);
	}

	async #loadBuffer(targetPath: string): Promise<VimLoadedFile> {
		const { absolutePath, displayPath } = normalizeTargetPath(targetPath, this.session.cwd);
		if (await isSqliteFile(absolutePath)) {
			throw new ToolError("Vim does not support SQLite targets in v1");
		}
		const loaded = await readTextFile(absolutePath);
		return {
			absolutePath,
			displayPath,
			lines: loaded.lines,
			trailingNewline: loaded.trailingNewline,
			fingerprint: loaded.fingerprint,
		};
	}

	async #beforeMutate(buffer: VimBuffer): Promise<void> {
		enforcePlanModeWrite(this.session, buffer.displayPath, { op: buffer.baseFingerprint ? "update" : "create" });
		if (!buffer.editabilityChecked && buffer.baseFingerprint) {
			await assertEditableFile(buffer.filePath, buffer.displayPath);
			buffer.editabilityChecked = true;
		}
	}

	async #saveBuffer(buffer: VimBuffer, options?: { force?: boolean }): Promise<VimSaveResult> {
		enforcePlanModeWrite(this.session, buffer.displayPath, { op: buffer.baseFingerprint ? "update" : "create" });
		if (buffer.baseFingerprint) {
			await assertEditableFile(buffer.filePath, buffer.displayPath);
		}
		if (!options?.force) {
			const diskFingerprint = await statFingerprint(buffer.filePath);
			if (!fingerprintEqual(buffer.baseFingerprint, diskFingerprint)) {
				throw new ToolError("File changed on disk since open; reload with :e! before saving.");
			}
		}
		const content = `${buffer.getText()}${buffer.trailingNewline ? "\n" : ""}`;
		const diagnostics = (await this.#writethrough(buffer.filePath, content)) as FileDiagnosticsResult | undefined;
		const loaded = await this.#loadBuffer(buffer.displayPath);
		return { loaded, diagnostics };
	}

	#renderFromEngine(
		engine: VimEngine,
		viewportLines: number,
		preferredStart?: number,
		closed = false,
		errorLocation?: VimToolDetails["errorLocation"],
		statusMessage?: string,
		modelDiff?: string,
	): AgentToolResult<VimToolDetails> {
		const details = buildToolDetailsFromEngine(
			engine,
			viewportLines,
			preferredStart,
			closed,
			errorLocation,
			statusMessage,
		);
		const resultText = modelDiff ? `${renderVimDetails(details)}\n\nDiff:\n${modelDiff}` : renderVimDetails(details);
		const builder = toolResult<VimToolDetails>(details).text(resultText);
		if (engine.diagnostics) {
			builder.diagnostics(engine.diagnostics.summary, engine.diagnostics.messages ?? []);
		}
		lastVimDetails = details;
		if (closed) {
			clearStoredPreviewEngine(engine.buffer.displayPath);
			clearStoredPreviewEngine(engine.buffer.filePath);
		} else {
			storePreviewEngine(engine);
		}
		return builder.done();
	}

	#throwWithSnapshot(engine: VimEngine, error: unknown): never {
		const location = error instanceof VimInputError ? error.location : undefined;
		const statusMessage = error instanceof Error ? error.message : String(error);
		const result = this.#renderFromEngine(
			engine,
			VIM_DEFAULT_VIEWPORT_LINES,
			engine.viewportStart,
			engine.closed,
			location,
			statusMessage,
		);
		const text = result.content.find(block => block.type === "text")?.text ?? statusMessage;
		throw new ToolError(text);
	}

	async execute(
		_toolCallId: string,
		params: VimParams,
		signal?: AbortSignal,
		onUpdate?: AgentToolUpdateCallback<VimToolDetails>,
		_context?: AgentToolContext,
	): Promise<AgentToolResult<VimToolDetails>> {
		return untilAborted(signal, async () => {
			// Resolve file path and get-or-create engine for this buffer
			const { absolutePath } = normalizeTargetPath(params.file, this.session.cwd);
			let engine = this.#engines.get(absolutePath);
			let isNewBuffer = false;
			if (!engine) {
				const loaded = await this.#loadBuffer(params.file);
				engine = new VimEngine(new VimBuffer(loaded), {
					beforeMutate: buffer => this.#beforeMutate(buffer),
					loadBuffer: path => this.#loadBuffer(path),
					saveBuffer: (buffer, options) => this.#saveBuffer(buffer, options),
				});
				engine.viewportStart = 1;
				this.#engines.set(absolutePath, engine);
				isNewBuffer = true;
			} else if (!engine.buffer.modified) {
				// Sync fingerprint from disk to handle LSP writethrough reformats
				const fp = await statFingerprint(absolutePath);
				if (fp) engine.buffer.baseFingerprint = fp;
			}

			const sequences = Array.isArray(params.kbd)
				? params.kbd
				: typeof params.kbd === "string"
					? [params.kbd]
					: undefined;
			if (!sequences) {
				// No kbd — just show the file viewport
				if (isNewBuffer) {
					engine.statusMessage = `Opened ${engine.buffer.displayPath}`;
				}
				return this.#renderFromEngine(engine, VIM_OPEN_VIEWPORT_LINES, engine.viewportStart);
			}

			// Safety: if the engine is stuck in INSERT mode, always reset before executing kbd.
			// Only skip for the intentional pause→resume pattern (no kbd, insert provided).
			const hasKbd = sequences.some(s => s.length > 0);
			if (engine.inputMode === "insert" && (hasKbd || (!params.pause && params.insert === undefined))) {
				engine.rollbackPendingInsert();
			}

			// Execute kbd sequences
			const commandText = sequences.join(" ");
			const tokenGroups = splitTokensBySequence(sequences);
			const beforeText = serializeBufferText(engine.buffer);

			if (this.session.getPlanModeState?.()?.enabled) {
				if (params.insert !== undefined) {
					throw new ToolError("Plan mode: vim is read-only; insert payloads are not allowed.");
				}
				const preview = engine.clone({
					beforeMutate: async () => {
						throw new VimInputError(
							"Plan mode: vim is read-only; only navigation, search, open, and close are allowed.",
						);
					},
					saveBuffer: async () => {
						throw new VimInputError("Plan mode: :w is not allowed.");
					},
				});
				await executeKeySequences(preview, tokenGroups, commandText);
			}

			try {
				const FRAME_INTERVAL_MS = 16; // ~60fps
				let lastUpdateTime = 0;

				const emitUpdate = onUpdate
					? async (force = false) => {
							const now = Date.now();
							if (!force && now - lastUpdateTime < FRAME_INTERVAL_MS) {
								return; // throttle: skip if too soon
							}
							onUpdate(this.#renderFromEngine(engine, VIM_DEFAULT_VIEWPORT_LINES, engine.viewportStart));
							lastUpdateTime = Date.now();
							await Bun.sleep(FRAME_INTERVAL_MS); // real delay for terminal to render
						}
					: undefined;

				await executeKeySequences(engine, tokenGroups, commandText, emitUpdate ? () => emitUpdate() : undefined);

				if (!engine.closed && params.insert !== undefined) {
					// Skip empty insert when not in INSERT mode (e.g., kbd included <Esc>)
					if (params.insert.length > 0 || engine.inputMode === "insert") {
						await applyInsertWithStreaming(
							engine,
							params.insert,
							params.pause !== true,
							emitUpdate ? () => emitUpdate(true) : undefined,
						);
					}
				}

				if (params.pause === true && !engine.closed && engine.getPendingInput()) {
					engine.statusMessage = engine.statusMessage ?? `Paused in ${engine.getPublicMode()} mode`;
				}
			} catch (error) {
				this.#throwWithSnapshot(engine, error);
			}

			if (beforeText !== serializeBufferText(engine.buffer)) {
				engine.centerViewportOnCursor();
			}

			// Auto-save when buffer was modified
			if (!engine.closed && engine.buffer.modified && params.pause !== true) {
				try {
					const result = await this.#saveBuffer(engine.buffer);
					engine.buffer.markSaved(result.loaded);
					engine.diagnostics = result.diagnostics;
					if (beforeText !== serializeBufferText(engine.buffer)) {
						engine.centerViewportOnCursor();
					}
				} catch (error) {
					this.#throwWithSnapshot(engine, error);
				}
			}

			const afterText = serializeBufferText(engine.buffer);
			const modelDiff = buildModelDiff(beforeText, afterText);

			const result = this.#renderFromEngine(
				engine,
				VIM_DEFAULT_VIEWPORT_LINES,
				engine.viewportStart,
				engine.closed,
				undefined,
				undefined,
				modelDiff,
			);
			if (engine.closed) {
				this.#engines.delete(absolutePath);
			}
			return result;
		});
	}
}

// Unescape JSON string escape sequences from a partial (potentially incomplete) JSON string value.
function unescapePartialJsonString(value: string): string {
	let output = "";
	for (let index = 0; index < value.length; index += 1) {
		const char = value[index];
		if (char !== "\\") {
			output += char;
			continue;
		}
		const next = value[index + 1];
		if (!next) {
			output += "\\";
			break;
		}
		index += 1;
		switch (next) {
			case '"':
			case "\\":
			case "/":
				output += next;
				break;
			case "b":
				output += "\b";
				break;
			case "f":
				output += "\f";
				break;
			case "n":
				output += "\n";
				break;
			case "r":
				output += "\r";
				break;
			case "t":
				output += "\t";
				break;
			case "u": {
				const codePoint = value.slice(index + 1, index + 5);
				if (codePoint.length === 4) {
					const parsed = parseInt(codePoint, 16);
					if (!Number.isNaN(parsed)) {
						output += String.fromCharCode(parsed);
						index += 4;
						continue;
					}
				}
				output += "\\u";
				break;
			}
			default:
				output += `\\${next}`;
		}
	}
	return output;
}

// Extract partial insert text from raw JSON buffer during streaming.
// partial-json often doesn't surface string values until the closing quote is seen.
function extractPartialInsert(partialJson: string | undefined): string | undefined {
	if (!partialJson) return undefined;
	const match = partialJson.match(/"insert"\s*:\s*"((?:\\.|[^"\\])*)(?:"|$)/u);
	if (!match) return undefined;
	return unescapePartialJsonString(match[1]!);
}

// Get the best available insert value - prefer raw partial JSON extraction during streaming
function getInsertForDisplay(args: VimRenderArgs): string | undefined {
	const partialInsert = extractPartialInsert(args.__partialJson);
	// During streaming, partialInsert may have more content than args.insert
	if (partialInsert !== undefined && (args.insert === undefined || partialInsert.length >= args.insert.length)) {
		return partialInsert;
	}
	return args.insert;
}

async function buildPreviewDetails(args: VimRenderArgs): Promise<VimToolDetails | undefined> {
	if (!args.file) {
		return undefined;
	}

	const baseEngine = previewEnginesByFile.get(args.file) ?? (await loadPreviewBaseEngine(args));
	if (!baseEngine) {
		return undefined;
	}

	const preview = baseEngine.clone(createPreviewCallbacks());
	const sequences = Array.isArray(args.kbd) ? args.kbd : [];
	const insertText = getInsertForDisplay(args);

	try {
		if (sequences.length > 0) {
			const commandText = sequences.join(" ");
			const tokenGroups = splitTokensBySequence(sequences);
			await executeKeySequences(preview, tokenGroups, commandText);
		}

		if (!preview.closed && insertText !== undefined && (insertText.length > 0 || preview.inputMode === "insert")) {
			await preview.applyLiteralInsert(insertText, false);
		}
	} catch {
		return undefined;
	}

	if (!preview.closed && insertText !== undefined) {
		preview.statusMessage = preview.statusMessage ?? "Streaming insert preview";
	}

	return buildToolDetailsFromEngine(preview, VIM_DEFAULT_VIEWPORT_LINES, preview.viewportStart, preview.closed);
}

export async function primeVimCallPreview(toolCallId: string | undefined, args: VimRenderArgs): Promise<void> {
	if (!toolCallId) {
		return;
	}

	const key = buildPreviewKey(args);
	const existing = previewStatesByToolCall.get(toolCallId);
	previewStatesByToolCall.set(toolCallId, { key, details: existing?.details });
	const details = await buildPreviewDetails(args);
	const current = previewStatesByToolCall.get(toolCallId);
	if (!current || current.key !== key) {
		return;
	}
	previewStatesByToolCall.set(toolCallId, { key, details });
}

export function clearVimCallPreview(toolCallId: string | undefined): void {
	if (!toolCallId) {
		return;
	}
	previewStatesByToolCall.delete(toolCallId);
}

export function resetVimRendererStateForTest(): void {
	lastVimDetails = undefined;
	previewEnginesByFile.clear();
	previewStatesByToolCall.clear();
}

export const vimToolRenderer = {
	renderCall(args: VimRenderArgs, options: RenderResultOptions, uiTheme: Theme): Component {
		if (args.file && !args.kbd) {
			return renderText(`${uiTheme.bold("Vim")} open ${args.file}`);
		}

		// Build a description of the streaming args for the header
		let argsDescription = "";
		if (args.kbd) {
			argsDescription = args.kbd.join(" ");
			const insertText = getInsertForDisplay(args);
			if (insertText !== undefined && insertText.length > 0) {
				argsDescription += ` · insert: ${insertText}`;
			}
			if (args.pause) {
				argsDescription += " · pause";
			}
		}

		// When a vim buffer is already open, show its viewport during LLM streaming
		// instead of just a plain text line. This gives visual continuity.
		const previewDetails =
			args.__toolCallId !== undefined ? previewStatesByToolCall.get(args.__toolCallId)?.details : undefined;
		const details = previewDetails ?? (lastVimDetails?.file === args.file ? lastVimDetails : undefined);
		if (details?.viewportLines && details.viewportLines.length > 0) {
			const lang = getLanguageFromPath(details.file);
			const langIcon = uiTheme.getLangIcon(lang);
			const modified = details.modified ? " [+]" : "";
			const position = `L${details.cursor.line}:${details.cursor.col}`;
			const padWidth = String(details.viewport.end).length;
			const viewportLines = details.viewportLines;
			const highlightedLines = highlightCode(viewportLines.map(line => line.text).join("\n"), lang);
			const renderedLines = viewportLines.map((line, index) => {
				const lineNoStr = String(line.line).padStart(padWidth, " ");
				const lineNoStyled = line.isCursor
					? uiTheme.fg("accent", lineNoStr)
					: line.isSelected
						? uiTheme.fg("warning", lineNoStr)
						: uiTheme.fg("dim", lineNoStr);
				const separator = uiTheme.fg("dim", "│");
				const prefix = line.isCursor
					? uiTheme.fg("accent", ">")
					: line.isSelected
						? uiTheme.fg("warning", "*")
						: " ";
				return `${prefix}${lineNoStyled}${separator}${highlightedLines[index] ?? line.text}`;
			});
			if (details.statusMessage) {
				renderedLines.push(uiTheme.fg("dim", details.statusMessage));
			}

			const outputBlock = new CachedOutputBlock();
			let cached: { key: string; result: string[] } | undefined;

			return {
				render: (width: number): string[] => {
					const cacheKey = `${width}|${options.spinnerFrame ?? -1}|${argsDescription}`;
					if (cached?.key === cacheKey) {
						return cached.result;
					}

					const header = renderStatusLine(
						{
							icon: "pending",
							spinnerFrame: options.spinnerFrame,
							title: "Vim",
							description: argsDescription || details.file + modified,
							meta: [`${langIcon} ${details.totalLines} lines`, position],
						},
						uiTheme,
					);

					const lines = outputBlock.render(
						{
							header,
							state: "pending",
							sections: [{ lines: renderedLines }],
							width,
						},
						uiTheme,
					);
					cached = { key: cacheKey, result: lines };
					return lines;
				},
				invalidate: () => {
					cached = undefined;
					outputBlock.invalidate();
				},
			};
		}

		// Fallback: no previous viewport available (first vim call)
		if (argsDescription) {
			return renderText(`${uiTheme.bold("Vim")} ${argsDescription}`);
		}
		return renderText(`${uiTheme.bold("Vim")}`);
	},
	renderResult(
		result: { content: Array<{ type: string; text?: string }>; details?: VimToolDetails; isError?: boolean },
		options: RenderResultOptions,
		uiTheme: Theme,
	): Component {
		const details = result.details;
		const isError = result.isError === true;

		// No structured details (e.g. closed): fall back to plain text
		if (!details?.viewportLines || details.viewportLines.length === 0) {
			if (details) {
				return renderText(renderVimDetails(details));
			}
			const text = result.content.find(block => block.type === "text")?.text ?? "";
			return renderText(text);
		}

		const lang = getLanguageFromPath(details.file);
		const langIcon = uiTheme.getLangIcon(lang);
		const modified = details.modified ? " [+]" : "";
		const position = `L${details.cursor.line}:${details.cursor.col}`;
		const padWidth = String(details.viewport.end).length;
		const viewportLines = details.viewportLines;
		const highlightedLines = highlightCode(viewportLines.map(line => line.text).join("\n"), lang);
		const renderedLines = viewportLines.map((line, index) => {
			const lineNoStr = String(line.line).padStart(padWidth, " ");
			const lineNoStyled = line.isCursor
				? uiTheme.fg("accent", lineNoStr)
				: line.isSelected
					? uiTheme.fg("warning", lineNoStr)
					: uiTheme.fg("dim", lineNoStr);
			const separator = uiTheme.fg("dim", "│");
			const prefix = line.isCursor ? uiTheme.fg("accent", ">") : line.isSelected ? uiTheme.fg("warning", "*") : " ";
			return `${prefix}${lineNoStyled}${separator}${highlightedLines[index] ?? line.text}`;
		});
		if (details.statusMessage) {
			renderedLines.push(uiTheme.fg("dim", details.statusMessage));
		}

		const sections: Array<{ label?: string; lines: string[] }> = [{ lines: renderedLines }];
		if (details.diagnostics?.messages && details.diagnostics.messages.length > 0) {
			const diagText = formatDiagnostics(
				{
					errored: isError,
					summary: details.diagnostics.summary,
					messages: details.diagnostics.messages,
				},
				options.expanded,
				uiTheme,
				(filePath: string) => uiTheme.getLangIcon(getLanguageFromPath(filePath)),
			);
			if (diagText) {
				sections.push({ lines: [diagText] });
			}
		}

		const outputBlock = new CachedOutputBlock();
		let cached: { key: string; result: string[] } | undefined;

		return {
			render: (width: number): string[] => {
				const cacheKey = `${width}|${options.isPartial ? 1 : 0}|${isError ? 1 : 0}|${options.spinnerFrame ?? -1}`;
				if (cached?.key === cacheKey) {
					return cached.result;
				}

				const icon = options.isPartial ? "pending" : isError ? "error" : "success";

				// Mode badge
				const modeBadge =
					details.mode === "NORMAL"
						? undefined
						: {
								label: details.mode,
								color:
									details.mode === "INSERT"
										? ("success" as const)
										: details.mode === "VISUAL" || details.mode === "VISUAL-LINE"
											? ("warning" as const)
											: ("accent" as const),
							};

				const header = renderStatusLine(
					{
						icon,
						spinnerFrame: options.spinnerFrame,
						title: "Vim",
						description: details.file + modified,
						badge: modeBadge,
						meta: [`${langIcon} ${details.totalLines} lines`, position],
					},
					uiTheme,
				);

				const lines = outputBlock.render(
					{
						header,
						state: options.isPartial ? "pending" : isError ? "error" : "success",
						sections,
						width,
					},
					uiTheme,
				);
				cached = { key: cacheKey, result: lines };
				return lines;
			},
			invalidate: () => {
				cached = undefined;
				outputBlock.invalidate();
			},
		};
	},
	mergeCallAndResult: true,
};

export { vimSchema };
