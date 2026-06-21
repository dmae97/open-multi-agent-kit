import type { AgentMessage } from "@earendil-works/omk-agent-core";
import type { Api, AssistantMessage, Model, Usage } from "@earendil-works/omk-ai";
import { createAssistantMessageEventStream, getModel } from "@earendil-works/omk-ai";
import { describe, expect, it } from "vitest";
import { generateBranchSummary } from "../src/core/compaction/branch-summarization.ts";
import {
	type CompactionPreparation,
	compact,
	DEFAULT_COMPACTION_RAW_INPUT_CHAR_CEILING,
	generateSummary,
	packSummaryInputForTokenBudget,
	sanitizeSerializedConversation,
} from "../src/core/compaction/compaction.ts";
import type { SessionEntry } from "../src/core/session-manager.ts";

function createUserMessage(text: string): AgentMessage {
	return { role: "user", content: text, timestamp: 1 };
}

function createUsage(): Usage {
	return {
		input: 1,
		output: 1,
		cacheRead: 0,
		cacheWrite: 0,
		totalTokens: 2,
		cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 },
	};
}

function createAssistantMessage(text: string, model: Model<Api>): AssistantMessage {
	return {
		role: "assistant",
		content: [{ type: "text", text }],
		usage: createUsage(),
		stopReason: "stop",
		timestamp: 1,
		api: model.api,
		provider: model.provider,
		model: model.id,
	};
}

function createDoneStream(text: string, model: Model<Api>) {
	const stream = createAssistantMessageEventStream();
	stream.push({ type: "done", reason: "stop", message: createAssistantMessage(text, model) });
	stream.end();
	return stream;
}

function createModel(): Model<Api> {
	const model = getModel("anthropic", "claude-sonnet-4-5");
	if (!model) throw new Error("test model fixture missing");
	return { ...model, contextWindow: 12000, maxTokens: 4096 };
}

function validSummary(criticalContext: string): string {
	return [
		"## Goal",
		"Keep runtime memory safe.",
		"",
		"## Constraints & Preferences",
		"- Preserve sanitized evidence only.",
		"",
		"## Progress",
		"### Done",
		"- [x] Captured summary.",
		"",
		"### In Progress",
		"- [ ] Continue verification.",
		"",
		"### Blocked",
		"- (none)",
		"",
		"## Key Decisions",
		"- **Sanitize**: Runtime memory text must not retain sensitive values.",
		"",
		"## Next Steps",
		"1. Run checks.",
		"",
		"## Critical Context",
		`- ${criticalContext}`,
		"",
		"## Resume Handoff",
		"- **First action**: Run targeted tests.",
		"- **Re-check before editing**: target files.",
		"- **Evidence status**: pending.",
	].join("\n");
}

describe("compaction raw input bounding", () => {
	it("leaves small input unchanged below the raw char ceiling", () => {
		const text = "short serialized conversation";
		const packed = packSummaryInputForTokenBudget(text, undefined, 1000);

		expect(packed.text).toBe(text);
		expect(packed.wasCompressed).toBe(false);
		expect(packed.omittedTokens).toBe(0);
	});

	it("clamps raw input above the ceiling before token packing", () => {
		const text = `HEADTOKEN-${"x".repeat(3000)}-TAILTOKEN`;
		const packed = packSummaryInputForTokenBudget(text, undefined, 200);

		expect(packed.text.length).toBeLessThanOrEqual(200);
		expect(packed.text).toContain("HEADTOKEN");
		expect(packed.text).toContain("TAILTOKEN");
		expect(packed.text).toContain("omk-digest:truncated");
		expect(packed.wasCompressed).toBe(true);
	});

	it("respects an explicit maxRawChars override", () => {
		const text = `HEAD-${"y".repeat(1000)}-TAIL`;
		const packed = packSummaryInputForTokenBudget(text, 10_000, 120);

		expect(packed.text.length).toBeLessThanOrEqual(120);
	});

	it("still applies token packing after raw clamp", () => {
		const text = Array.from(
			{ length: 120 },
			(_, index) => `packages/coding-agent/src/file-${index}.ts error line`,
		).join("\n");
		const packed = packSummaryInputForTokenBudget(text, 80, 500);

		expect(packed.wasCompressed).toBe(true);
		expect(packed.text).toContain("omk-summary-input-compressed");
		expect(packed.packedTokens).toBeLessThan(packed.originalTokens);
		expect(packed.omittedTokens).toBeGreaterThan(0);
	});

	it("does not duplicate overlapping head and tail slices", () => {
		const text = `HEADTOKEN-${"a".repeat(240)}-MIDTOKEN-${"b".repeat(240)}-TAILTOKEN`;
		const packed = packSummaryInputForTokenBudget(text, 80, 700);

		expect(packed.wasCompressed).toBe(true);
		expect(packed.text).toContain("omk-summary-input-compressed");
		expect(packed.text.match(/HEADTOKEN/g) ?? []).toHaveLength(1);
		expect(packed.text.match(/MIDTOKEN/g) ?? []).toHaveLength(1);
		expect(packed.text.match(/TAILTOKEN/g) ?? []).toHaveLength(1);
	});

	it("exports a default raw input char ceiling", () => {
		expect(DEFAULT_COMPACTION_RAW_INPUT_CHAR_CEILING).toBeGreaterThan(0);
	});
});

