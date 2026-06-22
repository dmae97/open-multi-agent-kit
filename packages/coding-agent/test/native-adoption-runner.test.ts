/**
 * RED lane (TDD): failing smoke-runner tests for the future *test-only* runner at
 *   packages/coding-agent/test/bench/native-adoption-runner.ts   (= "./bench/native-adoption-runner.ts")
 * imported here as "./bench/native-adoption-runner.ts".
 *
 * The runner does not exist yet. Every test in this file is EXPECTED TO FAIL at module
 * resolution ("Cannot find module .../bench/native-adoption-runner.ts" or
 * "does not provide an export named 'runNativeAdoptionSmokeRunner'"). That is the correct
 * RED signal: the suite fails because the feature is missing, not because of a typo.
 *
 * Contract pinned by these tests (minimal, fail-closed, test-only; never shipped from src/):
 *   export const NATIVE_ADOPTION_RUN_DIR = ".omk/runs/native-adoption"
 *   export function runNativeAdoptionSmokeRunner(options?): NativeAdoptionSmokeRunnerResult
 *   where result := {
 *     schemaVersion: "native-adoption-smoke.v1",
 *     runtimeCallsites: number,
 *     skippedMeasurements: boolean,                  // true when runtimeCallsites === 0 (fail-closed)
 *     measurements: readonly { target: string }[],   // [] when measurements are skipped
 *     decision: { verdict: "go" | "no-go" | "needs-telemetry"; reasons: readonly string[] },
 *     outPath: string,                                // always within NATIVE_ADOPTION_RUN_DIR
 *     writes: readonly string[],                      // JSON artifact paths only; never native/ or Rust
 *   }
 *   - an outPath outside NATIVE_ADOPTION_RUN_DIR (incl. path-traversal out of it) throws.
 *   - the default callsite profile yields runtimeCallsites === 0, so the runner never measures.
 *   - the smoke runner never creates native/ or Rust (.rs / Cargo.*) files.
 *
 * Determinism: injected clock + frozen provenance + a tiny fixture; no real timing, filesystem,
 * or network state is asserted (kept small and order-independent on purpose).
 */
import { describe, expect, it } from "vitest";
import {
	NATIVE_ADOPTION_RUN_DIR,
	type NativeAdoptionSmokeRunnerResult,
	runNativeAdoptionSmokeRunner,
} from "./bench/native-adoption-runner.ts";

const fixedClock = (): (() => number) => {
	let t = 0;
	return () => {
		t += 1_000_000;
		return t;
	};
};

const SMOKE = {
	fixture: { candidateCount: 6, embeddingDimensions: 4, seed: 1 },
	measure: { iterations: 1, warmupIterations: 0, clock: fixedClock() },
	generatedAt: "2026-06-22T00:00:00.000Z",
	repoSha: "0000000000000000000000000000000000000000",
	runtime: "node-test",
} as const;

// Matches a native/ path segment, a Rust source file, or a Cargo manifest/lock.
const NATIVE_OR_RUST = /(^|\/)native\/|\.rs$|(^|\/)Cargo\.(toml|lock)$/i;

describe("native-adoption smoke runner (Wave 0, RED)", () => {
	it("fails closed to no-go/runtime-callsite-absent and skips measurements when runtimeCallsites === 0", () => {
		const result: NativeAdoptionSmokeRunnerResult = runNativeAdoptionSmokeRunner({
			...SMOKE,
			callsites: { runtimeCallsites: 0, testCallsites: 3, definitionCallsites: 1, exportCallsites: 1 },
		});

		expect(result.runtimeCallsites).toBe(0);
		expect(result.decision.verdict).toBe("no-go");
		expect(result.decision.reasons).toContain("runtime-callsite-absent");
		expect(result.skippedMeasurements).toBe(true);
		expect(result.measurements).toHaveLength(0);
	});

	it("does not measure under the default callsite profile", () => {
		const result = runNativeAdoptionSmokeRunner({ ...SMOKE });

		expect(result.schemaVersion).toBe("native-adoption-smoke.v1");
		expect(result.runtimeCallsites).toBe(0);
		expect(result.skippedMeasurements).toBe(true);
		expect(result.measurements).toEqual([]);
	});

	it("rejects an outPath outside .omk/runs/native-adoption", () => {
		expect(NATIVE_ADOPTION_RUN_DIR).toBe(".omk/runs/native-adoption");

		expect(() => runNativeAdoptionSmokeRunner({ ...SMOKE, outPath: ".omk/runs/elsewhere/baseline.json" })).toThrow(
			/native-adoption/i,
		);

		expect(() =>
			runNativeAdoptionSmokeRunner({ ...SMOKE, outPath: ".omk/runs/native-adoption/../escape.json" }),
		).toThrow(/native-adoption/i);

		const accepted = runNativeAdoptionSmokeRunner({
			...SMOKE,
			outPath: ".omk/runs/native-adoption/smoke-baseline.json",
		});
		expect(accepted.outPath).toBe(".omk/runs/native-adoption/smoke-baseline.json");
	});

	it("never creates native/ or Rust files (writes JSON baselines only)", () => {
		const result = runNativeAdoptionSmokeRunner({
			...SMOKE,
			outPath: ".omk/runs/native-adoption/smoke-baseline.json",
		});

		for (const written of result.writes) {
			expect(written).not.toMatch(NATIVE_OR_RUST);
			expect(written.startsWith(`${NATIVE_ADOPTION_RUN_DIR}/`)).toBe(true);
		}
		expect(result.writes.some((written) => written.endsWith(".rs"))).toBe(false);
	});
});
