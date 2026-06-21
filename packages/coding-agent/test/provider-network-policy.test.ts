import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import {
	type Api,
	type AssistantMessage,
	type AssistantMessageEventStream,
	type BeforeProviderNetworkRequest,
	type Context,
	createAssistantMessageEventStream,
	type Model,
	type ProviderNetworkRequest,
	registerApiProvider,
	type Usage,
	unregisterApiProviders,
} from "@earendil-works/omk-ai";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { loadMcpInventory } from "../src/core/mcp-inventory.ts";
import type { ModelRegistry } from "../src/core/model-registry.ts";
import {
	type AgentStreamFunctionDeps,
	createAgentStreamFunction,
	createBeforeProviderNetworkRequest,
	decideProviderNetworkAccess,
	type ProviderNetworkAuditEvent,
	type ProviderNetworkPolicyConfig,
	type ProviderNetworkPolicyNetwork,
} from "../src/core/sdk.ts";
import { SettingsManager } from "../src/core/settings-manager.ts";

const DEFAULT_USAGE: Usage = {
	input: 0,
	output: 0,
	cacheRead: 0,
	cacheWrite: 0,
	totalTokens: 0,
	cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 },
};

const context: Context = {
	messages: [{ role: "user", content: "hello", timestamp: 1 }],
};

function network(
	mode: ProviderNetworkPolicyNetwork["mode"],
	overrides: Partial<ProviderNetworkPolicyNetwork> = {},
): ProviderNetworkPolicyNetwork {
	return {
		mode,
		allowedDomains: [],
		deniedDomains: [],
		allowUnixSockets: [],
		allowBrowser: false,
		...overrides,
	};
}

function request(host: string, overrides: Partial<ProviderNetworkRequest> = {}): ProviderNetworkRequest {
	return {
		provider: "test-provider",
		api: "openai-completions",
		modelId: "test-model",
		baseUrl: `https://${host}/`,
		url: `https://${host}/`,
		host,
		protocol: "https:",
		loopback: false,
		transport: "http",
		purpose: "chat",
		source: "model.baseUrl",
		...overrides,
	};
}

function writeJson(filePath: string, value: unknown): void {
	mkdirSync(dirname(filePath), { recursive: true });
	writeFileSync(filePath, JSON.stringify(value, null, 2), "utf8");
}

let tempDir = "";

beforeEach(() => {
	tempDir = join(tmpdir(), `pn-policy-${Date.now()}-${Math.random().toString(36).slice(2)}`);
	mkdirSync(tempDir, { recursive: true });
});

afterEach(() => {
	if (tempDir && existsSync(tempDir)) {
		rmSync(tempDir, { recursive: true });
	}
});

