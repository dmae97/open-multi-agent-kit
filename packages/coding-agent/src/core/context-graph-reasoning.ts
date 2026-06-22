export type ContextGraphTraversalMode = "dependency" | "reverse-impact" | "neighbors" | "tests";

export interface ContextGraphNode {
	readonly id: string;
	readonly reliability?: number;
	readonly changeFrequency?: number;
	readonly failureRate?: number;
	readonly complexity?: number;
	readonly centrality?: number;
}

export interface ContextGraphEdge {
	readonly id?: string;
	readonly source: string;
	readonly target: string;
	readonly kind?: string;
	readonly reliability?: number;
	readonly weight?: number;
}

export interface NormalizedContextGraphEdge extends ContextGraphEdge {
	readonly id: string;
	readonly kind: string;
}

export interface MultiSourceDijkstraInput {
	readonly nodes: readonly ContextGraphNode[];
	readonly edges: readonly ContextGraphEdge[];
	readonly sources: readonly string[];
	readonly mode: ContextGraphTraversalMode;
	readonly maxCost?: number;
}

export interface DijkstraPredecessor {
	readonly nodeId: string;
	readonly edge: NormalizedContextGraphEdge;
}

export interface DijkstraPathStep {
	readonly nodeId: string;
	readonly edge: NormalizedContextGraphEdge;
}

export interface MultiSourceDijkstraResult {
	readonly distances: ReadonlyMap<string, number>;
	readonly predecessors: ReadonlyMap<string, DijkstraPredecessor>;
	readonly paths: ReadonlyMap<string, readonly DijkstraPathStep[]>;
	readonly nodePaths: ReadonlyMap<string, readonly string[]>;
	readonly settledNodeIds: readonly string[];
}

export interface DependencyCycleInput {
	readonly nodes: readonly ContextGraphNode[];
	readonly edges: readonly ContextGraphEdge[];
}

export interface ImpactPropagationInput {
	readonly nodes: readonly ContextGraphNode[];
	readonly edges: readonly ContextGraphEdge[];
	readonly changedNodeIds: readonly string[];
	readonly threshold?: number;
	readonly decay?: number;
}

export interface ImpactPropagationHit {
	readonly nodeId: string;
	readonly score: number;
}

export interface ImpactPropagationResult {
	readonly scores: ReadonlyMap<string, number>;
	readonly impacted: readonly ImpactPropagationHit[];
}

export interface SetCoverTarget {
	readonly id: string;
	readonly weight?: number;
}

export interface WeightedTestCoverage {
	readonly targetId: string;
	readonly weight?: number;
}

export type TestCoverageInput = string | WeightedTestCoverage;

export interface TestCoverageCandidate {
	readonly id: string;
	readonly covers: readonly TestCoverageInput[];
	readonly cost?: number;
	readonly reliability?: number;
}

export interface GreedyWeightedSetCoverInput {
	readonly targets: readonly SetCoverTarget[];
	readonly tests: readonly TestCoverageCandidate[];
}

export interface GreedyWeightedSetCoverResult {
	readonly selectedTests: readonly TestCoverageCandidate[];
	readonly coveredTargetIds: readonly string[];
	readonly uncoveredTargetIds: readonly string[];
	readonly totalCost: number;
	readonly totalWeightCovered: number;
}

export interface HotspotScoringInput {
	readonly nodes: readonly ContextGraphNode[];
	readonly edges: readonly ContextGraphEdge[];
	readonly weights?: Partial<HotspotScoreWeights>;
}

export interface HotspotScoreWeights {
	readonly changeFrequency: number;
	readonly failureRate: number;
	readonly complexity: number;
	readonly fanIn: number;
	readonly fanOut: number;
	readonly reverseImpact: number;
	readonly centrality: number;
	readonly reliabilityRisk: number;
}

export interface HotspotScoreBreakdown {
	readonly changeFrequency: number;
	readonly failureRate: number;
	readonly complexity: number;
	readonly fanIn: number;
	readonly fanOut: number;
	readonly reverseImpact: number;
	readonly centrality: number;
	readonly reliabilityRisk: number;
}

