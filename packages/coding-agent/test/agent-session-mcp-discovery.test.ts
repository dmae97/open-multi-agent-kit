import { afterEach, describe, expect, it } from "bun:test";
import type { AgentTool } from "@oh-my-pi/pi-agent-core";
import { Agent } from "@oh-my-pi/pi-agent-core";
import type { Model } from "@oh-my-pi/pi-ai";
import { Type } from "@sinclair/typebox";
import { Settings } from "../src/config/settings";
import type { CustomTool } from "../src/extensibility/custom-tools/types";
import { AgentSession } from "../src/session/agent-session";
import { SessionManager } from "../src/session/session-manager";

function createModel(): Model<"openai-responses"> {
	return {
		id: "mock",
		name: "mock",
		api: "openai-responses",
		provider: "openai",
		baseUrl: "https://example.invalid",
		reasoning: false,
		input: ["text"],
		cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
		contextWindow: 8192,
		maxTokens: 2048,
	};
}

function createBasicTool(name: string, label: string): AgentTool {
	const schema = Type.Object({ value: Type.String() });
	return {
		name,
		label,
		description: `${label} tool`,
		parameters: schema,
		strict: true,
		async execute() {
			return { content: [{ type: "text", text: `${name} executed` }] };
		},
	};
}

function createMcpTool(
	name: string,
	serverName: string,
	mcpToolName: string,
	description: string,
	schemaKeys: string[],
): AgentTool {
	const properties = Object.fromEntries(schemaKeys.map(key => [key, Type.String()]));
	return {
		name,
		label: `${serverName}/${mcpToolName}`,
		description,
		parameters: Type.Object(properties),
		strict: true,
		mcpServerName: serverName,
		mcpToolName,
		async execute() {
			return { content: [{ type: "text", text: `${name} executed` }] };
		},
	} as AgentTool;
}

function createMcpCustomTool(
	name: string,
	serverName: string,
	mcpToolName: string,
	description: string,
	schemaKeys: string[],
): CustomTool {
	const properties = Object.fromEntries(schemaKeys.map(key => [key, Type.String()]));
	return {
		name,
		label: `${serverName}/${mcpToolName}`,
		description,
		parameters: Type.Object(properties),
		async execute() {
			return { content: [{ type: "text", text: `${name} executed` }] };
		},
	};
}

