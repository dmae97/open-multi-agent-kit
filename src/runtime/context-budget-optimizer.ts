/**
 * ContextBudgetOptimizer — priority-based context trimming with per-field token accounting.
 *
 * Key metric: evidence_pass_rate_per_token
 * Goal: maximize verification pass probability per token spent.
 *
 * Priority order (highest first):
 *   1. node goal
 *   2. explicit user constraints (system prompt)
 *   3. evidence requirements
 *   4. failing evidence from previous attempt
 *   5. directly changed files
 *   6. dependency node summaries
 *   7. relevant file slices
 *   8. graph memory facts
 *   9. broad project background
 */

import type { ContextCapsule, FileSlice, MemoryFact } from "./context-capsule.js";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ContextBudgetReport {
  readonly nodeId: string;
  readonly attemptId: string;
  readonly totalTokensEstimated: number;
  readonly systemTokens: number;
  readonly taskTokens: number;
  readonly dependencyTokens: number;
  readonly fileTokens: number;
  readonly memoryTokens: number;
  readonly evidenceTokens: number;
  readonly toolResultTokens: number;
  readonly droppedItems: readonly DroppedContextItem[];
}

export interface DroppedContextItem {
  readonly kind: "file" | "memory" | "dependency" | "tool-result" | "log";
  readonly reason: "low-relevance" | "budget-limit" | "duplicate" | "too-large";
  readonly summary: string;
}

export interface ContextTokenBreakdown {
  readonly system: number;
  readonly task: number;
  readonly goal: number;
  readonly dependencies: number;
  readonly files: number;
  readonly memory: number;
  readonly evidence: number;
  readonly priorAttempts: number;
  readonly total: number;
}

export interface ContextBudgetOptimizationResult {
  readonly capsule: ContextCapsule;
  readonly report: ContextBudgetReport;
  readonly breakdown: ContextTokenBreakdown;
}

/** Per-item evidence stats for pass-rate-per-token tracking. */
export interface ContextItemEvidenceStats {
  readonly itemId: string;
  readonly kind: "file" | "memory" | "dependency" | "tool-result";
  readonly tokens: number;
  readonly evidencePassCount: number;
  readonly evidenceFailCount: number;
  readonly passRate: number;
}

// ─── Token estimation ────────────────────────────────────────────────────────

const CHARS_PER_TOKEN = 4;

export function estimateTokens(text: string): number {
  return Math.ceil((text ?? "").length / CHARS_PER_TOKEN);
}

export function estimateFileSliceTokens(slice: FileSlice): number {
  return estimateTokens(slice.content);
}

export function estimateMemoryFactTokens(fact: MemoryFact): number {
  // SPO triple is the authoritative source; key/value are backward compat
  const spo = estimateTokens(fact.subject) + estimateTokens(fact.predicate) + estimateTokens(fact.object);
  const kv = estimateTokens(fact.key) + estimateTokens(fact.value);
  return Math.max(spo, kv);
}

export function breakdownCapsuleTokens(capsule: ContextCapsule): ContextTokenBreakdown {
  const system = estimateTokens(capsule.system);
  const task = estimateTokens(capsule.task);
  const goal = estimateTokens(capsule.goal);

  let dependencies = 0;
  for (const s of capsule.dependencySummaries) {
    dependencies += estimateTokens(s);
  }

  let files = 0;
  for (const f of capsule.relevantFiles) {
    files += estimateFileSliceTokens(f);
  }

  let memory = 0;
  for (const m of capsule.graphMemory) {
    memory += estimateMemoryFactTokens(m);
  }

  let evidence = 0;
  for (const e of capsule.evidenceRequirements) {
    evidence += estimateTokens(`${e.gate}: ${e.ref ?? ""}`);
  }

  let priorAttempts = 0;
  for (const a of capsule.priorAttempts) {
    priorAttempts += estimateTokens(`${a.attempt} ${a.provider} ${a.status} ${a.failureSummary ?? ""}`);
  }

  return {
    system,
    task,
    goal,
    dependencies,
    files,
    memory,
    evidence,
    priorAttempts,
    total: system + task + goal + dependencies + files + memory + evidence + priorAttempts,
  };
}

// ─── Priority levels ─────────────────────────────────────────────────────────

type PriorityItem =
  | { level: 1; kind: "goal" }
  | { level: 2; kind: "system" }
  | { level: 3; kind: "evidence" }
  | { level: 4; kind: "prior-attempts" }
  | { level: 5; kind: "files" }
  | { level: 6; kind: "dependencies" }
  | { level: 7; kind: "file-slices" }
  | { level: 8; kind: "memory" }
  | { level: 9; kind: "background" };

const PRIORITY_ORDER: PriorityItem[] = [
  { level: 1, kind: "goal" },
  { level: 2, kind: "system" },
  { level: 3, kind: "evidence" },
  { level: 4, kind: "prior-attempts" },
  { level: 5, kind: "files" },
  { level: 6, kind: "dependencies" },
  { level: 7, kind: "file-slices" },
  { level: 8, kind: "memory" },
  { level: 9, kind: "background" },
];

