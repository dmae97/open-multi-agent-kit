/**
 * `.omk/config.toml` loader for the freedom block.
 *
 * Implements a tiny, deterministic TOML subset that is exactly enough for the
 * schema defined in `.omk/runs/freedom-plan-20260619/config-schema.md`:
 *
 *   - `# comment` lines and blank lines
 *   - `[section.subsection]` headers
 *   - `key = "string"` | `key = true` | `key = false`
 *
 * Anything outside that subset is treated as a malformed line and rejected
 * at parse time so users learn early that their config is wrong.
 *
 * Adding `@iarna/toml` would also work, but AGENTS.md keeps direct deps pinned
 * and reviewed; a 60-line hand parser avoids the dep-review cost for a config
 * shape this small.
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

export type ApprovalPolicy = "yolo" | "prompt-per-tool";

export interface FreedomConfig {
	enabled: boolean;
	approvalPolicy: ApprovalPolicy;
	yoloMode: boolean;
	safetyFloor: { enforced: true };
	banner: { show: boolean; suppressAfter: "session" | "forever" };
	audit: { emitEvents: boolean; includeArgs: boolean; logPath: string };
	doctrineVersion: string;
}

export const FREEDOM_CONFIG_DEFAULTS: FreedomConfig = Object.freeze({
	enabled: false,
	approvalPolicy: "prompt-per-tool",
	yoloMode: false,
	safetyFloor: Object.freeze({ enforced: true }) as { enforced: true },
	banner: Object.freeze({ show: true, suppressAfter: "session" }) as {
		show: boolean;
		suppressAfter: "session" | "forever";
	},
	audit: Object.freeze({ emitEvents: true, includeArgs: false, logPath: ".omk/audit/freedom.log" }) as {
		emitEvents: boolean;
		includeArgs: boolean;
		logPath: string;
	},
	doctrineVersion: "0.78.0-freedom",
}) as FreedomConfig;

type TomlValue = string | boolean | number;

type TomlTable = { [key: string]: TomlValue | TomlTable };

export class FreedomConfigError extends Error {
	readonly line?: number;
	constructor(message: string, line?: number) {
		super(line ? `${message} (line ${line})` : message);
		this.name = "FreedomConfigError";
		this.line = line;
	}
}

export function loadFreedomConfig(projectRoot: string): FreedomConfig {
	const configPath = join(projectRoot, ".omk", "config.toml");
	if (!existsSync(configPath)) return FREEDOM_CONFIG_DEFAULTS;
	const raw = readFileSync(configPath, "utf8");
	const parsed = parseToml(raw);
	return materializeFreedomConfig(parsed);
}

export function parseFreedomConfigFromString(raw: string): FreedomConfig {
	return materializeFreedomConfig(parseToml(raw));
}

function parseToml(raw: string): TomlTable {
	const root: TomlTable = {};
	let current: TomlTable = root;
	const normalized = raw.replace(/\r\n/g, "\n");
	const lines = normalized.split("\n");
	for (let i = 0; i < lines.length; i++) {
		const lineNumber = i + 1;
		const line = stripInlineComment(lines[i]).trim();
		if (line.length === 0) continue;
		if (line.startsWith("[")) {
			if (!line.endsWith("]")) {
				throw new FreedomConfigError(`Unterminated section header: ${line}`, lineNumber);
			}
			const path = line
				.slice(1, -1)
				.split(".")
				.map((part) => part.trim());
			for (const part of path) {
				if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(part)) {
					throw new FreedomConfigError(`Invalid section name '${part}'`, lineNumber);
				}
			}
			current = ensureTable(root, path);
			continue;
		}
		const eq = line.indexOf("=");
		if (eq < 0) {
			throw new FreedomConfigError(`Expected 'key = value' but got '${line}'`, lineNumber);
		}
		const key = line.slice(0, eq).trim();
		const value = line.slice(eq + 1).trim();
		if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) {
			throw new FreedomConfigError(`Invalid key '${key}'`, lineNumber);
		}
		current[key] = parseValue(value, lineNumber);
	}
	return root;
}

function ensureTable(root: TomlTable, path: readonly string[]): TomlTable {
	let cursor: TomlTable = root;
	for (const part of path) {
		const next = cursor[part];
		if (next === undefined) {
			const created: TomlTable = {};
			cursor[part] = created;
			cursor = created;
			continue;
		}
		if (typeof next !== "object" || next === null) {
			throw new FreedomConfigError(`Section '${path.join(".")}' collides with a value`);
		}
		cursor = next as TomlTable;
	}
	return cursor;
}

function stripInlineComment(line: string): string {
	let inString = false;
	let quote = "";
	for (let i = 0; i < line.length; i++) {
		const c = line[i];
		if (inString) {
			if (c === "\\") {
				i += 1;
				continue;
			}
			if (c === quote) inString = false;
			continue;
		}
		if (c === '"' || c === "'") {
			inString = true;
			quote = c;
			continue;
		}
		if (c === "#") return line.slice(0, i);
	}
	return line;
}

function parseValue(raw: string, lineNumber: number): TomlValue {
	if (raw === "true") return true;
	if (raw === "false") return false;
	if (/^-?\d+$/.test(raw)) return Number(raw);
	if ((raw.startsWith('"') && raw.endsWith('"')) || (raw.startsWith("'") && raw.endsWith("'"))) {
		return raw.slice(1, -1).replace(/\\n/g, "\n").replace(/\\t/g, "\t").replace(/\\"/g, '"').replace(/\\\\/g, "\\");
	}
	throw new FreedomConfigError(`Unsupported value '${raw}'`, lineNumber);
}

function materializeFreedomConfig(parsed: TomlTable): FreedomConfig {
	const block = parsed.freedom;
	if (block === undefined) return FREEDOM_CONFIG_DEFAULTS;
	if (typeof block !== "object" || block === null) {
		throw new FreedomConfigError("'[freedom]' must be a table");
	}
	const freedom = block as TomlTable;

	const enabled = readBool(freedom, "enabled", FREEDOM_CONFIG_DEFAULTS.enabled);
	const approvalPolicy = readApprovalPolicy(freedom);
	const yoloMode = readBool(freedom, "yolo_mode", FREEDOM_CONFIG_DEFAULTS.yoloMode);
	const doctrineVersion = readString(freedom, "doctrine_version", FREEDOM_CONFIG_DEFAULTS.doctrineVersion);

	if (yoloMode && approvalPolicy !== "yolo") {
		throw new FreedomConfigError('yolo_mode=true requires approval_policy="yolo"');
	}

	const safetyFloorBlock = (freedom.safety_floor ?? {}) as TomlTable;
	for (const [key, value] of Object.entries(safetyFloorBlock)) {
		if (value !== "enforced") {
			throw new FreedomConfigError(
				`[freedom.safety_floor] '${key}' must be "enforced", got ${JSON.stringify(value)}`,
			);
		}
	}

	const bannerBlock = (freedom.banner ?? {}) as TomlTable;
	const banner = {
		show: readBool(bannerBlock, "show", FREEDOM_CONFIG_DEFAULTS.banner.show),
		suppressAfter: readSuppressAfter(bannerBlock),
	};

	const auditBlock = (freedom.audit ?? {}) as TomlTable;
	const audit = {
		emitEvents: readBool(auditBlock, "emit_events", FREEDOM_CONFIG_DEFAULTS.audit.emitEvents),
		includeArgs: readBool(auditBlock, "include_args", FREEDOM_CONFIG_DEFAULTS.audit.includeArgs),
		logPath: readString(auditBlock, "log_path", FREEDOM_CONFIG_DEFAULTS.audit.logPath),
	};

	return {
		enabled,
		approvalPolicy,
		yoloMode,
		safetyFloor: { enforced: true },
		banner,
		audit,
		doctrineVersion,
	};
}

function readBool(table: TomlTable, key: string, fallback: boolean): boolean {
	const value = table[key];
	if (value === undefined) return fallback;
	if (typeof value !== "boolean") {
		throw new FreedomConfigError(`'${key}' must be a boolean, got ${JSON.stringify(value)}`);
	}
	return value;
}

function readString(table: TomlTable, key: string, fallback: string): string {
	const value = table[key];
	if (value === undefined) return fallback;
	if (typeof value !== "string") {
		throw new FreedomConfigError(`'${key}' must be a string, got ${JSON.stringify(value)}`);
	}
	return value;
}

function readApprovalPolicy(table: TomlTable): ApprovalPolicy {
	const value = table.approval_policy;
	if (value === undefined) return FREEDOM_CONFIG_DEFAULTS.approvalPolicy;
	if (value === "yolo" || value === "prompt-per-tool") return value;
	throw new FreedomConfigError(`approval_policy must be "yolo" or "prompt-per-tool", got ${JSON.stringify(value)}`);
}

function readSuppressAfter(table: TomlTable): "session" | "forever" {
	const value = table.suppress_after;
	if (value === undefined) return FREEDOM_CONFIG_DEFAULTS.banner.suppressAfter;
	if (value === "session" || value === "forever") return value;
	throw new FreedomConfigError(`suppress_after must be "session" or "forever", got ${JSON.stringify(value)}`);
}
