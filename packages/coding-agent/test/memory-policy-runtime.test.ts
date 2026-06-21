import { describe, expect, it } from "vitest";
import { packSummaryInputForTokenBudget, sanitizeSerializedConversation } from "../src/core/compaction/compaction.ts";
import {
	deriveMemoryNamespace,
	enforceMemoryAccess,
	type MemoryAccessRequest,
	type MemoryPolicyContext,
	sanitizeMemoryPayload,
} from "../src/core/policy-overlays-runtime.ts";
import { boundAndSanitizeFirstMessage, boundAndSanitizeSessionDigest } from "../src/core/session-digest.ts";

// ---------------------------------------------------------------------------
// Shared fixtures
// ---------------------------------------------------------------------------

const memoryOverlay = { declaredUse: "memory" as const, advisoryOnly: false };
const baseContext: MemoryPolicyContext = {
	cwd: "/workspace/acme",
	sessionId: "session-123",
	goalId: "goal-alpha",
	laneId: "lane-c",
	laneAuthority: "write-sanitized",
};

// ---------------------------------------------------------------------------
// Acceptance: namespace derivation returns defer when context is insufficient
// ---------------------------------------------------------------------------

describe("memory namespace derivation defers on insufficient context", () => {
	it("defers session scope when sessionId is missing", () => {
		const decision = deriveMemoryNamespace({ ...baseContext, sessionId: undefined }, { scope: "session" });
		expect(decision.kind).toBe("defer");
		if (decision.kind === "defer") {
			expect(decision.missing).toContain("sessionId");
			expect(decision.rule).toBe("memory.namespace.missing_context");
		}
	});

	it("defers goal scope when goalId is missing", () => {
		const decision = deriveMemoryNamespace({ ...baseContext, goalId: undefined }, { scope: "goal" });
		expect(decision.kind).toBe("defer");
		if (decision.kind === "defer") expect(decision.missing).toContain("goalId");
	});

	it("defers lane scope when laneId is missing", () => {
		const decision = deriveMemoryNamespace({ ...baseContext, laneId: undefined }, { scope: "lane" });
		expect(decision.kind).toBe("defer");
		if (decision.kind === "defer") expect(decision.missing).toContain("laneId");
	});

	it("defers user scope when userId is missing", () => {
		const decision = deriveMemoryNamespace({ ...baseContext, userId: undefined }, { scope: "user" });
		expect(decision.kind).toBe("defer");
		if (decision.kind === "defer") expect(decision.missing).toContain("userId");
	});

	it("derives a project namespace without optional context and never defers", () => {
		const decision = deriveMemoryNamespace({ cwd: "/workspace/acme", laneAuthority: "none" }, { scope: "project" });
		expect(decision.kind).toBe("allow");
		if (decision.kind === "allow") {
			expect(decision.namespace).toMatch(/^omk:project:[a-f0-9]{16}$/);
		}
	});

	it("allows an explicit project root that contains the current workspace", () => {
		const decision = deriveMemoryNamespace(
			{ cwd: "/workspace/acme/packages/coding-agent", laneAuthority: "none" },
			{ scope: "project", projectRoot: "/workspace/acme" },
		);
		expect(decision.kind).toBe("allow");
	});

	it("denies explicit project roots outside the current workspace namespace", () => {
		const decision = deriveMemoryNamespace(baseContext, { scope: "project", projectRoot: "/workspace/other" });
		expect(decision.kind).toBe("deny");
		if (decision.kind === "deny") {
			expect(decision.rule).toBe("memory.namespace.project_root_mismatch");
		}
	});

	it("propagates defer through enforceMemoryAccess for a missing namespace field", () => {
		const request: MemoryAccessRequest = {
			kind: "write",
			store: "memory",
			namespace: { scope: "goal" },
			source: "compaction-summary",
			contentTier: "summary",
			payload: "ok",
		};
		const decision = enforceMemoryAccess(memoryOverlay, request, { ...baseContext, goalId: undefined });
		expect(decision.kind).toBe("defer");
		if (decision.kind === "defer") expect(decision.missing).toContain("goalId");
	});

	it("propagates cross-project namespace denial through enforceMemoryAccess", () => {
		const request: MemoryAccessRequest = {
			kind: "write",
			store: "memory",
			namespace: { scope: "project", projectRoot: "/workspace/other" },
			source: "compaction-summary",
			contentTier: "summary",
			payload: "ok",
		};
		const decision = enforceMemoryAccess(memoryOverlay, request, baseContext);
		expect(decision.kind).toBe("deny");
		if (decision.kind === "deny") expect(decision.rule).toBe("memory.namespace.project_root_mismatch");
	});
});

