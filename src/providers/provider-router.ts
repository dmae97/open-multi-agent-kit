import type {
  AgentProvider,
  ProviderRouteDecision,
  ProviderRouteInput,
  ProviderRouteStrategy,
} from "./provider.js";

export interface ProviderRouterOptions {
  providers: AgentProvider[];
  defaultStrategy?: ProviderRouteStrategy;
}

export function createProviderRouter(options: ProviderRouterOptions) {
  // TODO: "kimi-first" is tied to ProviderRouteStrategy internal type;
  // refactor to a runtime-neutral default once the strategy enum is updated.
  const { providers, defaultStrategy = "priority-first" } = options;
  const sorted = [...providers].sort((a, b) => b.priority - a.priority);

  function select(input: ProviderRouteInput): ProviderRouteDecision {
    const strategy = input.strategy ?? defaultStrategy;
    const candidates = sorted.filter((p) => p.supports(input.node));

    if (candidates.length === 0) {
      const fallback = sorted[0];
      if (!fallback) {
        throw new Error(`No providers registered and no fallback available for node ${input.node?.id ?? "unknown"}`);
      }
      return {
        provider: fallback,
        reason: "no-matching-provider",
        fallbacks: [],
        confidence: 0.5,
        strategy,
      };
    }

    switch (strategy) {
      case "priority-first":
        return selectPriorityFirst(candidates, input);
      case "cost-aware":
        return selectCostAware(candidates, input);
      case "fallback-on-evidence-fail":
        return selectFallbackOnEvidenceFail(candidates, input);
      case "round-robin":
        return selectRoundRobin(candidates, input);
      case "lowest-latency":
        return selectLowestLatency(candidates, input);
      default:
        return selectPriorityFirst(candidates, input);
    }
  }

  function selectPriorityFirst(
    candidates: AgentProvider[],
    _input: ProviderRouteInput
  ): ProviderRouteDecision {
    const primary = candidates[0];
    const fallbacks = candidates.slice(1);

    return {
      provider: primary,
      reason: "priority-first-strategy",
      fallbacks,
      confidence: 0.9,
      strategy: "priority-first",
    };
  }

  function selectCostAware(
    candidates: AgentProvider[],
    input: ProviderRouteInput
  ): ProviderRouteDecision {
    const withCost = candidates.map((p) => ({
      provider: p,
      estimatedCost: estimateProviderCost(p, input),
    }));
    withCost.sort((a, b) => a.estimatedCost - b.estimatedCost);

    return {
      provider: withCost[0].provider,
      reason: "lowest-estimated-cost",
      fallbacks: withCost.slice(1).map((c) => c.provider),
      confidence: 0.8,
      strategy: "cost-aware",
    };
  }

  function selectFallbackOnEvidenceFail(
    candidates: AgentProvider[],
    _input: ProviderRouteInput
  ): ProviderRouteDecision {
    const primary = candidates[0];
    const fallbacks = candidates.slice(1);

    return {
      provider: primary,
      reason: "evidence-fail-fallback-ordered",
      fallbacks,
      confidence: 0.85,
      strategy: "fallback-on-evidence-fail",
    };
  }

  let rrIndex = 0;
  function selectRoundRobin(
    candidates: AgentProvider[],
    _input: ProviderRouteInput
  ): ProviderRouteDecision {
    const idx = rrIndex % candidates.length;
    rrIndex++;
    const selected = candidates[idx];
    const fallbacks = candidates.filter((_, i) => i !== idx);

    return {
      provider: selected,
      reason: `round-robin-index-${idx}`,
      fallbacks,
      confidence: 0.7,
      strategy: "round-robin",
    };
  }

  function selectLowestLatency(
    candidates: AgentProvider[],
    _input: ProviderRouteInput
  ): ProviderRouteDecision {
    const sorted = [...candidates].sort((a, b) => {
      const aLatency = getProviderLatency(a);
      const bLatency = getProviderLatency(b);
      return aLatency - bLatency;
    });

    return {
      provider: sorted[0],
      reason: "lowest-latency",
      fallbacks: sorted.slice(1),
      confidence: 0.75,
      strategy: "lowest-latency",
    };
  }

  return { select };
}

function estimateProviderCost(
  provider: AgentProvider,
  _input: ProviderRouteInput
): number {
  if (provider.estimateCost) {
    return 0.001;
  }
  return provider.priority > 50 ? 0.002 : 0.001;
}

function getProviderLatency(provider: AgentProvider): number {
  return provider.priority > 50 ? 500 : 1000;
}
