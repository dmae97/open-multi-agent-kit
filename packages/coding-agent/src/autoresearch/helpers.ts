import * as crypto from "node:crypto";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { isEnoent } from "@oh-my-pi/pi-utils";
import type { ASIData, ASIValue, AutoresearchConfig, MetricDirection } from "./types";

export const METRIC_LINE_PREFIX = "METRIC";
export const ASI_LINE_PREFIX = "ASI";
export const EXPERIMENT_MAX_LINES = 10;
export const EXPERIMENT_MAX_BYTES = 4 * 1024;

const DENIED_KEY_NAMES = new Set(["__proto__", "constructor", "prototype"]);

export function parseMetricLines(output: string): Map<string, number> {
	const metrics = new Map<string, number>();
	const regex = new RegExp(`^${METRIC_LINE_PREFIX}\\s+([\\w.µ-]+)=(\\S+)\\s*$`, "gm");
	let match = regex.exec(output);
	while (match !== null) {
		const name = match[1];
		if (!DENIED_KEY_NAMES.has(name)) {
			const value = Number(match[2]);
			if (Number.isFinite(value)) {
				metrics.set(name, value);
			}
		}
		match = regex.exec(output);
	}
	return metrics;
}

export function parseAsiLines(output: string): ASIData | null {
	const asi: ASIData = {};
	const regex = new RegExp(`^${ASI_LINE_PREFIX}\\s+([\\w.-]+)=(.+)\\s*$`, "gm");
	let match = regex.exec(output);
	while (match !== null) {
		const key = match[1];
		if (!DENIED_KEY_NAMES.has(key)) {
			asi[key] = parseAsiValue(match[2]);
		}
		match = regex.exec(output);
	}
	return Object.keys(asi).length > 0 ? asi : null;
}

function parseAsiValue(raw: string): ASIValue {
	const value = raw.trim();
	if (value === "true") return true;
	if (value === "false") return false;
	if (value === "null") return null;
	if (/^-?\d+(?:\.\d+)?$/.test(value)) {
		const numberValue = Number(value);
		if (Number.isFinite(numberValue)) return numberValue;
	}
	if (value.startsWith("{") || value.startsWith("[") || value.startsWith('"')) {
		try {
			const parsed = JSON.parse(value) as ASIValue;
			return parsed;
		} catch {
			return value;
		}
	}
	return value;
}

export function mergeAsi(base: ASIData | null, override: ASIData | undefined): ASIData | undefined {
	if (!base && !override) return undefined;
	return {
		...(base ?? {}),
		...(override ?? {}),
	};
}

export function commas(value: number): string {
	const sign = value < 0 ? "-" : "";
	const digits = String(Math.trunc(Math.abs(value)));
	const groups: string[] = [];
	for (let index = digits.length; index > 0; index -= 3) {
		groups.unshift(digits.slice(Math.max(0, index - 3), index));
	}
	return sign + groups.join(",");
}

export function fmtNum(value: number, decimals: number = 0): string {
	if (decimals <= 0) return commas(Math.round(value));
	const absolute = Math.abs(value);
	const whole = Math.floor(absolute);
	const fraction = (absolute - whole).toFixed(decimals).slice(1);
	return `${value < 0 ? "-" : ""}${commas(whole)}${fraction}`;
}

export function formatNum(value: number | null, unit: string): string {
	if (value === null) return "-";
	if (Number.isInteger(value)) return `${fmtNum(value)}${unit}`;
	return `${fmtNum(value, 2)}${unit}`;
}

export function formatElapsed(milliseconds: number): string {
	const totalSeconds = Math.floor(milliseconds / 1000);
	const minutes = Math.floor(totalSeconds / 60);
	const seconds = totalSeconds % 60;
	if (minutes > 0) {
		return `${minutes}m ${String(seconds).padStart(2, "0")}s`;
	}
	return `${seconds}s`;
}

export function createTempFileAllocator(): () => string {
	let tempPath: string | undefined;
	return () => {
		if (tempPath) return tempPath;
		tempPath = path.join(os.tmpdir(), `pi-autoresearch-${crypto.randomUUID()}.log`);
		return tempPath;
	};
}

export function killTree(pid: number): void {
	try {
		process.kill(-pid, "SIGTERM");
	} catch {
		try {
			process.kill(pid, "SIGTERM");
		} catch {
			// Process already exited.
		}
	}
}

export function isAutoresearchShCommand(command: string): boolean {
	let normalized = command.trim();
	normalized = normalized.replace(/^(?:\w+=\S*\s+)+/, "");

	let previous = "";
	while (previous !== normalized) {
		previous = normalized;
		normalized = normalized.replace(/^(?:env|time|nice|nohup)(?:\s+-\S+(?:\s+\d+)?)?\s+/, "");
	}

	return /^(?:(?:bash|sh)\s+(?:-\w+\s+)*)?(?:\.\/|\/[\w/.-]*\/)?autoresearch\.sh(?:\s|$)/.test(normalized);
}

export function isBetter(current: number, best: number, direction: MetricDirection): boolean {
	return direction === "lower" ? current < best : current > best;
}

export function inferMetricUnitFromName(name: string): string {
	if (name.endsWith("µs") || name.endsWith("_µs")) return "µs";
	if (name.endsWith("ms") || name.endsWith("_ms")) return "ms";
	if (name.endsWith("_s") || name.endsWith("_sec") || name.endsWith("_secs")) return "s";
	if (name.endsWith("_kb") || name.endsWith("kb")) return "kb";
	if (name.endsWith("_mb") || name.endsWith("mb")) return "mb";
	return "";
}

export function readConfig(cwd: string): AutoresearchConfig {
	const configPath = path.join(cwd, "autoresearch.config.json");
	try {
		const raw = fs.readFileSync(configPath, "utf8");
		const parsed = JSON.parse(raw) as unknown;
		if (typeof parsed !== "object" || parsed === null) return {};
		const candidate = parsed as { maxIterations?: unknown; workingDir?: unknown };
		const config: AutoresearchConfig = {};
		if (typeof candidate.maxIterations === "number" && Number.isFinite(candidate.maxIterations)) {
			config.maxIterations = candidate.maxIterations;
		}
		if (typeof candidate.workingDir === "string" && candidate.workingDir.trim().length > 0) {
			config.workingDir = candidate.workingDir;
		}
		return config;
	} catch (error) {
		if (isEnoent(error)) return {};
		return {};
	}
}

export function readMaxExperiments(cwd: string): number | null {
	const value = readConfig(cwd).maxIterations;
	if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) return null;
	return Math.floor(value);
}

export function resolveWorkDir(cwd: string): string {
	const configured = readConfig(cwd).workingDir;
	if (!configured) return cwd;
	return path.isAbsolute(configured) ? configured : path.resolve(cwd, configured);
}

export function validateWorkDir(cwd: string): string | null {
	const workDir = resolveWorkDir(cwd);
	try {
		const stat = fs.statSync(workDir);
		if (!stat.isDirectory()) {
			return `workingDir ${workDir} is not a directory.`;
		}
		return null;
	} catch (error) {
		if (isEnoent(error)) {
			return `workingDir ${workDir} does not exist.`;
		}
		return `workingDir ${workDir} is unavailable.`;
	}
}
