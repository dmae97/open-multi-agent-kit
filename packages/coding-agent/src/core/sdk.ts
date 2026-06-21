import { join } from "node:path";
import { Agent, type AgentMessage, type StreamFn, type ThinkingLevel } from "@earendil-works/omk-agent-core";
import {
	assertProviderNetworkRequestAllowed,
	type BeforeProviderNetworkRequest,
	clampThinkingLevel,
	createProviderNetworkErrorStream,
	type Message,
	type Model,
	type ProviderNetworkDecision,
	type ProviderNetworkRequest,
	streamSimple,
} from "@earendil-works/omk-ai";
import { getAgentDir } from "../config.ts";
import { resolvePath } from "../utils/paths.ts";
import { AgentSession } from "./agent-session.ts";
import { formatNoModelsAvailableMessage } from "./auth-guidance.ts";
import { AuthStorage } from "./auth-storage.ts";
import { DEFAULT_THINKING_LEVEL } from "./defaults.ts";
import type { ExtensionRunner, LoadExtensionsResult, SessionStartEvent, ToolDefinition } from "./extensions/index.ts";
import type { ExtensionExecSandbox } from "./extensions/types.ts";
import type { LoadoutAccessPolicy } from "./loadout-access-policy.ts";
import { convertToLlm } from "./messages.ts";
import { ModelRegistry } from "./model-registry.ts";
import { findInitialModel } from "./model-resolver.ts";
import type { PackageTrialRuntimeOptions } from "./package-manager.ts";
import { mergeProviderAttributionHeaders } from "./provider-attribution.ts";
import type { ResourceLoader } from "./resource-loader.ts";
import { DefaultResourceLoader } from "./resource-loader.ts";
import { decideNetworkAccess, type SandboxPolicy } from "./sandbox/policy.ts";
import { getDefaultSessionDir, SessionManager } from "./session-manager.ts";
import { SettingsManager } from "./settings-manager.ts";
import { time } from "./timings.ts";
import {
	type BashSandboxPreflight,
	createBashTool,
	createCodingTools,
	createEditTool,
	createFindTool,
	createGrepTool,
	createLsTool,
	createReadOnlyTools,
	createReadTool,
	createWriteTool,
	type ToolName,
	withFileMutationQueue,
} from "./tools/index.ts";

export interface CreateAgentSessionOptions {
	/** Working directory for project-local discovery. Default: process.cwd() */
	cwd?: string;
	/** Global config directory. Default: ~/.omk/agent */
	agentDir?: string;

	/** Auth storage for credentials. Default: AuthStorage.create(agentDir/auth.json) */
	authStorage?: AuthStorage;
	/** Model registry. Default: ModelRegistry.create(authStorage, agentDir/models.json) */
	modelRegistry?: ModelRegistry;

	/** Model to use. Default: from settings, else first available */
	model?: Model<any>;
	/** Thinking level. Default: from settings, else 'medium' (clamped to model capabilities) */
	thinkingLevel?: ThinkingLevel;
	/** Models available for cycling (Ctrl+P in interactive mode) */
	scopedModels?: Array<{ model: Model<any>; thinkingLevel?: ThinkingLevel }>;

	/**
	 * Optional default tool suppression mode when no explicit allowlist is provided.
	 *
	 * - "all": start with no tools enabled
	 * - "builtin": disable the default built-in tools (read, bash, edit, write)
	 *   but keep extension/custom tools enabled
	 */
	noTools?: "all" | "builtin";
	/**
	 * Optional allowlist of tool names.
	 *
	 * When omitted, omk enables the default built-in tools (read, bash, edit, write)
	 * and leaves extension/custom tools enabled unless `noTools` changes that default.
	 * When provided, only the listed tool names are enabled.
	 */
	tools?: string[];
	/** Optional denylist of tool names to disable. Applies after `tools` when both are provided. */
	excludeTools?: string[];
	/** Custom tools to register (in addition to built-in tools). */
	customTools?: ToolDefinition[];

	/** Resource loader. When omitted, DefaultResourceLoader is used. */
	resourceLoader?: ResourceLoader;

	/** Session manager. Default: SessionManager.create(cwd) */
	sessionManager?: SessionManager;