// ─── Core optimizer ──────────────────────────────────────────────────────────

export function optimizeContextBudget(
  capsule: ContextCapsule,
  attemptId: string,
): ContextBudgetOptimizationResult {
  const breakdown = breakdownCapsuleTokens(capsule);
  const maxTokens = capsule.budget.maxInputTokens;
  const dropped: DroppedContextItem[] = [];

  if (breakdown.total <= maxTokens) {
    return {
      capsule,
      report: buildReport(capsule, attemptId, breakdown, dropped),
      breakdown,
    };
  }

  // Trim from lowest priority (9→1) until under budget
  let currentCapsule = { ...capsule };
  let currentBreakdown = breakdown;

  for (let i = PRIORITY_ORDER.length - 1; i >= 0; i--) {
    if (currentBreakdown.total <= maxTokens) break;

    const item = PRIORITY_ORDER[i];
    const result = trimLevel(currentCapsule, currentBreakdown, item, maxTokens);
    currentCapsule = result.capsule;
    currentBreakdown = result.breakdown;
    dropped.push(...result.dropped);
  }

  return {
    capsule: currentCapsule,
    report: buildReport(currentCapsule, attemptId, currentBreakdown, dropped),
    breakdown: currentBreakdown,
  };
}

// ─── Level-specific trimming ─────────────────────────────────────────────────

interface TrimResult {
  readonly capsule: ContextCapsule;
  readonly breakdown: ContextTokenBreakdown;
  readonly dropped: DroppedContextItem[];
}

function trimLevel(
  capsule: ContextCapsule,
  breakdown: ContextTokenBreakdown,
  item: PriorityItem,
  maxTokens: number,
): TrimResult {
  const overBy = breakdown.total - maxTokens;
  if (overBy <= 0) return { capsule, breakdown, dropped: [] };

  switch (item.kind) {
    case "background":
      return trimBackground(capsule, breakdown, overBy);
    case "memory":
      return trimMemory(capsule, breakdown, overBy);
    case "file-slices":
      return trimFileSlices(capsule, breakdown, overBy);
    case "dependencies":
      return trimDependencies(capsule, breakdown, overBy);
    case "files":
      return trimFiles(capsule, breakdown, overBy);
    case "prior-attempts":
      return trimPriorAttempts(capsule, breakdown, overBy);
    default:
      // Levels 1-3 (goal, system, evidence) are never trimmed
      return { capsule, breakdown, dropped: [] };
  }
}

function trimBackground(capsule: ContextCapsule, breakdown: ContextTokenBreakdown, _overBy: number): TrimResult {
  // Background = extra graphMemory facts beyond the essential ones
  const dropped: DroppedContextItem[] = [];
  if (capsule.graphMemory.length <= 1) return { capsule, breakdown, dropped };

  const keepCount = Math.max(1, Math.floor(capsule.graphMemory.length * 0.5));
  const removed = capsule.graphMemory.slice(keepCount);
  const newMemory = capsule.graphMemory.slice(0, keepCount);

  let savedTokens = 0;
  for (const m of removed) {
    savedTokens += estimateMemoryFactTokens(m);
    dropped.push({
      kind: "memory",
      reason: "budget-limit",
      summary: `${m.key} (${m.category})`,
    });
  }

  const newCapsule: ContextCapsule = { ...capsule, graphMemory: newMemory };
  const newBreakdown: ContextTokenBreakdown = {
    ...breakdown,
    memory: breakdown.memory - savedTokens,
    total: breakdown.total - savedTokens,
  };

  return { capsule: newCapsule, breakdown: newBreakdown, dropped };
}

function trimMemory(capsule: ContextCapsule, breakdown: ContextTokenBreakdown, overBy: number): TrimResult {
  const dropped: DroppedContextItem[] = [];
  if (capsule.graphMemory.length === 0) return { capsule, breakdown, dropped };

  // Drop lowest-confidence facts first
  const sorted = [...capsule.graphMemory].sort((a, b) => a.confidence - b.confidence);
  const newMemory: MemoryFact[] = [];
  let savedTokens = 0;

  for (const fact of sorted) {
    const tokens = estimateMemoryFactTokens(fact);
    if (savedTokens >= overBy) {
      newMemory.push(fact);
    } else {
      savedTokens += tokens;
      dropped.push({
        kind: "memory",
        reason: "low-relevance",
        summary: `${fact.key} (confidence=${fact.confidence})`,
      });
    }
  }

  const newCapsule: ContextCapsule = { ...capsule, graphMemory: newMemory };
  const newBreakdown: ContextTokenBreakdown = {
    ...breakdown,
    memory: breakdown.memory - savedTokens,
    total: breakdown.total - savedTokens,
  };

  return { capsule: newCapsule, breakdown: newBreakdown, dropped };
}

