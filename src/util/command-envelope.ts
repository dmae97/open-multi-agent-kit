import { randomUUID } from "node:crypto";
import { OMK_COMMAND_SCHEMA_VERSION } from "../version.js";
import type {
  OmkCommandDiagnostic,
  OmkCommandEnvelope,
  OmkCommandEnvelopeStatus,
} from "../contracts/command.js";
import type { EvidenceRef } from "../contracts/evidence.js";

export type CreateOmkCommandEnvelopeOptions<TData> = {
  command: string;
  status: OmkCommandEnvelopeStatus;
  data: TData;
  diagnostics?: OmkCommandDiagnostic[];
  evidenceRefs?: EvidenceRef[];
  exitCode?: number;
  runId?: string;
  commit?: string;
  startedAt?: string;
  finishedAt?: string;
};

export function createOmkCommandEnvelope<TData>(
  options: CreateOmkCommandEnvelopeOptions<TData>
): OmkCommandEnvelope<TData> {
  const startedAt = options.startedAt ?? new Date().toISOString();
  return {
    schemaVersion: OMK_COMMAND_SCHEMA_VERSION,
    command: options.command,
    status: options.status,
    ...(options.runId ? { runId: options.runId } : {}),
    ...(options.commit ? { commit: options.commit } : {}),
    startedAt,
    finishedAt: options.finishedAt ?? startedAt,
    data: options.data,
    diagnostics: options.diagnostics ?? [],
    evidenceRefs: options.evidenceRefs ?? [],
    exitCode: options.exitCode ?? (options.status === "fail" ? 1 : 0),
  };
}

export function commandDiagnostic(
  severity: OmkCommandDiagnostic["severity"],
  code: string,
  message: string,
  options: Partial<Omit<OmkCommandDiagnostic, "severity" | "code" | "message" | "redacted">> & { redacted?: boolean } = {}
): OmkCommandDiagnostic {
  return {
    severity,
    code,
    message,
    redacted: options.redacted ?? true,
    ...(options.remediation ? { remediation: options.remediation } : {}),
    ...(options.path ? { path: options.path } : {}),
  };
}

export function createCommandRunId(prefix = "cmd"): string {
  return `${prefix}-${randomUUID()}`;
}
