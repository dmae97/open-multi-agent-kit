import { describe, expect, it } from "vitest";
import {
	classifyTodoOverlay,
	deriveMemoryNamespace,
	enforceCacheOptimizerGate,
	enforceMemoryAccess,
	enforceObservabilityExport,
	enforceReportOnlyToolInvocation,
	sanitizeForExportPolicy,
	sanitizeMemoryPayload,
} from "../src/core/policy-overlays-runtime.ts";

const baseExportRequest = {
	sink: "braintrust" as const,
	contentTier: "metadata" as const,
	env: { offline: false, trace: true },
	data: { ok: true },
};

describe("enforceObservabilityExport", () => {
	it("denies Braintrust when defaultOff is true", () => {
		const policy = { defaultOff: true, offlineDisables: true, denyRawPrompt: true, denyRawToolOutput: true };
		const decision = enforceObservabilityExport(policy, baseExportRequest);
		expect(decision.kind).toBe("deny");
		expect(decision.rule).toBe("export.default_off");
	});

	it("denies any export when offlineDisables and env.offline are true", () => {
		const policy = { defaultOff: false, offlineDisables: true, denyRawPrompt: true, denyRawToolOutput: true };
		const decision = enforceObservabilityExport(policy, {
			...baseExportRequest,
			env: { offline: true, trace: true },
		});
		expect(decision.kind).toBe("deny");
		expect(decision.rule).toBe("export.offline");
	});

	it("denies summary tier when policy is metadata", () => {
		const policy = {
			defaultOff: false,
			offlineDisables: true,
			denyRawPrompt: true,
			denyRawToolOutput: true,
			payloadTier: "metadata" as const,
		};
		const decision = enforceObservabilityExport(policy, { ...baseExportRequest, contentTier: "summary" });
		expect(decision.kind).toBe("deny");
		expect(decision.rule).toBe("export.tier_exceeded");
	});

	it("allows metadata tier to Braintrust when explicitly enabled", () => {
		const policy = {
			defaultOff: false,
			offlineDisables: true,
			denyRawPrompt: true,
			denyRawToolOutput: true,
			payloadTier: "full" as const,
		};
		const decision = enforceObservabilityExport(policy, baseExportRequest);
		expect(decision.kind).toBe("allow");
		expect(decision.rule).toBe("export.allowed");
	});
});

describe("sanitizeForExportPolicy", () => {
	it("drops prompt/completion keys when denyRawPrompt is true", () => {
		const sanitized = sanitizeForExportPolicy(
			{ defaultOff: true, offlineDisables: true, denyRawPrompt: true, denyRawToolOutput: false },
			{ prompt: "secret", completion: "secret", response: "secret", safe: "kept" },
		);
		expect(sanitized).toEqual({ safe: "kept" });
	});

	it("drops tool input/output keys when denyRawToolOutput is true", () => {
		const sanitized = sanitizeForExportPolicy(
			{ defaultOff: true, offlineDisables: true, denyRawPrompt: false, denyRawToolOutput: true },
			{
				toolOutput: "secret",
				tool_input: "secret",
				toolCall: "secret",
				toolResult: "secret",
				safe: "kept",
			},
		);
		expect(sanitized).toEqual({ safe: "kept" });
	});
});