describe("decideProviderNetworkAccess", () => {
	it("allows everything in off mode regardless of host", () => {
		const config: ProviderNetworkPolicyConfig = { mode: "off", network: network("none") };
		const decision = decideProviderNetworkAccess(config, request("evil.example.com"));
		expect(decision).toMatchObject({ allowed: true, mode: "off", rule: "provider-network.off" });
		expect(decision.wouldDeny).toBeUndefined();
	});

	it("denies external hosts under enforce + network none", () => {
		const config: ProviderNetworkPolicyConfig = { mode: "enforce", network: network("none") };
		const decision = decideProviderNetworkAccess(config, request("api.example.com"));
		expect(decision).toMatchObject({ allowed: false, mode: "enforce", rule: "network.none" });
	});

	it("allows loopback hosts under enforce + loopback mode", () => {
		const config: ProviderNetworkPolicyConfig = { mode: "enforce", network: network("loopback") };
		const local = decideProviderNetworkAccess(
			config,
			request("127.0.0.1", {
				loopback: true,
				protocol: "http:",
				baseUrl: "http://127.0.0.1/",
				url: "http://127.0.0.1/",
			}),
		);
		expect(local).toMatchObject({ allowed: true, rule: "network.loopback" });
	});

	it("denies external hosts under enforce + loopback mode", () => {
		const config: ProviderNetworkPolicyConfig = { mode: "enforce", network: network("loopback") };
		const external = decideProviderNetworkAccess(config, request("api.example.com"));
		expect(external).toMatchObject({ allowed: false, rule: "network.domain_not_allowed" });
	});

	it("allows an allowlisted host under enforce + domain-allowlist", () => {
		const config: ProviderNetworkPolicyConfig = {
			mode: "enforce",
			network: network("domain-allowlist", { allowedDomains: ["api.openai.com"] }),
		};
		const decision = decideProviderNetworkAccess(config, request("api.openai.com"));
		expect(decision).toMatchObject({ allowed: true, rule: "network.domain_allow" });
	});

	it("denies a non-allowlisted host under enforce + domain-allowlist", () => {
		const config: ProviderNetworkPolicyConfig = {
			mode: "enforce",
			network: network("domain-allowlist", { allowedDomains: ["api.openai.com"] }),
		};
		const decision = decideProviderNetworkAccess(config, request("evil.example.com"));
		expect(decision).toMatchObject({ allowed: false, rule: "network.domain_not_allowed" });
	});

	it("lets a denied domain win over an allowlist entry", () => {
		const config: ProviderNetworkPolicyConfig = {
			mode: "enforce",
			network: network("domain-allowlist", {
				allowedDomains: ["api.openai.com"],
				deniedDomains: ["api.openai.com"],
			}),
		};
		const decision = decideProviderNetworkAccess(config, request("api.openai.com"));
		expect(decision).toMatchObject({ allowed: false, rule: "network.domain_deny" });
	});

	it("allows all explicit hosts under enforce + all-explicit", () => {
		const config: ProviderNetworkPolicyConfig = { mode: "enforce", network: network("all-explicit") };
		const decision = decideProviderNetworkAccess(config, request("api.example.com"));
		expect(decision).toMatchObject({ allowed: true, rule: "network.explicit_all" });
	});

	it("records wouldDeny without blocking in audit mode", () => {
		const denyConfig: ProviderNetworkPolicyConfig = { mode: "audit", network: network("none") };
		const denied = decideProviderNetworkAccess(denyConfig, request("api.example.com"));
		expect(denied).toMatchObject({ allowed: true, wouldDeny: true, mode: "audit", rule: "network.none" });

		const allowConfig: ProviderNetworkPolicyConfig = {
			mode: "audit",
			network: network("domain-allowlist", { allowedDomains: ["api.openai.com"] }),
		};
		const allowed = decideProviderNetworkAccess(allowConfig, request("api.openai.com"));
		expect(allowed).toMatchObject({ allowed: true, wouldDeny: false, mode: "audit", rule: "network.domain_allow" });
	});
});

describe("MCP inventory network decisions", () => {
	it("denies configured MCP server network by default when no explicit network policy is present", () => {
		const home = join(tempDir, "home");
		const cwd = join(tempDir, "project");
		const projectPath = join(cwd, ".omk", "mcp.json");
		writeJson(projectPath, {
			mcpServers: {
				context7: {
					command: "npx",
					args: ["-y", "@upstash/context7-mcp@1.0.0"],
				},
			},
		});

		const inventory = loadMcpInventory(cwd, home);

		expect(inventory.entries[0]).toMatchObject({
			name: "context7",
			networkDecision: {
				allowed: false,
				mode: "none",
				rule: "mcp.network.unspecified",
			},
		});
	});

	it("keeps malformed MCP network allowlists denied instead of falling open", () => {
		const home = join(tempDir, "home");
		const cwd = join(tempDir, "project");
		const projectPath = join(cwd, ".omk", "mcp.json");
		writeJson(projectPath, {
			mcpServers: {
				context7: {
					command: "npx",
					args: ["-y", "@upstash/context7-mcp@1.0.0"],
					network: { mode: "domain-allowlist", allowedDomains: [] },
				},
			},
		});

		const inventory = loadMcpInventory(cwd, home);

		expect(inventory.entries[0]).toMatchObject({
			networkDecision: {
				allowed: false,
				mode: "domain-allowlist",
				rule: "mcp.network.empty_allowlist",
			},
		});
	});
});

