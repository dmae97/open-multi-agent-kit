/**
 * ContextBrokerConverter — converts ContextCapsule to AgentTask.
 *
 * Bridges the context-broker bounded capsule with the provider-neutral
 * AgentRuntime task interface.
 */

import type { ContextCapsule } from "./context-capsule.js";
import type {
  AgentTask,
  AgentContext,
  ToolManifest,
  ProviderPolicy,
  CapabilityManifest,
} from "./agent-runtime.js";

export async function capsuleToTask(
  capsule: ContextCapsule,
  signal?: AbortSignal
): Promise<AgentTask> {
  const node = capsule.node;
  const routing = node.routing;

  // --- AgentContext ---
  const context: AgentContext = {
    runId: capsule.runId,
    nodeId: capsule.nodeId,
    role: node.role,
    goal: capsule.goal,
    system: capsule.system,
    files: capsule.relevantFiles.map((f) => f.path),
    memory: capsule.graphMemory.map((m) => ({
      key: m.key,
      source: m.kind,
      summary: m.value,
    })),
    abortSignal: signal,
    // TODO: capsule does not carry cwd/env; defaulting to undefined.
    cwd: undefined,
    env: undefined,
  };

  // --- ToolManifest ---
  // TODO: capsule.tools does not exist on ContextCapsule; available tools
  // are only string names in node.routing.tools / assignedCapabilities.tools.
  // Converting them to minimal manifest entries with empty schemas.
  const toolNames =
    routing?.tools ?? routing?.assignedCapabilities?.tools ?? [];
  const tools: ToolManifest = {
    available: toolNames.map((name) => ({
      name,
      description: "", // TODO: no description available in capsule
      inputSchema: {}, // TODO: no schema available in capsule
    })),
    mcpServers: routing?.mcpServers ?? [],
    skills: routing?.skills ?? [],
    hooks: routing?.hooks ?? [],
  };

  // --- ProviderPolicy ---
  // TODO: capsule.providerStrategy / preferredProviders / fallbackChain
  // do not exist on ContextCapsule. Deriving from node.routing instead.
  const preferredProviders: string[] = [];
  if (routing?.provider && routing.provider !== "auto") {
    preferredProviders.push(routing.provider);
  }
  if (routing?.candidateProviders?.length) {
    preferredProviders.push(...routing.candidateProviders);
  }

  const fallbackChain: string[] = [];
  if (routing?.fallbackProvider) {
    fallbackChain.push(routing.fallbackProvider);
  }

  const providerPolicy: ProviderPolicy = {
    // TODO: capsule.providerStrategy does not exist; defaulting to priority-first.
    strategy: "priority-first",
    preferredProviders,
    fallbackChain,
    // TODO: no cost/latency constraints in capsule; leaving undefined.
    maxCost: undefined,
    maxLatencyMs: undefined,
  };

  // --- CapabilityManifest ---
  // TODO: node does not expose a typed capabilities object; inferring from
  // routing flags and budget with safe defaults.
  const capabilities: CapabilityManifest = {
    read: true,
    write: routing?.readOnly === true ? false : true,
    shell: true,
    mcp: routing?.requiresMcp ?? false,
    patch: true,
    review: true,
    merge: true,
    vision: true,
    streaming: true,
    structuredOutput: true,
    toolCalling: routing?.requiresToolCalling ?? false,
    maxTokens: capsule.budget.maxInputTokens,
  };

  const task: AgentTask = {
    prompt: capsule.task,
    context,
    tools,
    providerPolicy,
    capabilities,
  };

  return task;
}