	/** Settings manager. Default: SettingsManager.create(cwd, agentDir) */
	settingsManager?: SettingsManager;
	/** Session start event metadata for extension runtime startup. */
	sessionStartEvent?: SessionStartEvent;
	/**
	 * Optional provider network policy. When omitted, no provider network
	 * preflight is installed (current behavior preserved). When set, a
	 * sanitized preflight runs before API key/header resolution and is
	 * forwarded to `streamSimple` for deeper provider-derived URL checks.
	 */
	providerNetworkPolicy?: ProviderNetworkPolicyConfig;
	/** Optional sanitized audit sink for provider network policy decisions. */
	onProviderNetworkAudit?: ProviderNetworkAuditSink;
	/** Optional loadout enforcement policy for SDK-created sessions. */
	loadoutAccessPolicy?: LoadoutAccessPolicy;
	/** Optional bash sandbox preflight policy for SDK-created sessions and RPC bash. */
	bashSandboxPreflight?: BashSandboxPreflight;
	/** Optional sandbox policy for extension `omk.exec` loaded through the default resource loader. */
	extensionExecSandbox?: ExtensionExecSandbox;
	/** Optional sandboxed temporary package trial runtime for CLI/SDK supplied package sources. */
	packageTrialRuntime?: PackageTrialRuntimeOptions;
}

/** Result from createAgentSession */
export interface CreateAgentSessionResult {
	/** The created session */
	session: AgentSession;
	/** Extensions result (for UI context setup in interactive mode) */
	extensionsResult: LoadExtensionsResult;
	/** Warning if session was restored with a different model than saved */
	modelFallbackMessage?: string;
}

// Re-exports

export * from "./agent-session-runtime.ts";
export type {
	ExtensionAPI,
	ExtensionCommandContext,
	ExtensionContext,
	ExtensionFactory,
	SlashCommandInfo,
	SlashCommandSource,
	ToolDefinition,
} from "./extensions/index.ts";
export type { PromptTemplate } from "./prompt-templates.ts";
export type { Skill } from "./skills.ts";
export type { Tool } from "./tools/index.ts";

export {
	withFileMutationQueue,
	// Tool factories (for custom cwd)
	createCodingTools,
	createReadOnlyTools,
	createReadTool,
	createBashTool,
	createEditTool,
	createWriteTool,
	createGrepTool,
	createFindTool,
	createLsTool,
};

// Helper Functions

function getDefaultAgentDir(): string {
	return getAgentDir();
}

/**
 * Create an AgentSession with the specified options.
 *
 * @example
 * ```typescript
 * // Minimal - uses defaults
 * const { session } = await createAgentSession();
 *
 * // With explicit model
 * import { getModel } from '@earendil-works/omk-ai';
 * const { session } = await createAgentSession({
 *   model: getModel('anthropic', 'claude-opus-4-5'),
 *   thinkingLevel: 'high',
 * });
 *
 * // Continue previous session
 * const { session, modelFallbackMessage } = await createAgentSession({
 *   continueSession: true,
 * });
 *
 * // Full control
 * const loader = new DefaultResourceLoader({
 *   cwd: process.cwd(),
 *   agentDir: getAgentDir(),
 *   settingsManager: SettingsManager.create(),
 * });
 * await loader.reload();
 * const { session } = await createAgentSession({
 *   model: myModel,
 *   tools: ["read", "bash"],
 *   resourceLoader: loader,
 *   sessionManager: SessionManager.inMemory(),
 * });
 * ```
 */
// ---------------------------------------------------------------------------
// Provider network policy
//
// Sanitized preflight for provider/API network access. The request metadata
// is origin-only (no credentials, query, fragment, path, headers, API keys,
// request bodies, prompts, or responses). Enforce mode blocks denied hosts
// before any provider network I/O and before API key/header resolution; audit
// mode records `wouldDeny` without blocking; off mode disables the preflight.
// The pure host/loopback/deny/allow logic reuses `decideNetworkAccess`.
// ---------------------------------------------------------------------------

export type ProviderNetworkPolicyMode = "off" | "audit" | "enforce";

export type ProviderNetworkPolicyNetwork = SandboxPolicy["network"];

export interface ProviderNetworkPolicyConfig {
	mode: ProviderNetworkPolicyMode;
	network: ProviderNetworkPolicyNetwork;
}

export interface ProviderNetworkAuditEvent {
	provider: string;
	api: string;
	modelId: string;
	host?: string;
	protocol: ProviderNetworkRequest["protocol"];
	port?: string;
	transport: ProviderNetworkRequest["transport"];
	purpose: ProviderNetworkRequest["purpose"];
	mode: ProviderNetworkPolicyMode;
	rule: string;
	allowed: boolean;
	wouldDeny?: boolean;
}

export type ProviderNetworkAuditSink = (event: ProviderNetworkAuditEvent) => void;