export interface HotspotScore {
	readonly nodeId: string;
	readonly score: number;
	readonly breakdown: HotspotScoreBreakdown;
}

interface TraversalEdge {
	readonly from: string;
	readonly to: string;
	readonly edge: NormalizedContextGraphEdge;
	readonly cost: number;
	readonly direction: "forward" | "reverse";
}

interface TestSelectionCandidate {
	readonly test: TestCoverageCandidate;
	readonly gain: number;
	readonly ratio: number;
	readonly effectiveCost: number;
	readonly coveredTargetIds: readonly string[];
}

const MIN_RELIABILITY = 0.001;
const FLOAT_EPSILON = 1e-12;
const DEFAULT_HOTSPOT_WEIGHTS: HotspotScoreWeights = {
	changeFrequency: 0.18,
	failureRate: 0.22,
	complexity: 0.15,
	fanIn: 0.15,
	fanOut: 0.05,
	reverseImpact: 0.15,
	centrality: 0.05,
	reliabilityRisk: 0.05,
};

export const reliabilityToTraversalCost = (reliability = 1): number => {
	const normalizedReliability = Math.max(MIN_RELIABILITY, clamp01(reliability));
	return 1 / normalizedReliability;
};

export const runMultiSourceDijkstra = (input: MultiSourceDijkstraInput): MultiSourceDijkstraResult => {
	const nodeIds = collectNodeIds(input.nodes, input.edges);
	const traversalEdges = buildTraversalEdges(input.edges, input.mode);
	const adjacency = buildTraversalAdjacency(traversalEdges);
	const sources = uniqueSorted(input.sources.map(normalizeId).filter((source) => source.length > 0));
	const distances = new Map<string, number>();
	const predecessors = new Map<string, DijkstraPredecessor>();
	const pathKeys = new Map<string, string>();
	const frontier = new Set<string>();
	const settledNodeIds: string[] = [];
	const maxCost = normalizePositiveNumber(input.maxCost, Number.POSITIVE_INFINITY);

	for (const source of sources) {
		nodeIds.add(source);
		distances.set(source, 0);
		pathKeys.set(source, source);
		frontier.add(source);
	}

	while (frontier.size > 0) {
		const currentNodeId = pickLowestCostNode(frontier, distances, pathKeys);
		if (currentNodeId === undefined) break;

		frontier.delete(currentNodeId);
		settledNodeIds.push(currentNodeId);
		const currentDistance = distances.get(currentNodeId) ?? Number.POSITIVE_INFINITY;
		const currentPathKey = pathKeys.get(currentNodeId) ?? currentNodeId;

		for (const traversalEdge of adjacency.get(currentNodeId) ?? []) {
			const candidateDistance = currentDistance + traversalEdge.cost;
			if (candidateDistance > maxCost + FLOAT_EPSILON) continue;

			const candidatePathKey = `${currentPathKey}\0${traversalEdge.to}\0${traversalEdge.edge.id}`;
			const existingDistance = distances.get(traversalEdge.to);
			const existingPathKey = pathKeys.get(traversalEdge.to);
			if (
				existingDistance === undefined ||
				candidateDistance < existingDistance - FLOAT_EPSILON ||
				(Math.abs(candidateDistance - existingDistance) <= FLOAT_EPSILON &&
					(existingPathKey === undefined || candidatePathKey.localeCompare(existingPathKey) < 0))
			) {
				distances.set(traversalEdge.to, candidateDistance);
				pathKeys.set(traversalEdge.to, candidatePathKey);
				predecessors.set(traversalEdge.to, { nodeId: currentNodeId, edge: traversalEdge.edge });
				frontier.add(traversalEdge.to);
			}
		}
	}

	const sortedReachableNodeIds = [...distances.keys()].sort((a, b) => a.localeCompare(b));
	const paths = new Map<string, readonly DijkstraPathStep[]>();
	const nodePaths = new Map<string, readonly string[]>();
	for (const nodeId of sortedReachableNodeIds) {
		const builtPath = buildPath(nodeId, predecessors);
		paths.set(nodeId, builtPath.edgeSteps);
		nodePaths.set(nodeId, builtPath.nodeIds);
	}

	return {
		distances,
		predecessors,
		paths,
		nodePaths,
		settledNodeIds,
	};
};