describe("AgentSession MCP discovery", () => {
	const sessions: AgentSession[] = [];

	afterEach(async () => {
		for (const session of sessions.splice(0)) {
			await session.dispose();
		}
	});

	it("caches discoverable MCP search indexes until MCP tools refresh", async () => {
		const readTool = createBasicTool("read", "Read");
		const docsSearchTool = createMcpTool("mcp_docs_search", "docs", "search", "Search internal docs", ["query"]);
		const toolRegistry = new Map([
			[readTool.name, readTool],
			[docsSearchTool.name, docsSearchTool],
		]);
		const agent = new Agent({
			initialState: {
				model: createModel(),
				systemPrompt: "initial",
				tools: [readTool],
				messages: [],
			},
		});
		const session = new AgentSession({
			agent,
			sessionManager: SessionManager.inMemory(),
			settings: Settings.isolated({ "mcp.discoveryMode": true }),
			modelRegistry: {} as never,
			toolRegistry,
			mcpDiscoveryEnabled: true,
			rebuildSystemPrompt: async toolNames => `tools:${toolNames.join(",")}`,
		});
		sessions.push(session);

		const firstIndex = session.getDiscoverableMCPSearchIndex();
		const secondIndex = session.getDiscoverableMCPSearchIndex();
		expect(secondIndex).toBe(firstIndex);
		expect(firstIndex.documents.map(document => document.tool.name)).toEqual(["mcp_docs_search"]);

		await session.refreshMCPTools([
			createMcpCustomTool("mcp_pager_list", "pager", "list", "List pager alerts", ["service"]),
		]);

		const refreshedIndex = session.getDiscoverableMCPSearchIndex();
		expect(refreshedIndex).not.toBe(firstIndex);
		expect(refreshedIndex.documents.map(document => document.tool.name)).toEqual(["mcp_pager_list"]);
	});

	it("reports only currently active MCP tools in non-discovery sessions", async () => {
		const readTool = createBasicTool("read", "Read");
		const docsSearchTool = createMcpTool("mcp_docs_search", "docs", "search", "Search internal docs", ["query"]);
		const slackSendTool = createMcpTool("mcp_slack_send_message", "slack", "send_message", "Send a Slack message", [
			"channel",
			"text",
		]);
		const toolRegistry = new Map([
			[readTool.name, readTool],
			[docsSearchTool.name, docsSearchTool],
			[slackSendTool.name, slackSendTool],
		]);
		const agent = new Agent({
			initialState: {
				model: createModel(),
				systemPrompt: "initial",
				tools: [readTool, docsSearchTool],
				messages: [],
			},
		});
		const session = new AgentSession({
			agent,
			sessionManager: SessionManager.inMemory(),
			settings: Settings.isolated({ "mcp.discoveryMode": false }),
			modelRegistry: {} as never,
			toolRegistry,
			mcpDiscoveryEnabled: false,
			rebuildSystemPrompt: async toolNames => `tools:${toolNames.join(",")}`,
		});
		sessions.push(session);

		expect(session.getSelectedMCPToolNames()).toEqual(["mcp_docs_search"]);

		await session.setActiveToolsByName(["read"]);

		expect(session.getSelectedMCPToolNames()).toEqual([]);
		expect(session.getActiveToolNames()).toEqual(["read"]);
		expect(session.systemPrompt).toBe("tools:read");
	});

	it("keeps manually deactivated MCP tools off after refresh in non-discovery sessions", async () => {
		const readTool = createBasicTool("read", "Read");
		const docsSearchTool = createMcpTool("mcp_docs_search", "docs", "search", "Search internal docs", ["query"]);
		const slackSendTool = createMcpTool("mcp_slack_send_message", "slack", "send_message", "Send a Slack message", [
			"channel",
			"text",
		]);
		const toolRegistry = new Map([
			[readTool.name, readTool],
			[docsSearchTool.name, docsSearchTool],
			[slackSendTool.name, slackSendTool],
		]);
		const agent = new Agent({
			initialState: {
				model: createModel(),
				systemPrompt: "initial",
				tools: [readTool, docsSearchTool],
				messages: [],
			},
		});
		const session = new AgentSession({
			agent,
			sessionManager: SessionManager.inMemory(),
			settings: Settings.isolated({ "mcp.discoveryMode": false }),
			modelRegistry: {} as never,
			toolRegistry,
			mcpDiscoveryEnabled: false,
			rebuildSystemPrompt: async toolNames => `tools:${toolNames.join(",")}`,
		});
		sessions.push(session);

		await session.setActiveToolsByName(["read"]);
		expect(session.getSelectedMCPToolNames()).toEqual([]);

		await session.refreshMCPTools([
			createMcpCustomTool("mcp_docs_search", "docs", "search", "Search internal docs", ["query"]),
			createMcpCustomTool("mcp_slack_send_message", "slack", "send_message", "Send a Slack message", [
				"channel",
				"text",
			]),
		]);

		expect(session.getSelectedMCPToolNames()).toEqual([]);
		expect(session.getActiveToolNames()).toEqual(["read"]);
		expect(session.systemPrompt).toBe("tools:read");
	});

	it("preserves directly activated MCP tools across refreshes in discovery mode", async () => {
		const readTool = createBasicTool("read", "Read");
		const docsSearchTool = createMcpTool("mcp_docs_search", "docs", "search", "Search internal docs", ["query"]);
		const slackSendTool = createMcpTool("mcp_slack_send_message", "slack", "send_message", "Send a Slack message", [
			"channel",
			"text",
		]);
		const toolRegistry = new Map([
			[readTool.name, readTool],
			[docsSearchTool.name, docsSearchTool],
			[slackSendTool.name, slackSendTool],
		]);
		const agent = new Agent({
			initialState: {
				model: createModel(),
				systemPrompt: "initial",
				tools: [readTool],
				messages: [],
			},
		});
		const session = new AgentSession({
			agent,
			sessionManager: SessionManager.inMemory(),
			settings: Settings.isolated({ "mcp.discoveryMode": true }),
			modelRegistry: {} as never,
			toolRegistry,
			mcpDiscoveryEnabled: true,
			rebuildSystemPrompt: async toolNames => `tools:${toolNames.join(",")}`,
		});
		sessions.push(session);

		await session.setActiveToolsByName(["read", "mcp_docs_search"]);
		expect(session.getSelectedMCPToolNames()).toEqual(["mcp_docs_search"]);
		expect(session.getActiveToolNames()).toEqual(["read", "mcp_docs_search"]);

		await session.refreshMCPTools([
			createMcpCustomTool("mcp_docs_search", "docs", "search", "Search internal docs", ["query"]),
			createMcpCustomTool("mcp_slack_send_message", "slack", "send_message", "Send a Slack message", [
				"channel",
				"text",
			]),
		]);
		expect(session.getSelectedMCPToolNames()).toEqual(["mcp_docs_search"]);
		expect(session.getActiveToolNames()).toEqual(["read", "mcp_docs_search"]);
	});

	it("keeps MCP tools hidden by default and activates discovered selections additively", async () => {
		const readTool = createBasicTool("read", "Read");
		const docsSearchTool = createMcpTool("mcp_docs_search", "docs", "search", "Search internal docs", ["query"]);
		const slackSendTool = createMcpTool("mcp_slack_send_message", "slack", "send_message", "Send a Slack message", [
			"channel",
			"text",
		]);
		const toolRegistry = new Map([
			[readTool.name, readTool],
			[docsSearchTool.name, docsSearchTool],
			[slackSendTool.name, slackSendTool],
		]);
		const agent = new Agent({
			initialState: {
				model: createModel(),
				systemPrompt: "initial",
				tools: [readTool],
				messages: [],
			},
		});
		const session = new AgentSession({
			agent,
			sessionManager: SessionManager.inMemory(),
			settings: Settings.isolated({ "mcp.discoveryMode": true }),
			modelRegistry: {} as never,
			toolRegistry,
			mcpDiscoveryEnabled: true,
			rebuildSystemPrompt: async toolNames => `tools:${toolNames.join(",")}`,
		});
		sessions.push(session);

		expect(session.getActiveToolNames()).toEqual(["read"]);
		expect(session.getDiscoverableMCPTools().map(tool => tool.name)).toEqual([
			"mcp_docs_search",
			"mcp_slack_send_message",
		]);

		await session.activateDiscoveredMCPTools(["mcp_docs_search"]);
		expect(session.getSelectedMCPToolNames()).toEqual(["mcp_docs_search"]);
		expect(session.getActiveToolNames()).toEqual(["read", "mcp_docs_search"]);
		expect(session.systemPrompt).toBe("tools:read,mcp_docs_search");

		await session.activateDiscoveredMCPTools(["mcp_slack_send_message"]);
		expect(session.getSelectedMCPToolNames()).toEqual(["mcp_docs_search", "mcp_slack_send_message"]);
		expect(session.getActiveToolNames()).toEqual(["read", "mcp_docs_search", "mcp_slack_send_message"]);
		expect(session.systemPrompt).toBe("tools:read,mcp_docs_search,mcp_slack_send_message");
	});
});
