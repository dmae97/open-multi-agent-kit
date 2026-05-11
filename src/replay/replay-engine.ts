/**
 * ReplayEngine — restores and replays a run's full execution timeline.
 *
 * Reads context capsules, evidence results, and decision traces to reconstruct
 * the exact sequence of events: provider selection, context delivery,
 * evidence gates, and repair decisions.
 */

import { readFile } from "fs/promises";
import { join } from "path";
import type { ReplayManifest, ReplayNodeRecord, DecisionTraceEntry } from "../contracts/replay.js";
import { createManifestBuilder } from "./manifest-builder.js";
import { getRunPath } from "../util/run-store.js";
import { style, status, label } from "../util/theme.js";

export interface ReplayOptions {
  runsDir?: string;
  json?: boolean;
  context?: boolean;
  evidence?: boolean;
  decisions?: boolean;
  repair?: boolean;
  nodeId?: string;
  attemptId?: string;
}

interface TimelineEvent {
  at: string;
  kind: "start" | "attempt" | "context" | "decision" | "evidence" | "repair" | "end";
  nodeId?: string;
  attemptId?: string;
  payload: unknown;
}

export async function replayRun(runId: string, options: ReplayOptions = {}): Promise<void> {
  const builder = createManifestBuilder({ runsDir: options.runsDir });
  const validation = await builder.validate(runId);
  if (!validation.valid) {
    console.error(status.error(`Run ${runId} is not replayable:`));
    for (const err of validation.errors) console.error(`  ${style.red("✕")} ${err}`);
    process.exit(1);
  }

  const manifest = await builder.build(runId);

  // Filter nodes if requested
  let nodes = manifest.nodes;
  if (options.nodeId) {
    nodes = nodes.filter((n) => n.nodeId === options.nodeId);
    if (nodes.length === 0) {
      console.error(status.error(`Node ${options.nodeId} not found in run ${runId}`));
      process.exit(1);
    }
  }

  // Filter attempts if requested
  if (options.attemptId) {
    const targetAttempt = manifest.nodes
      .flatMap((n) => n.attempts)
      .find((a) => a.attemptId === options.attemptId);
    if (!targetAttempt) {
      console.error(status.error(`Attempt ${options.attemptId} not found in run ${runId}`));
      process.exit(1);
    }
    const parentNode = manifest.nodes.find((n) =>
      n.attempts.some((a) => a.attemptId === options.attemptId)
    );
    if (parentNode) {
      nodes = [{
        ...parentNode,
        attempts: parentNode.attempts.filter((a) => a.attemptId === options.attemptId),
      }];
    }
  }

  // Build timeline
  const timeline = await buildTimeline(runId, nodes, options);

  if (options.json) {
    console.log(JSON.stringify({ runId, manifest, timeline }, null, 2));
    return;
  }

  renderReplay(runId, manifest, nodes, timeline, options);
}

async function buildTimeline(
  runId: string,
  nodes: readonly ReplayNodeRecord[],
  options: ReplayOptions
): Promise<TimelineEvent[]> {
  const events: TimelineEvent[] = [];

  // Load evidence and decisions
  const evidenceEntries = await loadEvidenceEntries(runId, options.runsDir);
  const allDecisions = await loadDecisions(runId, options.runsDir);

  events.push({ at: "", kind: "start", payload: { runId } });

  for (const node of nodes) {
    for (const attempt of node.attempts) {
      events.push({
        at: attempt.startedAt,
        kind: "attempt",
        nodeId: node.nodeId,
        attemptId: attempt.attemptId,
        payload: { runtime: attempt.runtime, model: attempt.model, provider: attempt.provider },
      });

      // Context capsule event
      if (options.context) {
        const capsule = await loadContextCapsule(runId, node.nodeId, attempt.attemptId, options.runsDir);
        if (capsule) {
          events.push({
            at: attempt.startedAt,
            kind: "context",
            nodeId: node.nodeId,
            attemptId: attempt.attemptId,
            payload: capsule,
          });
        }
      }

      // Decisions for this attempt
      const attemptDecisions = allDecisions.filter(
        (d) => d.attemptId === attempt.attemptId || (d.nodeId === node.nodeId && !d.attemptId)
      );
      for (const d of attemptDecisions) {
        const isRepair = d.component === "repair-policy";
        if (options.decisions || (options.repair && isRepair)) {
          events.push({
            at: d.at,
            kind: isRepair ? "repair" : "decision",
            nodeId: node.nodeId,
            attemptId: attempt.attemptId,
            payload: d,
          });
        }
      }

      // Evidence for this attempt
      if (options.evidence) {
        const attemptEvidence = evidenceEntries.filter(
          (e) => e.attemptId === attempt.attemptId && e.nodeId === node.nodeId
        );
        for (const ev of attemptEvidence) {
          events.push({
            at: ev.timestamp ?? attempt.endedAt ?? attempt.startedAt,
            kind: "evidence",
            nodeId: node.nodeId,
            attemptId: attempt.attemptId,
            payload: ev,
          });
        }
      }

      events.push({
        at: attempt.endedAt ?? attempt.startedAt,
        kind: "end",
        nodeId: node.nodeId,
        attemptId: attempt.attemptId,
        payload: { status: attempt.status, error: attempt.error, latencyMs: attempt.latencyMs },
      });
    }
  }

  // Sort by time, stable for same timestamps
  events.sort((a, b) => {
    const ta = a.at || "";
    const tb = b.at || "";
    if (ta !== tb) return ta.localeCompare(tb);
    const order = ["start", "attempt", "context", "decision", "repair", "evidence", "end"];
    return order.indexOf(a.kind) - order.indexOf(b.kind);
  });

  return events;
}

