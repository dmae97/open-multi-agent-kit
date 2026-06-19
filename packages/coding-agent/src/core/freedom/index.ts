/**
 * Public surface for the OMK freedom-mode runtime.
 *
 * Tool dispatchers import `gate`. The interactive TUI imports `badgeText` and
 * `bannerOnce`. Subprocess spawners import `applyFreedomEnv`. Everything else
 * is implementation detail and stays inside this directory.
 *
 * Design: every doctrine clause from AGENTS.md §0 has exactly one owner here.
 *   - §0.1 safety floor  → safety-floor.ts (always-on, never downgradable)
 *   - §0.2 defaults      → config.ts (parsed from .omk/config.toml)
 *   - §0.3 no moralizing → not enforced at runtime (system prompt only)
 *   - banner & badge     → banner.ts + policy.badgeText
 *   - subprocess env     → policy.applyFreedomEnv
 */

export type { BannerMemo } from "./banner.ts";
export { bannerOnce } from "./banner.ts";
export type { ApprovalPolicy, FreedomConfig } from "./config.ts";
export {
	FREEDOM_CONFIG_DEFAULTS,
	FreedomConfigError,
	loadFreedomConfig,
	parseFreedomConfigFromString,
} from "./config.ts";
export type { PolicyDecision, ToolCallContext } from "./policy.ts";
export { applyFreedomEnv, badgeText, gate } from "./policy.ts";
export type { MatcherVerdict } from "./safety-floor.ts";
export { redactSecrets, runSafetyFloor } from "./safety-floor.ts";
