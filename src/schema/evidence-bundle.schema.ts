import { z } from "zod";
import { OMK_EVIDENCE_BUNDLE_SCHEMA_VERSION } from "../version.js";
import { DecisionRefSchema } from "./decision.schema.js";
import { EvidenceRefSchema } from "./evidence.schema.js";

export const EvidenceBundleArtifactSchema = z.object({
  path: z.string().min(1),
  sha256: z.string().regex(/^[a-f0-9]{64}$/u),
  required: z.boolean().optional(),
  kind: z.enum(["file", "log", "diff", "metric", "review", "custom"]).optional(),
});

export const EvidenceBundleSchema = z.object({
  schemaVersion: z.literal(OMK_EVIDENCE_BUNDLE_SCHEMA_VERSION),
  runId: z.string().min(1),
  nodeId: z.string().min(1).optional(),
  commit: z.string().min(1),
  provider: z.string().min(1),
  model: z.string().min(1).optional(),
  runtimeVersion: z.string().min(1),
  command: z.object({
    value: z.string().min(1),
    exitCode: z.number().int(),
  }),
  changedFiles: z.array(z.string()),
  diffHash: z.string().regex(/^[a-f0-9]{64}$/u).optional(),
  artifacts: z.array(EvidenceBundleArtifactSchema).min(1),
  verifier: z.object({
    verdict: z.enum(["pass", "warn", "fail"]),
    version: z.string().min(1),
    checkedAt: z.string().min(1).optional(),
  }),
  redaction: z.object({
    applied: z.boolean(),
    summary: z.string().min(1),
    leakedSecretPatterns: z.array(z.string()).optional(),
  }),
  evidenceRefs: z.array(EvidenceRefSchema).optional(),
  decisionRefs: z.array(DecisionRefSchema).optional(),
});