export const detectDependencyCycles = (input: DependencyCycleInput): string[][] => {
	const nodeIds = [...collectNodeIds(input.nodes, input.edges)].sort((a, b) => a.localeCompare(b));
	const adjacency = buildDependencyAdjacency(input.edges, "forward");
	const selfLoops = new Set(
		normalizeEdges(input.edges)
			.filter((edge) => isDependencyEdge(edge) && edge.source === edge.target)
			.map((edge) => edge.source),
	);
	const indexes = new Map<string, number>();
	const lowLinks = new Map<string, number>();
	const stack: string[] = [];
	const stacked = new Set<string>();
	const cycles: string[][] = [];
	let nextIndex = 0;

	const visit = (nodeId: string): void => {
		indexes.set(nodeId, nextIndex);
		lowLinks.set(nodeId, nextIndex);
		nextIndex += 1;
		stack.push(nodeId);
		stacked.add(nodeId);

		for (const nextNodeId of adjacency.get(nodeId) ?? []) {
			if (!indexes.has(nextNodeId)) {
				visit(nextNodeId);
				lowLinks.set(nodeId, Math.min(lowLinks.get(nodeId) ?? 0, lowLinks.get(nextNodeId) ?? 0));
			} else if (stacked.has(nextNodeId)) {
				lowLinks.set(nodeId, Math.min(lowLinks.get(nodeId) ?? 0, indexes.get(nextNodeId) ?? 0));
			}
		}

		if (lowLinks.get(nodeId) !== indexes.get(nodeId)) return;

		const component: string[] = [];
		while (stack.length > 0) {
			const member = stack.pop();
			if (member === undefined) break;
			stacked.delete(member);
			component.push(member);
			if (member === nodeId) break;
		}

		if (component.length > 1 || selfLoops.has(nodeId)) cycles.push(component.sort((a, b) => a.localeCompare(b)));
	};

	for (const nodeId of nodeIds) {
		if (!indexes.has(nodeId)) visit(nodeId);
	}

	return cycles.sort(compareStringLists);
};

export const propagateImpact = (input: ImpactPropagationInput): ImpactPropagationResult => {
	const traversalEdges = buildTraversalEdges(input.edges, "reverse-impact");
	const adjacency = buildTraversalAdjacency(traversalEdges);
	const threshold = clamp01(input.threshold ?? 0);
	const decay = input.decay === undefined ? 1 : clamp01(input.decay);
	const scores = new Map<string, number>();
	const frontier = new Set<string>();
	const settled = new Set<string>();
	const changedNodeIds = uniqueSorted(input.changedNodeIds.map(normalizeId).filter((nodeId) => nodeId.length > 0));

	for (const nodeId of changedNodeIds) {
		scores.set(nodeId, 1);
		frontier.add(nodeId);
	}

	while (frontier.size > 0) {
		const nodeId = pickHighestScoreNode(frontier, scores);
		if (nodeId === undefined) break;

		frontier.delete(nodeId);
		settled.add(nodeId);
		const currentScore = scores.get(nodeId) ?? 0;

		for (const traversalEdge of adjacency.get(nodeId) ?? []) {
			const propagatedScore = currentScore * clamp01(traversalEdge.edge.reliability ?? 1) * decay;
			if (propagatedScore <= FLOAT_EPSILON || propagatedScore < threshold - FLOAT_EPSILON) continue;

			const existingScore = scores.get(traversalEdge.to);
			if (existingScore === undefined || propagatedScore > existingScore + FLOAT_EPSILON) {
				scores.set(traversalEdge.to, propagatedScore);
				if (!settled.has(traversalEdge.to)) frontier.add(traversalEdge.to);
			}
		}
	}

	const impacted = [...scores.entries()]
		.filter(([, score]) => score >= threshold - FLOAT_EPSILON)
		.map(([nodeId, score]) => ({ nodeId, score }))
		.sort(compareImpactHits);

	return { scores, impacted };
};

