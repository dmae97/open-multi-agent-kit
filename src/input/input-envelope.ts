import { createHash } from "crypto";

export type InputKind =
  | "plain-prompt"
  | "slash-command"
  | "goal-form"
  | "resume"
  | "verify"
  | "replan";

/**
 * Image or file attached to a prompt (clipboard paste, --image flag, drag).
 * Carries both the on-disk path and the base64 data URI for multimodal
 * wire protocol use (image_url parts).
 */
export interface InputAttachment {
  /** Original file name or "clipboard-image.png". */
  name: string;
  /** Absolute or project-relative path to the saved file. */
  path: string;
  /** MIME type: image/png, image/jpeg, image/webp, image/gif. */
  mimeType: string;
  /** Base64 data URI (data:image/png;base64,...) for wire protocol. */
  dataUri: string;
  /** Detected extension: png, jpg, webp, gif. */
  ext: string;
  /** Source of the attachment. */
  source: "clipboard" | "file" | "drag";
}

export type InputSource = "chat" | "parallel" | "run" | "goal" | "api";
export type InputMcpScope = "all" | "project" | "none";

export interface InputRequestedArtifact {
  name: string;
  path?: string;
}

export interface InputSlashCommandEnvelope {
  command: string;
  argv: string[];
  positional: string[];
  flags: Record<string, boolean | string | string[]>;
}

export interface InputEnvelope {
  schemaVersion: 1;
  inputId: string;
  runId: string;
  sessionId?: string;
  kind: InputKind;
  raw: string;
  normalized: string;
  redactionCount: number;
  source: InputSource;
  cwd: string;
  root: string;
  rootSource?: string;
  provider?: string;
  model?: string;
  mcpScope?: InputMcpScope;
  ui?: string;
  view?: string;
  theme?: string;
  constraints: string[];
  requestedArtifacts: InputRequestedArtifact[];
  /** Images/files attached to this input (clipboard paste, --image, drag). */
  attachments: InputAttachment[];
  slashCommand?: InputSlashCommandEnvelope;
  createdAt: string;
}

export interface BuildInputEnvelopeInput {
  runId: string;
  sessionId?: string;
  kind: InputKind;
  raw: string;
  source: InputSource;
  cwd: string;
  root: string;
  rootSource?: string;
  provider?: string;
  model?: string;
  mcpScope?: InputMcpScope;
  ui?: string;
  view?: string;
  theme?: string;
  constraints?: readonly string[];
  requestedArtifacts?: readonly InputRequestedArtifact[];
  attachments?: readonly InputAttachment[];
  slashCommand?: InputSlashCommandEnvelope;
  now?: () => Date;
}

const SECRET_PATTERNS: RegExp[] = [
  /github_pat_[A-Za-z0-9_]+/gu,
  /gh[pousr]_[A-Za-z0-9_]+/gu,
  /sk-[A-Za-z0-9_-]{12,}/gu,
  /\b([A-Z0-9_]*(?:KEY|TOKEN|SECRET|PASSWORD|CREDENTIAL)[A-Z0-9_]*=)([^\s]+)/giu,
  /\b((?:--?)(?:api[-_]?key|token|secret|password|credential)(?:=|\s+))([^\s]+)/giu,
];

export function sanitizeInputTextForArtifact(value: string): {
  text: string;
  redactionCount: number;
} {
  let text = value;
  let redactionCount = 0;
  for (const pattern of SECRET_PATTERNS) {
    text = text.replace(pattern, (...args: unknown[]) => {
      redactionCount += 1;
      if (
        typeof args[1] === "string" &&
        pattern.source.startsWith("\\b([A-Z0-9_]*")
      ) {
        return `${args[1]}[REDACTED:secret]`;
      }
      if (
        typeof args[1] === "string" &&
        pattern.source.startsWith("\\b((?:--?)")
      ) {
        return `${args[1]}[REDACTED:secret]`;
      }
      return "[REDACTED:secret]";
    });
  }
  return { text, redactionCount };
}

export function normalizeInputText(raw: string): string {
  return raw.trim().replace(/\s+/gu, " ");
}

export function normalizeMcpScope(
  value: string | undefined,
): InputMcpScope | undefined {
  const normalized = value?.trim().toLowerCase();
  if (normalized === "all" || normalized === "project" || normalized === "none")
    return normalized;
  return undefined;
}

export function buildInputEnvelope(
  input: BuildInputEnvelopeInput,
): InputEnvelope {
  const createdAt = (input.now ?? (() => new Date()))().toISOString();
  const sanitizedRaw = sanitizeInputTextForArtifact(input.raw);
  const sanitizedNormalized = sanitizeInputTextForArtifact(
    normalizeInputText(input.raw),
  );
  const inputId = createInputId(
    input.runId,
    input.kind,
    sanitizedNormalized.text,
    createdAt,
  );
  return {
    schemaVersion: 1,
    inputId,
    runId: input.runId,
    sessionId: input.sessionId,
    kind: input.kind,
    raw: sanitizedRaw.text,
    normalized: sanitizedNormalized.text,
    redactionCount:
      sanitizedRaw.redactionCount + sanitizedNormalized.redactionCount,
    source: input.source,
    cwd: input.cwd,
    root: input.root,
    rootSource: input.rootSource,
    provider: input.provider,
    model: input.model,
    mcpScope: input.mcpScope,
    ui: input.ui,
    view: input.view,
    theme: input.theme,
    constraints: [...(input.constraints ?? [])],
    requestedArtifacts:
      input.requestedArtifacts?.map((artifact) => ({ ...artifact })) ?? [],
    attachments: input.attachments?.map((a) => ({ ...a })) ?? [],
    slashCommand: input.slashCommand
      ? cloneSlashCommand(input.slashCommand)
      : undefined,
    createdAt,
  };
}

function createInputId(
  runId: string,
  kind: InputKind,
  normalized: string,
  createdAt: string,
): string {
  const digest = createHash("sha256")
    .update(`${runId}\0${kind}\0${normalized}\0${createdAt}`)
    .digest("hex")
    .slice(0, 12);
  return `input-${createdAt.replace(/[:.]/gu, "-")}-${digest}`;
}

function cloneSlashCommand(
  input: InputSlashCommandEnvelope,
): InputSlashCommandEnvelope {
  const flags: Record<string, boolean | string | string[]> = {};
  for (const [key, value] of Object.entries(input.flags))
    flags[key] = Array.isArray(value) ? [...value] : value;
  return {
    command: input.command,
    argv: [...input.argv],
    positional: [...input.positional],
    flags,
  };
}
