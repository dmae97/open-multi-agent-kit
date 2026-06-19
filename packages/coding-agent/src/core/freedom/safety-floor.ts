/**
 * Non-negotiable §0.1 safety floor matchers.
 *
 * These are deterministic, pure functions used by `policy.ts:gate()`. They
 * implement the four runtime-enforceable clauses from AGENTS.md §0.1:
 *
 *   1. Secrets must never be read, logged, or transmitted.
 *   2. Privilege escalation must require an explicit per-command user confirm.
 *   3. Filesystem-destructive commands at root or home are hard-denied.
 *   4. Tool calls must stay inside the lane grant's writeScope / executeScope.
 *
 * Clause 5 (§0.3 "no moralizing") is an LLM behavior clause and lives in the
 * orchestrator system prompt; there is no runtime matcher for it.
 *
 * Every matcher fails closed: if its internal regex throws, the call is
 * treated as a hard deny instead of an implicit allow. This is enforced by
 * the wrapper helpers in `policy.ts`, not here, so the matchers themselves
 * can stay tiny and testable.
 */
import type { HookFailureCode } from "../hooks/types.ts";

export interface ToolCallContext {
	tool: "bash" | "edit" | "write" | "read";
	args: {
		path?: string;
		command?: string;
		[key: string]: unknown;
	};
	laneGrant?: {
		writeScope?: readonly string[];
		executeScope?: readonly string[];
	};
}

export type MatcherVerdict =
	| { kind: "pass" }
	| { kind: "require-confirm"; reason: string }
	| { kind: "deny-hard"; code: HookFailureCode; reason: string };

const SECRET_PATH_PATTERNS: readonly RegExp[] = [
	/(^|\/)\.env(\.|$)/i,
	/(^|\/)\.env$/i,
	/(^|\/)auth\.json$/i,
	/(^|\/)\.netrc$/i,
	/(^|\/)\.aws\/credentials$/i,
	/(^|\/)\.ssh\/(id_[a-z0-9]+|[a-z0-9_-]+_(rsa|ed25519|ecdsa|dsa))$/i,
	/\.pem$/i,
	/\.key$/i,
	/(^|\/)[^/]*secret[^/]*$/i,
	/(^|\/)[^/]*token[^/]*$/i,
];

const SECRET_CONTENT_PATTERNS: readonly RegExp[] = [
	/npm_[A-Za-z0-9_-]{16,}/g,
	/\bgh[pousr]_[A-Za-z0-9]{36}\b/g,
	/\bxox[bpars]-[A-Za-z0-9-]+\b/g,
	/\bsk-(?:proj-)?[A-Za-z0-9_-]{20,}\b/g,
	/\bAKIA[0-9A-Z]{16}\b/g,
];

const PRIVILEGE_ESCALATION_PATTERNS: readonly RegExp[] = [
	/^\s*sudo(\s|$)/,
	/^\s*su(\s|$)/,
	/(^|\s|;|&&|\|\|)sudo\s/,
	/(^|\s|;|&&|\|\|)su\s/,
	/(^|\s)doas(\s|$)/,
	/chmod\s+[ug]\+s\b/,
	/\bsetcap\s/,
];

const FS_DESTRUCTION_PATTERNS: readonly RegExp[] = [
	/\brm\s+(-[a-zA-Z]*[rRfF][a-zA-Z]*\s+)+(\/|~|\$HOME|"\/"|'\/')(\s|$)/,
	/\bmkfs(\.\w+)?\s/,
	/\bdd\b[^|;&]*\bof=\/dev\//,
	/:\(\)\s*\{\s*:\s*\|\s*:\s*&\s*\}\s*;\s*:/,
	/\bchmod\s+-R\s+0+\s+\/(\s|$)/,
];

const REDACTION_PLACEHOLDER = "***REDACTED***";

function normalizePath(input: string): string {
	return input.replace(/\\/g, "/");
}