export const selectTestsByGreedyWeightedSetCover = (
	input: GreedyWeightedSetCoverInput,
): GreedyWeightedSetCoverResult => {
	const targetWeights = normalizeTargetWeights(input.targets);
	const remainingTargetIds = new Set(targetWeights.keys());
	const selectedTests: TestCoverageCandidate[] = [];
	const selectedTestIds = new Set<string>();
	let totalCost = 0;
	let totalWeightCovered = 0;

	while (remainingTargetIds.size > 0) {
		let bestCandidate: TestSelectionCandidate | undefined;
		for (const test of [...input.tests].sort((a, b) => a.id.localeCompare(b.id))) {
			if (selectedTestIds.has(test.id)) continue;

			const candidate = scoreTestSelectionCandidate(test, remainingTargetIds, targetWeights);
			if (candidate.gain <= FLOAT_EPSILON) continue;
			if (bestCandidate === undefined || compareTestSelectionCandidates(candidate, bestCandidate) < 0) {
				bestCandidate = candidate;
			}
		}

		if (bestCandidate === undefined) break;

		selectedTests.push(bestCandidate.test);
		selectedTestIds.add(bestCandidate.test.id);
		totalCost += bestCandidate.effectiveCost;
		totalWeightCovered += bestCandidate.gain;
		for (const targetId of bestCandidate.coveredTargetIds) {
			remainingTargetIds.delete(targetId);
		}
	}

	const uncoveredTargetIds = [...remainingTargetIds].sort((a, b) => a.localeCompare(b));
	const coveredTargetIds = [...targetWeights.keys()]
		.filter((targetId) => !remainingTargetIds.has(targetId))
		.sort((a, b) => a.localeCompare(b));

	return {
		selectedTests,
		coveredTargetIds,
		uncoveredTargetIds,
		totalCost,
		totalWeightCovered,
	};
};

export const scoreGraphHotspots = (input: HotspotScoringInput): HotspotScore[] => {
	const nodeIds = collectNodeIds(input.nodes, input.edges);
	const nodeById = new Map(input.nodes.map((node) => [normalizeId(node.id), node]));
	const dependencyEdges = normalizeEdges(input.edges).filter(isDependencyEdge);
	const fanInSources = new Map<string, Set<string>>();
	const fanOutTargets = new Map<string, Set<string>>();

	for (const edge of dependencyEdges) {
		addSetValue(fanInSources, edge.target, edge.source);
		addSetValue(fanOutTargets, edge.source, edge.target);
	}

	const reverseReachableCounts = calculateReverseReachableCounts([...nodeIds], dependencyEdges);
	const maxFanIn = maxMapSetSize(fanInSources);
	const maxFanOut = maxMapSetSize(fanOutTargets);
	const maxReverseReachable = Math.max(1, ...reverseReachableCounts.values());
	const weights = { ...DEFAULT_HOTSPOT_WEIGHTS, ...input.weights };

	return [...nodeIds]
		.map((nodeId) => {
			const node = nodeById.get(nodeId);
			const breakdown = {
				changeFrequency: clamp01(node?.changeFrequency ?? 0),
				failureRate: clamp01(node?.failureRate ?? 0),
				complexity: clamp01(node?.complexity ?? 0),
				fanIn: normalizeRatio(fanInSources.get(nodeId)?.size ?? 0, maxFanIn),
				fanOut: normalizeRatio(fanOutTargets.get(nodeId)?.size ?? 0, maxFanOut),
				reverseImpact: normalizeRatio(reverseReachableCounts.get(nodeId) ?? 0, maxReverseReachable),
				centrality: clamp01(node?.centrality ?? 0),
				reliabilityRisk: 1 - clamp01(node?.reliability ?? 1),
			};
			return {
				nodeId,
				score: calculateHotspotScore(breakdown, weights),
				breakdown,
			};
		})
		.sort(compareHotspotScores);
};

