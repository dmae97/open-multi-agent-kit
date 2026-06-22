import { describe, expect, it } from "vitest";
import {
	assertNativeAdoptionBaselineSecretFree,
	assertNativeAdoptionFixtureSecretFree,
	classifyNativeAdoptionCallsites,
	createNativeAdoptionBaseline,
	createNativeAdoptionFixture,
	evaluateNativeAdoptionGate,
	runNativeAdoptionTarget,
	scanNativeAdoptionForbiddenImports,
	summarizeNativeAdoptionSamples,
	withNativeAdoptionSideEffectGuards,
} from "../src/core/native-adoption-benchmark.ts";

describe("native adoption benchmark Wave 0 primitives", () => {
	it("creates deterministic secret-free fixtures with byte-stable manifests", () => {
		const first = createNativeAdoptionFixture({ candidateCount: 12, embeddingDimensions: 4, seed: 0xc0ffee });
		const second = createNativeAdoptionFixture({ candidateCount: 12, embeddingDimensions: 4, seed: 0xc0ffee });

		expect(first.manifest.sha256).toBe(second.manifest.sha256);
		expect(first.candidates[0]?.embedding).toEqual(second.candidates[0]?.embedding);
		expect(first.candidates).toHaveLength(12);
		expect(first.queryEmbedding).toHaveLength(4);
		expect(() => assertNativeAdoptionFixtureSecretFree(first)).not.toThrow();
	});

	it("rejects secret-like fixture content before benchmark output is persisted", () => {
		const fixture = createNativeAdoptionFixture({ candidateCount: 2, embeddingDimensions: 0, seed: 7 });
		const poisoned = {
			...fixture,
			candidates: [
				{
					...fixture.candidates[0]!,
					content: "DUCKCODING_API_KEY=1234567890abcdef",
				},
				...fixture.candidates.slice(1),
			],
		};

		expect(() => assertNativeAdoptionFixtureSecretFree(poisoned)).toThrow(/secret-like fixture content/i);
	});

	it("summarizes durations with nearest-rank percentiles and coefficient of variation", () => {
		const stats = summarizeNativeAdoptionSamples([10, 20, 30, 40, 50]);

		expect(stats.p50Ns).toBe(30);
		expect(stats.p95Ns).toBe(50);
		expect(stats.p99Ns).toBe(50);
		expect(stats.meanNs).toBe(30);
		expect(stats.coefficientOfVariation).toBeGreaterThan(0);
	});

	it("runs benchmark targets without provider, spawn, or file-read side effects", () => {
		const fixture = createNativeAdoptionFixture({ candidateCount: 8, embeddingDimensions: 3, seed: 99 });
		const result = withNativeAdoptionSideEffectGuards(() => runNativeAdoptionTarget("selectMmrContext", fixture));

		expect(result.sideEffects.network).toBe(0);
		expect(result.sideEffects.spawn).toBe(0);
		expect(result.sideEffects.fileRead).toBe(0);
		expect(result.value.target).toBe("selectMmrContext");
		expect(result.value.outputDigest).toMatch(/^[a-f0-9]{64}$/);
	});

	it("fails closed when guarded benchmark code attempts network access", () => {
		expect(() =>
			withNativeAdoptionSideEffectGuards(() => {
				void fetch("https://example.invalid");
				return "unreachable";
			}),
		).toThrow(/forbidden side effect/i);
	});

	it("classifies runtime callsites separately from tests, definitions, and barrel exports", () => {
		const result = classifyNativeAdoptionCallsites({
			symbols: ["selectMmrContext"],
			files: [
				{
					path: "packages/coding-agent/src/core/context-graph-retrieval.ts",
					content: "export function selectMmrContext() {}",
				},
				{
					path: "packages/coding-agent/src/index.ts",
					content: 'export * from "./core/context-graph-retrieval.ts";',
				},
				{
					path: "packages/coding-agent/test/context-graph-retrieval.test.ts",
					content: "selectMmrContext([], { tokenBudget: 10 })",
				},
				{
					path: "packages/coding-agent/src/core/runtime-consumer.ts",
					content: "selectMmrContext(candidates, options)",
				},
			],
		});

		expect(result.runtimeCallsites).toBe(1);
		expect(result.testCallsites).toBe(1);
		expect(result.definitionCallsites).toBe(1);
		expect(result.exportCallsites).toBe(1);
	});

	it("returns no-go when runtime callsites are absent even if synthetic speedup looks good", () => {
		const decision = evaluateNativeAdoptionGate({
			runtimeCallsites: 0,
			bottleneckClass: "cpu",
			typescriptP95Ns: 3_000_000,
			projectedRustP95Ns: 300_000,
			ipcOverheadP95Ns: 100_000,
			movableFraction: 0.9,
			startupP95Ms: 80,
			rssDeltaMb: 20,
			archiveDeltaMb: 8,
			sideEffectViolations: [],
		});

		expect(decision.verdict).toBe("no-go");
		expect(decision.reasons).toContain("runtime-callsite-absent");
	});

	it("returns go only when CPU-bound p95 net speedup and operational budgets pass", () => {
		const decision = evaluateNativeAdoptionGate({
			runtimeCallsites: 4,
			bottleneckClass: "cpu",
			typescriptP95Ns: 10_000_000,
			projectedRustP95Ns: 1_000_000,
			ipcOverheadP95Ns: 500_000,
			movableFraction: 0.9,
			startupP95Ms: 90,
			rssDeltaMb: 32,
			archiveDeltaMb: 9,
			sideEffectViolations: [],
		});

		expect(decision.verdict).toBe("go");
		expect(decision.metrics.projectedNetSpeedup).toBeGreaterThan(3);
		expect(decision.metrics.ipcOverheadFraction).toBeLessThan(0.3);
	});

	it("creates a native-adoption-baseline.v1 artifact without exposing environment values", () => {
		const fixture = createNativeAdoptionFixture({ candidateCount: 4, embeddingDimensions: 0, seed: 1 });
		const baseline = createNativeAdoptionBaseline({
			repoSha: "abc123",
			runtime: "node-test",
			generatedAt: "2026-06-22T00:00:00.000Z",
			fixture,
			measurements: [],
			decision: evaluateNativeAdoptionGate({
				runtimeCallsites: 0,
				bottleneckClass: "unknown",
				typescriptP95Ns: 0,
				projectedRustP95Ns: 0,
				ipcOverheadP95Ns: 0,
				movableFraction: 0,
				startupP95Ms: 0,
				rssDeltaMb: 0,
				archiveDeltaMb: 0,
				sideEffectViolations: [],
			}),
		});

		expect(baseline.schemaVersion).toBe("native-adoption-baseline.v1");
		expect(baseline.env).toEqual({});
		expect(JSON.stringify(baseline)).not.toContain("API_KEY");
	});
});

