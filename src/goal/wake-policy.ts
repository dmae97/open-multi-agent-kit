import { readFile, writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { getProjectRoot } from "../util/fs.js";

export interface WakeTrigger {
  type: "time" | "run-failed" | "evidence-missing" | "file-changed" | "browser-feedback" | "manual";
  interval?: string;
  paths?: string[];
  action: "continue" | "replan" | "verify" | "ask-human" | "close";
}

export interface WakePolicy {
  schemaVersion: 1;
  goalId: string;
  wakeTriggers: WakeTrigger[];
  budgets: {
    maxIterations: number;
    maxWallClockHours: number;
    maxDailyCostUsd: number;
    maxConsecutiveFailures: number;
  };
  approval: {
    write: "auto" | "interactive";
    shell: "auto" | "interactive";
    publish: "auto" | "block";
    secrets: "auto" | "block";
  };
}

function getWakePolicyPath(goalId: string): string {
  const root = getProjectRoot();
  return join(root, ".omk", "goals", goalId, "wake-policy.json");
}

export async function loadWakePolicy(goalId: string): Promise<WakePolicy | null> {
  const path = getWakePolicyPath(goalId);
  try {
    const content = await readFile(path, "utf-8");
    const parsed = JSON.parse(content) as unknown;
    if (!parsed || typeof parsed !== "object") {
      return null;
    }
    const obj = parsed as Record<string, unknown>;
    if (obj.schemaVersion !== 1) {
      return null;
    }
    return parsed as WakePolicy;
  } catch (err) {
    if (err && typeof err === "object" && "code" in err && err.code === "ENOENT") {
      return null;
    }
    console.warn(
      `Failed to load wake policy for ${goalId}: ${err instanceof Error ? err.message : String(err)}`
    );
    return null;
  }
}

export async function saveWakePolicy(policy: WakePolicy): Promise<void> {
  const path = getWakePolicyPath(policy.goalId);
  await mkdir(join(getProjectRoot(), ".omk", "goals", policy.goalId), { recursive: true });
  await writeFile(path, JSON.stringify(policy, null, 2), "utf-8");
}

export function createDefaultWakePolicy(goalId: string): WakePolicy {
  return {
    schemaVersion: 1,
    goalId,
    wakeTriggers: [
      { type: "time", interval: "6h", action: "continue" },
      { type: "run-failed", action: "replan" },
      { type: "evidence-missing", action: "continue" },
      { type: "manual", action: "continue" },
    ],
    budgets: {
      maxIterations: 10,
      maxWallClockHours: 24,
      maxDailyCostUsd: 5,
      maxConsecutiveFailures: 3,
    },
    approval: {
      write: "interactive",
      shell: "interactive",
      publish: "block",
      secrets: "block",
    },
  };
}
