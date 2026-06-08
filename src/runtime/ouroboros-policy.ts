/**
 * Ouroboros routing policy for OMK.
 *
 * Resolves whether to prefer the embedded Ouroboros spec-first flow
 * for goal/spec/orchestration intents.  Detection is non-fatal and
 * never triggers network access or implicit installs.
 */

import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { homedir } from "node:os";

// ── Mode ────────────────────────────────────────────────────────────

export type OuroborosMode = "always" | "auto" | "off";

/**
 * Read the OMK_OUROBOROS env var and normalise it into a mode.
 *
 * - unset / anything other than the known tokens  → "always" (default)
 * - "auto"                                        → "auto"
 * - "off" / "0" / "false" (case-insensitive)      → "off"
 */
export function resolveOuroborosMode(
  env: NodeJS.ProcessEnv = process.env,
): OuroborosMode {
  const raw = (env.OMK_OUROBOROS ?? "").trim().toLowerCase();
  if (raw === "off" || raw === "0" || raw === "false") return "off";
  if (raw === "auto") return "auto";
  return "always";
}

// ── Availability ────────────────────────────────────────────────────

export interface OuroborosAvailability {
  available: boolean;
  via: "mcp" | "binary" | "none";
  detail: string;
}

interface DetectOpts {
  env?: NodeJS.ProcessEnv;
  mcpConfigPath?: string;
  which?: (cmd: string) => Promise<string | null>;
}

/**
 * Check whether Ouroboros is reachable without network or installs.
 *
 * Strategy (non-fatal):
 *   1. Look for an `ouroboros` key in ~/.omk/agent/mcp.json  (global)
 *      and/or .omk/mcp.json  (project-scoped).
 *   2. Optionally check for an `ouroboros` binary via an injectable which().
 *
 * Any I/O error silently yields `{ available: false, via: "none" }`.
 */
export async function detectOuroborosAvailable(
  opts?: DetectOpts,
): Promise<OuroborosAvailability> {
  // --- binary check (fast, optional) ---
  if (opts?.which) {
    try {
      const bin = await opts.which("ouroboros");
      if (bin) {
        return { available: true, via: "binary", detail: `found binary: ${bin}` };
      }
    } catch {
      // swallow
    }
  }

  // --- MCP config check (non-fatal) ---
  const home = homedir();
  const candidates = [
    opts?.mcpConfigPath ?? join(home, ".omk", "agent", "mcp.json"),
    join(process.cwd(), ".omk", "mcp.json"),
  ];

  for (const configPath of candidates) {
    try {
      const raw = await readFile(configPath, "utf-8");
      const parsed: unknown = JSON.parse(raw);
      if (isRecord(parsed) && isRecord(parsed.mcpServers)) {
        if ("ouroboros" in parsed.mcpServers) {
          return {
            available: true,
            via: "mcp",
            detail: `ouroboros server found in ${configPath}`,
          };
        }
      }
    } catch {
      // file missing or malformed → continue
    }
  }

  return { available: false, via: "none", detail: "ouroboros not detected" };
}

// ── Decision ────────────────────────────────────────────────────────

export interface OuroborosDecision {
  use: boolean;
  mode: OuroborosMode;
  availability: OuroborosAvailability;
  reason: string;
}

/**
 * Intent tokens (lowercased) that qualify for Ouroboros routing.
 */
const OUROBOROS_INTENT_KEYWORDS: readonly string[] = [
  "goal",
  "plan",
  "spec",
  "seed",
  "interview",
  "orchestrate",
  "feature",
  "build",
  "implement",
  // Korean equivalents
  "계획",
  "스펙",
  "구현",
  "기획",
];

interface DecisionInput {
  intent: string;
  env?: NodeJS.ProcessEnv;
  detect?: () => Promise<OuroborosAvailability>;
}

/**
 * Decide whether the current run should route through Ouroboros.
 *
 * - use=true only when mode≠off AND available AND intent matches.
 * - When mode=always but unavailable → use=false with fallback reason.
 * - Never throws.
 */
export async function resolveOuroborosDecision(
  input: DecisionInput,
): Promise<OuroborosDecision> {
  const mode = resolveOuroborosMode(input.env);
  const detect = input.detect ?? (() => detectOuroborosAvailable({ env: input.env }));

  let availability: OuroborosAvailability;
  try {
    availability = await detect();
  } catch {
    availability = { available: false, via: "none", detail: "detection threw" };
  }

  if (mode === "off") {
    return { use: false, mode, availability, reason: "ouroboros-mode-off" };
  }

  if (!availability.available) {
    return {
      use: false,
      mode,
      availability,
      reason: "ouroboros-unavailable-fallback-native",
    };
  }

  if (!isGoalLikeIntent(input.intent)) {
    return { use: false, mode, availability, reason: "intent-not-goal-like" };
  }

  return { use: true, mode, availability, reason: "ouroboros-routing-active" };
}

// ── Helpers ─────────────────────────────────────────────────────────

function isGoalLikeIntent(intent: string): boolean {
  const lowered = intent.toLocaleLowerCase();
  return OUROBOROS_INTENT_KEYWORDS.some((kw) => lowered.includes(kw));
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}
