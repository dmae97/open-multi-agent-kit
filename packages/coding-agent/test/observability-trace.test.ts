import { describe, expect, it } from "vitest";
import {
	createObservabilityTrace,
	decideExternalSink,
	sanitizeTraceData,
	shouldExportTrace,
} from "../src/core/observability-trace.ts";

describe("trace export decisions", () => {
	it("is disabled by default", () => {
		expect(shouldExportTrace({})).toBe(false);
		expect(decideExternalSink({})).toMatchObject({ allowed: false, rule: "trace.disabled" });
	});

	it("offline mode blocks external export", () => {
		expect(shouldExportTrace({ enabled: true }, { offline: true })).toBe(false);
		expect(decideExternalSink({ enabled: true, sink: "braintrust" }, { offline: true })).toMatchObject({
			allowed: false,
			rule: "trace.disabled",
		});
	});

	it("allows braintrust only when explicitly enabled", () => {
		expect(decideExternalSink({ enabled: true, sink: "local" })).toMatchObject({
			allowed: false,
			rule: "trace.local",
		});
		expect(decideExternalSink({ enabled: true, sink: "braintrust" })).toMatchObject({
			allowed: true,
			rule: "trace.external_allowed",
		});
	});
});

describe("trace data sanitizer", () => {
	it("drops raw prompt, output, headers, cookies, and env fields", () => {
		const sanitized = sanitizeTraceData({
			prompt: "private prompt",
			stdout: "raw output",
			headers: { authorization: "Bearer abc" },
			cookies: "session=secret",
			env: { TOKEN: "secret" },
			safe: "kept",
		});
		expect(sanitized).toEqual({ safe: "kept" });
	});

	it("redacts secret-like keys and token-like string values", () => {
		const sanitized = sanitizeTraceData({ apiKey: "sk-secret-value", message: "Authorization: Bearer abc.def.ghi" });
		expect(sanitized).toEqual({ apiKey: "[redacted]", message: "[redacted]" });
	});
});

describe("createObservabilityTrace", () => {
	it("hashes run/session ids and keeps sanitized metadata", () => {
		const trace = createObservabilityTrace(
			{
				runId: "run-1",
				sessionId: "session-1",
				operationId: "op-1",
				timestamp: "2026-06-21T00:00:00Z",
				kind: "spec.verify",
				status: "completed",
				data: { requirement: "R1", stdout: "hidden" },
				artifacts: [{ path: "reports/result.md", exists: true, allowed: true, sizeBytes: 10, sha256: "abc" }],
			},
			{ source: "harness-control", cwd: "/repo" },
		);

		expect(trace.schemaVersion).toBe("omk.observability.trace.v1");
		expect(trace.runIdHash).toMatch(/^[a-f0-9]{64}$/);
		expect(trace.sessionIdHash).toMatch(/^[a-f0-9]{64}$/);
		expect(trace.sanitizedData).toEqual({ requirement: "R1" });
		expect(trace.artifacts[0]).toMatchObject({ relPath: "reports/result.md", sha256: "abc" });
	});

	it("does not expose sensitive artifact paths as relative paths", () => {
		const trace = createObservabilityTrace(
			{
				runId: "run-1",
				operationId: "op-1",
				timestamp: "2026-06-21T00:00:00Z",
				kind: "spec.verify",
				status: "completed",
				artifacts: [{ path: ".env", exists: true, allowed: false }],
			},
			{ source: "harness-control", cwd: "/repo" },
		);

		expect(trace.artifacts[0].pathHash).toMatch(/^[a-f0-9]{64}$/);
		expect(trace.artifacts[0].relPath).toBeUndefined();
	});

	it("adds external metadata only when requested", () => {
		const trace = createObservabilityTrace(
			{
				runId: "run-1",
				operationId: "op-1",
				timestamp: "2026-06-21T00:00:00Z",
				kind: "spec.verify",
				status: "completed",
				data: { ok: true },
			},
			{ source: "verification", sink: "braintrust", contentTier: "metadata" },
		);
		expect(trace.external).toMatchObject({ sink: "braintrust", contentTier: "metadata" });
	});
});
