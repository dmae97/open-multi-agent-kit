import type { OMK_EVIDENCE_BUNDLE_SCHEMA_VERSION, OMK_RUNTIME_VERSION } from "../version.js";
import type { DecisionRef } from "./decision.js";
import type { EvidenceRef } from "./evidence.js";

export type EvidenceBundleVerdict = "pass" | "warn" | "fail";

export type EvidenceBundleArtifact = {
  path: string;
  sha256: string;
  required?: boolean;
  kind?: "file" | "log" | "diff" | "metric" | "review" | "custom";
};

export type EvidenceBundle = {
  schemaVersion: typeof OMK_EVIDENCE_BUNDLE_SCHEMA_VERSION;
  runId: string;
  nodeId?: string;
  commit: string;
  provider: string;
  model?: string;
  runtimeVersion: typeof OMK_RUNTIME_VERSION | string;
  command: {
    value: string;
    exitCode: number;
  };
  changedFiles: string[];
  diffHash?: string;
  artifacts: EvidenceBundleArtifact[];
  verifier: {
    verdict: EvidenceBundleVerdict;
    version: string;
    checkedAt?: string;
  };
  redaction: {
    applied: boolean;
    summary: string;
    leakedSecretPatterns?: string[];
  };
  evidenceRefs?: EvidenceRef[];
  decisionRefs?: DecisionRef[];
};

export type EvidenceBundleIssueKind =
  | "missing_required_field"
  | "missing_artifact"
  | "hash_mismatch"
  | "unlinked_decision"
  | "stale_commit"
  | "redaction_violation"
  | "unsupported_schema";

export type EvidenceBundleIssue = {
  kind: EvidenceBundleIssueKind;
  severity: "error" | "warn";
  message: string;
  path?: string;
  expected?: string;
  actual?: string;
};

export type EvidenceBundleValidationResult = {
  ok: boolean;
  verdict: EvidenceBundleVerdict;
  issues: EvidenceBundleIssue[];
};
