/**
 * CLI Theme — Render Table Compiler
 * Compiles an omk.theme.v1 document (themes/*.theme.json) into per-surface
 * render tables at startup. For each semantic token it precomputes the SGR
 * sequence for the requested degradation tier:
 *   truecolor → SGR 38;2;R;G;B
 *   256       → SGR 38;5;N via the OKLab nearest-neighbor lookup (16-255 only)
 *   16        → the theme's hand-authored ansi16 (fallback16) mapping
 *   no-color  → empty string
 * Single entrypoint: compileTheme(theme, tier).
 */

import { buildXterm256Lookup, normalizeHex, hexToRgb255 } from "./oklab-quantize.js";
import type { ColorTier } from "./terminal-capability.js";

export type ThemeUsage = "text" | "indicator" | "background";
export type ThemeTokenKind = "state" | "chrome" | "background";

export type Ansi16Name =
  | "black"
  | "red"
  | "green"
  | "yellow"
  | "blue"
  | "magenta"
  | "cyan"
  | "white"
  | "brightBlack"
  | "brightRed"
  | "brightGreen"
  | "brightYellow"
  | "brightBlue"
  | "brightMagenta"
  | "brightCyan"
  | "brightWhite";

export interface ThemeSemanticSpec {
  readonly color: string;
  readonly glyph?: string;
  readonly kind?: ThemeTokenKind;
  readonly usage: ThemeUsage;
}

export interface OmkThemeV1 {
  readonly schemaVersion: "omk.theme.v1";
  readonly name: string;
  readonly displayName?: string;
  readonly mode: "dark" | "light";
  readonly primitives: Readonly<Record<string, string>>;
  readonly backgrounds: readonly string[];
  readonly semantics: Readonly<Record<string, ThemeSemanticSpec>>;
  readonly components: Readonly<Record<string, Readonly<Record<string, string>>>>;
  readonly fallback16: Readonly<Record<string, string>>;
}

export interface RenderEntry {
  /** Semantic role this entry resolves (e.g. "dag.lane.running"). */
  readonly role: string;
  /** Canonical 24-bit hex of the underlying primitive. */
  readonly hex: string;
  /** Mandatory state glyph, or "" for chrome/background tokens. */
  readonly glyph: string;
  /** Precomputed SGR open sequence for the compiled tier ("" on no-color). */
  readonly sgr: string;
}

export interface CompiledTheme {
  readonly name: string;
  readonly tier: ColorTier;
  /** SGR reset for this tier ("" on no-color). */
  readonly reset: string;
  /** Semantic role → precomputed render entry. */
  readonly tokens: Readonly<Record<string, RenderEntry>>;
  /** Component surface → slot → precomputed render entry. */
  readonly surfaces: Readonly<Record<string, Readonly<Record<string, RenderEntry>>>>;
  /** Wrap text in the precomputed sequence for a semantic role. */
  readonly paint: (role: string, text: string) => string;
}

const ESC = "\u001b[";
const SGR_RESET = `${ESC}0m`;

// Foreground SGR codes for the 16-color tier (standard 30-37, bright 90-97).
const ANSI16_FG: Readonly<Record<Ansi16Name, number>> = {
  black: 30,
  red: 31,
  green: 32,
  yellow: 33,
  blue: 34,
  magenta: 35,
  cyan: 36,
  white: 37,
  brightBlack: 90,
  brightRed: 91,
  brightGreen: 92,
  brightYellow: 93,
  brightBlue: 94,
  brightMagenta: 95,
  brightCyan: 96,
  brightWhite: 97,
};

function isAnsi16Name(name: string): name is Ansi16Name {
  return Object.prototype.hasOwnProperty.call(ANSI16_FG, name);
}

function resolvePrimitiveHex(theme: OmkThemeV1, role: string, color: string): string {
  const raw = theme.primitives[color];
  if (raw === undefined) {
    throw new Error(`compileTheme(${theme.name}): semantic "${role}" references unknown primitive "${color}"`);
  }
  return normalizeHex(raw);
}

function sgrForTier(
  theme: OmkThemeV1,
  role: string,
  hex: string,
  tier: ColorTier,
  lookup256: ReadonlyMap<string, number>
): string {
  switch (tier) {
    case "truecolor": {
      const [r, g, b] = hexToRgb255(hex);
      return `${ESC}38;2;${r};${g};${b}m`;
    }
    case "256": {
      const index = lookup256.get(hex);
      if (index === undefined) {
        throw new Error(`compileTheme(${theme.name}): missing 256-color lookup for "${role}" (${hex})`);
      }
      return `${ESC}38;5;${index}m`;
    }
    case "16": {
      const name = theme.fallback16[role];
      if (name === undefined || !isAnsi16Name(name)) {
        throw new Error(`compileTheme(${theme.name}): semantic "${role}" has no valid ansi16 fallback (got "${name ?? "<missing>"}")`);
      }
      return `${ESC}${ANSI16_FG[name]}m`;
    }
    case "no-color":
      return "";
  }
}

/**
 * Compile an omk.theme.v1 document into a per-surface render table for one
 * degradation tier. Pure: computes everything up front, performs no I/O.
 */
export function compileTheme(theme: OmkThemeV1, tier: ColorTier): CompiledTheme {
  // Precompute the OKLab → xterm-256 lookup once per compile (build/load time).
  const distinctHexes = Object.entries(theme.semantics).map(([role, spec]) =>
    resolvePrimitiveHex(theme, role, spec.color)
  );
  const lookup256 = tier === "256" ? buildXterm256Lookup(distinctHexes) : new Map<string, number>();

  const tokens: Record<string, RenderEntry> = {};
  for (const [role, spec] of Object.entries(theme.semantics)) {
    const hex = resolvePrimitiveHex(theme, role, spec.color);
    tokens[role] = {
      role,
      hex,
      glyph: spec.glyph ?? "",
      sgr: sgrForTier(theme, role, hex, tier, lookup256),
    };
  }

  const surfaces: Record<string, Readonly<Record<string, RenderEntry>>> = {};
  for (const [surface, slots] of Object.entries(theme.components)) {
    const compiled: Record<string, RenderEntry> = {};
    for (const [slot, role] of Object.entries(slots)) {
      const entry = tokens[role];
      if (entry === undefined) {
        throw new Error(`compileTheme(${theme.name}): component ${surface}.${slot} references unknown semantic role "${role}"`);
      }
      compiled[slot] = entry;
    }
    surfaces[surface] = compiled;
  }

  const reset = tier === "no-color" ? "" : SGR_RESET;

  return {
    name: theme.name,
    tier,
    reset,
    tokens,
    surfaces,
    paint(role: string, text: string): string {
      const entry = tokens[role];
      if (entry === undefined || entry.sgr === "") return text;
      return entry.sgr + text + reset;
    },
  };
}
