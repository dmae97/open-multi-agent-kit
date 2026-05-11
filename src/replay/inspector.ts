/**
 * ReplayInspector — forensic inspection of a single run.
 */

import { readFile } from "fs/promises";
import { join } from "path";
import type { ReplayManifest, ReplayNodeRecord, ReplayAttemptRecord, DecisionTraceEntry } from "../contracts/replay.js";
import { createManifestBuilder } from "./manifest-builder.js";
import { getRunPath } from "../util/run-store.js";
import { style, status, label } from "../util/theme.js";

export interface InspectOptions {
  runsDir?: string;
  nodeId?: string;
  attemptId?: string;
  json?: boolean;
  context?: boolean;
  evidence?: boolean;
  decisions?: boolean;
  repair?: boolean;
}

export async function inspectRun(runId: string, options: InspectOptions = {}): Promise<void> {
  const builder = createManifestBuilder({ runsDir: options.runsDir });
  const validation = await builder.validate(runId);
  if (!validation.valid) {
    console.error(status.error(`Run ${runId} is not replayable:`));
    for (const err of validation.errors) console.error(`  ${style.red("✕")} ${err}`);
    process.exit(1);
  }

  const manifest = await builder.build(runId);

  // Load deep forensic data
  const evidenceEntries = options.evidence ? await loadEvidenceEntries(runId, options.runsDir) : [];
  const allDecisions = options.decisions || options.repair ? await loadDecisions(runId, options.runsDir) : [];

  if (options.json) {
    const payload: Record<string, unknown> = { manifest };
    if (options.nodeId) {
      const node = manifest.nodes.find((n) => n.nodeId === options.nodeId);
      payload.node = node ?? null;
    }
    if (options.attemptId) {
      const attempt = manifest.nodes
        .flatMap((n) => n.attempts)
        .find((a) => a.attemptId === options.attemptId);
      payload.attempt = attempt ?? null;
    }
    if (options.evidence) payload.evidence = evidenceEntries;
    if (options.decisions || options.repair) payload.decisions = allDecisions;
    console.log(JSON.stringify(payload, null, 2));
    return;
  }

  if (options.nodeId) {
    const node = manifest.nodes.find((n) => n.nodeId === options.nodeId);
    if (!node) {
      console.error(status.error(`Node ${options.nodeId} not found in run ${runId}`));
      process.exit(1);
    }
    await renderNode(node, manifest.runId, options);
    return;
  }

  if (options.attemptId) {
    const attempt = manifest.nodes
      .flatMap((n) => n.attempts)
      .find((a) => a.attemptId === options.attemptId);
    if (!attempt) {
      console.error(status.error(`Attempt ${options.attemptId} not found in run ${runId}`));
      process.exit(1);
    }
    await renderAttempt(attempt, manifest.runId, false, options);
    return;
  }

  renderManifest(manifest, options);
}

function renderManifest(m: ReplayManifest, options: InspectOptions = {}): void {
  console.log(style.purpleBold(`🔍 Replay Manifest — ${m.runId}`));
  console.log(label("OMK Version", m.omkVersion));
  console.log(label("Started", m.startedAt));
  if (m.completedAt) console.log(label("Completed", m.completedAt));
  console.log(label("DAG Hash", m.dagHash));
  console.log("");
  console.log(style.pinkBold("Summary"));
  console.log(`  Nodes:        ${m.summary.totalNodes}`);
  console.log(`  Attempts:     ${m.summary.totalAttempts}`);
  console.log(`  Success:      ${style.mint(String(m.summary.successCount))}`);
  console.log(`  Failed:       ${m.summary.failureCount > 0 ? style.red(String(m.summary.failureCount)) : "0"}`);
  console.log(`  Skipped:      ${m.summary.skippedCount}`);
  console.log(`  Latency:      ${formatMs(m.summary.totalLatencyMs)}`);
  console.log(`  Cost (est.):  $${m.summary.totalCostUsd.toFixed(4)}`);
  console.log("");
  console.log(style.pinkBold("Nodes"));
  for (const node of m.nodes) {
    const statusIcon = node.finalStatus === "success" ? style.mint("✓") : node.finalStatus === "skipped" ? style.gray("⊘") : style.red("✕");
    console.log(`  ${statusIcon} ${style.cream(node.nodeId)} ${style.gray(`(${node.attempts.length} attempts, ${formatMs(node.totalLatencyMs)})`)}`);
    for (const a of node.attempts) {
      const aIcon = a.status === "success" ? style.mint("✓") : style.red("✕");
      console.log(`    ${aIcon} ${style.gray(a.attemptId)} ${a.runtime}${a.model ? ` / ${a.model}` : ""} ${formatMs(a.latencyMs ?? 0)}`);
      if (a.decisionTrace.length > 0) {
        console.log(`      ${style.gray("decisions:")} ${a.decisionTrace.length}`);
      }
    }
  }

  // Forensic extras
  if (options.decisions || options.repair) {
    const repairDecisions = m.nodes.flatMap((n) => n.attempts.flatMap((a) => a.decisionTrace.filter((d) => d.component === "repair-policy")));
    if (repairDecisions.length > 0) {
      console.log("");
      console.log(style.pinkBold("Repair Decisions"));
      for (const d of repairDecisions) {
        console.log(`  ${style.gray(d.at)} [${style.orange(d.nodeId ?? "?")}] ${d.outputDecision}`);
        console.log(`    ${style.gray(d.reason)}`);
      }
    }
  }
}

