import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { loadMcpInventory } from "../src/core/mcp-inventory.ts";
import { buildBuiltinMcpServerConfig, getBuiltinMcpPreset, listBuiltinMcpPresets } from "../src/core/mcp-presets.ts";

const LAW_OC_ENV_PLACEHOLDER = "$" + "{LAW_OC}";

describe("builtin MCP presets", () => {
	it("lists executable exact npm presets for browser/docs MCP servers", () => {
		const names = listBuiltinMcpPresets().map((preset) => preset.name);

		expect(names).toEqual(["aside-ubuntu-compat", "chrome-devtools", "context7", "korean-law", "playwright"]);
		expect(names).not.toContain("rhwp");

		for (const preset of listBuiltinMcpPresets()) {
			expect(preset.exactPackageSpec).toBe(`${preset.npmPackage}@${preset.npmVersion}`);
			expect(preset.exactPackageSpec).not.toContain("@latest");
			expect(preset.exactPackageSpec).not.toMatch(/\bpi\b/);
			expect(preset.gitTag.length).toBeGreaterThan(0);
			expect(preset.gitCommit).toMatch(/^[0-9a-f]{40}$/);

			if (preset.name === "aside-ubuntu-compat") {
				expect(preset.command).toBe("zsh");
				expect(preset.args).toEqual(["-lc", `exec npx -y ${preset.exactPackageSpec}`]);
			} else {
				expect(preset.command).toBe("npx");
				expect(preset.args).toEqual(["-y", preset.exactPackageSpec]);
			}
		}
	});

	it("builds runnable server configs without leaking placeholder env to env-free presets", () => {
		expect(buildBuiltinMcpServerConfig("playwright")).toEqual({
			command: "npx",
			args: ["-y", "@playwright/mcp@0.0.76"],
			startup_timeout_sec: 45,
		});
		expect(buildBuiltinMcpServerConfig("chrome-devtools")).toEqual({
			command: "npx",
			args: ["-y", "chrome-devtools-mcp@1.4.0"],
			startup_timeout_sec: 45,
		});
		expect(buildBuiltinMcpServerConfig("context7")).toEqual({
			command: "npx",
			args: ["-y", "@upstash/context7-mcp@3.2.2"],
			startup_timeout_sec: 30,
		});
	});

	it("keeps aside Ubuntu compat honest about being a facade", () => {
		const preset = getBuiltinMcpPreset("aside-ubuntu-compat");
		expect(preset).toBeDefined();
		if (!preset) return;

		expect(preset.label).toBe("Aside Ubuntu Compat MCP");
		expect(preset.npmPackage).toBe("@playwright/mcp");
		expect(preset.exactPackageSpec).toBe("@playwright/mcp@0.0.76");
		expect(preset.command).toBe("zsh");
		expect(preset.args).toEqual(["-lc", "exec npx -y @playwright/mcp@0.0.76"]);
		expect(preset.optionalEnvKeys).toEqual(["DISPLAY", "WAYLAND_DISPLAY", "XDG_RUNTIME_DIR"]);
		expect(preset.description).toContain("does not provide native macOS Aside APIs on Linux");
		expect(preset.notes.join("\n")).toContain("Compatibility facade only");
		expect(preset.notes.join("\n")).toContain("does not expose native macOS Aside APIs");
		expect(buildBuiltinMcpServerConfig("aside-ubuntu-compat")).toEqual({
			command: "zsh",
			args: ["-lc", "exec npx -y @playwright/mcp@0.0.76"],
			startup_timeout_sec: 45,
		});
	});

	it("declares deterministic policy metadata for builtin presets", () => {
		const root = mkdtempSync(path.join(os.tmpdir(), "omk-mcp-policy-presets-"));
		const inventory = loadMcpInventory(root, path.join(root, "home"));
		const presets = new Map(inventory.presets.map((preset) => [preset.name, preset]));

		expect(presets.get("playwright")).toMatchObject({
			capabilityDecision: {
				trustedCapabilities: ["tools"],
				unknownCapabilities: [],
				malformed: false,
				rule: "mcp.capabilities.declared",
			},
			samplingDecision: {
				allowed: false,
				mode: "disabled",
				rule: "mcp.sampling.capability_missing",
			},
			authDecision: {
				mode: "none",
				envKeys: [],
				rule: "mcp.auth.none",
			},
		});
		expect(presets.get("korean-law")).toMatchObject({
			capabilityDecision: { trustedCapabilities: ["tools"] },
			authDecision: {
				mode: "env",
				envKeys: ["KOREAN_LAW_API_KEY", "LAW_OC"],
				rule: "mcp.auth.env",
			},
		});
	});

	it("keeps korean-law env placeholder only when shell env mode is requested", () => {
		expect(buildBuiltinMcpServerConfig("korean-law")).toEqual({
			command: "npx",
			args: ["-y", "korean-law-mcp@4.4.0"],
			env: { LAW_OC: LAW_OC_ENV_PLACEHOLDER },
			startup_timeout_sec: 30,
		});
		expect(buildBuiltinMcpServerConfig("korean-law", { envMode: "empty" })).toEqual({
			command: "npx",
			args: ["-y", "korean-law-mcp@4.4.0"],
			startup_timeout_sec: 30,
		});
	});

	it("returns cloned presets", () => {
		const first = getBuiltinMcpPreset("playwright");
		const second = getBuiltinMcpPreset("playwright");
		expect(first).toBeDefined();
		expect(second).toBeDefined();
		if (!first || !second) return;

		expect(first.args).not.toBe(second.args);
		expect(second.args).toEqual(["-y", "@playwright/mcp@0.0.76"]);
		expect(getBuiltinMcpPreset("missing")).toBeUndefined();
	});

	it("reports local MCP sources, configured presets, and fail-closed network policy", () => {
		const root = mkdtempSync(path.join(os.tmpdir(), "omk-mcp-inventory-"));
		const home = path.join(root, "home");
		const cwd = path.join(root, "project");
		const kimiMcpDir = path.join(home, ".kimi");
		const homeMcpDir = path.join(home, ".omk");
		const projectMcpDir = path.join(cwd, ".omk");
		mkdirSync(kimiMcpDir, { recursive: true });
		mkdirSync(homeMcpDir, { recursive: true });
		mkdirSync(projectMcpDir, { recursive: true });

		writeFileSync(
			path.join(kimiMcpDir, "mcp.json"),
			JSON.stringify({ mcpServers: { legacyKimi: { command: "node" } } }),
		);
		writeFileSync(
			path.join(homeMcpDir, "mcp.json"),
			JSON.stringify({ mcpServers: { playwright: { command: "npx", network: { mode: "invalid" } } } }),
		);
		writeFileSync(
			path.join(projectMcpDir, "mcp.json"),
			JSON.stringify({
				mcpServers: {
					context7: {
						command: "npx",
						network: { mode: "domain-allowlist", allowedDomains: ["context7.com"] },
					},
				},
			}),
		);

		const inventory = loadMcpInventory(cwd, home);

		expect(inventory.sources).toEqual([
			{ path: path.join(home, ".kimi", "mcp.json"), exists: true, serverCount: 1 },
			{ path: path.join(home, ".omk", "mcp.json"), exists: true, serverCount: 1 },
			{ path: path.join(cwd, ".omk", "mcp.json"), exists: true, serverCount: 1 },
		]);
		expect(inventory.presets.filter((preset) => preset.configured).map((preset) => preset.name)).toEqual([
			"context7",
			"playwright",
		]);
		expect(inventory.entries.find((entry) => entry.name === "legacyKimi")?.networkDecision).toMatchObject({
			allowed: false,
			rule: "mcp.network.unspecified",
		});
		expect(inventory.entries.find((entry) => entry.name === "playwright")?.networkDecision).toMatchObject({
			allowed: false,
			rule: "mcp.network.invalid_mode",
		});
		expect(inventory.entries.find((entry) => entry.name === "context7")?.networkDecision).toMatchObject({
			allowed: true,
			rule: "mcp.network.domain-allowlist",
			allowedDomains: ["context7.com"],
		});
	});

	it("trusts declared user MCP capabilities only when sampling and auth policies are explicit", () => {
		const root = mkdtempSync(path.join(os.tmpdir(), "omk-mcp-policy-happy-"));
		const home = path.join(root, "home");
		const cwd = path.join(root, "project");
		const projectMcpDir = path.join(cwd, ".omk");
		mkdirSync(projectMcpDir, { recursive: true });

		writeFileSync(
			path.join(projectMcpDir, "mcp.json"),
			JSON.stringify({
				mcpServers: {
					oauthServer: {
						command: "node",
						capabilities: { tools: true },
						authPolicy: { mode: "oauth", clientSecret: "oauth-secret-value" },
					},
					review: {
						command: "node",
						env: {
							API_TOKEN: "secret-token-value",
							SECONDARY_TOKEN: "another-secret",
						},
						capabilities: ["tools", "resources", "sampling"],
						samplingPolicy: { mode: "client-gated", humanApprovalRequired: true },
						authPolicy: { mode: "env", envKeys: ["API_TOKEN"] },
					},
				},
			}),
		);

		const inventory = loadMcpInventory(cwd, home);
		const entry = inventory.entries.find((candidate) => candidate.name === "review");
		const oauthEntry = inventory.entries.find((candidate) => candidate.name === "oauthServer");

		expect(entry).toBeDefined();
		expect(entry?.capabilityDecision).toMatchObject({
			trustedCapabilities: ["tools", "resources", "sampling"],
			unknownCapabilities: [],
			malformed: false,
			rule: "mcp.capabilities.declared",
		});
		expect(entry?.samplingDecision).toMatchObject({
			allowed: true,
			mode: "client-gated",
			humanApprovalRequired: true,
			rule: "mcp.sampling.client_gated_human_approval",
		});
		expect(entry?.authDecision).toEqual({
			mode: "env",
			envKeys: ["API_TOKEN"],
			rule: "mcp.auth.env",
			reason: "MCP auth uses environment variable names; values are not exposed.",
		});
		expect(JSON.stringify(entry)).not.toContain("secret-token-value");
		expect(JSON.stringify(entry)).not.toContain("another-secret");
		expect(oauthEntry?.authDecision).toEqual({
			mode: "oauth",
			envKeys: [],
			rule: "mcp.auth.oauth",
			reason: "MCP auth is handled by oauth; secret values are not exposed.",
		});
		expect(JSON.stringify(oauthEntry)).not.toContain("oauth-secret-value");
	});

	it("reports unknown or malformed user MCP capabilities without trusting them", () => {
		const root = mkdtempSync(path.join(os.tmpdir(), "omk-mcp-policy-edge-"));
		const home = path.join(root, "home");
		const cwd = path.join(root, "project");
		const projectMcpDir = path.join(cwd, ".omk");
		mkdirSync(projectMcpDir, { recursive: true });

		writeFileSync(
			path.join(projectMcpDir, "mcp.json"),
			JSON.stringify({
				mcpServers: {
					edge: {
						command: "node",
						capabilities: {
							tools: true,
							prompts: "yes",
							sampling: true,
							shell: true,
						},
						samplingPolicy: { mode: "client-gated", humanApprovalRequired: false },
						authPolicy: { mode: "cookie", token: "secret-cookie-value" },
					},
				},
			}),
		);

		const inventory = loadMcpInventory(cwd, home);
		const entry = inventory.entries.find((candidate) => candidate.name === "edge");

		expect(entry?.capabilityDecision).toEqual({
			trustedCapabilities: ["tools", "sampling"],
			unknownCapabilities: ["shell"],
			malformed: true,
			rule: "mcp.capabilities.untrusted_input",
			reason: "Only known MCP capabilities are trusted; unknown or malformed entries are reported but ignored.",
		});
		expect(entry?.samplingDecision).toMatchObject({
			allowed: false,
			mode: "client-gated",
			humanApprovalRequired: false,
			rule: "mcp.sampling.policy_invalid",
		});
		expect(entry?.authDecision).toMatchObject({
			mode: "external",
			envKeys: [],
			rule: "mcp.auth.invalid",
		});
		expect(JSON.stringify(entry)).not.toContain("secret-cookie-value");
	});
});
