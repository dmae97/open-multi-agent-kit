import { createHash } from "node:crypto";
import { performance } from "node:perf_hooks";
import {
	canonicalJsonStringify,
	fuseRrfRankings,
	type RetrievalRanking,
	renderContextPack,
	type ScoredContextCandidate,
	scoreRetrievalCandidate,
	scoreTopicalRelevance,
	selectMmrContext,
} from "./context-graph-retrieval.ts";

export const NATIVE_ADOPTION_BASELINE_SCHEMA_VERSION = "native-adoption-baseline.v1";
export const DEFAULT_NATIVE_ADOPTION_SEED = 0xc0ffee;

const DEFAULT_MIN_TYPESCRIPT_P95_NS = 200_000;
const DEFAULT_MIN_MOVABLE_FRACTION = 0.6;
const DEFAULT_MAX_IPC_OVERHEAD_FRACTION = 0.3;
const DEFAULT_MIN_NET_SPEEDUP = 3;
const DEFAULT_MAX_STARTUP_P95_MS = 150;
const DEFAULT_MAX_RSS_DELTA_MB = 64;
const DEFAULT_MAX_ARCHIVE_DELTA_MB = 15;
const DEFAULT_TOKEN_BUDGET = 2_400;

export type NativeAdoptionBenchmarkTarget =
	| "selectMmrContext"
	| "fuseRrfRankings"
	| "scoreTopicalRelevance"
	| "scoreRetrievalCandidate"
	| "renderContextPack"
	| "cacheKeyControl";

export type NativeAdoptionBottleneckClass = "cpu" | "io" | "provider" | "spawn" | "unknown";
export type NativeAdoptionVerdict = "go" | "no-go" | "needs-telemetry";

export interface NativeAdoptionFixtureOptions {
	candidateCount: number;
	embeddingDimensions: number;
	seed?: number;
}

export interface NativeAdoptionFixtureManifest {
	sha256: string;
	payloadBytes: number;
	candidateCount: number;
	embeddingDimensions: number;
	seed: number;
}

export interface NativeAdoptionFixture {
	seed: number;
	candidateCount: number;
	embeddingDimensions: number;
	query: string;
	queryEmbedding?: readonly number[];
	candidates: readonly ScoredContextCandidate[];
	rankings: readonly RetrievalRanking[];
	manifest: NativeAdoptionFixtureManifest;
}

export interface NativeAdoptionSampleStats {
	samples: number;
	minNs: number;
	maxNs: number;
	meanNs: number;
	p50Ns: number;
	p95Ns: number;
	p99Ns: number;
	coefficientOfVariation: number;
}

export interface NativeAdoptionTargetResult {
	target: NativeAdoptionBenchmarkTarget;
	operations: number;
	outputDigest: string;
}

export interface NativeAdoptionTargetMeasurement extends NativeAdoptionTargetResult {
	stats: NativeAdoptionSampleStats;
	sideEffects: NativeAdoptionSideEffectCounts;
}

export interface NativeAdoptionMeasureOptions {
	iterations?: number;
	warmupIterations?: number;
	clock?: () => number;
}

export interface NativeAdoptionGateInput {
	runtimeCallsites: number;
	bottleneckClass: NativeAdoptionBottleneckClass;
	typescriptP95Ns: number;
	projectedRustP95Ns: number;
	ipcOverheadP95Ns: number;
	movableFraction: number;
	startupP95Ms: number;
	rssDeltaMb: number;
	archiveDeltaMb: number;
	sideEffectViolations?: readonly string[];
	budgets?: Partial<NativeAdoptionGateBudgets>;
}

export interface NativeAdoptionGateBudgets {
	minTypeScriptP95Ns: number;
	minMovableFraction: number;
	maxIpcOverheadFraction: number;
	minProjectedNetSpeedup: number;
	maxStartupP95Ms: number;
	maxRssDeltaMb: number;
	maxArchiveDeltaMb: number;
}

export interface NativeAdoptionGateMetrics {
	retainedTypeScriptP95Ns: number;
	sidecarNetP95Ns: number;
	projectedNetSpeedup: number;
	cpuSpeedup: number;
	ipcOverheadFraction: number;
	movableFraction: number;
}