function syntheticProviderSandboxPolicy(
	mode: "audit" | "enforce",
	network: ProviderNetworkPolicyNetwork,
): SandboxPolicy {
	return {
		mode,
		profile: "networked",
		filesystem: {
			root: "/",
			readAllow: [],
			readDeny: [],
			writeAllow: [],
			denyWrite: [],
			tempWrite: [],
			followSymlinks: false,
		},
		network,
		process: { allowExec: true, allowShell: true, allowPrivilege: false },
	};
}

/**
 * Map a sanitized provider network request to a provider-neutral decision.
 * Reuses the pure sandbox network decision logic (`decideNetworkAccess`) so
 * allow/deny/loopback semantics stay consistent with the rest of the sandbox.
 */
export function decideProviderNetworkAccess(
	config: ProviderNetworkPolicyConfig,
	request: ProviderNetworkRequest,
): ProviderNetworkDecision {
	if (config.mode === "off") {
		return {
			allowed: true,
			rule: "provider-network.off",
			reason: "Provider network policy is disabled.",
			mode: "off",
		};
	}

	const sandboxMode = config.mode === "audit" ? "audit" : "enforce";
	const sandboxDecision = decideNetworkAccess(syntheticProviderSandboxPolicy(sandboxMode, config.network), {
		host: request.host,
		url: request.url,
		loopback: request.loopback,
		browser: false,
	});

	if (config.mode === "audit") {
		return {
			allowed: true,
			wouldDeny: !sandboxDecision.allowed,
			rule: sandboxDecision.rule,
			reason: sandboxDecision.reason,
			mode: "audit",
		};
	}

	return {
		allowed: sandboxDecision.allowed,
		rule: sandboxDecision.rule,
		reason: sandboxDecision.reason,
		mode: "enforce",
	};
}

/**
 * Create the `beforeNetworkRequest` hook installed on the agent stream
 * function. The optional audit sink receives only sanitized metadata
 * (provider, api, model id, host, protocol, port, transport, purpose, mode,
 * rule, allowed/wouldDeny) and never headers, API keys, or request bodies.
 */
export function createBeforeProviderNetworkRequest(
	config: ProviderNetworkPolicyConfig,
	onAudit?: ProviderNetworkAuditSink,
): BeforeProviderNetworkRequest {
	return (request) => {
		const decision = decideProviderNetworkAccess(config, request);
		onAudit?.({
			provider: request.provider,
			api: String(request.api),
			modelId: request.modelId,
			host: request.host,
			protocol: request.protocol,
			port: request.port,
			transport: request.transport,
			purpose: request.purpose,
			mode: decision.mode,
			rule: decision.rule,
			allowed: decision.allowed,
			wouldDeny: decision.wouldDeny,
		});
		return decision;
	};
}

/**
 * Dependencies for the agent stream function factory.
 */
export interface AgentStreamFunctionDeps {
	modelRegistry: ModelRegistry;
	settingsManager: SettingsManager;
	/** When set, a sanitized preflight runs before auth resolution and is forwarded to `streamSimple`. */
	providerNetworkBeforeRequest?: BeforeProviderNetworkRequest;
}

/**
 * Build the Agent `streamFn` used by `createAgentSession`.
 *
 * Contract preserved from the previous inline implementation:
 * - resolves API key/headers via the model registry,
 * - applies provider retry/timeout settings,
 * - merges provider attribution headers.
 *
 * Added behavior: when `providerNetworkBeforeRequest` is set, a sanitized
 * preflight runs BEFORE auth resolution. A deny returns a sanitized error
 * stream (no headers/API keys/bodies/prompts/responses are exposed) and skips
 * auth + provider invocation entirely. The hook is also forwarded to
 * `streamSimple` so provider-derived endpoints can be checked deeper.
 */
export function createAgentStreamFunction(deps: AgentStreamFunctionDeps): StreamFn {
	const { modelRegistry, settingsManager, providerNetworkBeforeRequest } = deps;
	return async (model, context, options) => {
		if (providerNetworkBeforeRequest) {
			try {
				await assertProviderNetworkRequestAllowed(
					{ model, purpose: "chat", transport: "http", source: "model.baseUrl" },
					providerNetworkBeforeRequest,
				);
			} catch (error) {
				return createProviderNetworkErrorStream(model, error);
			}
		}
		const auth = await modelRegistry.getApiKeyAndHeaders(model);
		if (!auth.ok) {
			throw new Error(auth.error);
		}
		const providerRetrySettings = settingsManager.getProviderRetrySettings();
		const httpIdleTimeoutMs = settingsManager.getHttpIdleTimeoutMs();
		// SDKs treat timeout=0 as 0ms (immediate timeout), not "no timeout".
		// Use max int32 to effectively disable the timeout.
		const effectiveTimeoutMs = httpIdleTimeoutMs === 0 ? 2147483647 : httpIdleTimeoutMs;
		const timeoutMs = options?.timeoutMs ?? providerRetrySettings.timeoutMs ?? effectiveTimeoutMs;
		const websocketConnectTimeoutMs =
			options?.websocketConnectTimeoutMs ?? settingsManager.getWebSocketConnectTimeoutMs();
		return streamSimple(model, context, {
			...options,
			apiKey: auth.apiKey,
			timeoutMs,
			websocketConnectTimeoutMs,
			maxRetries: options?.maxRetries ?? providerRetrySettings.maxRetries,
			maxRetryDelayMs: options?.maxRetryDelayMs ?? providerRetrySettings.maxRetryDelayMs,
			headers: mergeProviderAttributionHeaders(
				model,
				settingsManager,
				options?.sessionId,
				auth.headers,
				options?.headers,
			),
			...(providerNetworkBeforeRequest ? { beforeNetworkRequest: providerNetworkBeforeRequest } : {}),
		});
	};
}