function trimFileSlices(capsule: ContextCapsule, breakdown: ContextTokenBreakdown, overBy: number): TrimResult {
  const dropped: DroppedContextItem[] = [];
  if (capsule.relevantFiles.length === 0) return { capsule, breakdown, dropped };

  // Drop largest files first (least efficient per-token)
  const sorted = [...capsule.relevantFiles].sort(
    (a, b) => estimateFileSliceTokens(b) - estimateFileSliceTokens(a),
  );
  const newFiles: FileSlice[] = [];
  let savedTokens = 0;

  for (const file of sorted) {
    const tokens = estimateFileSliceTokens(file);
    if (savedTokens >= overBy) {
      newFiles.push(file);
    } else {
      savedTokens += tokens;
      dropped.push({
        kind: "file",
        reason: tokens > overBy ? "too-large" : "budget-limit",
        summary: `${file.path} (${tokens} tokens)`,
      });
    }
  }

  const newCapsule: ContextCapsule = { ...capsule, relevantFiles: newFiles };
  const newBreakdown: ContextTokenBreakdown = {
    ...breakdown,
    files: breakdown.files - savedTokens,
    total: breakdown.total - savedTokens,
  };

  return { capsule: newCapsule, breakdown: newBreakdown, dropped };
}

function trimDependencies(capsule: ContextCapsule, breakdown: ContextTokenBreakdown, overBy: number): TrimResult {
  const dropped: DroppedContextItem[] = [];
  if (capsule.dependencySummaries.length === 0) return { capsule, breakdown, dropped };

  // Drop from end (least recent dependency)
  const newSummaries: string[] = [];
  let savedTokens = 0;
  const reversed = [...capsule.dependencySummaries].reverse();

  for (const summary of reversed) {
    const tokens = estimateTokens(summary);
    if (savedTokens >= overBy) {
      newSummaries.unshift(summary);
    } else {
      savedTokens += tokens;
      dropped.push({
        kind: "dependency",
        reason: "budget-limit",
        summary: summary.slice(0, 80),
      });
    }
  }

  const newCapsule: ContextCapsule = { ...capsule, dependencySummaries: newSummaries };
  const newBreakdown: ContextTokenBreakdown = {
    ...breakdown,
    dependencies: breakdown.dependencies - savedTokens,
    total: breakdown.total - savedTokens,
  };

  return { capsule: newCapsule, breakdown: newBreakdown, dropped };
}

function trimFiles(capsule: ContextCapsule, breakdown: ContextTokenBreakdown, overBy: number): TrimResult {
  // Same as trimFileSlices but more aggressive — remove all non-essential files
  return trimFileSlices(capsule, breakdown, overBy);
}

function trimPriorAttempts(capsule: ContextCapsule, breakdown: ContextTokenBreakdown, _overBy: number): TrimResult {
  const dropped: DroppedContextItem[] = [];
  if (capsule.priorAttempts.length === 0) return { capsule, breakdown, dropped };

  // Keep only last 2 attempts, drop older ones
  const keepCount = Math.min(2, capsule.priorAttempts.length);
  const removed = capsule.priorAttempts.slice(0, capsule.priorAttempts.length - keepCount);
  const newAttempts = capsule.priorAttempts.slice(capsule.priorAttempts.length - keepCount);

  let savedTokens = 0;
  for (const a of removed) {
    savedTokens += estimateTokens(`${a.attempt} ${a.provider} ${a.status} ${a.failureSummary ?? ""}`);
    dropped.push({
      kind: "log",
      reason: "budget-limit",
      summary: `attempt ${a.attempt} (${a.provider}/${a.status})`,
    });
  }

  const newCapsule: ContextCapsule = { ...capsule, priorAttempts: newAttempts };
  const newBreakdown: ContextTokenBreakdown = {
    ...breakdown,
    priorAttempts: breakdown.priorAttempts - savedTokens,
    total: breakdown.total - savedTokens,
  };

  return { capsule: newCapsule, breakdown: newBreakdown, dropped };
}

// ─── Report builder ──────────────────────────────────────────────────────────

function buildReport(
  capsule: ContextCapsule,
  attemptId: string,
  breakdown: ContextTokenBreakdown,
  droppedItems: DroppedContextItem[],
): ContextBudgetReport {
  return {
    nodeId: capsule.nodeId,
    attemptId,
    totalTokensEstimated: breakdown.total,
    systemTokens: breakdown.system + breakdown.goal,
    taskTokens: breakdown.task,
    dependencyTokens: breakdown.dependencies,
    fileTokens: breakdown.files,
    memoryTokens: breakdown.memory,
    evidenceTokens: breakdown.evidence + breakdown.priorAttempts,
    toolResultTokens: 0,
    droppedItems,
  };
}

// ─── Factory ─────────────────────────────────────────────────────────────────

export function createContextBudgetOptimizer() {
  return {
    optimize: optimizeContextBudget,
    breakdown: breakdownCapsuleTokens,
    estimateTokens,
    estimateFileSliceTokens,
    estimateMemoryFactTokens,
  };
}