export interface NativeAdoptionGateDecision {
	verdict: NativeAdoptionVerdict;
	reasons: readonly string[];
	metrics: NativeAdoptionGateMetrics;
	budgets: NativeAdoptionGateBudgets;
}

export interface NativeAdoptionBaselineInput {
	repoSha: string;
	runtime: string;
	generatedAt: string;
	fixture: NativeAdoptionFixture;
	measurements: readonly NativeAdoptionTargetMeasurement[];
	decision: NativeAdoptionGateDecision;
}

export interface NativeAdoptionBaseline {
	schemaVersion: typeof NATIVE_ADOPTION_BASELINE_SCHEMA_VERSION;
	repoSha: string;
	runtime: string;
	generatedAt: string;
	env: Record<string, never>;
	fixture: NativeAdoptionFixtureManifest;
	measurements: readonly NativeAdoptionTargetMeasurement[];
	decision: NativeAdoptionGateDecision;
}

export interface NativeAdoptionSecretScanFinding {
	path: string;
	pattern: string;
}

export interface NativeAdoptionForbiddenImportFinding {
	path: string;
	specifier: string;
	statement: string;
}

export interface NativeAdoptionSideEffectCounts {
	network: number;
	spawn: number;
	fileRead: number;
}

export interface NativeAdoptionSideEffectRecorder {
	recordNetwork: () => never;
	recordSpawn: () => never;
	recordFileRead: () => never;
}

export interface NativeAdoptionGuardedResult<T> {
	value: T;
	sideEffects: NativeAdoptionSideEffectCounts;
}

export interface NativeAdoptionSourceFile {
	path: string;
	content: string;
}

export interface NativeAdoptionCallsiteInput {
	symbols: readonly string[];
	files: readonly NativeAdoptionSourceFile[];
}

export interface NativeAdoptionCallsiteSummary {
	runtimeCallsites: number;
	testCallsites: number;
	definitionCallsites: number;
	exportCallsites: number;
	harnessCallsites: number;
	bySymbol: Record<
		string,
		{
			runtime: number;
			test: number;
			definition: number;
			export: number;
			harness: number;
		}
	>;
}

type NativeAdoptionSourceCategory = "definition" | "export" | "test" | "harness" | "runtime";

interface Prng {
	next: () => number;
}