export async function createAgentSession(options: CreateAgentSessionOptions = {}): Promise<CreateAgentSessionResult> {
	const cwd = resolvePath(options.cwd ?? options.sessionManager?.getCwd() ?? process.cwd());
	const agentDir = options.agentDir ? resolvePath(options.agentDir) : getDefaultAgentDir();
	let resourceLoader = options.resourceLoader;

	// Use provided or create AuthStorage and ModelRegistry
	const authPath = options.agentDir ? join(agentDir, "auth.json") : undefined;
	const modelsPath = options.agentDir ? join(agentDir, "models.json") : undefined;
	const authStorage = options.authStorage ?? AuthStorage.create(authPath);
	const modelRegistry = options.modelRegistry ?? ModelRegistry.create(authStorage, modelsPath);

	const settingsManager = options.settingsManager ?? SettingsManager.create(cwd, agentDir);
	const sessionManager = options.sessionManager ?? SessionManager.create(cwd, getDefaultSessionDir(cwd, agentDir));

	if (!resourceLoader) {
		resourceLoader = new DefaultResourceLoader({
			cwd,
			agentDir,
			settingsManager,
			extensionExecSandbox: options.extensionExecSandbox,
			trialRuntime: options.packageTrialRuntime,
		});
		await resourceLoader.reload();
		time("resourceLoader.reload");
	}

	// Check if session has existing data to restore
	const existingSession = sessionManager.buildSessionContext();
	const hasExistingSession = existingSession.messages.length > 0;
	const hasThinkingEntry = sessionManager.getBranch().some((entry) => entry.type === "thinking_level_change");

	let model = options.model;
	let modelFallbackMessage: string | undefined;

	// If session has data, try to restore model from it
	if (!model && hasExistingSession && existingSession.model) {
		const restoredModel = modelRegistry.find(existingSession.model.provider, existingSession.model.modelId);
		if (restoredModel && modelRegistry.hasConfiguredAuth(restoredModel)) {
			model = restoredModel;
		}
		if (!model) {
			modelFallbackMessage = `Could not restore model ${existingSession.model.provider}/${existingSession.model.modelId}`;
		}
	}

	// If still no model, use findInitialModel (checks settings default, then provider defaults)
	if (!model) {
		const result = await findInitialModel({
			scopedModels: [],
			isContinuing: hasExistingSession,
			defaultProvider: settingsManager.getDefaultProvider(),
			defaultModelId: settingsManager.getDefaultModel(),
			defaultThinkingLevel: settingsManager.getDefaultThinkingLevel(),
			modelRegistry,
		});
		model = result.model;
		if (!model) {
			modelFallbackMessage = formatNoModelsAvailableMessage();
		} else if (modelFallbackMessage) {
			modelFallbackMessage += `. Using ${model.provider}/${model.id}`;
		}
	}

	let thinkingLevel = options.thinkingLevel;

	// If session has data, restore thinking level from it
	if (thinkingLevel === undefined && hasExistingSession) {
		thinkingLevel = hasThinkingEntry
			? (existingSession.thinkingLevel as ThinkingLevel)
			: (settingsManager.getDefaultThinkingLevel() ?? DEFAULT_THINKING_LEVEL);
	}

	// Fall back to settings default
	if (thinkingLevel === undefined) {
		thinkingLevel = settingsManager.getDefaultThinkingLevel() ?? DEFAULT_THINKING_LEVEL;
	}

	// Clamp to model capabilities
	if (!model) {
		thinkingLevel = "off";
	} else {
		thinkingLevel = clampThinkingLevel(model, thinkingLevel) as ThinkingLevel;
	}

	const defaultActiveToolNames: ToolName[] = ["read", "bash", "edit", "write"];
	const allowedToolNames = options.tools ?? (options.noTools === "all" ? [] : undefined);
	const excludedToolNames = options.excludeTools;
	const excludedToolNameSet = excludedToolNames ? new Set(excludedToolNames) : undefined;
	const initialActiveToolNames: string[] = (
		options.tools ? [...options.tools] : options.noTools ? [] : defaultActiveToolNames
	).filter((name) => !excludedToolNameSet?.has(name));

	let agent: Agent;

	// Create convertToLlm wrapper that filters images if blockImages is enabled (defense-in-depth)
	const convertToLlmWithBlockImages = (messages: AgentMessage[]): Message[] => {
		const converted = convertToLlm(messages);
		// Check setting dynamically so mid-session changes take effect
		if (!settingsManager.getBlockImages()) {
			return converted;
		}
		// Filter out ImageContent from all messages, replacing with text placeholder
		return converted.map((msg) => {
			if (msg.role === "user" || msg.role === "toolResult") {
				const content = msg.content;
				if (Array.isArray(content)) {
					const hasImages = content.some((c) => c.type === "image");
					if (hasImages) {
						const filteredContent = content
							.map((c) =>
								c.type === "image" ? { type: "text" as const, text: "Image reading is disabled." } : c,
							)
							.filter(
								(c, i, arr) =>
									// Dedupe consecutive "Image reading is disabled." texts
									!(
										c.type === "text" &&
										c.text === "Image reading is disabled." &&
										i > 0 &&
										arr[i - 1].type === "text" &&
										(arr[i - 1] as { type: "text"; text: string }).text === "Image reading is disabled."
									),
							);
						return { ...msg, content: filteredContent };
					}
				}
			}
			return msg;
		});
	};

	const extensionRunnerRef: { current?: ExtensionRunner } = {};
	const providerNetworkBeforeRequest = options.providerNetworkPolicy
		? createBeforeProviderNetworkRequest(options.providerNetworkPolicy, options.onProviderNetworkAudit)
		: undefined;

	agent = new Agent({
		initialState: {
			systemPrompt: "",
			model,
			thinkingLevel,
			tools: [],
		},
		convertToLlm: convertToLlmWithBlockImages,
		streamFn: createAgentStreamFunction({
			modelRegistry,
			settingsManager,
			providerNetworkBeforeRequest,
		}),
		onPayload: async (payload, _model) => {
			const runner = extensionRunnerRef.current;
			if (!runner?.hasHandlers("before_provider_request")) {
				return payload;
			}
			return runner.emitBeforeProviderRequest(payload);
		},
		onResponse: async (response, _model) => {
			const runner = extensionRunnerRef.current;
			if (!runner?.hasHandlers("after_provider_response")) {
				return;
			}
			await runner.emit({
				type: "after_provider_response",
				status: response.status,
				headers: response.headers,
			});
		},
		sessionId: sessionManager.getSessionId(),
		transformContext: async (messages) => {
			const runner = extensionRunnerRef.current;
			if (!runner) return messages;
			return runner.emitContext(messages);
		},
		steeringMode: settingsManager.getSteeringMode(),
		followUpMode: settingsManager.getFollowUpMode(),
		transport: settingsManager.getTransport(),
		thinkingBudgets: settingsManager.getThinkingBudgets(),
		maxRetryDelayMs: settingsManager.getProviderRetrySettings().maxRetryDelayMs,
	});

	// Restore messages if session has existing data
	if (hasExistingSession) {
		agent.state.messages = existingSession.messages;
		if (!hasThinkingEntry) {
			sessionManager.appendThinkingLevelChange(thinkingLevel);
		}
	} else {
		// Save initial model and thinking level for new sessions so they can be restored on resume
		if (model) {
			sessionManager.appendModelChange(model.provider, model.id);
		}
		sessionManager.appendThinkingLevelChange(thinkingLevel);
	}

	const session = new AgentSession({
		agent,
		sessionManager,
		settingsManager,
		cwd,
		scopedModels: options.scopedModels,
		resourceLoader,
		customTools: options.customTools,
		modelRegistry,
		initialActiveToolNames,
		allowedToolNames,
		excludedToolNames,
		extensionRunnerRef,
		loadoutAccessPolicy: options.loadoutAccessPolicy,
		bashSandboxPreflight: options.bashSandboxPreflight,
		sessionStartEvent: options.sessionStartEvent,
	});
	const extensionsResult = resourceLoader.getExtensions();

	return {
		session,
		extensionsResult,
		modelFallbackMessage,
	};
}