describe("compaction serialized-conversation sanitization", () => {
	it("redacts authorization, JWT, private key, and tool-result secrets", () => {
		const bearer = `Bearer compaction-auth-${"c".repeat(20)}`;
		const jwt = "eyJhbGciOi.eyJzdWIiOi.SflKxwRJSmKK";
		const text = `[Tool result]: AUTH=${bearer}\n[User]: token=${jwt} files packages/coding-agent/src/index.ts`;
		const result = sanitizeSerializedConversation(text);

		expect(result.findings.redactionCount).toBeGreaterThanOrEqual(1);
		expect(result.text).toContain("packages/coding-agent/src/index.ts");
		expect(result.text).not.toContain(bearer);
		expect(result.text).not.toContain(jwt);
	});

	it("keeps safe file paths and command-exit summaries", () => {
		const text = "edited src/lib.rs; cargo build exited 0; see /home/dev/notes";
		const result = sanitizeSerializedConversation(text);
		expect(result.text).toContain("src/lib.rs");
		expect(result.text).toContain("cargo build");
		expect(result.text).not.toContain("/home/dev");
		expect(result.findings.categories.path).toBeGreaterThanOrEqual(1);
	});

	it("sanitizes previous summaries before they enter the summarizer prompt", async () => {
		const model = createModel();
		const secret = "previous-short-secret";
		const previousSummary = validSummary(`previous apiKey=${secret} password=hunter2 path /home/alice/project`);
		let capturedContext = "";

		await generateSummary(
			[createUserMessage("summarize safe conversation")],
			model,
			2000,
			"test-key",
			undefined,
			undefined,
			undefined,
			previousSummary,
			undefined,
			async (_model, context) => {
				capturedContext = JSON.stringify(context);
				return createDoneStream(validSummary("clean result"), model);
			},
			8000,
		);

		expect(capturedContext).toContain("[redacted]");
		expect(capturedContext).not.toContain(secret);
		expect(capturedContext).not.toContain("hunter2");
		expect(capturedContext).not.toContain("/home/alice");
	});

	it("sanitizes branch summary serialized conversations and generated summaries", async () => {
		const model = createModel();
		const rawSecret = "branch-short-secret";
		const generatedSecret = "branch-generated-secret";
		let capturedContext = "";
		const entries: SessionEntry[] = [
			{
				type: "message",
				id: "entry-1",
				parentId: null,
				timestamp: "2026-06-21T00:00:00.000Z",
				message: createUserMessage(`branch apiKey=${rawSecret} path /home/branch/project`),
			},
		];

		const result = await generateBranchSummary(entries, {
			model,
			apiKey: "test-key",
			signal: new AbortController().signal,
			streamFn: async (_model, context) => {
				capturedContext = JSON.stringify(context);
				return createDoneStream(
					validSummary(`generated password=${generatedSecret} path /home/generated/project`),
					model,
				);
			},
		});

		expect(capturedContext).toContain("[redacted]");
		expect(capturedContext).not.toContain(rawSecret);
		expect(capturedContext).not.toContain("/home/branch");
		expect(result.summary).toContain("[redacted]");
		expect(result.summary).not.toContain(generatedSecret);
		expect(result.summary).not.toContain("/home/generated");
	});

	it("sanitizes generated compaction summaries before returning", async () => {
		const model = createModel();
		const secret = "generated-short-secret";
		const summary = await generateSummary(
			[createUserMessage("summarize safe conversation")],
			model,
			2000,
			"test-key",
			undefined,
			undefined,
			undefined,
			undefined,
			undefined,
			async () => createDoneStream(validSummary(`generated password=${secret} path /home/dana/project`), model),
			8000,
		);

		expect(summary).toContain("[redacted]");
		expect(summary).not.toContain(secret);
		expect(summary).not.toContain("/home/dana");
	});

	it("sanitizes split-turn compaction output and file operation details", async () => {
		const model = createModel();
		const secret = "compact-short-secret";
		const preparation: CompactionPreparation = {
			firstKeptEntryId: "entry-keep",
			messagesToSummarize: [createUserMessage("history before split")],
			turnPrefixMessages: [createUserMessage("prefix before kept suffix")],
			isSplitTurn: true,
			tokensBefore: 1000,
			previousSummary: undefined,
			fileOps: {
				read: new Set(["/home/read/secret.txt"]),
				written: new Set<string>(),
				edited: new Set(["/home/edit/secret.ts"]),
			},
			settings: { enabled: true, reserveTokens: 2000, keepRecentTokens: 10, summaryInputTokens: 8000 },
		};
		const responses = [
			validSummary(`history apiKey=${secret}`),
			`## Original Request\nprefix password=${secret}\n\n## Early Progress\n- touched /home/prefix/file\n\n## Context for Suffix\n- continue`,
		];

		const result = await compact(
			preparation,
			model,
			"test-key",
			undefined,
			undefined,
			undefined,
			undefined,
			async () => createDoneStream(responses.shift() ?? validSummary("fallback"), model),
		);

		const serialized = JSON.stringify(result);
		expect(serialized).toContain("[redacted]");
		expect(serialized).not.toContain(secret);
		expect(serialized).not.toContain("/home/read");
		expect(serialized).not.toContain("/home/edit");
		expect(serialized).not.toContain("/home/prefix");
	});
});
