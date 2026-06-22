import type { BeforeProviderSend, Context, TextContent, ToolResultMessage } from "@earendil-works/omk-ai";
import { estimateLeanContextTokens } from "./lean-context-policy.ts";

const DEFAULT_THRESHOLD_TOKENS = 2_048;
const LEAN_CONTEXT_STUB_PREFIX = "[lean-context]";

const DEFAULT_SECRET_PATTERNS: readonly RegExp[] = [
	/-----BEGIN [A-Z0-9 ]*PRIVATE KEY-----/i,
	/\b(?:api[_-]?key|access[_-]?token|auth[_-]?token|refresh[_-]?token|client[_-]?secret|secret|password|passwd|pwd)\b\s*[:=]\s*["']?[^\s"']{8,}/i,
	/\bauthorization\s*:\s*bearer\s+[A-Za-z0-9._~+/=-]{10,}/i,
	/\b(?:gh[pousr]_|sk-|xox[baprs]-)[A-Za-z0-9_=-]{10,}/i,
];

export interface HeadroomCompressTextInput {
	readonly text: string;
	readonly estimatedTokens: number;
	readonly thresholdTokens: number;
	readonly toolCallId: string;
	readonly toolName: string;
	readonly contentIndex: number;
	readonly isError: boolean;
	readonly details?: unknown;
}

export type HeadroomCompressText = (input: HeadroomCompressTextInput) => string | undefined;

export interface HeadroomBeforeProviderSendOptions {
	readonly compressText: HeadroomCompressText;
	readonly thresholdTokens?: number;
	readonly logsThresholdTokens?: number;
	readonly enabled?: boolean;
}

export interface HeadroomBeforeProviderSendStats {
	readonly seenToolResultTextBlocks: number;
	readonly compressedBlocks: number;
	readonly skippedBelowThresholdBlocks: number;
	readonly skippedSecretBlocks: number;
	readonly skippedLeanContextBlocks: number;
	readonly failedOpenBlocks: number;
	readonly inputTokens: number;
	readonly outputTokens: number;
}

export interface HeadroomBeforeProviderSend {
	readonly beforeProviderSend: BeforeProviderSend;
	getStats(): HeadroomBeforeProviderSendStats;
	reset(): void;
}

export function createHeadroomBeforeProviderSend(
	options: HeadroomBeforeProviderSendOptions,
): HeadroomBeforeProviderSend {
	let stats = createEmptyStats();

	return {
		beforeProviderSend(input) {
			if (options.enabled === false) return undefined;
			const result = transformContext(input.context, options, stats);
			stats = result.stats;
			return result.changed ? result.context : undefined;
		},
		getStats() {
			return { ...stats };
		},
		reset() {
			stats = createEmptyStats();
		},
	};
}

interface ContextTransformResult {
	readonly context: Context;
	readonly stats: HeadroomBeforeProviderSendStats;
	readonly changed: boolean;
}

function transformContext(
	context: Context,
	options: HeadroomBeforeProviderSendOptions,
	initialStats: HeadroomBeforeProviderSendStats,
): ContextTransformResult {
	let nextStats = initialStats;
	let changed = false;
	const messages = context.messages.map((message) => {
		if (message.role !== "toolResult") return message;
		const result = transformToolResult(message, options, nextStats);
		nextStats = result.stats;
		changed = changed || result.changed;
		return result.message;
	});

	return {
		context: changed ? { ...context, messages } : context,
		stats: nextStats,
		changed,
	};
}

interface ToolResultTransformResult {
	readonly message: ToolResultMessage<unknown>;
	readonly stats: HeadroomBeforeProviderSendStats;
	readonly changed: boolean;
}

function transformToolResult(
	message: ToolResultMessage<unknown>,
	options: HeadroomBeforeProviderSendOptions,
	initialStats: HeadroomBeforeProviderSendStats,
): ToolResultTransformResult {
	let nextStats = initialStats;
	let changed = false;
	const content = message.content.map((block, index) => {
		if (block.type !== "text") return block;
		const result = transformTextBlock(block, message, index, options, nextStats);
		nextStats = result.stats;
		changed = changed || result.changed;
		return result.block;
	});

	return {
		message: changed ? { ...message, content } : message,
		stats: nextStats,
		changed,
	};
}

interface TextBlockTransformResult {
	readonly block: TextContent;
	readonly stats: HeadroomBeforeProviderSendStats;
	readonly changed: boolean;
}

function transformTextBlock(
	block: TextContent,
	message: ToolResultMessage<unknown>,
	contentIndex: number,
	options: HeadroomBeforeProviderSendOptions,
	initialStats: HeadroomBeforeProviderSendStats,
): TextBlockTransformResult {
	const estimatedTokens = estimateLeanContextTokens(block.text);
	let stats = incrementStats(initialStats, {
		seenToolResultTextBlocks: 1,
		inputTokens: estimatedTokens,
	});

	if (isLeanContextStub(block.text)) {
		return { block, stats: incrementStats(stats, { skippedLeanContextBlocks: 1 }), changed: false };
	}

	if (containsSecretPattern(block.text)) {
		return { block, stats: incrementStats(stats, { skippedSecretBlocks: 1 }), changed: false };
	}

	const thresholdTokens = getThresholdTokens(options, message);
	if (estimatedTokens <= thresholdTokens) {
		return { block, stats: incrementStats(stats, { skippedBelowThresholdBlocks: 1 }), changed: false };
	}

	let compressed: string | undefined;
	try {
		compressed = options.compressText({
			text: block.text,
			estimatedTokens,
			thresholdTokens,
			toolCallId: message.toolCallId,
			toolName: message.toolName,
			contentIndex,
			isError: message.isError,
			details: message.details,
		});
	} catch {
		return { block, stats: incrementStats(stats, { failedOpenBlocks: 1 }), changed: false };
	}

	if (compressed === undefined) {
		return { block, stats: incrementStats(stats, { failedOpenBlocks: 1 }), changed: false };
	}

	if (compressed === block.text) {
		return { block, stats, changed: false };
	}

	stats = incrementStats(stats, {
		compressedBlocks: 1,
		outputTokens: estimateLeanContextTokens(compressed),
	});
	return { block: { ...block, text: compressed }, stats, changed: true };
}

function createEmptyStats(): HeadroomBeforeProviderSendStats {
	return {
		seenToolResultTextBlocks: 0,
		compressedBlocks: 0,
		skippedBelowThresholdBlocks: 0,
		skippedSecretBlocks: 0,
		skippedLeanContextBlocks: 0,
		failedOpenBlocks: 0,
		inputTokens: 0,
		outputTokens: 0,
	};
}

function incrementStats(
	stats: HeadroomBeforeProviderSendStats,
	delta: Partial<Record<keyof HeadroomBeforeProviderSendStats, number>>,
): HeadroomBeforeProviderSendStats {
	return {
		seenToolResultTextBlocks: stats.seenToolResultTextBlocks + (delta.seenToolResultTextBlocks ?? 0),
		compressedBlocks: stats.compressedBlocks + (delta.compressedBlocks ?? 0),
		skippedBelowThresholdBlocks: stats.skippedBelowThresholdBlocks + (delta.skippedBelowThresholdBlocks ?? 0),
		skippedSecretBlocks: stats.skippedSecretBlocks + (delta.skippedSecretBlocks ?? 0),
		skippedLeanContextBlocks: stats.skippedLeanContextBlocks + (delta.skippedLeanContextBlocks ?? 0),
		failedOpenBlocks: stats.failedOpenBlocks + (delta.failedOpenBlocks ?? 0),
		inputTokens: stats.inputTokens + (delta.inputTokens ?? 0),
		outputTokens: stats.outputTokens + (delta.outputTokens ?? 0),
	};
}

function getThresholdTokens(options: HeadroomBeforeProviderSendOptions, message: ToolResultMessage<unknown>): number {
	const threshold = isLogLikeToolResult(message)
		? (options.logsThresholdTokens ?? options.thresholdTokens)
		: options.thresholdTokens;
	if (threshold === undefined) return DEFAULT_THRESHOLD_TOKENS;
	if (!Number.isFinite(threshold) || threshold < 0) return 0;
	return Math.ceil(threshold);
}

function isLogLikeToolResult(message: ToolResultMessage<unknown>): boolean {
	if (/\b(?:bash|exec|shell|log|logs|stderr|stdout)\b/i.test(message.toolName)) return true;
	const details = asRecord(message.details);
	if (!details) return false;
	return ["path", "filePath", "command", "query"].some((key) => {
		const value = details[key];
		return typeof value === "string" && /(?:\.log\b|\blogs?\b|stderr|stdout|trace)/i.test(value);
	});
}

function isLeanContextStub(text: string): boolean {
	return text.trimStart().startsWith(LEAN_CONTEXT_STUB_PREFIX);
}

function containsSecretPattern(text: string): boolean {
	return DEFAULT_SECRET_PATTERNS.some((pattern) => regexTestStateless(pattern, text));
}

function regexTestStateless(pattern: RegExp, text: string): boolean {
	const flags = pattern.flags.replace(/[gy]/g, "");
	return new RegExp(pattern.source, flags).test(text);
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
	return typeof value === "object" && value !== null && !Array.isArray(value)
		? (value as Record<string, unknown>)
		: undefined;
}
