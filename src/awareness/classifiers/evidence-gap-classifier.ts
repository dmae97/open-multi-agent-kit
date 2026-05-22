import type { GoalSpec, GoalEvidence } from "../../contracts/goal.js";
import type { Notice } from "../notice.js";

export function classifyEvidenceGap(goal: GoalSpec, evidence: GoalEvidence[]): Notice | null {
  const requiredCriteria = goal.successCriteria.filter((c) => c.requirement === "required");
  if (requiredCriteria.length === 0) return null;

  const evidenceMap = new Map<string, GoalEvidence>();
  for (const e of evidence) {
    if (!evidenceMap.has(e.criterionId)) {
      evidenceMap.set(e.criterionId, e);
    }
  }

  const missing = requiredCriteria.filter((c) => {
    const ev = evidenceMap.get(c.id);
    return !ev || !ev.passed;
  });

  if (missing.length === 0) return null;

  const confidence = Math.min(0.6 + missing.length * 0.05, 0.95);

  return {
    id: `ntc_eg_${Date.now()}`,
    createdAt: new Date().toISOString(),
    source: "goal",
    type: "evidence-gap",
    severity: "warning",
    confidence,
    summary: `Goal "${goal.title}" is missing evidence for ${missing.length} required criterion(s): ${missing
      .map((m) => m.description)
      .join(", ")}`,
    evidenceRefs: [],
    suggestedAction: "continue-goal",
  };
}