export const multiSourceDijkstra = runMultiSourceDijkstra;
export const findDependencyCycles = detectDependencyCycles;
export const propagateReverseImpact = propagateImpact;
export const selectTestsByWeightedSetCover = selectTestsByGreedyWeightedSetCover;
export const scoreHotspots = scoreGraphHotspots;

const buildPath = (
	nodeId: string,
	predecessors: ReadonlyMap<string, DijkstraPredecessor>,
): { readonly edgeSteps: readonly DijkstraPathStep[]; readonly nodeIds: readonly string[] } => {
	const reversedSteps: DijkstraPathStep[] = [];
	const reversedNodeIds = [nodeId];
	let currentNodeId = nodeId;
	const seen = new Set<string>();

	while (!seen.has(currentNodeId)) {
		seen.add(currentNodeId);
		const predecessor = predecessors.get(currentNodeId);
		if (predecessor === undefined) break;
		reversedSteps.push({ nodeId: currentNodeId, edge: predecessor.edge });
		currentNodeId = predecessor.nodeId;
		reversedNodeIds.push(currentNodeId);
	}

	return {
		edgeSteps: reversedSteps.reverse(),
		nodeIds: reversedNodeIds.reverse(),
	};
};

const buildTraversalEdges = (edges: readonly ContextGraphEdge[], mode: ContextGraphTraversalMode): TraversalEdge[] => {
	const traversalEdges: TraversalEdge[] = [];
	for (const edge of normalizeEdges(edges)) {
		if (mode === "dependency" && isDependencyEdge(edge)) {
			traversalEdges.push(makeTraversalEdge(edge, edge.source, edge.target, "forward"));
		} else if (mode === "reverse-impact" && isDependencyEdge(edge)) {
			traversalEdges.push(makeTraversalEdge(edge, edge.target, edge.source, "reverse"));
		} else if (mode === "neighbors") {
			traversalEdges.push(makeTraversalEdge(edge, edge.source, edge.target, "forward"));
			if (edge.source !== edge.target)
				traversalEdges.push(makeTraversalEdge(edge, edge.target, edge.source, "reverse"));
		} else if (mode === "tests" && isTestEdge(edge)) {
			traversalEdges.push(makeTraversalEdge(edge, edge.source, edge.target, "forward"));
			if (edge.source !== edge.target)
				traversalEdges.push(makeTraversalEdge(edge, edge.target, edge.source, "reverse"));
		}
	}
	return traversalEdges.sort(compareTraversalEdges);
};

const makeTraversalEdge = (
	edge: NormalizedContextGraphEdge,
	from: string,
	to: string,
	direction: "forward" | "reverse",
): TraversalEdge => ({
	from,
	to,
	edge,
	cost: calculateTraversalEdgeCost(edge),
	direction,
});

const calculateTraversalEdgeCost = (edge: ContextGraphEdge): number => {
	const baseCost = normalizePositiveNumber(edge.weight, 1);
	return baseCost * reliabilityToTraversalCost(edge.reliability ?? 1);
};

const buildTraversalAdjacency = (
	traversalEdges: readonly TraversalEdge[],
): ReadonlyMap<string, readonly TraversalEdge[]> => {
	const adjacency = new Map<string, TraversalEdge[]>();
	for (const traversalEdge of traversalEdges) {
		const existing = adjacency.get(traversalEdge.from) ?? [];
		adjacency.set(traversalEdge.from, [...existing, traversalEdge].sort(compareTraversalEdges));
	}
	return adjacency;
};

const buildDependencyAdjacency = (
	edges: readonly ContextGraphEdge[],
	direction: "forward" | "reverse",
): ReadonlyMap<string, readonly string[]> => {
	const adjacency = new Map<string, Set<string>>();
	for (const edge of normalizeEdges(edges).filter(isDependencyEdge)) {
		const from = direction === "forward" ? edge.source : edge.target;
		const to = direction === "forward" ? edge.target : edge.source;
		addSetValue(adjacency, from, to);
	}
	return new Map(
		[...adjacency.entries()].map(([nodeId, neighbors]) => [
			nodeId,
			[...neighbors].sort((a, b) => a.localeCompare(b)),
		]),
	);
};