describe("memory namespace and persistence policy", () => {
	const memoryOverlay = { declaredUse: "memory" as const, advisoryOnly: false };
	const baseContext = {
		cwd: "/workspace/acme",
		sessionId: "session-123",
		goalId: "goal-alpha",
		laneId: "lane-e",
		laneAuthority: "write-sanitized" as const,
	};

	it("allows read access for memory lanes with read authority", () => {
		const decision = enforceMemoryAccess(
			memoryOverlay,
			{ kind: "read", store: "memory", namespace: { scope: "project" } },
			{ ...baseContext, laneAuthority: "read" },
		);

		expect(decision.kind).toBe("allow");
		expect(decision.rule).toBe("memory.read_allowed");
		expect("namespace" in decision ? decision.namespace : "").toMatch(/^omk:project:[a-f0-9]{16}$/);
	});

	it("derives canonical lane namespaces and rejects unsafe topics", () => {
		const namespace = deriveMemoryNamespace(baseContext, { scope: "lane", topic: "Evidence.Log-1" });
		expect(namespace.kind).toBe("allow");
		expect(namespace.kind === "allow" ? namespace.namespace : "").toMatch(
			/^omk:project:[a-f0-9]{16}:goal:goal-alpha:lane:lane-e:evidence\.log-1$/,
		);

		const unsafe = deriveMemoryNamespace(baseContext, { scope: "project", topic: "../unsafe" });
		expect(unsafe.kind).toBe("deny");
		expect(unsafe.rule).toBe("memory.namespace.invalid_topic");
	});

	it("allows sanitized project writes for memory lanes with write authority", () => {
		const tokenValue = `Bearer fake-${"x".repeat(40)}`;
		const decision = enforceMemoryAccess(
			memoryOverlay,
			{
				kind: "write",
				store: "memory",
				namespace: { scope: "project", topic: "handoff" },
				source: "compaction-summary",
				contentTier: "summary",
				payload: { authorization: tokenValue, note: "Reach user@example.com from /home/alice/work" },
			},
			baseContext,
		);

		expect(decision.kind).toBe("allow");
		expect(decision.rule).toBe("memory.write_sanitized");
		expect("findings" in decision ? decision.findings.redactionCount : 0).toBeGreaterThanOrEqual(3);
		const serialized = JSON.stringify(decision);
		expect(serialized).not.toContain(tokenValue);
		expect(serialized).not.toContain("user@example.com");
		expect(serialized).not.toContain("/home/alice");
	});

	it("denies writes outside memory lanes and advisory-only memory writes", () => {
		const outsideLane = enforceMemoryAccess(
			{ declaredUse: "advisor" as const },
			{
				kind: "write",
				store: "memory",
				namespace: { scope: "project" },
				source: "compaction-summary",
				contentTier: "summary",
				payload: "summary",
			},
			baseContext,
		);
		expect(outsideLane.kind).toBe("deny");
		expect(outsideLane.rule).toBe("memory.not_a_memory_lane");

		const advisory = enforceMemoryAccess(
			{ declaredUse: "memory" as const, advisoryOnly: true },
			{
				kind: "write",
				store: "memory",
				namespace: { scope: "project" },
				source: "compaction-summary",
				contentTier: "summary",
				payload: "summary",
			},
			baseContext,
		);
		expect(advisory.kind).toBe("deny");
		expect(advisory.rule).toBe("memory.advisory_only");
	});

	it("denies raw payloads for supermemory", () => {
		const decision = enforceMemoryAccess(
			memoryOverlay,
			{
				kind: "write",
				store: "supermemory",
				namespace: { scope: "goal" },
				source: "session-digest",
				contentTier: "raw",
				payload: "raw transcript",
			},
			baseContext,
		);

		expect(decision.kind).toBe("deny");
		expect(decision.rule).toBe("memory.supermemory_raw_denied");
	});

	it("sanitizes payloads with category counts and no raw sensitive values", () => {
		const tokenValue = `Bearer fake-${"z".repeat(40)}`;
		const result = sanitizeMemoryPayload(
			{
				token: tokenValue,
				toolOutput: "raw output should be dropped",
				note: "Contact admin@example.com from /home/bob/project",
			},
			{ source: "session-digest", contentTier: "summary", maxChars: 2000, external: true },
		);

		expect(result.findings.sanitized).toBe(true);
		expect(result.findings.categories.auth).toBeGreaterThanOrEqual(1);
		expect(result.findings.categories.rawTool).toBeGreaterThanOrEqual(1);
		expect(result.findings.categories.pii).toBeGreaterThanOrEqual(1);
		expect(result.findings.categories.path).toBeGreaterThanOrEqual(1);
		const serialized = JSON.stringify(result);
		expect(serialized).not.toContain(tokenValue);
		expect(serialized).not.toContain("raw output should be dropped");
		expect(serialized).not.toContain("admin@example.com");
		expect(serialized).not.toContain("/home/bob");
	});

	it("denies high-density sensitive payloads with counts only", () => {
		const result = sanitizeMemoryPayload(
			{
				first: `Bearer fake-${"a".repeat(40)}`,
				second: `Bearer fake-${"b".repeat(40)}`,
				third: `Bearer fake-${"c".repeat(40)}`,
			},
			{ source: "extension", contentTier: "summary", maxChars: 2000, external: true },
		);

		expect(result.findings.denied).toBe(true);
		expect(result.reason).toBe("memory.sanitizer.high_secret_density");
		const serialized = JSON.stringify(result);
		expect(serialized).not.toContain("fake-");
	});
});