describe("native adoption benchmark Wave 0 primitive hardening (RED)", () => {
	it("rejects secret-like content embedded in baseline decision reasons", () => {
		const poisoned = {
			...buildCleanNativeAdoptionBaseline(),
			decision: {
				...buildCleanNativeAdoptionBaseline().decision,
				reasons: ["runtime-callsite-absent", "AWS_SECRET_ACCESS_KEY=AKIA0123456789ABCDEF"],
			},
		};

		expect(() => assertNativeAdoptionBaselineSecretFree(poisoned)).toThrow(/secret-like baseline content/i);
	});

	it("rejects secret-like content embedded in measurement output digests", () => {
		const poisoned = {
			...buildCleanNativeAdoptionBaseline(),
			measurements: [
				{
					target: "selectMmrContext",
					operations: 1,
					outputDigest: "ghp_0123456789abcdef0123456789abcdef0123",
					stats: summarizeNativeAdoptionSamples([1, 2, 3]),
					sideEffects: { network: 0, spawn: 0, fileRead: 0 },
				},
			],
		};

		expect(() => assertNativeAdoptionBaselineSecretFree(poisoned)).toThrow(/secret-like baseline content/i);
	});

	it("accepts a fully clean baseline document", () => {
		expect(() => assertNativeAdoptionBaselineSecretFree(buildCleanNativeAdoptionBaseline())).not.toThrow();
	});

	it("separates benchmark harness callsites from production runtime callsites", () => {
		const result = classifyNativeAdoptionCallsites({
			symbols: ["selectMmrContext"],
			files: [
				{
					path: "packages/coding-agent/src/core/native-adoption-benchmark.ts",
					content: "const r = selectMmrContext(fixture.candidates, { tokenBudget: 10 });",
				},
				{
					path: "packages/coding-agent/src/core/runtime-consumer.ts",
					content: "selectMmrContext(candidates, options)",
				},
			],
		});

		expect(result.harnessCallsites).toBe(1);
		expect(result.runtimeCallsites).toBe(1);
		expect(result.bySymbol.selectMmrContext?.harness).toBe(1);
	});

	it("ignores import, string, comment, and member-only references when counting runtime callsites", () => {
		const result = classifyNativeAdoptionCallsites({
			symbols: ["selectMmrContext"],
			files: [
				{
					path: "packages/coding-agent/src/core/import-only-consumer.ts",
					content: 'import { selectMmrContext } from "./context-graph-retrieval.ts";',
				},
				{
					path: "packages/coding-agent/src/core/string-comment-consumer.ts",
					content: [
						"// selectMmrContext is mentioned only in this comment",
						'const label = "selectMmrContext";',
						"telemetry.selectMmrContext = true;",
					].join("\n"),
				},
			],
		});

		expect(result.runtimeCallsites).toBe(0);
	});

	it("flags forbidden node:fs and child_process imports in scanned sources", () => {
		const violations = scanNativeAdoptionForbiddenImports([
			{
				path: "packages/coding-agent/src/core/native-adoption-benchmark.ts",
				content: 'import { readFileSync } from "node:fs";',
			},
			{
				path: "scripts/native-adoption-runner.ts",
				content: 'import { spawn } from "child_process";',
			},
		]);

		expect(violations).toHaveLength(2);
		const serialized = JSON.stringify(violations);
		expect(serialized).toContain("node:fs");
		expect(serialized).toContain("child_process");
	});

	it("passes sources that avoid forbidden runtime imports", () => {
		const violations = scanNativeAdoptionForbiddenImports([
			{
				path: "packages/coding-agent/src/core/native-adoption-benchmark.ts",
				content: 'import { createHash } from "node:crypto";',
			},
		]);

		expect(violations).toHaveLength(0);
	});
});

function buildCleanNativeAdoptionBaseline() {
	const fixture = createNativeAdoptionFixture({ candidateCount: 4, embeddingDimensions: 0, seed: 5 });
	return createNativeAdoptionBaseline({
		repoSha: "deadbeef",
		runtime: "node-test",
		generatedAt: "2026-06-22T00:00:00.000Z",
		fixture,
		measurements: [],
		decision: evaluateNativeAdoptionGate({
			runtimeCallsites: 0,
			bottleneckClass: "unknown",
			typescriptP95Ns: 0,
			projectedRustP95Ns: 0,
			ipcOverheadP95Ns: 0,
			movableFraction: 0,
			startupP95Ms: 0,
			rssDeltaMb: 0,
			archiveDeltaMb: 0,
			sideEffectViolations: [],
		}),
	});
}