function basename(input: string): string {
	const normalized = normalizePath(input);
	const idx = normalized.lastIndexOf("/");
	return idx >= 0 ? normalized.slice(idx + 1) : normalized;
}

function matchesAnyGlob(path: string, scope: readonly string[]): boolean {
	if (scope.length === 0) return false;
	const normalized = normalizePath(path);
	for (const glob of scope) {
		const re = globToRegex(glob);
		if (re.test(normalized)) return true;
	}
	return false;
}

function globToRegex(glob: string): RegExp {
	// Minimal glob: ** -> .*, * -> [^/]*, ? -> [^/]. Other regex metachars escaped.
	const normalized = normalizePath(glob);
	let pattern = "";
	let i = 0;
	while (i < normalized.length) {
		const c = normalized[i];
		if (c === "*" && normalized[i + 1] === "*") {
			pattern += ".*";
			i += 2;
			continue;
		}
		if (c === "*") {
			pattern += "[^/]*";
			i += 1;
			continue;
		}
		if (c === "?") {
			pattern += "[^/]";
			i += 1;
			continue;
		}
		if (/[.+^${}()|[\]\\]/.test(c)) {
			pattern += `\\${c}`;
			i += 1;
			continue;
		}
		pattern += c;
		i += 1;
	}
	return new RegExp(`^${pattern}$`);
}

/**
 * Clause 1 — secrets. Block reads/writes/edits targeting credential files.
 * Bash matchers check the command's argv for known credential paths too.
 */
export function checkSecretsClause(call: ToolCallContext): MatcherVerdict {
	if (call.tool === "read" || call.tool === "edit" || call.tool === "write") {
		const path = typeof call.args.path === "string" ? call.args.path : "";
		if (path && pathLooksLikeSecret(path)) {
			return {
				kind: "deny-hard",
				code: "hook_rejected",
				reason: `Secrets clause blocks ${call.tool} on '${path}'.`,
			};
		}
	}
	if (call.tool === "bash") {
		const cmd = typeof call.args.command === "string" ? call.args.command : "";
		if (cmd && bashTouchesSecret(cmd)) {
			return {
				kind: "deny-hard",
				code: "hook_rejected",
				reason: "Secrets clause blocks bash command that reads a credential file.",
			};
		}
	}
	return { kind: "pass" };
}

function pathLooksLikeSecret(path: string): boolean {
	const normalized = normalizePath(path);
	const base = basename(normalized);
	for (const re of SECRET_PATH_PATTERNS) {
		if (re.test(normalized) || re.test(base)) return true;
	}
	return false;
}

function bashTouchesSecret(cmd: string): boolean {
	// Catch the obvious cat / cp / mv / less / head / tail / source <secret-path>.
	const readVerbs = /\b(cat|less|more|head|tail|tac|nl|od|hexdump|xxd|cp|mv|source|\.)\b\s+([^\s|;&<>]+)/g;
	let match: RegExpExecArray | null = readVerbs.exec(cmd);
	while (match !== null) {
		const target = match[2];
		if (target && pathLooksLikeSecret(target)) return true;
		match = readVerbs.exec(cmd);
	}
	return false;
}

/**
 * Clause 2 — privilege escalation. Even under yolo mode, sudo/su require an
 * explicit confirm. Never auto-approved.
 */
export function checkPrivilegeClause(call: ToolCallContext): MatcherVerdict {
	if (call.tool !== "bash") return { kind: "pass" };
	const cmd = typeof call.args.command === "string" ? call.args.command : "";
	if (!cmd) return { kind: "pass" };
	for (const re of PRIVILEGE_ESCALATION_PATTERNS) {
		if (re.test(cmd)) {
			return {
				kind: "require-confirm",
				reason: "Privilege escalation requires explicit confirmation under §0.1.",
			};
		}
	}
	return { kind: "pass" };
}

/**
 * Clause 3 — filesystem destruction. Hard deny. No override path.
 */
