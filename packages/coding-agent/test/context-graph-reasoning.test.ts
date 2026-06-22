import { describe, expect, it } from "vitest";
import {
	detectDependencyCycles,
	propagateImpact,
	reliabilityToTraversalCost,
	runMultiSourceDijkstra,
	scoreGraphHotspots,
	selectTestsByGreedyWeightedSetCover,
} from "../src/core/context-graph-reasoning.ts";

const graphNodes = (...ids: readonly string[]) => ids.map((id) => ({ id }));

describe("context graph reasoning algorithms", () => {
	it("maps lower reliability to higher traversal cost", () => {
		expect(reliabilityToTraversalCost(0.9)).toBeLessThan(reliabilityToTraversalCost(0.2));
		expect(reliabilityToTraversalCost(1)).toBe(1);
		expect(reliabilityToTraversalCost(0)).toBeGreaterThan(reliabilityToTraversalCost(0.01));
	});

	it("uses the cheapest parallel edge in deterministic multi-source Dijkstra", () => {
		const result = runMultiSourceDijkstra({
			nodes: graphNodes("a", "b", "c"),
			edges: [
				{ id: "expensive", source: "a", target: "b", kind: "dependency", reliability: 0.2 },
				{ id: "cheap", source: "a", target: "b", kind: "dependency", reliability: 0.9 },
				{ id: "tail", source: "b", target: "c", kind: "dependency", reliability: 0.9 },
			],
			sources: ["a"],
			mode: "dependency",
		});

		expect(result.distances.get("b")).toBeCloseTo(reliabilityToTraversalCost(0.9), 6);
		expect(result.paths.get("b")?.map((step) => step.edge.id)).toEqual(["cheap"]);
		expect(result.paths.get("c")?.map((step) => step.edge.id)).toEqual(["cheap", "tail"]);
	});

	it("breaks equal-cost path ties deterministically", () => {
		const result = runMultiSourceDijkstra({
			nodes: graphNodes("d", "c", "b", "a"),
			edges: [
				{ id: "c-to-d", source: "c", target: "d", kind: "dependency", weight: 1 },
				{ id: "b-to-d", source: "b", target: "d", kind: "dependency", weight: 1 },
				{ id: "a-to-c", source: "a", target: "c", kind: "dependency", weight: 1 },
				{ id: "a-to-b", source: "a", target: "b", kind: "dependency", weight: 1 },
			],
			sources: ["a"],
			mode: "dependency",
		});

		expect(result.settledNodeIds).toEqual(["a", "b", "c", "d"]);
		expect(result.nodePaths.get("d")).toEqual(["a", "b", "d"]);
	});

	it("detects dependency cycles and traversal terminates on cyclic graphs", () => {
		const nodes = graphNodes("a", "b", "c", "d");
		const edges = [
			{ id: "a-b", source: "a", target: "b", kind: "dependency" as const },
			{ id: "b-c", source: "b", target: "c", kind: "dependency" as const },
			{ id: "c-a", source: "c", target: "a", kind: "dependency" as const },
			{ id: "c-d", source: "c", target: "d", kind: "dependency" as const },
		];

		expect(detectDependencyCycles({ nodes, edges })).toEqual([["a", "b", "c"]]);
		expect(runMultiSourceDijkstra({ nodes, edges, sources: ["a"], mode: "dependency" }).settledNodeIds).toEqual([
			"a",
			"b",
			"c",
			"d",
		]);
	});

	it("uses dependency direction separately from reverse-impact direction", () => {
		const nodes = graphNodes("app", "lib");
		const edges = [{ id: "app-lib", source: "app", target: "lib", kind: "dependency" as const }];

		const dependency = runMultiSourceDijkstra({ nodes, edges, sources: ["app"], mode: "dependency" });
		const reverseImpact = runMultiSourceDijkstra({ nodes, edges, sources: ["lib"], mode: "reverse-impact" });
		const wrongDirection = runMultiSourceDijkstra({ nodes, edges, sources: ["lib"], mode: "dependency" });

		expect(dependency.distances.has("lib")).toBe(true);
		expect(reverseImpact.distances.has("app")).toBe(true);
		expect(wrongDirection.distances.has("app")).toBe(false);
	});

	it("propagates impact over reverse dependency edges and applies thresholds", () => {
		const result = propagateImpact({
			nodes: graphNodes("lib", "app", "cli", "deep"),
			edges: [
				{ id: "app-lib", source: "app", target: "lib", kind: "dependency", reliability: 0.9 },
				{ id: "cli-app", source: "cli", target: "app", kind: "dependency", reliability: 0.9 },
				{ id: "deep-cli", source: "deep", target: "cli", kind: "dependency", reliability: 0.2 },
			],
			changedNodeIds: ["lib"],
			threshold: 0.5,
		});

		expect(result.impacted.map((item) => item.nodeId)).toEqual(["lib", "app", "cli"]);
		expect(result.scores.get("app")).toBeCloseTo(0.9, 6);
		expect(result.scores.has("deep")).toBe(false);
	});

	it("selects cost-effective tests with greedy weighted set cover", () => {
		const result = selectTestsByGreedyWeightedSetCover({
			targets: [{ id: "auth" }, { id: "billing" }, { id: "cli" }, { id: "sdk" }],
			tests: [
				{ id: "integration-all", covers: ["auth", "billing", "cli", "sdk"], cost: 4 },
				{ id: "api-fast", covers: ["cli", "sdk"], cost: 1 },
				{ id: "unit-fast", covers: ["auth", "billing"], cost: 1 },
				{ id: "expensive-auth", covers: ["auth"], cost: 10 },
			],
		});

		expect(result.selectedTests.map((test) => test.id)).toEqual(["api-fast", "unit-fast"]);
		expect(result.coveredTargetIds).toEqual(["auth", "billing", "cli", "sdk"]);
		expect(result.uncoveredTargetIds).toEqual([]);
	});

	it("scores hotspots from node metrics and dependency connectivity", () => {
		const hotspots = scoreGraphHotspots({
			nodes: [
				{ id: "leaf", changeFrequency: 0.1, failureRate: 0.1, complexity: 0.2 },
				{ id: "core", changeFrequency: 0.8, failureRate: 0.6, complexity: 0.9 },
				{ id: "app" },
				{ id: "cli" },
				{ id: "util" },
			],
			edges: [
				{ id: "app-core", source: "app", target: "core", kind: "dependency" },
				{ id: "cli-core", source: "cli", target: "core", kind: "dependency" },
				{ id: "core-util", source: "core", target: "util", kind: "dependency" },
			],
		});

		expect(hotspots[0]?.nodeId).toBe("core");
		expect(hotspots[0]?.score).toBeGreaterThan(hotspots.find((item) => item.nodeId === "leaf")?.score ?? 0);
		expect(hotspots[0]?.breakdown.fanIn).toBeGreaterThan(0);
	});
});