// ---------------------------------------------------------------------------
// Acceptance: sanitizer redacts secret-like values, API keys, auth tokens,
// PII-like values, and home paths without raw match leakage
// ---------------------------------------------------------------------------

describe("memory sanitizer redacts sensitive values without leaking raw matches", () => {
	it("redacts bearer tokens, JWTs, provider tokens, and AWS keys", () => {
		const bearer = `Bearer fake-bearer-${"a".repeat(24)}`;
		const jwt = "eyJhbGciOi.eyJzdWIiOi.SflKxwRJSmKK";
		const providerKey = `sk-proj-${"b".repeat(24)}`;
		const githubPat = `ghp_${"c".repeat(24)}`;
		const awsKey = `AKIA${"IOSFODNN7EXAMPLE".slice(0, 16)}`;
		const result = sanitizeMemoryPayload(
			{ auth: bearer, id: jwt, key: providerKey, pat: githubPat, aws: awsKey, note: "kept" },
			{ source: "extension", contentTier: "summary", maxChars: 4000, external: true },
		);
		expect(result.findings.redactionCount).toBeGreaterThanOrEqual(5);
		const serialized = JSON.stringify(result);
		for (const secret of [bearer, jwt, providerKey, githubPat, awsKey]) {
			expect(serialized).not.toContain(secret);
		}
		expect(result.payload).toMatchObject({ note: "kept" });
	});

	it("redacts emails, phone-like numbers, SSN/credit-card sequences, and home paths", () => {
		const email = "operator@acme-corp.io";
		const phone = "+1-415-555-0142";
		const ssn = "123-45-6789";
		const card = "4111 1111 1111 1111";
		const homePath = "/home/alice/secret-dir";
		const result = sanitizeMemoryPayload(`reach ${email} at ${phone} ssn ${ssn} card ${card} files ${homePath}`, {
			source: "compaction-summary",
			contentTier: "summary",
			maxChars: 4000,
			external: false,
		});
		const serialized = JSON.stringify(result);
		expect(result.findings.categories.pii).toBeGreaterThanOrEqual(1);
		expect(result.findings.categories.path).toBeGreaterThanOrEqual(1);
		for (const sensitive of [email, phone, ssn, card, homePath]) {
			expect(serialized).not.toContain(sensitive);
		}
	});

	it("redacts PEM private key blocks and marks the payload as denied", () => {
		const pem = `-----BEGIN RSA PRIVATE KEY-----\nMIIE${"A".repeat(120)}\n-----END RSA PRIVATE KEY-----`;
		const result = sanitizeMemoryPayload(
			{ cert: pem, note: "safe" },
			{ source: "extension", contentTier: "summary", maxChars: 4000, external: true },
		);
		expect(result.findings.denied).toBe(true);
		expect(result.reason).toBe("memory.sanitizer.private_key");
		expect(JSON.stringify(result)).not.toContain(pem);
		expect(result.payload).toMatchObject({ note: "safe" });
	});

	it("redacts secret-like key assignments in freeform text even for short values", () => {
		const apiKey = "short-secret-value";
		const password = "hunter2";
		const cookie = "sid-short";
		const result = sanitizeMemoryPayload(`apiKey=${apiKey}\npassword: ${password}\ncookie=${cookie}\nstatus=kept`, {
			source: "session-digest",
			contentTier: "summary",
			maxChars: 4000,
			external: false,
		});
		const serialized = JSON.stringify(result);
		expect(result.findings.redactionCount).toBeGreaterThanOrEqual(3);
		for (const sensitive of [apiKey, password, cookie]) {
			expect(serialized).not.toContain(sensitive);
		}
		expect(serialized).toContain("status=kept");
	});

	it("never exposes original sensitive values in the decision digest or categories", () => {
		const token = `sk-ant-${"z".repeat(30)}`;
		const result = sanitizeMemoryPayload(
			{ api_key: token },
			{
				source: "user-explicit",
				contentTier: "summary",
				maxChars: 2000,
				external: true,
			},
		);
		const serialized = JSON.stringify(result.findings);
		expect(serialized).not.toContain(token);
		expect(result.findings.categories.secret).toBeGreaterThanOrEqual(1);
	});
});