const normalizeEdges = (edges: readonly ContextGraphEdge[]): NormalizedContextGraphEdge[] =>
	edges.flatMap((edge, index) => {
		const source = normalizeId(edge.source);
		const target = normalizeId(edge.target);
		if (source.length === 0 || target.length === 0) return [];
		const kind = (edge.kind ?? "related").trim() || "related";
		const explicitId = edge.id?.trim();
		const id = explicitId && explicitId.length > 0 ? explicitId : `${kind}:${source}->${target}:${index}`;
		return [{ ...edge, id, source, target, kind }];
	});

const collectNodeIds = (nodes: readonly ContextGraphNode[], edges: readonly ContextGraphEdge[]): Set<string> => {
	const nodeIds = new Set<string>();
	for (const node of nodes) {
		const nodeId = normalizeId(node.id);
		if (nodeId.length > 0) nodeIds.add(nodeId);
	}
	for (const edge of normalizeEdges(edges)) {
		nodeIds.add(edge.source);
		nodeIds.add(edge.target);
	}
	return nodeIds;
};

const pickLowestCostNode = (
	frontier: ReadonlySet<string>,
	distances: ReadonlyMap<string, number>,
	pathKeys: ReadonlyMap<string, string>,
): string | undefined =>
	[...frontier].sort((a, b) => {
		const distanceDelta =
			(distances.get(a) ?? Number.POSITIVE_INFINITY) - (distances.get(b) ?? Number.POSITIVE_INFINITY);
		if (Math.abs(distanceDelta) > FLOAT_EPSILON) return distanceDelta;
		return (pathKeys.get(a) ?? a).localeCompare(pathKeys.get(b) ?? b) || a.localeCompare(b);
	})[0];

const pickHighestScoreNode = (frontier: ReadonlySet<string>, scores: ReadonlyMap<string, number>): string | undefined =>
	[...frontier].sort((a, b) => (scores.get(b) ?? 0) - (scores.get(a) ?? 0) || a.localeCompare(b))[0];

const scoreTestSelectionCandidate = (
	test: TestCoverageCandidate,
	remainingTargetIds: ReadonlySet<string>,
	targetWeights: ReadonlyMap<string, number>,
): TestSelectionCandidate => {
	const coverage = normalizeCoverage(test.covers);
	const coveredTargetIds = [...remainingTargetIds]
		.filter((targetId) => (coverage.get(targetId) ?? 0) > 0)
		.sort((a, b) => a.localeCompare(b));
	const gain = coveredTargetIds.reduce(
		(sum, targetId) => sum + (targetWeights.get(targetId) ?? 0) * (coverage.get(targetId) ?? 0),
		0,
	);
	const effectiveCost = normalizePositiveNumber(test.cost, 1) * reliabilityToTraversalCost(test.reliability ?? 1);
	return {
		test,
		gain,
		ratio: gain / effectiveCost,
		effectiveCost,
		coveredTargetIds,
	};
};

const normalizeCoverage = (covers: readonly TestCoverageInput[]): ReadonlyMap<string, number> => {
	const coverage = new Map<string, number>();
	for (const cover of covers) {
		const targetId = typeof cover === "string" ? normalizeId(cover) : normalizeId(cover.targetId);
		if (targetId.length === 0) continue;
		const weight = typeof cover === "string" ? 1 : normalizePositiveNumber(cover.weight, 1);
		coverage.set(targetId, Math.max(coverage.get(targetId) ?? 0, weight));
	}
	return coverage;
};

const normalizeTargetWeights = (targets: readonly SetCoverTarget[]): ReadonlyMap<string, number> => {
	const targetWeights = new Map<string, number>();
	for (const target of targets) {
		const targetId = normalizeId(target.id);
		if (targetId.length === 0) continue;
		targetWeights.set(
			targetId,
			Math.max(targetWeights.get(targetId) ?? 0, normalizePositiveNumber(target.weight, 1)),
		);
	}
	return new Map([...targetWeights.entries()].sort(([a], [b]) => a.localeCompare(b)));
};

