import { z } from "zod";
import { OMK_COMMAND_SCHEMA_VERSION } from "../version.js";
import { EvidenceRefSchema } from "./evidence.schema.js";

export const OmkCommandEnvelopeStatusSchema = z.enum(["pass", "warn", "fail"]);
export const OmkCommandDiagnosticSchema = z.object({
  severity: z.enum(["info", "warn", "error"]),
  code: z.string().min(1),
  message: z.string().min(1),
  redacted: z.boolean(),
  remediation: z.string().optional(),
  path: z.string().optional(),
});

export const OmkCommandEnvelopeV1Schema = z.object({
  schemaVersion: z.literal(OMK_COMMAND_SCHEMA_VERSION),
  command: z.string().min(1),
  status: OmkCommandEnvelopeStatusSchema,
  runId: z.string().min(1).optional(),
  commit: z.string().min(1).optional(),
  startedAt: z.string().min(1),
  finishedAt: z.string().min(1),
  data: z.unknown(),
  diagnostics: z.array(OmkCommandDiagnosticSchema),
  evidenceRefs: z.array(EvidenceRefSchema),
  exitCode: z.number().int().min(0),
});
