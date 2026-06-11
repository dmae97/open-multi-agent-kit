import type { OMK_COMMAND_SCHEMA_VERSION } from "../version.js";
import type { EvidenceRef } from "./evidence.js";

export type OmkCommandEnvelopeStatus = "pass" | "warn" | "fail";
export type OmkCommandDiagnosticSeverity = "info" | "warn" | "error";

export type OmkCommandDiagnostic = {
  severity: OmkCommandDiagnosticSeverity;
  code: string;
  message: string;
  redacted: boolean;
  remediation?: string;
  path?: string;
};

export type OmkCommandEnvelope<TData = unknown> = {
  schemaVersion: typeof OMK_COMMAND_SCHEMA_VERSION;
  command: string;
  status: OmkCommandEnvelopeStatus;
  runId?: string;
  commit?: string;
  startedAt: string;
  finishedAt: string;
  data: TData;
  diagnostics: OmkCommandDiagnostic[];
  evidenceRefs: EvidenceRef[];
  exitCode: number;
};