// ---------------------------------------------------------------------------
// Acceptance: supermemory / raw tier denied by policy model
// ---------------------------------------------------------------------------

describe("enforceMemoryAccess store and content-tier rules", () => {
	it("denies raw payloads targeting the supermemory store", () => {
		const request: MemoryAccessRequest = {
			kind: "write",
			store: "supermemory",
			namespace: { scope: "goal" },
			source: "session-digest",
			contentTier: "raw",
			payload: "raw transcript",
		};
		const decision = enforceMemoryAccess(memoryOverlay, request, baseContext);
		expect(decision.kind).toBe("deny");
		if (decision.kind === "deny") {
			expect(decision.rule).toBe("memory.supermemory_raw_denied");
		}
	});

	it("allows raw local memory only with explicit user-global authority and clean payload", () => {
		const request: MemoryAccessRequest = {
			kind: "write",
			store: "memory",
			namespace: { scope: "project" },
			source: "user-explicit",
			contentTier: "raw",
			payload: "clean user-authored note",
		};
		const decision = enforceMemoryAccess(memoryOverlay, request, { ...baseContext, laneAuthority: "write-global" });
		expect(decision.kind).toBe("allow");
		if (decision.kind === "allow") {
			expect(decision.rule).toBe("memory.write_sanitized");
			expect(decision.findings.redactionCount).toBe(0);
		}
	});

	it("denies raw local memory when the payload still contains sanitizer findings", () => {
		const request: MemoryAccessRequest = {
			kind: "write",
			store: "memory",
			namespace: { scope: "project" },
			source: "user-explicit",
			contentTier: "raw",
			payload: `Bearer leak-${"x".repeat(24)}`,
		};
		const decision = enforceMemoryAccess(memoryOverlay, request, { ...baseContext, laneAuthority: "write-global" });
		expect(decision.kind).toBe("deny");
		if (decision.kind === "deny") {
			expect(decision.rule).toBe("memory.raw_sensitive_denied");
			expect(JSON.stringify(decision)).not.toContain("leak-");
		}
	});

	it("allows sanitized supermemory summary writes for memory lanes", () => {
		const request: MemoryAccessRequest = {
			kind: "write",
			store: "supermemory",
			namespace: { scope: "goal" },
			source: "compaction-summary",
			contentTier: "summary",
			payload: { note: "Goal checkpoint", lead: "operator@acme.io" },
		};
		const decision = enforceMemoryAccess(memoryOverlay, request, baseContext);
		expect(decision.kind).toBe("allow");
		if (decision.kind === "allow") {
			expect(decision.rule).toBe("memory.write_sanitized");
			expect(decision.sanitizedPayload).toBeDefined();
			expect(JSON.stringify(decision)).not.toContain("operator@acme.io");
		}
	});
});

// ---------------------------------------------------------------------------
// Acceptance: session digest path uses sanitization (exported pure helpers)
// ---------------------------------------------------------------------------

