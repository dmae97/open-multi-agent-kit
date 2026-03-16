import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { getBundledModel } from "@oh-my-pi/pi-ai";
import { Settings } from "@oh-my-pi/pi-coding-agent/config/settings";
import type { CustomTool } from "@oh-my-pi/pi-coding-agent/extensibility/custom-tools/types";
import { createAgentSession } from "@oh-my-pi/pi-coding-agent/sdk";
import { SessionManager } from "@oh-my-pi/pi-coding-agent/session/session-manager";
import { Snowflake } from "@oh-my-pi/pi-utils";
import { Type } from "@sinclair/typebox";

function createMcpCustomTool(name: string, serverName: string, mcpToolName: string): CustomTool {
	return {
		name,
		label: `${serverName}/${mcpToolName}`,
		description: `Tool ${mcpToolName} from ${serverName}`,
		mcpServerName: serverName,
		mcpToolName,
		parameters: Type.Object({ query: Type.String() }),
		async execute() {
			return { content: [{ type: "text", text: `${name} executed` }] };
		},
	} as CustomTool;
}

describe("createAgentSession MCP discovery prompt gating", () => {
	let tempDir: string;

	beforeEach(() => {
		tempDir = path.join(os.tmpdir(), `pi-sdk-mcp-discovery-${Snowflake.next()}`);
		fs.mkdirSync(tempDir, { recursive: true });
	});

	afterEach(() => {
		if (tempDir && fs.existsSync(tempDir)) {
			fs.rmSync(tempDir, { recursive: true, force: true });
		}
	});

	it("does not advertise MCP discovery when search_tool_bm25 is not active", async () => {
		const { session } = await createAgentSession({
			cwd: tempDir,
			agentDir: tempDir,
			sessionManager: SessionManager.inMemory(),
			settings: Settings.isolated({ "mcp.discoveryMode": true }),
			model: getBundledModel("openai", "gpt-4o-mini"),
			disableExtensionDiscovery: true,
			skills: [],
			contextFiles: [],
			promptTemplates: [],
			slashCommands: [],
			enableMCP: false,
			enableLsp: false,
			toolNames: ["read"],
			customTools: [createMcpCustomTool("mcp_github_create_issue", "github", "create_issue")],
		});

		expect(session.systemPrompt).not.toContain("### MCP tool discovery");
		expect(session.systemPrompt).not.toContain("call `search_tool_bm25` before concluding no such tool exists");
	});

	it("preserves explicitly requested MCP tools in discovery mode", async () => {
		const { session } = await createAgentSession({
			cwd: tempDir,
			agentDir: tempDir,
			sessionManager: SessionManager.inMemory(),
			settings: Settings.isolated({ "mcp.discoveryMode": true }),
			model: getBundledModel("openai", "gpt-4o-mini"),
			disableExtensionDiscovery: true,
			skills: [],
			contextFiles: [],
			promptTemplates: [],
			slashCommands: [],
			enableMCP: false,
			enableLsp: false,
			toolNames: ["read", "mcp_github_create_issue", "search_tool_bm25"],
			customTools: [
				createMcpCustomTool("mcp_github_create_issue", "github", "create_issue"),
				createMcpCustomTool("mcp_slack_post_message", "slack", "post_message"),
			],
		});

		expect(session.getActiveToolNames()).toContain("mcp_github_create_issue");
		expect(session.getSelectedMCPToolNames()).toEqual(["mcp_github_create_issue"]);
		expect(session.systemPrompt).toContain("mcp_github_create_issue");

		await session.activateDiscoveredMCPTools(["mcp_slack_post_message"]);

		expect(session.getActiveToolNames()).toEqual(
			expect.arrayContaining(["read", "search_tool_bm25", "mcp_github_create_issue", "mcp_slack_post_message"]),
		);
		expect(session.getSelectedMCPToolNames()).toEqual(["mcp_github_create_issue", "mcp_slack_post_message"]);
	});

	it("builds search_tool_bm25 descriptions from the loaded MCP catalog", async () => {
		const { session } = await createAgentSession({
			cwd: tempDir,
			agentDir: tempDir,
			sessionManager: SessionManager.inMemory(),
			settings: Settings.isolated({ "mcp.discoveryMode": true }),
			model: getBundledModel("openai", "gpt-4o-mini"),
			disableExtensionDiscovery: true,
			skills: [],
			contextFiles: [],
			promptTemplates: [],
			slashCommands: [],
			enableMCP: false,
			enableLsp: false,
			toolNames: ["read", "search_tool_bm25"],
			customTools: [createMcpCustomTool("mcp_github_create_issue", "github", "create_issue")],
		});

		const searchTool = session.agent.state.tools.find(tool => tool.name === "search_tool_bm25");
		expect(searchTool?.description).toContain("Total discoverable MCP tools loaded: 1.");
		expect(searchTool?.description).toContain("- `server_name`");
	});
});
