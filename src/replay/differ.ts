/**
 * ReplayDiffer — structural diff between two ReplayManifests.
 */

import { readFile, readdir } from "fs/promises";
import { join } from "path";
import type { ReplayDiffReport, ReplayDiffEntry, DecisionTraceEntry } from "../contracts/replay.js";
import { createManifestBuilder } from "./manifest-builder.js";
import { getRunPath } from "../util/run-store.js";

export async function diffRuns(runA: string, runB: string, runsDir?: string): Promise<ReplayDiffReport> {
  const builder = createManifestBuilder({ runsDir });
  const [manifestA, manifestB] = await Promise.all([builder.build(runA), builder.build(runB)]);

  const entries: ReplayDiffEntry[] = [];

  // Hash comparisons
  const dagHashMatch = manifestA.dagHash === manifestB.dagHash;
  const policyHashMatch =
    manifestA.policyHash === manifestB.policyHash &&
    manifestA.routerPolicyHash === manifestB.routerPolicyHash &&
    manifestA.repairPolicyHash === manifestB.repairPolicyHash;

  // Load deep forensic data
  const [evidenceA, evidenceB, decisionsA, decisionsB, contextA, contextB] = await Promise.all([
    loadEvidence(runA, runsDir),
    loadEvidence(runB, runsDir),
    loadDecisions(runA, runsDir),
    loadDecisions(runB, runsDir),
    loadContextHashes(runA, runsDir),
    loadContextHashes(runB, runsDir),
  ]);

  // Node-level diffs
  const nodeMapA = new Map(manifestA.nodes.map((n) => [n.nodeId, n]));
  const nodeMapB = new Map(manifestB.nodes.map((n) => [n.nodeId, n]));

  for (const [nodeId, nodeA] of nodeMapA) {
    const nodeB = nodeMapB.get(nodeId);
    if (!nodeB) {
      entries.push({
        kind: "node-removed",
        nodeId,
        runA,
        runB,
        detail: `Node ${nodeId} exists in ${runA} but not in ${runB}`,
      });
      continue;
    }

    // Attempt count
    if (nodeA.attempts.length !== nodeB.attempts.length) {
      entries.push({
        kind: "attempt-count",
        nodeId,
        runA,
        runB,
        detail: `Attempt count differs for ${nodeId}`,
        values: { a: nodeA.attempts.length, b: nodeB.attempts.length },
      });
    }

    // Status
    if (nodeA.finalStatus !== nodeB.finalStatus) {
      entries.push({
        kind: "status-changed",
        nodeId,
        runA,
        runB,
        detail: `Final status changed for ${nodeId}`,
        values: { a: nodeA.finalStatus, b: nodeB.finalStatus },
      });
    }

    // Latency
    if (Math.abs(nodeA.totalLatencyMs - nodeB.totalLatencyMs) > 1000) {
      entries.push({
        kind: "latency",
        nodeId,
        runA,
        runB,
        detail: `Latency differs significantly for ${nodeId}`,
        values: { a: nodeA.totalLatencyMs, b: nodeB.totalLatencyMs },
      });
    }

    // Cost
    if (Math.abs(nodeA.totalCostUsd - nodeB.totalCostUsd) > 0.001) {
      entries.push({
        kind: "cost",
        nodeId,
        runA,
        runB,
        detail: `Cost differs for ${nodeId}`,
        values: { a: nodeA.totalCostUsd, b: nodeB.totalCostUsd },
      });
    }

    // Decision trace depth
    const nodeDecisionsA = decisionsA.filter((d) => d.nodeId === nodeId);
    const nodeDecisionsB = decisionsB.filter((d) => d.nodeId === nodeId);
    if (nodeDecisionsA.length !== nodeDecisionsB.length) {
      entries.push({
        kind: "decision-changed",
        nodeId,
        runA,
        runB,
        detail: `Decision trace count differs for ${nodeId}`,
        values: { a: nodeDecisionsA.length, b: nodeDecisionsB.length },
      });
    }

    // Decision component-level diffs
    const componentsA = new Map<string, string[]>();
    const componentsB = new Map<string, string[]>();
    for (const d of nodeDecisionsA) {
      const list = componentsA.get(d.component) ?? [];
      list.push(d.outputDecision);
      componentsA.set(d.component, list);
    }
    for (const d of nodeDecisionsB) {
      const list = componentsB.get(d.component) ?? [];
      list.push(d.outputDecision);
      componentsB.set(d.component, list);
    }
    for (const [component, listA] of componentsA) {
      const listB = componentsB.get(component) ?? [];
      if (listA.length !== listB.length || listA.join(",") !== listB.join(",")) {
        entries.push({
          kind: "decision-changed",
          nodeId,
          runA,
          runB,
          detail: `Decision trace for ${component} differs on ${nodeId}`,
          values: { a: listA.join(", "), b: listB.join(", ") },
        });
      }
    }

    // Repair decision diffs
    const repairsA = nodeDecisionsA.filter((d) => d.component === "repair-policy");
    const repairsB = nodeDecisionsB.filter((d) => d.component === "repair-policy");
    if (repairsA.length !== repairsB.length || repairsA.map((d) => d.outputDecision).join(",") !== repairsB.map((d) => d.outputDecision).join(",")) {
      entries.push({
        kind: "repair-changed",
        nodeId,
        runA,
        runB,
        detail: `Repair policy decisions differ for ${nodeId}`,
        values: { a: repairsA.map((d) => d.outputDecision).join(", "), b: repairsB.map((d) => d.outputDecision).join(", ") },
      });
    }

    // Token delta (last attempt)
    const lastA = nodeA.attempts[nodeA.attempts.length - 1];
    const lastB = nodeB.attempts[nodeB.attempts.length - 1];
    if (lastA && lastB) {
      const inDelta = Math.abs(lastA.inputTokensEstimated - lastB.inputTokensEstimated);
      const outDelta = Math.abs(lastA.outputTokensEstimated - lastB.outputTokensEstimated);
      if (inDelta + outDelta > 100) {
        entries.push({
          kind: "token-delta",
          nodeId,
          runA,
          runB,
          detail: `Token usage differs for ${nodeId}`,
          values: {
            a: `${lastA.inputTokensEstimated} in / ${lastA.outputTokensEstimated} out`,
            b: `${lastB.inputTokensEstimated} in / ${lastB.outputTokensEstimated} out`,
          },
        });
      }
    }

    // Context capsule diffs
    const ctxA = contextA.get(nodeId) ?? new Map();
    const ctxB = contextB.get(nodeId) ?? new Map();
    for (const [attemptId, hashA] of ctxA) {
      const hashB = ctxB.get(attemptId);
      if (hashB === undefined) {
        entries.push({
          kind: "context-changed",
          nodeId,
          runA,
          runB,
          detail: `Context capsule for ${nodeId}/${attemptId} missing in ${runB}`,
          values: { a: hashA, b: "(missing)" },
        });
      } else if (hashA !== hashB) {
        entries.push({
          kind: "context-changed",
          nodeId,
          runA,
          runB,
          detail: `Context capsule hash differs for ${nodeId}/${attemptId}`,
          values: { a: hashA, b: hashB },
        });
      }
    }
    for (const [attemptId, hashB] of ctxB) {
      if (!ctxA.has(attemptId)) {
        entries.push({
          kind: "context-changed",
          nodeId,
          runA,
          runB,
          detail: `Context capsule for ${nodeId}/${attemptId} missing in ${runA}`,
          values: { a: "(missing)", b: hashB },
        });
      }
    }

    // Evidence gate diffs
    const evA = evidenceA.filter((e) => e.nodeId === nodeId);
    const evB = evidenceB.filter((e) => e.nodeId === nodeId);
    const evMapA = new Map(evA.map((e) => [`${e.attemptId}:${e.gate}`, e.passed]));
    const evMapB = new Map(evB.map((e) => [`${e.attemptId}:${e.gate}`, e.passed]));
    for (const [key, passedA] of evMapA) {
      const passedB = evMapB.get(key);
      if (passedB === undefined) {
        entries.push({
          kind: "evidence-changed",
          nodeId,
          runA,
          runB,
          detail: `Evidence gate ${key} missing in ${runB}`,
          values: { a: passedA ? "pass" : "fail", b: "(missing)" },
        });
      } else if (passedA !== passedB) {
        entries.push({
          kind: "evidence-changed",
          nodeId,
          runA,
          runB,
          detail: `Evidence gate ${key} result differs`,
          values: { a: passedA ? "pass" : "fail", b: passedB ? "pass" : "fail" },
        });
      }
    }
    for (const [key, passedB] of evMapB) {
      if (!evMapA.has(key)) {
        entries.push({
          kind: "evidence-changed",
          nodeId,
          runA,
          runB,
          detail: `Evidence gate ${key} missing in ${runA}`,
          values: { a: "(missing)", b: passedB ? "pass" : "fail" },
        });
      }
    }
  }

  for (const nodeId of nodeMapB.keys()) {
    if (!nodeMapA.has(nodeId)) {
      entries.push({
        kind: "node-added",
        nodeId,
        runA,
        runB,
        detail: `Node ${nodeId} exists in ${runB} but not in ${runA}`,
      });
    }
  }

  return {
    runA,
    runB,
    dagHashMatch,
    policyHashMatch,
    entries,
  };
}

async function loadEvidence(
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

async function loadContextHashes(runId: string, runsDir?: string): Promise<Map<string, Map<string, string>>> {
  const result = new Map<string, Map<string, string>>();
  const dir = getRunPath(runId, undefined, runsDir);
  const capsuleDir = join(dir, "context-capsules");
  try {
    const files = await readdir(capsuleDir);
    for (const file of files) {
      if (!file.endsWith(".json")) continue;
      const content = await readFile(join(capsuleDir, file), "utf-8");
      const hash = hashString(content);
      const [nodeId, attemptIdWithExt] = file.replace(".json", "").split("-");
      const attemptId = attemptIdWithExt ?? "";
      const nodeMap = result.get(nodeId) ?? new Map<string, string>();
      nodeMap.set(attemptId, hash);
      result.set(nodeId, nodeMap);
    }
  } catch {
    // ignore missing context-capsules dir
  }
  return result;
}

function hashString(input: string): string {
  let h = 0;
  for (let i = 0; i < input.length; i++) {
    h = ((h << 5) - h + input.charCodeAt(i)) | 0;
  }
  return Math.abs(h).toString(36);
}