describe("session digest sanitized pure helpers", () => {
	it("boundAndSanitizeSessionDigest redacts secrets and preserves head/tail structure", () => {
		const segments = [
			"Reach admin@acme.io from /home/bob",
			`Auth header: Bearer realtok-${"9".repeat(20)}`,
			"Plan: keep the HEAD marker visible",
		];
		const result = boundAndSanitizeSessionDigest(segments, { maxChars: 400 });
		expect(result.findings.redactionCount).toBeGreaterThanOrEqual(3);
		expect(result.findings.categories.pii).toBeGreaterThanOrEqual(1);
		expect(result.findings.categories.path).toBeGreaterThanOrEqual(1);
		expect(result.findings.categories.auth).toBeGreaterThanOrEqual(1);
		expect(result.text).toContain("HEAD marker");
		const serialized = JSON.stringify(result);
		expect(serialized).not.toContain("admin@acme.io");
		expect(serialized).not.toContain("/home/bob");
		expect(serialized).not.toContain("realtok-");
		expect(result.text.length).toBeLessThanOrEqual(400);
	});

	it("boundAndSanitizeFirstMessage redacts and bounds the first message", () => {
		const text = `first: reach dev@startup.io in /home/dev and use Bearer earlytok-${"0".repeat(20)}`;
		const result = boundAndSanitizeFirstMessage(text, 80);
		expect(result.text.length).toBeLessThanOrEqual(80);
		expect(result.findings.redactionCount).toBeGreaterThanOrEqual(2);
		expect(result.text).not.toContain("dev@startup.io");
		expect(result.text).not.toContain("/home/dev");
		expect(result.text).not.toContain("earlytok-");
	});

	it("leaves clean digest text unchanged in structure and length budget", () => {
		const result = boundAndSanitizeSessionDigest(["alpha", "beta", "gamma"], { maxChars: 100 });
		expect(result.text).toBe("alpha beta gamma");
		expect(result.findings.redactionCount).toBe(0);
		expect(result.findings.sanitized).toBe(false);
	});
});

// ---------------------------------------------------------------------------
// Acceptance: compaction path uses sanitization (exported pure helper + wiring)
// ---------------------------------------------------------------------------

describe("compaction serialized-conversation sanitization", () => {
	it("sanitizeSerializedConversation redacts auth tokens, JWTs, and tool-result secrets", () => {
		const text = [
			"[User]: use the credential below",
			`[Assistant tool calls]: edit(path="/home/carol/secret.txt")`,
			`[Tool result]: AUTH=Bearer compactiontok-${"1".repeat(24)}`,
			`token=eyJhbGciOi.eyJzdWIiOi.SflKxwRJSmKK`,
		].join("\n");
		const result = sanitizeSerializedConversation(text);
		const serialized = JSON.stringify(result);
		expect(result.findings.redactionCount).toBeGreaterThanOrEqual(1);
		expect(serialized).not.toContain("compactiontok-");
		expect(serialized).not.toContain("eyJhbGciOi.eyJzdWIiOi.SflKxwRJSmKK");
		expect(serialized).not.toContain("/home/carol");
	});

	it("keeps safe file paths and command-exit summaries while redacting secrets", () => {
		const text =
			"[User]: edited packages/coding-agent/src/index.ts; npm run check exited 0; key=sk-leak-tok-1234567890abcdef";
		const result = sanitizeSerializedConversation(text);
		expect(result.text).toContain("packages/coding-agent/src/index.ts");
		expect(result.text).toContain("npm run check");
		expect(result.text).not.toContain("sk-leak-tok-");
	});

	it("packSummaryInputForTokenBudget redacts secrets in packed summarizer input", () => {
		const secret = `Bearer packtok-${"2".repeat(24)}`;
		const text = `HEADTOKEN ${secret} ${"x".repeat(300)} middle ${"y".repeat(300)} TAILTOKEN`;
		const packed = packSummaryInputForTokenBudget(text, 80, 600);
		expect(packed.text).not.toContain(secret);
		expect(packed.text).toContain("HEADTOKEN");
		expect(packed.text).toContain("TAILTOKEN");
		expect(packed.wasCompressed).toBe(true);
		expect(JSON.stringify(packed)).not.toContain("packtok-");
	});

	it("packSummaryInputForTokenBudget leaves clean small input unchanged", () => {
		const text = "short serialized conversation with HEADTOKEN and TAILTOKEN";
		const packed = packSummaryInputForTokenBudget(text, 1000, 1000);
		expect(packed.text).toBe(text);
		expect(packed.wasCompressed).toBe(false);
	});
});