async function renderNode(node: ReplayNodeRecord, runId: string, options: InspectOptions = {}): Promise<void> {
  console.log(style.purpleBold(`🔍 Node — ${node.nodeId}`));
  console.log(label("Run", runId));
  console.log(label("Final Status", node.finalStatus));
  console.log(label("Attempts", String(node.attempts.length)));
  console.log(label("Latency", formatMs(node.totalLatencyMs)));
  console.log("");
  for (const a of node.attempts) {
    await renderAttempt(a, runId, /* compact */ true, options);
    console.log("");
  }
}

async function renderAttempt(a: ReplayAttemptRecord, runId: string, compact = false, options: InspectOptions = {}): Promise<void> {
  if (!compact) console.log(style.purpleBold(`🔍 Attempt — ${a.attemptId}`));
  else console.log(style.creamBold(a.attemptId));
  if (!compact) console.log(label("Run", runId));
  console.log(label("Runtime", a.runtime));
  if (a.model) console.log(label("Model", a.model));
  if (a.provider) console.log(label("Provider", a.provider));
  console.log(label("Status", a.status));
  console.log(label("Latency", formatMs(a.latencyMs ?? 0)));
  console.log(label("Tokens", `${a.inputTokensEstimated} in / ${a.outputTokensEstimated} out`));
  if (a.error) console.log(label("Error", style.red(a.error)));

  // Decision trace
  if (a.decisionTrace.length > 0 && (options.decisions || options.repair || (!options.context && !options.evidence))) {
    const traces = options.repair
      ? a.decisionTrace.filter((d) => d.component === "repair-policy")
      : a.decisionTrace;
    if (traces.length > 0) {
      console.log(style.gray("Decision Trace:"));
      for (const d of traces) {
        const scores = d.scores ? ` ${style.gray(JSON.stringify(d.scores))}` : "";
        console.log(`  ${style.gray(d.at)} [${style.purple(d.component)}] ${d.outputDecision}${scores}`);
        console.log(`    ${style.gray(d.reason)}`);
      }
    }
  }

  // Context capsule deep-dive
  if (options.context) {
    const capsule = await loadContextCapsule(runId, a.attemptId.split("__")[0] ?? "", a.attemptId, options.runsDir);
    if (capsule) {
      console.log(style.gray("Context Capsule:"));
      const c = capsule as {
        system?: string;
        task?: string;
        goal?: string;
        relevantFiles?: readonly { path: string; content: string }[];
        dependencySummaries?: readonly string[];
        graphMemory?: readonly { key: string; value: string }[];
        budget?: { maxInputTokens: number; compression: string };
        _snapshot?: { estimatedTokens: number };
      };
      console.log(`  ${style.gray("Tokens:")} ${c._snapshot?.estimatedTokens ?? "?"}`);
      if (c.budget) console.log(`  ${style.gray("Budget:")} ${c.budget.maxInputTokens} max-input, ${c.budget.compression}`);
      if (c.goal) console.log(`  ${style.gray("Goal:")} ${c.goal.slice(0, 120).replace(/\n/g, " ")}${c.goal.length > 120 ? "…" : ""}`);
      if (c.relevantFiles?.length) {
        console.log(`  ${style.gray("Files:")} ${c.relevantFiles.length}`);
        for (const f of c.relevantFiles.slice(0, 5)) {
          console.log(`    ${style.cream(f.path)} ${style.gray(`(${f.content.length} chars)`)}`);
        }
        if (c.relevantFiles.length > 5) console.log(`    ${style.gray(`... and ${c.relevantFiles.length - 5} more`)}`);
      }
      if (c.graphMemory?.length) {
        console.log(`  ${style.gray("Memory:")} ${c.graphMemory.length} facts`);
        for (const m of c.graphMemory.slice(0, 3)) {
          console.log(`    ${style.cream(m.key)} = ${m.value.slice(0, 60)}${m.value.length > 60 ? "…" : ""}`);
        }
        if (c.graphMemory.length > 3) console.log(`    ${style.gray(`... and ${c.graphMemory.length - 3} more`)}`);
      }
    } else {
      console.log(style.gray("Context Capsule: (missing)"));
    }
  }

  // Evidence results
  if (options.evidence) {
    const entries = await loadEvidenceEntriesForAttempt(runId, a.attemptId.split("__")[0] ?? "", a.attemptId, options.runsDir);
    if (entries.length > 0) {
      console.log(style.gray("Evidence Results:"));
      for (const ev of entries) {
        const icon = ev.passed ? style.mint("✓") : style.red("✕");
        console.log(`  ${icon} ${ev.gate}`);
        if (ev.message) console.log(`    ${style.gray(ev.message)}`);
        if (ev.ref) console.log(`    ${style.gray("Ref: " + ev.ref)}`);
      }
    } else {
      console.log(style.gray("Evidence Results: (none recorded)"));
    }
  }
}

