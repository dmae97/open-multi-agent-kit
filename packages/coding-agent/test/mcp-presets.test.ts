import { describe, expect, it } from "vitest";
import {
	buildBuiltinMcpServerConfig,
	getBuiltinMcpPreset,
	listBuiltinMcpPresets,
	summarizeBuiltinMcpPreset,
} from "../src/core/mcp-presets.ts";

const LAW_OC_ENV_PLACEHOLDER = "$" + "{LAW_OC}";
const USER_CONFIG_API_KEY_PLACEHOLDER = "$" + "{user_config.api_key}";

describe("builtin MCP presets", () => {
	it("includes korean-law with exact pinned npm package and upstream commit", () => {
		const preset = getBuiltinMcpPreset("korean-law");
		expect(preset).toBeDefined();
		expect(preset?.npmPackage).toBe("korean-law-mcp");
		expect(preset?.npmVersion).toBe("4.4.0");
		expect(preset?.exactPackageSpec).toBe("korean-law-mcp@4.4.0");
		expect(preset?.args).toEqual(["-y", "korean-law-mcp@4.4.0"]);
		expect(preset?.args.join(" ")).not.toContain("@latest");
		expect(preset?.gitTag).toBe("v4.4.0");
		expect(preset?.gitCommit).toBe("2ef8f1827d349381fc2bde15120c803fd2e7bfed");
		expect(preset?.license).toBe("MIT");
	});

	it("builds stdio config without embedding secret values", () => {
		const config = buildBuiltinMcpServerConfig("korean-law");
		expect(config).toEqual({
			command: "npx",
			args: ["-y", "korean-law-mcp@4.4.0"],
			env: { LAW_OC: LAW_OC_ENV_PLACEHOLDER },
			startup_timeout_sec: 30,
		});
		expect(JSON.stringify(config)).not.toContain("honggildong");
		expect(JSON.stringify(config)).not.toContain("latest");
	});

	it("can build an empty-env config for clients that inherit shell environment", () => {
		expect(buildBuiltinMcpServerConfig("korean-law", { envMode: "empty" })).toEqual({
			command: "npx",
			args: ["-y", "korean-law-mcp@4.4.0"],
			startup_timeout_sec: 30,
		});
	});

	it("returns defensive copies", () => {
		const presets = listBuiltinMcpPresets();
		(presets[0].args as string[]).push("mutated");
		expect(getBuiltinMcpPreset("korean-law")?.args).toEqual(["-y", "korean-law-mcp@4.4.0"]);
	});

	it("sanitizes summaries to metadata only", () => {
		const preset = getBuiltinMcpPreset("korean-law");
		expect(preset).toBeDefined();
		const summary = summarizeBuiltinMcpPreset(preset!);
		expect(summary.envKeys).toEqual(["LAW_OC", "KOREAN_LAW_API_KEY"]);
		expect(summary.commandSummary).toBe("npx -y korean-law-mcp@4.4.0");
		expect(summary.autoApproveCount).toBe(0);
		expect(JSON.stringify(summary)).not.toContain(USER_CONFIG_API_KEY_PLACEHOLDER);
	});

	it("returns undefined for unknown presets", () => {
		expect(getBuiltinMcpPreset("unknown")).toBeUndefined();
		expect(buildBuiltinMcpServerConfig("unknown")).toBeUndefined();
	});
});