function renderReplay(
  runId: string,
  manifest: ReplayManifest,
  nodes: readonly ReplayNodeRecord[],
  timeline: TimelineEvent[],
  _options: ReplayOptions
): void {
  console.log(style.purpleBold(`▶ Replay — ${runId}`));
  console.log(label("OMK Version", manifest.omkVersion));
  console.log(label("Started", manifest.startedAt));
  if (manifest.completedAt) console.log(label("Completed", manifest.completedAt));
  console.log(label("DAG Hash", manifest.dagHash));
  console.log("");

  const nodeMap = new Map(nodes.map((n) => [n.nodeId, n]));

  for (const event of timeline) {
    switch (event.kind) {
      case "start": {
        console.log(style.gray("┌─ Run started"));
        break;
      }
      case "attempt": {
        const p = event.payload as { runtime: string; model?: string; provider?: string };
        const providerInfo = p.provider ? ` via ${style.cream(p.provider)}` : "";
        const modelInfo = p.model ? ` (${p.model})` : "";
        console.log(`\n  ${style.purpleBold("▸")} ${style.creamBold(event.nodeId ?? "")} ${style.gray(event.attemptId ?? "")}`);
        console.log(`    ${style.gray("Runtime:")} ${p.runtime}${modelInfo}${providerInfo}`);
        break;
      }
      case "context": {
        const capsule = event.payload as {
          system?: string;
          task?: string;
          goal?: string;
          relevantFiles?: readonly { path: string; content: string }[];
          dependencySummaries?: readonly string[];
          graphMemory?: readonly { key: string; value: string }[];
          budget?: { maxInputTokens: number; compression: string };
          _snapshot?: { estimatedTokens: number };
        };
        const tokens = capsule._snapshot?.estimatedTokens ?? 0;
        const fileCount = capsule.relevantFiles?.length ?? 0;
        const memCount = capsule.graphMemory?.length ?? 0;
        console.log(`    ${style.gray("Context:")} ${tokens} tokens, ${fileCount} files, ${memCount} memory facts`);
        if (capsule.budget) {
          console.log(`      ${style.gray("Budget:")} ${capsule.budget.maxInputTokens} max-input, ${capsule.budget.compression} compression`);
        }
        if (capsule.goal) {
          const goalPreview = capsule.goal.slice(0, 80).replace(/\n/g, " ");
          console.log(`      ${style.gray("Goal:")} ${goalPreview}${capsule.goal.length > 80 ? "…" : ""}`);
        }
        break;
      }
      case "decision": {
        const d = event.payload as DecisionTraceEntry;
        const scores = d.scores ? ` ${style.gray(JSON.stringify(d.scores))}` : "";
        console.log(`    ${style.gray("Decision:")} [${style.purple(d.component)}] ${d.outputDecision}${scores}`);
        console.log(`      ${style.gray(d.reason)}`);
        break;
      }
      case "repair": {
        const d = event.payload as DecisionTraceEntry;
        console.log(`    ${style.orange("Repair:")} [${style.purple(d.component)}] ${d.outputDecision}`);
        console.log(`      ${style.gray(d.reason)}`);
        break;
      }
      case "evidence": {
        const ev = event.payload as { gate: string; passed: boolean; message?: string; ref?: string };
        const icon = ev.passed ? style.mint("✓") : style.red("✕");
        console.log(`    ${icon} ${style.gray("Evidence:")} ${ev.gate}`);
        if (ev.message) console.log(`      ${style.gray(ev.message)}`);
        if (ev.ref) console.log(`      ${style.gray("Ref: " + ev.ref)}`);
        break;
      }
      case "end": {
        const p = event.payload as { status: string; error?: string; latencyMs?: number };
        const icon = p.status === "success" ? style.mint("✓") : style.red("✕");
        const latency = p.latencyMs ? ` ${formatMs(p.latencyMs)}` : "";
        console.log(`    ${icon} ${style.gray("Result:")} ${p.status}${latency}`);
        if (p.error) console.log(`      ${style.red(p.error)}`);
        const node = nodeMap.get(event.nodeId ?? "");
        if (node && node.attempts[node.attempts.length - 1]?.attemptId === event.attemptId) {
          console.log(`  ${style.gray("└─ Node " + event.nodeId + " complete")}`);
        }
        break;
      }
    }
  }

  // Summary
  console.log("");
  console.log(style.purpleBold("Replay Summary"));
  console.log(`  Nodes:    ${nodes.length}`);
  console.log(`  Attempts: ${nodes.reduce((s, n) => s + n.attempts.length, 0)}`);
  console.log(`  Success:  ${style.mint(String(nodes.filter((n) => n.finalStatus === "success").length))}`);
  console.log(`  Failed:   ${style.red(String(nodes.filter((n) => n.finalStatus === "failed").length))}`);
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

function formatMs(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`;
  const m = Math.floor(ms / 60_000);
  const s = Math.floor((ms % 60_000) / 1000);
  return `${m}m${s}s`;
}