function formatMs(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`;
  const m = Math.floor(ms / 60_000);
  const s = Math.floor((ms % 60_000) / 1000);
  return `${m}m${s}s`;
}

async function loadContextCapsule(
  runId: string,
  nodeId: string,
  attemptId: string,
  runsDir?: string
): Promise<unknown | null> {
  const dir = getRunPath(runId, undefined, runsDir);
  const path = join(dir, "context-capsules", `${nodeId}-${attemptId}.json`);
  try {
    const content = await readFile(path, "utf-8");
    return JSON.parse(content);
  } catch {
    return null;
  }
}

async function loadEvidenceEntriesForAttempt(
  runId: string,
  nodeId: string,
  attemptId: string,
  runsDir?: string
): Promise<Array<{ gate: string; passed: boolean; message?: string; ref?: string; timestamp?: string }>> {
  const dir = getRunPath(runId, undefined, runsDir);
  const path = join(dir, "evidence.jsonl");
  try {
    const content = await readFile(path, "utf-8");
    return content
      .trim()
      .split("\n")
      .filter((l) => l.length > 0)
      .map((line) => JSON.parse(line))
      .filter((e: { nodeId?: string; attemptId?: string }) => e.nodeId === nodeId && e.attemptId === attemptId);
  } catch {
    return [];
  }
}

async function loadEvidenceEntries(
  runId: string,
  runsDir?: string
): Promise<Array<{ nodeId: string; attemptId: string; gate: string; passed: boolean; message?: string; ref?: string; timestamp?: string }>> {
  const dir = getRunPath(runId, undefined, runsDir);
  const path = join(dir, "evidence.jsonl");
  try {
    const content = await readFile(path, "utf-8");
    return content
      .trim()
      .split("\n")
      .filter((l) => l.length > 0)
      .map((line) => JSON.parse(line));
  } catch {
    return [];
  }
}

async function loadDecisions(runId: string, runsDir?: string): Promise<DecisionTraceEntry[]> {
  const dir = getRunPath(runId, undefined, runsDir);
  const path = join(dir, "decisions.jsonl");
  try {
    const content = await readFile(path, "utf-8");
    return content
      .trim()
      .split("\n")
      .filter((l) => l.length > 0)
      .map((line) => JSON.parse(line) as DecisionTraceEntry);
  } catch {
    return [];
  }
}