const SECRET_PATTERNS: ReadonlyArray<{ name: string; pattern: RegExp }> = [
	{ name: "pem-private-key", pattern: /-----BEGIN [A-Z ]*PRIVATE KEY-----/i },
	{ name: "bearer-token", pattern: /\bBearer\s+[A-Za-z0-9._~+/=-]{16,}/i },
	{ name: "jwt", pattern: /\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/ },
	{
		name: "env-secret-assignment",
		pattern: /\b[A-Z0-9_]*(?:API[_-]?KEY|SECRET|TOKEN|PASSWORD|PRIVATE[_-]?KEY)[A-Z0-9_]*\s*=\s*["']?[^"'\s]{8,}/,
	},
	{
		name: "vendor-token-prefix",
		pattern: /\b(?:(?:ghp|gho|ghu|ghs|github_pat)_[A-Za-z0-9_]{16,}|sk-[A-Za-z0-9]{16,})\b/,
	},
];

const FORBIDDEN_NATIVE_ADOPTION_IMPORTS = new Set([
	"fs",
	"node:fs",
	"child_process",
	"node:child_process",
	"net",
	"node:net",
	"tls",
	"node:tls",
	"http",
	"node:http",
	"https",
	"node:https",
	"undici",
]);

export function createNativeAdoptionFixture(options: NativeAdoptionFixtureOptions): NativeAdoptionFixture {
	const seed = normalizeSeed(options.seed ?? DEFAULT_NATIVE_ADOPTION_SEED);
	const candidateCount = Math.max(0, Math.floor(options.candidateCount));
	const embeddingDimensions = Math.max(0, Math.floor(options.embeddingDimensions));
	const prng = createMulberry32(seed);
	const topics = ["retrieval", "memory", "ontology", "cache", "session", "tools"];
	const query = "context graph retrieval ranking memory cache";
	const queryEmbedding = embeddingDimensions > 0 ? createVector(prng, embeddingDimensions) : undefined;
	const candidates: ScoredContextCandidate[] = [];

	for (let index = 0; index < candidateCount; index++) {
		const topic = topics[index % topics.length] ?? "retrieval";
		const score = round6(1 - index / Math.max(candidateCount, 1) + prng.next() * 0.05);
		candidates.push({
			id: `fixture-${index.toString().padStart(5, "0")}`,
			path: `packages/coding-agent/src/fixture/${topic}-${index}.ts`,
			title: `${topic} fixture ${index}`,
			symbol: `fixtureSymbol${index}`,
			kind: index % 3 === 0 ? "function" : "document",
			content: createFixtureContent(topic, index),
			tokenEstimate: 32 + (index % 11) * 7,
			topic,
			...(embeddingDimensions > 0 ? { embedding: createVector(prng, embeddingDimensions) } : {}),
			score: clamp01(score),
			rrfScore: clamp01(score * 0.8),
			topicalScore: clamp01(score * 0.9),
		});
	}

	const rankings = createFixtureRankings(candidates);
	const payload = { seed, candidateCount, embeddingDimensions, query, queryEmbedding, candidates, rankings };
	const payloadText = canonicalJsonStringify(payload);
	const manifest = {
		sha256: sha256Hex(payloadText),
		payloadBytes: Buffer.byteLength(payloadText, "utf8"),
		candidateCount,
		embeddingDimensions,
		seed,
	};
	const fixture: NativeAdoptionFixture = {
		seed,
		candidateCount,
		embeddingDimensions,
		query,
		...(queryEmbedding ? { queryEmbedding } : {}),
		candidates,
		rankings,
		manifest,
	};
	assertNativeAdoptionFixtureSecretFree(fixture);
	return fixture;
}

export function assertNativeAdoptionFixtureSecretFree(fixture: NativeAdoptionFixture): void {
	const payload = canonicalJsonStringify({
		seed: fixture.seed,
		candidateCount: fixture.candidateCount,
		embeddingDimensions: fixture.embeddingDimensions,
		query: fixture.query,
		queryEmbedding: fixture.queryEmbedding,
		candidates: fixture.candidates,
		rankings: fixture.rankings,
		manifest: fixture.manifest,
	});
	const hit = SECRET_PATTERNS.find(({ pattern }) => pattern.test(payload));
	if (hit) {
		throw new Error(`secret-like fixture content rejected: ${hit.name}`);
	}
}

export function scanNativeAdoptionSecrets(value: unknown): NativeAdoptionSecretScanFinding[] {
	const findings: NativeAdoptionSecretScanFinding[] = [];
	visitNativeAdoptionSecretValue(value, "$", findings, new Set<object>());
	return findings;
}

export function assertNativeAdoptionBaselineSecretFree(value: unknown): void {
	const findings = scanNativeAdoptionSecrets(value);
	if (findings.length > 0) {
		const first = findings[0];
		throw new Error(`secret-like baseline content rejected: ${first?.pattern ?? "unknown"} at ${first?.path ?? "$"}`);
	}
}

export const assertNativeAdoptionDocumentSecretFree = assertNativeAdoptionBaselineSecretFree;

export function runNativeAdoptionTarget(
	target: NativeAdoptionBenchmarkTarget,
	fixture: NativeAdoptionFixture,
): NativeAdoptionTargetResult {
	assertNativeAdoptionFixtureSecretFree(fixture);
	if (target === "selectMmrContext") {
		const result = selectMmrContext(fixture.candidates, { tokenBudget: DEFAULT_TOKEN_BUDGET, lambda: 0.6 });
		return digestTargetResult(
			target,
			result.selected.map((candidate) => candidate.id),
			fixture.candidates.length,
		);
	}
	if (target === "fuseRrfRankings") {
		const result = fuseRrfRankings(fixture.rankings, { limit: Math.min(100, fixture.candidates.length) });
		return digestTargetResult(
			target,
			result.map((hit) => [hit.id, round6(hit.score)]),
			fixture.candidates.length,
		);
	}
	if (target === "scoreTopicalRelevance") {
		const result = fixture.candidates.map((candidate) =>
			scoreTopicalRelevance({ query: fixture.query, queryEmbedding: fixture.queryEmbedding, document: candidate }),
		);
		return digestTargetResult(
			target,
			result.map((score) => round6(score.score)),
			fixture.candidates.length,
		);
	}
	if (target === "scoreRetrievalCandidate") {
		const result = fixture.candidates.map(
			(candidate) =>
				scoreRetrievalCandidate({
					rrfScore: candidate.rrfScore ?? candidate.score,
					topicalScore: candidate.topicalScore ?? candidate.score,
					graphScore: candidate.score,
					recencyScore: (candidate.score * 0.5) % 1,
					authorityScore: (candidate.score * 0.75) % 1,
					conflictPenalty: candidate.conflicts?.length ? 1 : 0,
				}).finalScore,
		);
		return digestTargetResult(target, result.map(round6), fixture.candidates.length);
	}
	if (target === "renderContextPack") {
		const result = renderContextPack(fixture.candidates.slice(0, Math.min(16, fixture.candidates.length)), {
			queryIntent: "native-adoption-benchmark",
			maxEvidenceChars: 180,
		});
		return digestTargetResult(target, result, fixture.candidates.length);
	}
	const result = canonicalJsonStringify({
		query: fixture.query,
		manifest: fixture.manifest,
		first: fixture.candidates[0]?.id ?? "none",
	});
	return digestTargetResult(target, result, fixture.candidates.length);
}

export function measureNativeAdoptionTarget(
	target: NativeAdoptionBenchmarkTarget,
	fixture: NativeAdoptionFixture,
	options: NativeAdoptionMeasureOptions = {},
): NativeAdoptionTargetMeasurement {
	const iterations = Math.max(1, Math.floor(options.iterations ?? 20));
	const warmupIterations = Math.max(0, Math.floor(options.warmupIterations ?? 5));
	const clock = options.clock ?? performance.now.bind(performance);
	let lastResult = runNativeAdoptionTarget(target, fixture);
	for (let index = 0; index < warmupIterations; index++) {
		lastResult = runNativeAdoptionTarget(target, fixture);
	}

	const samples: number[] = [];
	let sideEffects = createEmptySideEffectCounts();
	for (let index = 0; index < iterations; index++) {
		const guarded = withNativeAdoptionSideEffectGuards(() => {
			const startMs = clock();
			lastResult = runNativeAdoptionTarget(target, fixture);
			const endMs = clock();
			return Math.max(0, Math.round((endMs - startMs) * 1_000_000));
		});
		sideEffects = addSideEffects(sideEffects, guarded.sideEffects);
		samples.push(guarded.value);
	}

	return {
		...lastResult,
		stats: summarizeNativeAdoptionSamples(samples),
		sideEffects,
	};
}

export function summarizeNativeAdoptionSamples(samples: readonly number[]): NativeAdoptionSampleStats {
	if (samples.length === 0) {
		return {
			samples: 0,
			minNs: 0,
			maxNs: 0,
			meanNs: 0,
			p50Ns: 0,
			p95Ns: 0,
			p99Ns: 0,
			coefficientOfVariation: 0,
		};
	}
	const sorted = [...samples].map((sample) => Math.max(0, Math.round(sample))).sort((a, b) => a - b);
	const meanNs = sorted.reduce((sum, sample) => sum + sample, 0) / sorted.length;
	const variance = sorted.reduce((sum, sample) => sum + (sample - meanNs) ** 2, 0) / sorted.length;
	return {
		samples: sorted.length,
		minNs: sorted[0] ?? 0,
		maxNs: sorted[sorted.length - 1] ?? 0,
		meanNs,
		p50Ns: nearestRank(sorted, 0.5),
		p95Ns: nearestRank(sorted, 0.95),
		p99Ns: nearestRank(sorted, 0.99),
		coefficientOfVariation: meanNs === 0 ? 0 : Math.sqrt(variance) / meanNs,
	};
}

export function withNativeAdoptionSideEffectGuards<T>(
	fn: (recorder: NativeAdoptionSideEffectRecorder) => T,
): NativeAdoptionGuardedResult<T> {
	const sideEffects = createEmptySideEffectCounts();
	const recorder = createSideEffectRecorder(sideEffects);
	const originalFetch = globalThis.fetch;
	globalThis.fetch = ((..._args: Parameters<typeof fetch>) => recorder.recordNetwork()) as typeof fetch;

	let value: T | undefined;
	let thrown: unknown;
	try {
		value = fn(recorder);
	} catch (error) {
		thrown = error;
	} finally {
		globalThis.fetch = originalFetch;
	}

	const violations = formatSideEffectViolations(sideEffects);
	if (violations.length > 0) {
		throw new Error(`forbidden side effect during native adoption benchmark: ${violations.join(",")}`);
	}
	if (thrown) throw thrown;
	return { value: value as T, sideEffects };
}

export function evaluateNativeAdoptionGate(input: NativeAdoptionGateInput): NativeAdoptionGateDecision {
	const budgets = createGateBudgets(input.budgets);
	const movableFraction = clamp01(input.movableFraction);
	const retainedTypeScriptP95Ns = Math.max(0, input.typescriptP95Ns) * (1 - movableFraction);
	const sidecarNetP95Ns =
		retainedTypeScriptP95Ns + Math.max(0, input.projectedRustP95Ns) + Math.max(0, input.ipcOverheadP95Ns);
	const projectedNetSpeedup = sidecarNetP95Ns > 0 ? Math.max(0, input.typescriptP95Ns) / sidecarNetP95Ns : 0;
	const movableTypeScriptP95Ns = Math.max(0, input.typescriptP95Ns) * movableFraction;
	const cpuSpeedup = input.projectedRustP95Ns > 0 ? movableTypeScriptP95Ns / input.projectedRustP95Ns : 0;
	const ipcOverheadFraction =
		input.typescriptP95Ns > 0 ? Math.max(0, input.ipcOverheadP95Ns) / input.typescriptP95Ns : 1;
	const reasons: string[] = [];

	if (input.runtimeCallsites <= 0) reasons.push("runtime-callsite-absent");
	if (input.bottleneckClass !== "cpu") reasons.push(`bottleneck-not-cpu:${input.bottleneckClass}`);
	if (input.typescriptP95Ns < budgets.minTypeScriptP95Ns) reasons.push("typescript-p95-too-small");
	if (movableFraction < budgets.minMovableFraction) reasons.push("movable-fraction-too-low");
	if (ipcOverheadFraction >= budgets.maxIpcOverheadFraction) reasons.push("ipc-overhead-too-high");
	if (projectedNetSpeedup < budgets.minProjectedNetSpeedup) reasons.push("projected-net-speedup-too-low");
	if (input.startupP95Ms > budgets.maxStartupP95Ms) reasons.push("startup-p95-too-high");
	if (input.rssDeltaMb > budgets.maxRssDeltaMb) reasons.push("rss-delta-too-high");
	if (input.archiveDeltaMb > budgets.maxArchiveDeltaMb) reasons.push("archive-delta-too-high");
	for (const violation of input.sideEffectViolations ?? []) {
		reasons.push(`side-effect:${violation}`);
	}

	return {
		verdict: reasons.length === 0 ? "go" : "no-go",
		reasons,
		metrics: {
			retainedTypeScriptP95Ns,
			sidecarNetP95Ns,
			projectedNetSpeedup,
			cpuSpeedup,
			ipcOverheadFraction,
			movableFraction,
		},
		budgets,
	};
}

export function createNativeAdoptionBaseline(input: NativeAdoptionBaselineInput): NativeAdoptionBaseline {
	assertNativeAdoptionFixtureSecretFree(input.fixture);
	const baseline = {
		schemaVersion: NATIVE_ADOPTION_BASELINE_SCHEMA_VERSION,
		repoSha: input.repoSha,
		runtime: input.runtime,
		generatedAt: input.generatedAt,
		env: {},
		fixture: input.fixture.manifest,
		measurements: input.measurements,
		decision: input.decision,
	} satisfies NativeAdoptionBaseline;
	assertNativeAdoptionBaselineSecretFree(baseline);
	return baseline;
}

export function classifyNativeAdoptionCallsites(input: NativeAdoptionCallsiteInput): NativeAdoptionCallsiteSummary {
	const bySymbol: NativeAdoptionCallsiteSummary["bySymbol"] = {};
	for (const symbol of input.symbols) {
		bySymbol[symbol] = { runtime: 0, test: 0, definition: 0, export: 0, harness: 0 };
	}

	for (const file of input.files) {
		const category = classifySourceFile(file);
		for (const symbol of input.symbols) {
			const symbolSummary = bySymbol[symbol];
			if (!symbolSummary) continue;
			const count = countNativeAdoptionReferences(file, symbol, category);
			if (count === 0) continue;
			if (category === "test") symbolSummary.test += count;
			else if (category === "definition") symbolSummary.definition += count;
			else if (category === "export") symbolSummary.export += count;
			else if (category === "harness") symbolSummary.harness += count;
			else symbolSummary.runtime += count;
		}
	}

	return {
		runtimeCallsites: sumBySymbol(bySymbol, "runtime"),
		testCallsites: sumBySymbol(bySymbol, "test"),
		definitionCallsites: sumBySymbol(bySymbol, "definition"),
		exportCallsites: sumBySymbol(bySymbol, "export"),
		harnessCallsites: sumBySymbol(bySymbol, "harness"),
		bySymbol,
	};
}

export function scanNativeAdoptionForbiddenImports(
	files: readonly NativeAdoptionSourceFile[],
): NativeAdoptionForbiddenImportFinding[] {
	const findings: NativeAdoptionForbiddenImportFinding[] = [];
	for (const file of files) {
		for (const match of findNativeAdoptionImportSpecifiers(file.content)) {
			if (FORBIDDEN_NATIVE_ADOPTION_IMPORTS.has(match.specifier)) {
				findings.push({ path: file.path, specifier: match.specifier, statement: match.statement });
			}
		}
	}
	return findings;
}

export function assertNativeAdoptionTimedTargetImportSafe(content: string, path = "<inline>"): void {
	const findings = scanNativeAdoptionForbiddenImports([{ path, content }]);
	if (findings.length > 0) {
		const first = findings[0];
		throw new Error(`forbidden static import in timed native adoption target: ${first?.specifier ?? "unknown"}`);
	}
}

function createFixtureContent(topic: string, index: number): string {
	return [
		`Fixture document ${index} covers ${topic} retrieval behavior.`,
		"It describes graph context ranking, memory evidence, ontology validation, cache policy, and session packing.",
		"The text is synthetic and contains no credentials, network endpoints, or external provider payloads.",
	].join(" ");
}

function createFixtureRankings(candidates: readonly ScoredContextCandidate[]): RetrievalRanking[] {
	const lexical = candidates.map((candidate) => ({ id: candidate.id, score: candidate.score }));
	const vector = [...candidates]
		.sort((a, b) => (a.topic ?? "").localeCompare(b.topic ?? "") || b.score - a.score)
		.map((candidate) => ({ id: candidate.id, score: candidate.score }));
	const graph = [...candidates]
		.sort((a, b) => (a.path ?? "").localeCompare(b.path ?? ""))
		.map((candidate) => ({ id: candidate.id, score: candidate.score }));
	return [
		{ name: "lexical", weight: 1, hits: lexical },
		{ name: "vector", weight: 1.15, hits: vector },
		{ name: "graph", weight: 0.85, hits: graph },
	];
}

function createVector(prng: Prng, dimensions: number): number[] {
	return Array.from({ length: dimensions }, () => round6(prng.next() * 2 - 1));
}

function createMulberry32(seed: number): Prng {
	let state = seed >>> 0;
	return {
		next: () => {
			state += 0x6d2b79f5;
			let value = state;
			value = Math.imul(value ^ (value >>> 15), value | 1);
			value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
			return ((value ^ (value >>> 14)) >>> 0) / 4_294_967_296;
		},
	};
}

function normalizeSeed(seed: number): number {
	return Number.isFinite(seed) ? Math.floor(seed) >>> 0 : DEFAULT_NATIVE_ADOPTION_SEED;
}

function digestTargetResult(
	target: NativeAdoptionBenchmarkTarget,
	output: unknown,
	operations: number,
): NativeAdoptionTargetResult {
	return {
		target,
		operations,
		outputDigest: sha256Hex(canonicalJsonStringify({ target, output })),
	};
}

function sha256Hex(value: string): string {
	return createHash("sha256").update(value, "utf8").digest("hex");
}

function nearestRank(sortedSamples: readonly number[], percentile: number): number {
	if (sortedSamples.length === 0) return 0;
	const index = Math.min(sortedSamples.length - 1, Math.max(0, Math.ceil(percentile * sortedSamples.length) - 1));
	return sortedSamples[index] ?? 0;
}

function createEmptySideEffectCounts(): NativeAdoptionSideEffectCounts {
	return { network: 0, spawn: 0, fileRead: 0 };
}

function createSideEffectRecorder(sideEffects: NativeAdoptionSideEffectCounts): NativeAdoptionSideEffectRecorder {
	return {
		recordNetwork: () => {
			sideEffects.network += 1;
			throw new Error("forbidden side effect: network");
		},
		recordSpawn: () => {
			sideEffects.spawn += 1;
			throw new Error("forbidden side effect: spawn");
		},
		recordFileRead: () => {
			sideEffects.fileRead += 1;
			throw new Error("forbidden side effect: file-read");
		},
	};
}

function addSideEffects(
	left: NativeAdoptionSideEffectCounts,
	right: NativeAdoptionSideEffectCounts,
): NativeAdoptionSideEffectCounts {
	return {
		network: left.network + right.network,
		spawn: left.spawn + right.spawn,
		fileRead: left.fileRead + right.fileRead,
	};
}

function formatSideEffectViolations(sideEffects: NativeAdoptionSideEffectCounts): string[] {
	const violations: string[] = [];
	if (sideEffects.network > 0) violations.push(`network:${sideEffects.network}`);
	if (sideEffects.spawn > 0) violations.push(`spawn:${sideEffects.spawn}`);
	if (sideEffects.fileRead > 0) violations.push(`fileRead:${sideEffects.fileRead}`);
	return violations;
}

function createGateBudgets(input: Partial<NativeAdoptionGateBudgets> | undefined): NativeAdoptionGateBudgets {
	return {
		minTypeScriptP95Ns: input?.minTypeScriptP95Ns ?? DEFAULT_MIN_TYPESCRIPT_P95_NS,
		minMovableFraction: input?.minMovableFraction ?? DEFAULT_MIN_MOVABLE_FRACTION,
		maxIpcOverheadFraction: input?.maxIpcOverheadFraction ?? DEFAULT_MAX_IPC_OVERHEAD_FRACTION,
		minProjectedNetSpeedup: input?.minProjectedNetSpeedup ?? DEFAULT_MIN_NET_SPEEDUP,
		maxStartupP95Ms: input?.maxStartupP95Ms ?? DEFAULT_MAX_STARTUP_P95_MS,
		maxRssDeltaMb: input?.maxRssDeltaMb ?? DEFAULT_MAX_RSS_DELTA_MB,
		maxArchiveDeltaMb: input?.maxArchiveDeltaMb ?? DEFAULT_MAX_ARCHIVE_DELTA_MB,
	};
}

function classifySourceFile(file: NativeAdoptionSourceFile): NativeAdoptionSourceCategory {
	const normalizedPath = file.path.replaceAll("\\", "/");
	if (normalizedPath.endsWith("/src/core/native-adoption-benchmark.ts")) return "harness";
	if (normalizedPath.includes("/test/bench/") || normalizedPath.endsWith("/test/native-adoption-runner.test.ts")) {
		return "harness";
	}
	if (/\/(test|tests)\//.test(normalizedPath) || /\.test\.tsx?$/.test(normalizedPath)) return "test";
	if (normalizedPath.endsWith("/context-graph-retrieval.ts")) return "definition";
	if (normalizedPath.endsWith("/src/index.ts")) return "export";
	return "runtime";
}

function countNativeAdoptionReferences(
	file: NativeAdoptionSourceFile,
	symbol: string,
	category: NativeAdoptionSourceCategory,
): number {
	if (category === "export") return countBarrelExportReferences(file, symbol);
	if (category === "definition") return countDefinitionReferences(file.content, symbol);
	return countCallExpressionReferences(file.content, symbol);
}

function countDefinitionReferences(content: string, symbol: string): number {
	const escaped = escapeRegExp(symbol);
	return (
		content.match(new RegExp(`(?:export\\s+)?(?:function|const|let|var|class)\\s+${escaped}\\b`, "g"))?.length ?? 0
	);
}

function countCallExpressionReferences(content: string, symbol: string): number {
	const escaped = escapeRegExp(symbol);
	const sanitized = stripCommentsAndStrings(content);
	const matches = sanitized.match(new RegExp(`(^|[^\\w.$])${escaped}\\s*\\(`, "g"));
	return matches?.length ?? 0;
}

function countSymbolReferences(content: string, symbol: string): number {
	const escaped = escapeRegExp(symbol);
	return content.match(new RegExp(`\\b${escaped}\\b`, "g"))?.length ?? 0;
}

function countBarrelExportReferences(file: NativeAdoptionSourceFile, symbol: string): number {
	const normalizedPath = file.path.replaceAll("\\", "/");
	if (!normalizedPath.endsWith("/src/index.ts")) return 0;
	if (countSymbolReferences(file.content, symbol) > 0) return 0;
	return file.content.includes("context-graph-retrieval.ts") ? 1 : 0;
}

function sumBySymbol(
	bySymbol: NativeAdoptionCallsiteSummary["bySymbol"],
	key: "runtime" | "test" | "definition" | "export" | "harness",
): number {
	return Object.values(bySymbol).reduce((sum, value) => sum + value[key], 0);
}

function visitNativeAdoptionSecretValue(
	value: unknown,
	path: string,
	findings: NativeAdoptionSecretScanFinding[],
	seen: Set<object>,
): void {
	if (typeof value === "string") {
		for (const { name, pattern } of SECRET_PATTERNS) {
			if (pattern.test(value)) findings.push({ path, pattern: name });
		}
		return;
	}
	if (typeof value !== "object" || value === null) return;
	if (seen.has(value)) return;
	seen.add(value);
	if (Array.isArray(value)) {
		value.forEach((entry, index) => {
			visitNativeAdoptionSecretValue(entry, `${path}[${index}]`, findings, seen);
		});
		return;
	}
	for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
		visitNativeAdoptionSecretValue(entry, `${path}.${key}`, findings, seen);
	}
}

function findNativeAdoptionImportSpecifiers(content: string): Array<{ specifier: string; statement: string }> {
	const imports: Array<{ specifier: string; statement: string }> = [];
	const sanitized = stripCommentsAndStrings(content, { keepImportSpecifiers: true });
	const importPattern =
		/\bimport\s+(?:type\s+)?(?:[^"';]+?\s+from\s+)?["']([^"']+)["']|\brequire\(\s*["']([^"']+)["']\s*\)/g;
	for (const match of sanitized.matchAll(importPattern)) {
		const specifier = match[1] ?? match[2];
		if (!specifier) continue;
		imports.push({ specifier, statement: match[0] });
	}
	return imports;
}

function stripCommentsAndStrings(content: string, options: { keepImportSpecifiers?: boolean } = {}): string {
	let output = "";
	let index = 0;
	let state: "code" | "single" | "double" | "template" | "line" | "block" = "code";
	while (index < content.length) {
		const char = content[index] ?? "";
		const next = content[index + 1] ?? "";
		if (state === "code") {
			if (char === "/" && next === "/") {
				output += "  ";
				index += 2;
				state = "line";
				continue;
			}
			if (char === "/" && next === "*") {
				output += "  ";
				index += 2;
				state = "block";
				continue;
			}
			if (char === "'") {
				output += options.keepImportSpecifiers ? char : " ";
				index += 1;
				state = "single";
				continue;
			}
			if (char === '"') {
				output += options.keepImportSpecifiers ? char : " ";
				index += 1;
				state = "double";
				continue;
			}
			if (char === "`") {
				output += " ";
				index += 1;
				state = "template";
				continue;
			}
			output += char;
			index += 1;
			continue;
		}
		if (state === "line") {
			output += char === "\n" ? "\n" : " ";
			index += 1;
			if (char === "\n") state = "code";
			continue;
		}
		if (state === "block") {
			output += char === "\n" ? "\n" : " ";
			if (char === "*" && next === "/") {
				output += " ";
				index += 2;
				state = "code";
			} else {
				index += 1;
			}
			continue;
		}
		const quote = state === "single" ? "'" : state === "double" ? '"' : "`";
		output += options.keepImportSpecifiers && state !== "template" ? char : char === "\n" ? "\n" : " ";
		if (char === "\\") {
			const escaped = content[index + 1] ?? "";
			output += options.keepImportSpecifiers && state !== "template" ? escaped : escaped === "\n" ? "\n" : " ";
			index += 2;
			continue;
		}
		index += 1;
		if (char === quote) state = "code";
	}
	return output;
}

function escapeRegExp(value: string): string {
	return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function round6(value: number): number {
	return Math.round(value * 1_000_000) / 1_000_000;
}

function clamp01(value: number): number {
	if (!Number.isFinite(value)) return 0;
	if (value < 0) return 0;
	if (value > 1) return 1;
	return value;
}