describe("createBeforeProviderNetworkRequest", () => {
	it("emits sanitized audit metadata and never leaks secrets", async () => {
		const events: ProviderNetworkAuditEvent[] = [];
		const hook = createBeforeProviderNetworkRequest({ mode: "audit", network: network("none") }, (event) =>
			events.push(event),
		);

		const decision = await hook(request("api.example.com", { port: "443" }));

		expect(decision.allowed).toBe(true);
		expect(decision.wouldDeny).toBe(true);
		expect(events).toHaveLength(1);
		expect(events[0]).toMatchObject({
			provider: "test-provider",
			api: "openai-completions",
			modelId: "test-model",
			host: "api.example.com",
			protocol: "https:",
			port: "443",
			transport: "http",
			purpose: "chat",
			mode: "audit",
			rule: "network.none",
			allowed: true,
			wouldDeny: true,
		});
		// Audit payload must never carry credentials, auth, or body markers.
		const serialized = JSON.stringify(events[0]);
		for (const forbidden of ["sk-", "apiKey", "authorization", "password", "bearer", "payload"]) {
			expect(serialized.toLowerCase()).not.toContain(forbidden);
		}
	});

	it("returns allowed=false in enforce mode for a denied host", async () => {
		const hook = createBeforeProviderNetworkRequest({ mode: "enforce", network: network("none") });
		expect((await hook(request("api.example.com"))).allowed).toBe(false);
	});
});

// ---------------------------------------------------------------------------
// createAgentStreamFunction integration: proves the preflight ordering gate
// (policy before auth resolution) without spinning up a full AgentSession.
// ---------------------------------------------------------------------------

function makeModel(api: string, baseUrl: string): Model<Api> {
	return {
		id: `${api}-model`,
		name: "Test Model",
		api,
		provider: "test-provider",
		baseUrl,
		reasoning: false,
		input: ["text"],
		cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
		contextWindow: 1000,
		maxTokens: 100,
	};
}

function doneStream(model: Model<Api>): AssistantMessageEventStream {
	const stream = createAssistantMessageEventStream();
	const message: AssistantMessage = {
		role: "assistant",
		content: [{ type: "text", text: "ok" }],
		api: model.api,
		provider: model.provider,
		model: model.id,
		usage: DEFAULT_USAGE,
		stopReason: "stop",
		timestamp: 2,
	};
	queueMicrotask(() => {
		stream.push({ type: "done", reason: "stop", message });
	});
	return stream;
}

interface FauxProviderInvocation {
	model: Model<Api>;
	options: Record<string, unknown> | undefined;
}

function registerFauxProvider(api: string, onInvoke: (invocation: FauxProviderInvocation) => void): string {
	const sourceId = `provider-network-policy-test-${api}-${Math.random().toString(36).slice(2)}`;
	registerApiProvider(
		{
			api,
			stream: (model, _context, options) => {
				onInvoke({ model, options: options as Record<string, unknown> | undefined });
				return doneStream(model);
			},
			streamSimple: (model, _context, options) => {
				onInvoke({ model, options: options as Record<string, unknown> | undefined });
				return doneStream(model);
			},
		},
		sourceId,
	);
	return sourceId;
}

function makeAuthSpyRegistry(onResolve: () => void): ModelRegistry {
	return {
		getApiKeyAndHeaders: async (_model: Model<Api>) => {
			onResolve();
			return { ok: true, apiKey: "sk-secret-key", headers: undefined };
		},
	} as unknown as ModelRegistry;
}

const sourceIds: string[] = [];
afterEach(() => {
	for (const sourceId of sourceIds.splice(0)) {
		unregisterApiProviders(sourceId);
	}
});

