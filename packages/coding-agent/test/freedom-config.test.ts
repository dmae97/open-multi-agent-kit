import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
	FREEDOM_CONFIG_DEFAULTS,
	FreedomConfigError,
	loadFreedomConfig,
	parseFreedomConfigFromString,
} from "../src/core/freedom/config.ts";

let tmpRoot: string;

beforeEach(() => {
	tmpRoot = mkdtempSync(join(tmpdir(), "omk-freedom-cfg-"));
});

afterEach(() => {
	rmSync(tmpRoot, { recursive: true, force: true });
});

function writeConfig(content: string): void {
	mkdirSync(join(tmpRoot, ".omk"), { recursive: true });
	writeFileSync(join(tmpRoot, ".omk", "config.toml"), content, "utf8");
}

describe("loadFreedomConfig", () => {
	it("returns defaults when .omk/config.toml is missing", () => {
		const cfg = loadFreedomConfig(tmpRoot);
		expect(cfg).toEqual(FREEDOM_CONFIG_DEFAULTS);
		expect(cfg.enabled).toBe(false);
		expect(cfg.safetyFloor.enforced).toBe(true);
	});

	it("returns defaults when file exists but no [freedom] block", () => {
		writeConfig('[other]\nkey = "value"\n');
		const cfg = loadFreedomConfig(tmpRoot);
		expect(cfg).toEqual(FREEDOM_CONFIG_DEFAULTS);
	});

	it("parses a full freedom block with yolo mode on", () => {
		writeConfig(`
[freedom]
enabled = true
approval_policy = "yolo"
yolo_mode = true
doctrine_version = "0.78.0-freedom"

[freedom.banner]
show = true
suppress_after = "session"

[freedom.safety_floor]
secrets = "enforced"
privilege = "enforced"
fs_destruction = "enforced"
scope = "enforced"

[freedom.audit]
emit_events = true
include_args = false
log_path = ".omk/audit/freedom.log"
`);
		const cfg = loadFreedomConfig(tmpRoot);
		expect(cfg.enabled).toBe(true);
		expect(cfg.approvalPolicy).toBe("yolo");
		expect(cfg.yoloMode).toBe(true);
		expect(cfg.safetyFloor.enforced).toBe(true);
		expect(cfg.banner.show).toBe(true);
		expect(cfg.audit.emitEvents).toBe(true);
		expect(cfg.audit.includeArgs).toBe(false);
	});

	it("hard-errors when yolo_mode=true but approval_policy is not yolo", () => {
		writeConfig(`
[freedom]
enabled = true
approval_policy = "prompt-per-tool"
yolo_mode = true
`);
		expect(() => loadFreedomConfig(tmpRoot)).toThrow(FreedomConfigError);
	});

	it("hard-errors when safety_floor.* is not 'enforced'", () => {
		writeConfig(`
[freedom]
enabled = true

[freedom.safety_floor]
secrets = "off"
`);
		expect(() => loadFreedomConfig(tmpRoot)).toThrow(FreedomConfigError);
	});

	it("hard-errors on invalid approval_policy value", () => {
		writeConfig(`
[freedom]
approval_policy = "halfway"
`);
		expect(() => loadFreedomConfig(tmpRoot)).toThrow(FreedomConfigError);
	});

	it("hard-errors on malformed lines", () => {
		writeConfig("[freedom\nenabled = true\n");
		expect(() => loadFreedomConfig(tmpRoot)).toThrow(FreedomConfigError);
	});
});

describe("parseFreedomConfigFromString", () => {
	it("parses CRLF line endings", () => {
		const crlf = '[freedom]\r\nenabled = true\r\napproval_policy = "yolo"\r\nyolo_mode = true\r\n';
		const cfg = parseFreedomConfigFromString(crlf);
		expect(cfg.enabled).toBe(true);
		expect(cfg.yoloMode).toBe(true);
	});

	it("ignores comments and blank lines", () => {
		const cfg = parseFreedomConfigFromString(`
# leading comment

[freedom] # inline
enabled = true  # also inline
`);
		expect(cfg.enabled).toBe(true);
	});

	it("preserves the safetyFloor.enforced lock under any user input", () => {
		const cfg = parseFreedomConfigFromString(`
[freedom]
enabled = true
`);
		expect(cfg.safetyFloor.enforced).toBe(true);
	});
});