export function checkFsDestructionClause(call: ToolCallContext): MatcherVerdict {
	if (call.tool !== "bash") return { kind: "pass" };
	const cmd = typeof call.args.command === "string" ? call.args.command : "";
	if (!cmd) return { kind: "pass" };
	for (const re of FS_DESTRUCTION_PATTERNS) {
		if (re.test(cmd)) {
			return {
				kind: "deny-hard",
				code: "hook_rejected",
				reason: "Filesystem-destructive command is blocked by §0.1.",
			};
		}
	}
	return { kind: "pass" };
}

/**
 * Clause 4 — scope. Edits/writes must land inside writeScope; bash must stay
 * inside executeScope when configured. Empty/undefined scope = no constraint
 * (e.g. local CLI usage without a lane grant).
 */
export function checkScopeClause(call: ToolCallContext): MatcherVerdict {
	const grant = call.laneGrant;
	if (!grant) return { kind: "pass" };
	if (call.tool === "write" || call.tool === "edit") {
		const writeScope = grant.writeScope;
		if (writeScope && writeScope.length > 0) {
			const path = typeof call.args.path === "string" ? call.args.path : "";
			if (path && !matchesAnyGlob(path, writeScope)) {
				return {
					kind: "deny-hard",
					code: "hook_rejected",
					reason: `Path '${path}' is outside writeScope.`,
				};
			}
		}
	}
	if (call.tool === "bash") {
		const executeScope = grant.executeScope;
		if (executeScope && executeScope.length > 0) {
			const cmd = typeof call.args.command === "string" ? call.args.command : "";
			const touched = extractMutatingTargets(cmd);
			for (const target of touched) {
				if (!matchesAnyGlob(target, executeScope)) {
					return {
						kind: "deny-hard",
						code: "hook_rejected",
						reason: `Bash mutates '${target}' outside executeScope.`,
					};
				}
			}
		}
	}
	return { kind: "pass" };
}

function extractMutatingTargets(cmd: string): string[] {
	// Heuristic: top-level >, >>, tee target; ignore quoted forms inside strings.
	const targets: string[] = [];
	const redirectRe = />>?\s*([^\s|;&<>'"]+)/g;
	let m: RegExpExecArray | null = redirectRe.exec(cmd);
	while (m !== null) {
		const t = m[1];
		if (t && t !== "/dev/null") targets.push(t);
		m = redirectRe.exec(cmd);
	}
	const teeRe = /\btee\s+(?:-a\s+)?([^\s|;&<>'"]+)/g;
	m = teeRe.exec(cmd);
	while (m !== null) {
		const t = m[1];
		if (t) targets.push(t);
		m = teeRe.exec(cmd);
	}
	return targets;
}

/**
 * Redact bearer tokens and other secret-looking substrings before any sink
 * (logger, audit event, tool result returned to the LLM).
 */
export function redactSecrets(input: string): string {
	if (!input) return input;
	let out = input;
	for (const re of SECRET_CONTENT_PATTERNS) {
		out = out.replace(re, REDACTION_PLACEHOLDER);
	}
	return out;
}

/**
 * Run every clause in order. First non-pass verdict wins; deny-hard beats
 * require-confirm in the rare case both fire (privilege + fs-destruction).
 */
export function runSafetyFloor(call: ToolCallContext): MatcherVerdict {
	const checks = [checkSecretsClause, checkFsDestructionClause, checkScopeClause, checkPrivilegeClause];
	let firstConfirm: MatcherVerdict | null = null;
	for (const check of checks) {
		try {
			const verdict = check(call);
			if (verdict.kind === "deny-hard") return verdict;
			if (verdict.kind === "require-confirm" && !firstConfirm) firstConfirm = verdict;
		} catch (error) {
			return {
				kind: "deny-hard",
				code: "hook_failed",
				reason: `Safety floor matcher threw: ${error instanceof Error ? error.message : String(error)}`,
			};
		}
	}
	return firstConfirm ?? { kind: "pass" };
}
