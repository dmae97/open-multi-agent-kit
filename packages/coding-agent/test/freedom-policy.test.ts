import { describe, expect, it } from "vitest";
import { FREEDOM_CONFIG_DEFAULTS, type FreedomConfig } from "../src/core/freedom/config.ts";
import { applyFreedomEnv, badgeText, gate, type ToolCallContext } from "../src/core/freedom/policy.ts";

function withFreedom(partial: Partial<FreedomConfig>): FreedomConfig {
	return { ...FREEDOM_CONFIG_DEFAULTS, ...partial };
}

const YOLO_CFG: FreedomConfig = withFreedom({
	enabled: true,
	approvalPolicy: "yolo",
	yoloMode: true,
});

const PROMPT_CFG: FreedomConfig = withFreedom({
	enabled: true,
	approvalPolicy: "prompt-per-tool",
	yoloMode: false,
});

function bash(command: string): ToolCallContext {
	return { tool: "bash", args: { command } };
}
function read(path: string): ToolCallContext {
	return { tool: "read", args: { path } };
}

describe("gate", () => {
	it("allows ordinary bash under yolo", () => {
		expect(gate(bash("ls -la"), YOLO_CFG).kind).toBe("allow");
	});

	it("requires confirm under prompt-per-tool even for ordinary bash", () => {
		expect(gate(bash("ls -la"), PROMPT_CFG).kind).toBe("require-confirm");
	});

	it("requires confirm under defaults (freedom disabled)", () => {
		expect(gate(bash("ls"), FREEDOM_CONFIG_DEFAULTS).kind).toBe("require-confirm");
	});

	it("hard-denies secrets read regardless of mode", () => {
		expect(gate(read("/repo/.env"), YOLO_CFG).kind).toBe("deny-hard");
		expect(gate(read("/repo/.env"), PROMPT_CFG).kind).toBe("deny-hard");
		expect(gate(read("/repo/.env"), FREEDOM_CONFIG_DEFAULTS).kind).toBe("deny-hard");
	});

	it("hard-denies fs destruction regardless of mode", () => {
		expect(gate(bash("rm -rf /"), YOLO_CFG).kind).toBe("deny-hard");
		expect(gate(bash("rm -rf $HOME"), YOLO_CFG).kind).toBe("deny-hard");
	});

	it("requires confirm for privilege escalation regardless of mode", () => {
		expect(gate(bash("sudo apt install x"), YOLO_CFG).kind).toBe("require-confirm");
		expect(gate(bash("sudo apt install x"), PROMPT_CFG).kind).toBe("require-confirm");
	});

	it("hard-denies scope breakout writes", () => {
		const grant = { writeScope: ["/repo/**"] };
		const decision = gate({ tool: "write", args: { path: "/etc/hosts" }, laneGrant: grant }, YOLO_CFG);
		expect(decision.kind).toBe("deny-hard");
	});
});

describe("badgeText", () => {
	it("returns undefined when freedom is off", () => {
		expect(badgeText(FREEDOM_CONFIG_DEFAULTS)).toBeUndefined();
	});

	it("returns yolo badge under yolo", () => {
		expect(badgeText(YOLO_CFG)).toBe("freedom·yolo");
	});

	it("returns prompt badge when enabled but not yolo", () => {
		expect(badgeText(PROMPT_CFG)).toBe("freedom·prompt");
	});
});

describe("applyFreedomEnv", () => {
	it("returns env unchanged when freedom is off", () => {
		const env = { FOO: "bar" };
		expect(applyFreedomEnv(env, FREEDOM_CONFIG_DEFAULTS)).toEqual(env);
	});

	it("sets OMK_FREEDOM_MODE and OMK_DOCTRINE_VERSION when enabled", () => {
		const result = applyFreedomEnv({ FOO: "bar" }, PROMPT_CFG);
		expect(result.FOO).toBe("bar");
		expect(result.OMK_FREEDOM_MODE).toBe("true");
		expect(result.OMK_DOCTRINE_VERSION).toBe(PROMPT_CFG.doctrineVersion);
		expect(result.OMK_EXECUTE_ALL).toBeUndefined();
	});

	it("sets OMK_EXECUTE_ALL only under yolo", () => {
		const result = applyFreedomEnv({}, YOLO_CFG);
		expect(result.OMK_EXECUTE_ALL).toBe("true");
	});

	it("never auto-sets advanced flags", () => {
		const result = applyFreedomEnv({}, YOLO_CFG);
		expect(result.OMK_TOS_BYPASS).toBeUndefined();
		expect(result.OMK_DARKWEB_CRAWL).toBeUndefined();
	});
});