describe("enforceReportOnlyToolInvocation", () => {
	const reportOverlay = { declaredUse: "advisor" as const, mutationMode: "report-only" as const };

	it("allows read tools for advisor source", () => {
		const decision = enforceReportOnlyToolInvocation(reportOverlay, {
			source: "advisor",
			toolName: "read",
			toolCategory: "read",
		});
		expect(decision.kind).toBe("allow");
		expect(decision.rule).toBe("advisor.read_allowed");
	});

	it("denies write and shell tools for advisor source", () => {
		const writeDecision = enforceReportOnlyToolInvocation(reportOverlay, {
			source: "advisor",
			toolName: "edit",
			toolCategory: "write",
		});
		expect(writeDecision.kind).toBe("deny");
		expect(writeDecision.rule).toBe("advisor.mutation_denied");

		const shellDecision = enforceReportOnlyToolInvocation(reportOverlay, {
			source: "advisor",
			toolName: "bash",
			toolCategory: "shell",
		});
		expect(shellDecision.kind).toBe("deny");
		expect(shellDecision.rule).toBe("advisor.mutation_denied");
	});

	it("denies advisor source when overlay is missing", () => {
		const decision = enforceReportOnlyToolInvocation(undefined, {
			source: "advisor",
			toolName: "read",
			toolCategory: "read",
		});
		expect(decision.kind).toBe("deny");
		expect(decision.rule).toBe("advisor.missing_overlay");
	});
});

describe("classifyTodoOverlay", () => {
	it("marks compaction-summary todos as non-authoritative", () => {
		const result = classifyTodoOverlay({ text: "fix tests", source: "compaction-summary" });
		expect(result.authoritative).toBe(false);
		expect("display" in result).toBe(true);
		if ("display" in result) {
			expect(result.display).toBe("fix tests");
		}
	});

	it("marks user-explicit todos as authoritative", () => {
		const result = classifyTodoOverlay({ text: "fix tests", source: "user-explicit" });
		expect(result.authoritative).toBe(true);
		expect("source" in result).toBe(true);
		if ("source" in result) {
			expect(result.source).toBe("user-explicit");
		}
	});
});

describe("enforceCacheOptimizerGate", () => {
	const cacheOverlay = { declaredUse: "cache-perf" as const };

	it("defers when metrics array is empty", () => {
		const decision = enforceCacheOptimizerGate(cacheOverlay, { metrics: [] });
		expect(decision.kind).toBe("defer");
		expect(decision.rule).toBe("pending-measurement-plan");
	});

	it("defers when gate decision is not treatment", () => {
		const decision = enforceCacheOptimizerGate(cacheOverlay, { metrics: ["latency"], gateDecision: "control" });
		expect(decision.kind).toBe("defer");
		expect(decision.rule).toBe("pending-measurement-plan");
	});

	it("allows when metrics exist and decision is treatment", () => {
		const decision = enforceCacheOptimizerGate(cacheOverlay, { metrics: ["latency"], gateDecision: "treatment" });
		expect(decision.kind).toBe("allow");
		expect(decision.rule).toBe("cache.treatment_allowed");
	});
});
