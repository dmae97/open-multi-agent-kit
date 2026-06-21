import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { loadMcpInventory } from "../src/core/mcp-inventory.ts";

const tempDirs: string[] = [];

function makeTempRoot(): { home: string; cwd: string; cleanup: () => void } {
	const root = mkdtempSync(join(tmpdir(), "omk-mcp-inventory-"));
	tempDirs.push(root);
	const home = join(root, "home");
	const cwd = join(root, "project");
	mkdirSync(home, { recursive: true });
	mkdirSync(cwd, { recursive: true });
	return {
		home,
		cwd,
		cleanup: () => rmSync(root, { recursive: true, force: true }),
	};
}

function writeJson(filePath: string, value: unknown): void {
	mkdirSync(dirname(filePath), { recursive: true });
	writeFileSync(filePath, JSON.stringify(value, null, 2), "utf8");
}

afterEach(() => {
	for (const dir of tempDirs.splice(0)) {
		rmSync(dir, { recursive: true, force: true });
	}
});

describe("loadMcpInventory builtin presets", () => {
	it("lists korean-law as an available builtin preset when no server is configured", () => {
		const { home, cwd } = makeTempRoot();
		const inventory = loadMcpInventory(cwd, home);

		expect(inventory.entries).toEqual([]);
		expect(inventory.presets).toEqual([
			expect.objectContaining({
				name: "korean-law",
				configured: false,
				exactPackageSpec: "korean-law-mcp@4.4.0",
				gitCommit: "2ef8f1827d349381fc2bde15120c803fd2e7bfed",
				commandSummary: "npx -y korean-law-mcp@4.4.0",
				envKeys: ["LAW_OC", "KOREAN_LAW_API_KEY"],
			}),
		]);
	});

	it("marks the preset configured when the global MCP config defines korean-law", () => {
		const { home, cwd } = makeTempRoot();
		const globalPath = join(home, ".omk", "mcp.json");
		writeJson(globalPath, {
			mcpServers: {
				"korean-law": {
					command: "npx",
					args: ["-y", "korean-law-mcp@4.4.0"],
					env: { LAW_OC: "secret-value" },
				},
			},
		});

		const inventory = loadMcpInventory(cwd, home);
		expect(inventory.entries).toHaveLength(1);
		expect(inventory.entries[0]).toMatchObject({
			name: "korean-law",
			source: globalPath,
			commandSummary: "npx korean-law-mcp@4.4.0",
			envKeys: ["LAW_OC"],
		});
		expect(JSON.stringify(inventory.entries)).not.toContain("secret-value");
		expect(inventory.presets[0]).toMatchObject({ configured: true, configuredBy: globalPath });
	});

	it("uses project config as the configured preset source when it overrides global", () => {
		const { home, cwd } = makeTempRoot();
		const globalPath = join(home, ".omk", "mcp.json");
		const projectPath = join(cwd, ".omk", "mcp.json");
		writeJson(globalPath, { mcpServers: { "korean-law": { command: "npx", args: ["-y", "old@1.0.0"] } } });
		writeJson(projectPath, {
			mcpServers: { "korean-law": { command: "npx", args: ["-y", "korean-law-mcp@4.4.0"] } },
		});

		const inventory = loadMcpInventory(cwd, home);
		expect(inventory.entries).toHaveLength(1);
		expect(inventory.entries[0]).toMatchObject({ source: projectPath });
		expect(inventory.presets[0]).toMatchObject({ configured: true, configuredBy: projectPath });
	});

	it("keeps builtin presets available when a config file is malformed", () => {
		const { home, cwd } = makeTempRoot();
		const malformedPath = join(cwd, ".omk", "mcp.json");
		mkdirSync(join(cwd, ".omk"), { recursive: true });
		writeFileSync(malformedPath, "{ not json", "utf8");

		const inventory = loadMcpInventory(cwd, home);
		expect(inventory.errors).toEqual([expect.objectContaining({ path: malformedPath })]);
		expect(inventory.presets[0]).toMatchObject({ name: "korean-law", configured: false });
	});
});
