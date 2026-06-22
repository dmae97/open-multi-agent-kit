import {
	createNativeAdoptionBaseline,
	createNativeAdoptionFixture,
	evaluateNativeAdoptionGate,
	measureNativeAdoptionTarget,
	type NativeAdoptionCallsiteSummary,
	type NativeAdoptionGateDecision,
	type NativeAdoptionMeasureOptions,
	type NativeAdoptionTargetMeasurement,
} from "../../src/core/native-adoption-benchmark.ts";

export const NATIVE_ADOPTION_RUN_DIR = ".omk/runs/native-adoption";

export interface NativeAdoptionSmokeRunnerFixtureOptions {
	candidateCount: number;
	embeddingDimensions: number;
	seed?: number;
}

export interface NativeAdoptionSmokeRunnerCallsites {
	runtimeCallsites: number;
	testCallsites: number;
	definitionCallsites: number;
	exportCallsites: number;
	harnessCallsites?: number;
}

export interface NativeAdoptionSmokeRunnerOptions {
	fixture?: NativeAdoptionSmokeRunnerFixtureOptions;
	measure?: NativeAdoptionMeasureOptions;
	generatedAt?: string;
	repoSha?: string;
	runtime?: string;
	outPath?: string;
	callsites?: NativeAdoptionSmokeRunnerCallsites;
}

export interface NativeAdoptionSmokeRunnerResult {
	schemaVersion: "native-adoption-smoke.v1";
	runtimeCallsites: number;
	skippedMeasurements: boolean;
	measurements: readonly NativeAdoptionTargetMeasurement[];
	decision: NativeAdoptionGateDecision;
	outPath: string;
	writes: readonly string[];
	callsiteProof: NativeAdoptionCallsiteSummary;
}

export function runNativeAdoptionSmokeRunner(
	options: NativeAdoptionSmokeRunnerOptions = {},
): NativeAdoptionSmokeRunnerResult {
	const outPath = resolveNativeAdoptionOutPath(
		options.outPath ?? `${NATIVE_ADOPTION_RUN_DIR}/native-adoption-smoke.json`,
	);
	const callsiteProof = createCallsiteProof(options.callsites);
	const skippedMeasurements = callsiteProof.runtimeCallsites <= 0;
	const fixture = createNativeAdoptionFixture(
		options.fixture ?? { candidateCount: 16, embeddingDimensions: 0, seed: 0xc0ffee },
	);
	const measurements = skippedMeasurements
		? []
		: [
				measureNativeAdoptionTarget(
					"selectMmrContext",
					fixture,
					options.measure ?? { iterations: 1, warmupIterations: 0 },
				),
			];
	const p95Ns = measurements[0]?.stats.p95Ns ?? 0;
	const sideEffectViolations = measurements.flatMap((measurement) => formatMeasurementSideEffects(measurement));
	const decision = evaluateNativeAdoptionGate({
		runtimeCallsites: callsiteProof.runtimeCallsites,
		bottleneckClass: skippedMeasurements ? "unknown" : "cpu",
		typescriptP95Ns: p95Ns,
		projectedRustP95Ns: skippedMeasurements ? 0 : Math.max(1, Math.floor(p95Ns / 4)),
		ipcOverheadP95Ns: skippedMeasurements ? 0 : Math.max(1, Math.floor(p95Ns / 20)),
		movableFraction: skippedMeasurements ? 0 : 0.8,
		startupP95Ms: 0,
		rssDeltaMb: 0,
		archiveDeltaMb: 0,
		sideEffectViolations,
	});

	if (!skippedMeasurements) {
		createNativeAdoptionBaseline({
			repoSha: options.repoSha ?? "unknown",
			runtime: options.runtime ?? "node-test",
			generatedAt: options.generatedAt ?? new Date(0).toISOString(),
			fixture,
			measurements,
			decision,
		});
	}

	return {
		schemaVersion: "native-adoption-smoke.v1",
		runtimeCallsites: callsiteProof.runtimeCallsites,
		skippedMeasurements,
		measurements,
		decision,
		outPath,
		writes: [outPath],
		callsiteProof,
	};
}

function resolveNativeAdoptionOutPath(outPath: string): string {
	const normalized = normalizeRelativePath(outPath);
	if (normalized !== NATIVE_ADOPTION_RUN_DIR && !normalized.startsWith(`${NATIVE_ADOPTION_RUN_DIR}/`)) {
		throw new Error(`native-adoption output must stay under ${NATIVE_ADOPTION_RUN_DIR}`);
	}
	if (!normalized.endsWith(".json")) {
		throw new Error("native-adoption output must be a JSON artifact");
	}
	return normalized;
}

function normalizeRelativePath(value: string): string {
	const parts: string[] = [];
	for (const rawPart of value.replaceAll("\\", "/").split("/")) {
		if (rawPart === "" || rawPart === ".") continue;
		if (rawPart === "..") {
			parts.pop();
			continue;
		}
		parts.push(rawPart);
	}
	return parts.join("/");
}

function createCallsiteProof(input: NativeAdoptionSmokeRunnerCallsites | undefined): NativeAdoptionCallsiteSummary {
	const runtimeCallsites = input?.runtimeCallsites ?? 0;
	const testCallsites = input?.testCallsites ?? 0;
	const definitionCallsites = input?.definitionCallsites ?? 0;
	const exportCallsites = input?.exportCallsites ?? 0;
	const harnessCallsites = input?.harnessCallsites ?? 0;
	return {
		runtimeCallsites,
		testCallsites,
		definitionCallsites,
		exportCallsites,
		harnessCallsites,
		bySymbol: {},
	};
}

function formatMeasurementSideEffects(measurement: NativeAdoptionTargetMeasurement): string[] {
	const violations: string[] = [];
	if (measurement.sideEffects.network > 0) violations.push(`network:${measurement.sideEffects.network}`);
	if (measurement.sideEffects.spawn > 0) violations.push(`spawn:${measurement.sideEffects.spawn}`);
	if (measurement.sideEffects.fileRead > 0) violations.push(`fileRead:${measurement.sideEffects.fileRead}`);
	return violations;
}