describe("createAgentStreamFunction", () => {
	function makeDeps(
		providerNetworkBeforeRequest: BeforeProviderNetworkRequest | undefined,
		onAuthResolve: () => void = () => {},
	): AgentStreamFunctionDeps {
		return {
			modelRegistry: makeAuthSpyRegistry(onAuthResolve),
			settingsManager: SettingsManager.create(tempDir, tempDir),
			providerNetworkBeforeRequest,
		};
	}

	it("runs the preflight before auth resolution and returns a sanitized error stream on deny", async () => {
		const api = `pn-deny-${Math.random().toString(36).slice(2)}`;
		// No provider registered: if the preflight failed to block, streamSimple
		// would throw "No API provider registered". Auth must never resolve.
		let authResolved = false;
		const deps = makeDeps(createBeforeProviderNetworkRequest({ mode: "enforce", network: network("none") }), () => {
			authResolved = true;
			throw new Error("auth must not resolve when policy denies");
		});
		const streamFn = createAgentStreamFunction(deps);

		const stream = await streamFn(
			// baseUrl carries a credential-shaped query to prove it never leaks.
			makeModel(api, "https://denied.example.com/v1?api_key=sk-leak-guard"),
			context,
		);
		const result = await stream.result();

		expect(authResolved).toBe(false);
		expect(result.stopReason).toBe("error");
		expect(result.errorMessage).toContain("Provider network access denied");
		expect(result.errorMessage).toContain("denied.example.com");
		expect(result.errorMessage).not.toContain("sk-leak-guard");
		expect(result.errorMessage).not.toContain("api_key");
	});

	it("resolves auth, forwards the hook to streamSimple, and streams on allow", async () => {
		const api = `pn-allow-${Math.random().toString(36).slice(2)}`;
		const invocations: FauxProviderInvocation[] = [];
		sourceIds.push(registerFauxProvider(api, (invocation) => invocations.push(invocation)));

		let authResolved = 0;
		const hook = createBeforeProviderNetworkRequest({
			mode: "enforce",
			network: network("domain-allowlist", { allowedDomains: ["allowed.example.com"] }),
		});
		const deps = makeDeps(hook, () => {
			authResolved += 1;
		});
		const streamFn = createAgentStreamFunction(deps);

		const result = await (await streamFn(makeModel(api, "https://allowed.example.com/v1"), context)).result();

		expect(result.stopReason).toBe("stop");
		expect(authResolved).toBe(1);
		expect(invocations).toHaveLength(1);
		// The hook is forwarded into streamSimple so provider-derived endpoints
		// can be checked deeper by the AI package.
		expect(invocations[0].options?.beforeNetworkRequest).toBe(hook);
	});

	it("does not block in audit mode but records sanitized wouldDeny audit events", async () => {
		const api = `pn-audit-${Math.random().toString(36).slice(2)}`;
		const invocations: FauxProviderInvocation[] = [];
		sourceIds.push(registerFauxProvider(api, (invocation) => invocations.push(invocation)));
		const events: ProviderNetworkAuditEvent[] = [];

		let authResolved = 0;
		const hook = createBeforeProviderNetworkRequest({ mode: "audit", network: network("none") }, (event) =>
			events.push(event),
		);
		const deps = makeDeps(hook, () => {
			authResolved += 1;
		});
		const streamFn = createAgentStreamFunction(deps);

		const result = await (await streamFn(makeModel(api, "https://api.example.com/v1"), context)).result();

		// Audit never blocks: provider still streams successfully.
		expect(result.stopReason).toBe("stop");
		expect(invocations).toHaveLength(1);
		expect(authResolved).toBe(1);
		expect(events.length).toBeGreaterThanOrEqual(1);
		expect(events.some((event) => event.wouldDeny === true)).toBe(true);
		// Audit metadata must never carry the resolved API key or auth markers.
		const serialized = JSON.stringify(events);
		for (const forbidden of ["sk-secret-key", "apiKey", "authorization", "bearer", "password"]) {
			expect(serialized.toLowerCase()).not.toContain(forbidden);
		}
	});

	it("preserves the exact legacy behavior when no policy is configured", async () => {
		const api = `pn-none-${Math.random().toString(36).slice(2)}`;
		const invocations: FauxProviderInvocation[] = [];
		sourceIds.push(registerFauxProvider(api, (invocation) => invocations.push(invocation)));

		let authResolved = 0;
		const deps = makeDeps(undefined, () => {
			authResolved += 1;
		});
		const streamFn = createAgentStreamFunction(deps);

		const result = await (await streamFn(makeModel(api, "https://api.example.com/v1"), context)).result();

		expect(result.stopReason).toBe("stop");
		expect(authResolved).toBe(1);
		expect(invocations).toHaveLength(1);
		// No policy hook is forwarded, matching pre-policy behavior exactly.
		expect(invocations[0].options?.beforeNetworkRequest).toBeUndefined();
	});
});
