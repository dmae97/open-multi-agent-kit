/**
 * Freedom-mode policy gate.
 *
 * The dispatcher wraps every tool call in `gate(call, cfg)`. Three outcomes:
 *
 *   - `allow`: dispatcher runs the tool without an interactive prompt.
 *   - `require-confirm`: dispatcher falls back to its existing confirm UI.
 *   - `deny-hard`: dispatcher returns a FailClosedToolResult and never runs.
 *
 * The safety floor (`safety-floor.ts`) is always consulted first. Only when
 * the floor passes do we look at the approval policy from `.omk/config.toml`.
 * Freedom mode can flip the second decision (approval) but never the first
 * (safety floor), which matches AGENTS.md §0.1 ("non-negotiable").
 */
import type { HookFailureCode } from "../hooks/types.ts";
import type { FreedomConfig } from "./config.ts";
import { runSafetyFloor, type ToolCallContext } from "./safety-floor.ts";

export type { ToolCallContext } from "./safety-floor.ts";

export type PolicyDecision =
	| { kind: "allow" }
	| { kind: "require-confirm"; reason: string }
	| { kind: "deny-hard"; code: HookFailureCode; reason: string };

export function gate(call: ToolCallContext, cfg: FreedomConfig): PolicyDecision {
	// §0.1 floor first. The floor can hard-deny or upgrade to require-confirm
	// (privilege escalation). It never returns 'allow' on its own.
	const floor = runSafetyFloor(call);
	if (floor.kind === "deny-hard") return floor;
	if (floor.kind === "require-confirm") return floor;

	// Floor passed. Now consult the approval policy.
	if (cfg.enabled && cfg.approvalPolicy === "yolo" && cfg.yoloMode) {
		return { kind: "allow" };
	}
	return {
		kind: "require-confirm",
		reason: cfg.enabled
			? "approval_policy is not 'yolo'; falling back to per-tool confirmation."
			: "Freedom mode disabled; per-tool confirmation required.",
	};
}

/**
 * UI surface: returns a short badge string when freedom mode is on, otherwise
 * undefined. Used by the interactive footer.
 */
export function badgeText(cfg: FreedomConfig): string | undefined {
	if (!cfg.enabled) return undefined;
	return cfg.approvalPolicy === "yolo" && cfg.yoloMode ? "freedom·yolo" : "freedom·prompt";
}

/**
 * Environment passthrough for child processes spawned under freedom mode.
 * Mirrors the legacy shell hook's exports for code that still reads them, but
 * never auto-sets the advanced flags (TOS bypass / dark-web crawl); those must
 * be enabled explicitly via a future [freedom.advanced] block.
 */
export function applyFreedomEnv(env: NodeJS.ProcessEnv, cfg: FreedomConfig): NodeJS.ProcessEnv {
	if (!cfg.enabled) return env;
	const out: NodeJS.ProcessEnv = { ...env };
	out.OMK_FREEDOM_MODE = "true";
	out.OMK_DOCTRINE_VERSION = cfg.doctrineVersion;
	if (cfg.approvalPolicy === "yolo" && cfg.yoloMode) {
		out.OMK_EXECUTE_ALL = "true";
	}
	return out;
}
