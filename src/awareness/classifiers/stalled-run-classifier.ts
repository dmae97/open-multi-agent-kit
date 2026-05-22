import type { Notice } from "../notice.js";

const STALL_THRESHOLD_MS = 30 * 60 * 1000; // 30 minutes

export function classifyStalledRun(
  runId: string,
  status: string,
  lastActivity: string
): Notice | null {
  if (status !== "running") return null;

  const last = new Date(lastActivity).getTime();
  const now = Date.now();
  if (Number.isNaN(last)) return null;

  const elapsed = now - last;
  if (elapsed < STALL_THRESHOLD_MS) return null;

  const minutes = Math.round(elapsed / 60_000);

  return {
    id: `ntc_sr_${Date.now()}`,
    createdAt: new Date().toISOString(),
    source: "run",
    type: "stalled-run",
    severity: "blocker",
    confidence: 0.9,
    summary: `Run ${runId} has been stalled for ${minutes} minute(s) with no activity.`,
    evidenceRefs: [],
    suggestedAction: "replan-goal",
  };
}