const calculateReverseReachableCounts = (
	nodeIds: readonly string[],
	dependencyEdges: readonly NormalizedContextGraphEdge[],
): ReadonlyMap<string, number> => {
	const reverseAdjacency = buildDependencyAdjacency(dependencyEdges, "reverse");
	const counts = new Map<string, number>();
	for (const nodeId of nodeIds) {
		const visited = new Set<string>();
		const queue = [...(reverseAdjacency.get(nodeId) ?? [])];
		while (queue.length > 0) {
			const current = queue.shift();
			if (current === undefined || current === nodeId || visited.has(current)) continue;
			visited.add(current);
			queue.push(...(reverseAdjacency.get(current) ?? []));
		}
		counts.set(nodeId, visited.size);
	}
	return counts;
};

const calculateHotspotScore = (breakdown: HotspotScoreBreakdown, weights: HotspotScoreWeights): number =>
	clamp01(
		breakdown.changeFrequency * weights.changeFrequency +
			breakdown.failureRate * weights.failureRate +
			breakdown.complexity * weights.complexity +
			breakdown.fanIn * weights.fanIn +
			breakdown.fanOut * weights.fanOut +
			breakdown.reverseImpact * weights.reverseImpact +
			breakdown.centrality * weights.centrality +
			breakdown.reliabilityRisk * weights.reliabilityRisk,
	);

const compareTraversalEdges = (a: TraversalEdge, b: TraversalEdge): number =>
	a.from.localeCompare(b.from) ||
	a.to.localeCompare(b.to) ||
	a.cost - b.cost ||
	a.edge.id.localeCompare(b.edge.id) ||
	a.direction.localeCompare(b.direction);

const compareImpactHits = (a: ImpactPropagationHit, b: ImpactPropagationHit): number =>
	b.score - a.score || a.nodeId.localeCompare(b.nodeId);

const compareHotspotScores = (a: HotspotScore, b: HotspotScore): number =>
	b.score - a.score || a.nodeId.localeCompare(b.nodeId);

const compareStringLists = (a: readonly string[], b: readonly string[]): number =>
	a[0]?.localeCompare(b[0] ?? "") || a.length - b.length || a.join("\0").localeCompare(b.join("\0"));

const compareTestSelectionCandidates = (a: TestSelectionCandidate, b: TestSelectionCandidate): number =>
	b.ratio - a.ratio || b.gain - a.gain || a.effectiveCost - b.effectiveCost || a.test.id.localeCompare(b.test.id);

const isDependencyEdge = (edge: ContextGraphEdge): boolean => edge.kind === "dependency";

const isTestEdge = (edge: ContextGraphEdge): boolean =>
	edge.kind === "test" || edge.kind === "tests" || edge.kind === "coverage";

const addSetValue = <TKey, TValue>(map: Map<TKey, Set<TValue>>, key: TKey, value: TValue): void => {
	const existing = map.get(key);
	if (existing === undefined) {
		map.set(key, new Set([value]));
		return;
	}
	existing.add(value);
};

const maxMapSetSize = <TKey, TValue>(map: ReadonlyMap<TKey, ReadonlySet<TValue>>): number =>
	Math.max(1, ...[...map.values()].map((items) => items.size));

const normalizeRatio = (value: number, maxValue: number): number => {
	if (!Number.isFinite(value) || !Number.isFinite(maxValue) || maxValue <= 0) return 0;
	return clamp01(value / maxValue);
};

const normalizePositiveNumber = (value: number | undefined, fallback: number): number =>
	value !== undefined && Number.isFinite(value) && value > 0 ? value : fallback;

const normalizeId = (id: string): string => id.trim();

const uniqueSorted = (values: readonly string[]): string[] => [...new Set(values)].sort((a, b) => a.localeCompare(b));

const clamp01 = (value: number): number => {
	if (!Number.isFinite(value) || value <= 0) return 0;
	if (value >= 1) return 1;
	return value;
};
