/**
 * CLI Theme — Barrel export for terminal capability, theme registry, and theme resolver.
 */

export {
  getTerminalCapability,
  defaultThemeForCapability,
  detectColorTier,
  colorTierForDepth,
} from "./terminal-capability.js";

export type {
  TerminalCapability,
  ColorDepth,
  ColorTier,
} from "./terminal-capability.js";

export {
  hexToOklab,
  hexToRgb255,
  normalizeHex,
  nearestXterm256,
  buildXterm256Lookup,
} from "./oklab-quantize.js";

export type { OklabColor } from "./oklab-quantize.js";

export { compileTheme } from "./render-table.js";

export type {
  Ansi16Name,
  CompiledTheme,
  OmkThemeV1,
  RenderEntry,
  ThemeSemanticSpec,
  ThemeTokenKind,
  ThemeUsage,
} from "./render-table.js";

export {
  getBuiltinTheme,
  listBuiltinThemes,
  registerBuiltinTheme,
  __registry,
} from "./theme-registry.js";

export type {
  SemanticToken,
  ThemePalette,
} from "./theme-registry.js";

export { resolveTheme } from "./theme-resolver.js";
export type { ResolveThemeOptions } from "./theme-resolver.js";

export { renderStatusFrame } from "./status-frame.js";

export {
  listThemeDocuments,
  loadThemeDocument,
  validateThemeDocument,
} from "./theme-doc.js";
export type { ThemeDocumentRef } from "./theme-doc.js";

export { explainColorTier } from "./tier-explain.js";
export type { ColorTierExplanation } from "./tier-explain.js";
