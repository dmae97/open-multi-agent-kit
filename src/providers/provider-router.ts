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
  const { providers, defaultStrategy = "cost-aware" } = options;
  const sorted = providers
    .map((provider, index) => ({ provider, index }))
    .sort((a, b) => b.provider.priority - a.provider.priority || a.index - b.index)
    .map((entry) => entry.provider);

  function select(input: ProviderRouteInput): ProviderRouteDecision {
    const strategy = input.strategy ?? defaultStrategy;
    const candidates = sorted.filter((p) => p.supports(input.node));

    if (candidates.length === 0) {
      const fallback = sorted[0];
      if (!fallback) {
        throw new Error("provider-router requires at least one configured provider");
      }
      return {
        provider: fallback,
        reason: "no-supported-provider-matched",
        fallbacks: [],
        confidence: 0.5,
        strategy,
      };
    }

    switch (strategy) {
      case "compatibility-first":
        return selectCompatibilityFirst(candidates, input);
      case "cost-aware":
        return selectCostAware(candidates, input);
      case "fallback-on-evidence-fail":
        return selectFallbackOnEvidenceFail(candidates, input);
      case "round-robin":
        return selectRoundRobin(candidates, input);
      case "lowest-latency":
        return selectLowestLatency(candidates, input);
      default:
        return selectCostAware(candidates, input);
    }
  }

  function selectCompatibilityFirst(
    candidates: AgentProvider[],
    input: ProviderRouteInput
  ): ProviderRouteDecision {
    const ordered = orderByCompatibility(candidates, input);
    const hinted = explicitProviderHint(input)
      ? ordered.find((provider) => provider.id === input.providerHint)
      : undefined;
    const selected = hinted ?? ordered[0];

    return {
      provider: selected,
      reason: hinted ? "explicit-provider-hint-compatible" : "compatibility-capability-evidence-best",
      fallbacks: ordered.filter((provider) => provider !== selected),
      confidence: hinted ? 0.9 : compatibilityConfidence(selected, input),
      strategy: "compatibility-first",
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
    input: ProviderRouteInput
  ): ProviderRouteDecision {
    const ordered = [...candidates].sort((a, b) => {
      const priorityDelta = b.priority - a.priority;
      if (priorityDelta !== 0) return priorityDelta;

      const costDelta = estimateProviderCost(a, input) - estimateProviderCost(b, input);
      if (costDelta !== 0) return costDelta;

      return String(a.id).localeCompare(String(b.id));
    });

    return {
      provider: ordered[0],
      reason: "evidence-fail-fallback-ordered",
      fallbacks: ordered.slice(1),
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
  return provider.priority > 50 ? 500 : 750;
}

function orderByCompatibility(
  candidates: AgentProvider[],
  input: ProviderRouteInput
): AgentProvider[] {
  return [...candidates].sort((left, right) => {
    const scoreDelta = compatibilityScore(right, input) - compatibilityScore(left, input);
    if (scoreDelta !== 0) return scoreDelta;

    const costDelta = estimateProviderCost(left, input) - estimateProviderCost(right, input);
    if (costDelta !== 0) return costDelta;

    const priorityDelta = right.priority - left.priority;
    if (priorityDelta !== 0) return priorityDelta;

    return String(left.id).localeCompare(String(right.id));
  });
}

function compatibilityScore(provider: AgentProvider, input: ProviderRouteInput): number {
  let score = 0.5;
  if (explicitProviderHint(input) && provider.id === input.providerHint) {
    score += 0.5;
  }
  if (input.needsMcp) {
    score += supportsLocalControlPlane(provider) ? 0.25 : -0.15;
  }
  if (input.needsToolCalling) {
    score += supportsLocalControlPlane(provider) || provider.kind === "openai-compatible" ? 0.2 : 0;
  }
  if (input.risk === "read" || input.readOnly) {
    score += provider.kind === "openai-compatible" ? 0.15 : 0.05;
  } else {
    score += supportsLocalControlPlane(provider) ? 0.15 : -0.1;
  }
  if (provider.health) {
    score += 0.08;
  }
  if (provider.estimateCost) {
    score += 0.06;
  }
  score += Math.max(0, Math.min(1, provider.priority / 100)) * 0.1;
  return score;
}

function supportsLocalControlPlane(provider: AgentProvider): boolean {
  return provider.kind === "local" ||
    provider.kind === "external-cli" ||
    provider.kind === "codex-cli" ||
    provider.kind.endsWith("-native");
}

function explicitProviderHint(input: ProviderRouteInput): boolean {
  return Boolean(input.providerHint && input.providerHint !== "auto");
}

function compatibilityConfidence(provider: AgentProvider, input: ProviderRouteInput): number {
  return Math.max(0.65, Math.min(0.9, Number((0.55 + compatibilityScore(provider, input) / 4).toFixed(2))));
}
