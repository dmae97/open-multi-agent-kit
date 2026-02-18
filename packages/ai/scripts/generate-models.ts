#!/usr/bin/env bun

import * as path from "node:path";
import { $env } from "@oh-my-pi/pi-utils";
import { createModelManager } from "../src/model-manager";
import {
	GENERATE_MODELS_PROVIDER_DESCRIPTORS,
	type GenerateModelsProviderDescriptor,
} from "../src/provider-models/openai-compat";
import { JWT_CLAIM_PATH } from "../src/providers/openai-codex/constants";
import { CliAuthStorage } from "../src/storage";
import type { Api, Model } from "../src/types";
import { fetchAntigravityDiscoveryModels } from "../src/utils/discovery/antigravity";
import { fetchCodexModels } from "../src/utils/discovery/codex";
import { fetchCursorUsableModels } from "../src/utils/discovery/cursor";
import { getOAuthApiKey } from "../src/utils/oauth";
import type { OAuthProvider } from "../src/utils/oauth/types";
import prevModelsJson from "../src/models.json" with { type: "json" };

const packageRoot = path.join(import.meta.dir, "..");

interface ModelsDevModel {
	id: string;
	name: string;
	tool_call?: boolean;
	reasoning?: boolean;
	limit?: {
		context?: number;
		output?: number;
	};
	cost?: {
		input?: number;
		output?: number;
		cache_read?: number;
		cache_write?: number;
	};
	modalities?: {
		input?: string[];
	};
	provider?: {
		npm?: string;
	};
}

const COPILOT_STATIC_HEADERS = {
	"User-Agent": "GitHubCopilotChat/0.35.0",
	"Editor-Version": "vscode/1.107.0",
	"Editor-Plugin-Version": "copilot-chat/0.35.0",
	"Copilot-Integration-Id": "vscode-chat",
} as const;

const CLOUDFLARE_AI_GATEWAY_BASE_URL = "https://gateway.ai.cloudflare.com/v1/<account>/<gateway>/anthropic";
const TOGETHER_BASE_URL = "https://api.together.xyz/v1";
const NVIDIA_BASE_URL = "https://integrate.api.nvidia.com/v1";
const XIAOMI_BASE_URL = "https://api.xiaomimimo.com/anthropic";
const QWEN_PORTAL_BASE_URL = "https://portal.qwen.ai/v1";

interface ProviderApiKeyOptions {
	provider: string;
	envVars: string[];
	oauthProvider?: OAuthProvider;
}

async function resolveProviderApiKey({ provider, envVars, oauthProvider }: ProviderApiKeyOptions): Promise<string | undefined> {
	for (const envVar of envVars) {
		const value = $env[envVar as keyof typeof $env];
		if (typeof value === "string" && value.length > 0) {
			return value;
		}
	}

	try {
		const storage = await CliAuthStorage.create();
		try {
			const storedApiKey = storage.getApiKey(provider);
			if (storedApiKey) {
				return storedApiKey;
			}
			if (oauthProvider) {
				const storedOAuth = storage.getOAuth(oauthProvider);
				if (storedOAuth) {
					const result = await getOAuthApiKey(oauthProvider, { [oauthProvider]: storedOAuth });
					if (result) {
						storage.saveOAuth(oauthProvider, result.newCredentials);
						return result.apiKey;
					}
				}
			}
		} finally {
			storage.close();
		}
	} catch {
		// Ignore missing/unreadable auth storage.
	}

	return undefined;
}

async function fetchProviderModelsFromCatalog(descriptor: GenerateModelsProviderDescriptor): Promise<Model[]> {
	const apiKey = await resolveProviderApiKey({
		provider: descriptor.providerId,
		envVars: descriptor.envVars,
		oauthProvider: descriptor.oauthProvider,
	});

	if (!apiKey && !descriptor.allowUnauthenticated) {
		console.log(`No ${descriptor.label} credentials found (env or agent.db), using fallback models`);
		return [];
	}

	try {
		console.log(`Fetching models from ${descriptor.label} model manager...`);
		const manager = createModelManager(descriptor.createModelManagerOptions({ apiKey }));
		const result = await manager.refresh("online");
		const models = result.models.filter(model => model.provider === descriptor.providerId);
		if (models.length === 0) {
			console.warn(`${descriptor.label} discovery returned no models, using fallback models`);
			return [];
		}
		console.log(`Fetched ${models.length} models from ${descriptor.label} model manager`);
		return models;
	} catch (error) {
		console.error(`Failed to fetch ${descriptor.label} models:`, error);
		return [];
	}
}

async function loadModelsDevData(): Promise<Model[]> {
	try {
		console.log("Fetching models from models.dev API...");
		const response = await fetch("https://models.dev/api.json");
		const data = await response.json();

		const models: Model[] = [];

		// Process Amazon Bedrock models
		if (data["amazon-bedrock"]?.models) {
			for (const [modelId, model] of Object.entries(data["amazon-bedrock"].models)) {
				const m = model as ModelsDevModel;
				if (m.tool_call !== true) continue;

				let id = modelId;

				if (id.startsWith("ai21.jamba")) {
					// These models doesn't support tool use in streaming mode
					continue;
				}

				if (id.startsWith("amazon.titan-text-express") || id.startsWith("mistral.mistral-7b-instruct-v0")) {
					// These models doesn't support system messages
					continue;
				}

				// Some Amazon Bedrock models require cross-region inference profiles to work.
				// To use cross-region inference, we need to add a region prefix to the models.
				// See https://docs.aws.amazon.com/bedrock/latest/userguide/inference-profiles-support.html#inference-profiles-support-system
				// TODO: Remove Claude models once https://github.com/anomalyco/models.dev/pull/607 is merged, and follow-up with other models.

				// Models with global cross-region inference profiles
				if (
					id.startsWith("anthropic.claude-haiku-4-5") ||
					id.startsWith("anthropic.claude-sonnet-4") ||
					id.startsWith("anthropic.claude-opus-4-5") ||
					id.startsWith("amazon.nova-2-lite") ||
					id.startsWith("cohere.embed-v4") ||
					id.startsWith("twelvelabs.pegasus-1-2")
				) {
					id = "global." + id;
				}

				// Models with US cross-region inference profiles
				if (
					id.startsWith("amazon.nova-lite") ||
					id.startsWith("amazon.nova-micro") ||
					id.startsWith("amazon.nova-premier") ||
					id.startsWith("amazon.nova-pro") ||
					id.startsWith("anthropic.claude-3-7-sonnet") ||
					id.startsWith("anthropic.claude-opus-4-1") ||
					id.startsWith("anthropic.claude-opus-4-20250514") ||
					id.startsWith("deepseek.r1") ||
					id.startsWith("meta.llama3-2") ||
					id.startsWith("meta.llama3-3") ||
					id.startsWith("meta.llama4")
				) {
					id = "us." + id;
				}

				const bedrockModel = {
					id,
					name: m.name || id,
					api: "bedrock-converse-stream" as const,
					provider: "amazon-bedrock" as const,
					baseUrl: "https://bedrock-runtime.us-east-1.amazonaws.com",
					reasoning: m.reasoning === true,
					input: (m.modalities?.input?.includes("image") ? ["text", "image"] : ["text"]) as ("text" | "image")[],
					cost: {
						input: m.cost?.input || 0,
						output: m.cost?.output || 0,
						cacheRead: m.cost?.cache_read || 0,
						cacheWrite: m.cost?.cache_write || 0,
					},
					contextWindow: m.limit?.context || 4096,
					maxTokens: m.limit?.output || 4096,
				};
				models.push(bedrockModel);

				// Add EU cross-region inference variants for Claude models
				if (modelId.startsWith("anthropic.claude-")) {
					models.push({
						...bedrockModel,
						id: "eu." + modelId,
						name: (m.name || modelId) + " (EU)",
					});
				}
			}
		}

		// Process Anthropic models
		if (data.anthropic?.models) {
			for (const [modelId, model] of Object.entries(data.anthropic.models)) {
				const m = model as ModelsDevModel;
				if (m.tool_call !== true) continue;

				// Skip deprecated Anthropic models (old naming convention)
				if (
					modelId.startsWith("claude-3-5-haiku") ||
					modelId.startsWith("claude-3-7-sonnet") ||
					modelId === "claude-3-opus-20240229" ||
					modelId === "claude-3-sonnet-20240229"
				) {
					continue;
				}

				models.push({
					id: modelId,
					name: m.name || modelId,
					api: "anthropic-messages",
					provider: "anthropic",
					baseUrl: "https://api.anthropic.com",
					reasoning: m.reasoning === true,
					input: m.modalities?.input?.includes("image") ? ["text", "image"] : ["text"],
					cost: {
						input: m.cost?.input || 0,
						output: m.cost?.output || 0,
						cacheRead: m.cost?.cache_read || 0,
						cacheWrite: m.cost?.cache_write || 0,
					},
					contextWindow: m.limit?.context || 4096,
					maxTokens: m.limit?.output || 4096,
				});
			}
		}

		// Process Google models
		if (data.google?.models) {
			for (const [modelId, model] of Object.entries(data.google.models)) {
				const m = model as ModelsDevModel;
				if (m.tool_call !== true) continue;

				models.push({
					id: modelId,
					name: m.name || modelId,
					api: "google-generative-ai",
					provider: "google",
					baseUrl: "https://generativelanguage.googleapis.com/v1beta",
					reasoning: m.reasoning === true,
					input: m.modalities?.input?.includes("image") ? ["text", "image"] : ["text"],
					cost: {
						input: m.cost?.input || 0,
						output: m.cost?.output || 0,
						cacheRead: m.cost?.cache_read || 0,
						cacheWrite: m.cost?.cache_write || 0,
					},
					contextWindow: m.limit?.context || 4096,
					maxTokens: m.limit?.output || 4096,
				});
			}
		}

		// Process OpenAI models
		if (data.openai?.models) {
			for (const [modelId, model] of Object.entries(data.openai.models)) {
				const m = model as ModelsDevModel;
				if (m.tool_call !== true) continue;

				models.push({
					id: modelId,
					name: m.name || modelId,
					api: "openai-responses",
					provider: "openai",
					baseUrl: "https://api.openai.com/v1",
					reasoning: m.reasoning === true,
					input: m.modalities?.input?.includes("image") ? ["text", "image"] : ["text"],
					cost: {
						input: m.cost?.input || 0,
						output: m.cost?.output || 0,
						cacheRead: m.cost?.cache_read || 0,
						cacheWrite: m.cost?.cache_write || 0,
					},
					contextWindow: m.limit?.context || 4096,
					maxTokens: m.limit?.output || 4096,
				});
			}
		}

		// Process Groq models
		if (data.groq?.models) {
			for (const [modelId, model] of Object.entries(data.groq.models)) {
				const m = model as ModelsDevModel;
				if (m.tool_call !== true) continue;

				models.push({
					id: modelId,
					name: m.name || modelId,
					api: "openai-completions",
					provider: "groq",
					baseUrl: "https://api.groq.com/openai/v1",
					reasoning: m.reasoning === true,
					input: m.modalities?.input?.includes("image") ? ["text", "image"] : ["text"],
					cost: {
						input: m.cost?.input || 0,
						output: m.cost?.output || 0,
						cacheRead: m.cost?.cache_read || 0,
						cacheWrite: m.cost?.cache_write || 0,
					},
					contextWindow: m.limit?.context || 4096,
					maxTokens: m.limit?.output || 4096,
				});
			}
		}

		// Process Cerebras models
		if (data.cerebras?.models) {
			for (const [modelId, model] of Object.entries(data.cerebras.models)) {
				const m = model as ModelsDevModel;
				if (m.tool_call !== true) continue;

				models.push({
					id: modelId,
					name: m.name || modelId,
					api: "openai-completions",
					provider: "cerebras",
					baseUrl: "https://api.cerebras.ai/v1",
					reasoning: m.reasoning === true,
					input: m.modalities?.input?.includes("image") ? ["text", "image"] : ["text"],
					cost: {
						input: m.cost?.input || 0,
						output: m.cost?.output || 0,
						cacheRead: m.cost?.cache_read || 0,
						cacheWrite: m.cost?.cache_write || 0,
					},
					contextWindow: m.limit?.context || 4096,
					maxTokens: m.limit?.output || 4096,
				});
			}
		}

		// Process Together models
		if (data.together?.models) {
			for (const [modelId, model] of Object.entries(data.together.models)) {
				const m = model as ModelsDevModel;
				if (m.tool_call !== true) continue;

				models.push({
					id: modelId,
					name: m.name || modelId,
					api: "openai-completions",
					provider: "together",
					baseUrl: TOGETHER_BASE_URL,
					reasoning: m.reasoning === true,
					input: m.modalities?.input?.includes("image") ? ["text", "image"] : ["text"],
					cost: {
						input: m.cost?.input || 0,
						output: m.cost?.output || 0,
						cacheRead: m.cost?.cache_read || 0,
						cacheWrite: m.cost?.cache_write || 0,
					},
					contextWindow: m.limit?.context || 4096,
					maxTokens: m.limit?.output || 4096,
				});
			}
		}

		// Process NVIDIA models
		if (data.nvidia?.models) {
			for (const [modelId, model] of Object.entries(data.nvidia.models)) {
				const m = model as ModelsDevModel;
				if (m.tool_call !== true) continue;

				models.push({
					id: modelId,
					name: m.name || modelId,
					api: "openai-completions",
					provider: "nvidia",
					baseUrl: NVIDIA_BASE_URL,
					reasoning: m.reasoning === true,
					input: m.modalities?.input?.includes("image") ? ["text", "image"] : ["text"],
					cost: {
						input: m.cost?.input || 0,
						output: m.cost?.output || 0,
						cacheRead: m.cost?.cache_read || 0,
						cacheWrite: m.cost?.cache_write || 0,
					},
					contextWindow: m.limit?.context || 131072,
					maxTokens: m.limit?.output || 4096,
				});
			}
		}

		// Process xAi models
		if (data.xai?.models) {
			for (const [modelId, model] of Object.entries(data.xai.models)) {
				const m = model as ModelsDevModel;
				if (m.tool_call !== true) continue;

				models.push({
					id: modelId,
					name: m.name || modelId,
					api: "openai-completions",
					provider: "xai",
					baseUrl: "https://api.x.ai/v1",
					reasoning: m.reasoning === true,
					input: m.modalities?.input?.includes("image") ? ["text", "image"] : ["text"],
					cost: {
						input: m.cost?.input || 0,
						output: m.cost?.output || 0,
						cacheRead: m.cost?.cache_read || 0,
						cacheWrite: m.cost?.cache_write || 0,
					},
					contextWindow: m.limit?.context || 4096,
					maxTokens: m.limit?.output || 4096,
				});
			}
		}

		// Process zAi models
		if (data["zai-coding-plan"]?.models) {
			for (const [modelId, model] of Object.entries(data["zai-coding-plan"].models)) {
				const m = model as ModelsDevModel;
				if (m.tool_call !== true) continue;
				const supportsImage = m.modalities?.input?.includes("image");

				models.push({
					id: modelId,
					name: m.name || modelId,
					api: "anthropic-messages",
					provider: "zai",
					baseUrl: "https://api.z.ai/api/anthropic",
					reasoning: m.reasoning === true,
					input: supportsImage ? ["text", "image"] : ["text"],
					cost: {
						input: m.cost?.input || 0,
						output: m.cost?.output || 0,
						cacheRead: m.cost?.cache_read || 0,
						cacheWrite: m.cost?.cache_write || 0,
					},
					contextWindow: m.limit?.context || 4096,
					maxTokens: m.limit?.output || 4096,
				});
			}
		}

		// Process Xiaomi MiMo models
		if (data.xiaomi?.models) {
			for (const [modelId, model] of Object.entries(data.xiaomi.models)) {
				const m = model as ModelsDevModel;
				if (m.tool_call !== true) continue;
				const supportsImage = m.modalities?.input?.includes("image");

				models.push({
					id: modelId,
					name: m.name || modelId,
					api: "anthropic-messages",
					provider: "xiaomi",
					baseUrl: XIAOMI_BASE_URL,
					reasoning: m.reasoning === true,
					input: supportsImage ? ["text", "image"] : ["text"],
					cost: {
						input: m.cost?.input || 0,
						output: m.cost?.output || 0,
						cacheRead: m.cost?.cache_read || 0,
						cacheWrite: m.cost?.cache_write || 0,
					},
					contextWindow: m.limit?.context || 262144,
					maxTokens: m.limit?.output || 8192,
				});
			}
		}


		// Process MiniMax Coding Plan models

		// Process MiniMax Coding Plan models
		// MiniMax Coding Plan uses OpenAI-compatible API with separate API key
		const minimaxCodeVariants = [
			{ key: "minimax-coding-plan", provider: "minimax-code", baseUrl: "https://api.minimax.io/v1" },
			{ key: "minimax-cn-coding-plan", provider: "minimax-code-cn", baseUrl: "https://api.minimaxi.com/v1" },
		] as const;

		for (const { key, provider, baseUrl } of minimaxCodeVariants) {
			if (data[key]?.models) {
				for (const [modelId, model] of Object.entries(data[key].models)) {
					const m = model as ModelsDevModel;
					if (m.tool_call !== true) continue;
					const supportsImage = m.modalities?.input?.includes("image");

					models.push({
						id: modelId,
						name: m.name || modelId,
						api: "openai-completions",
						provider,
						baseUrl,
						reasoning: m.reasoning === true,
						input: supportsImage ? ["text", "image"] : ["text"],
						cost: {
							input: m.cost?.input || 0,
							output: m.cost?.output || 0,
							cacheRead: m.cost?.cache_read || 0,
							cacheWrite: m.cost?.cache_write || 0,
						},
						compat: {
							supportsDeveloperRole: false,
							thinkingFormat: "zai",
							reasoningContentField: "reasoning_content",
						},
						contextWindow: m.limit?.context || 4096,
						maxTokens: m.limit?.output || 4096,
					});
				}
			}
		}

		// Process Cloudflare AI Gateway models
		if (data["cloudflare-ai-gateway"]?.models) {
			for (const [modelId, model] of Object.entries(data["cloudflare-ai-gateway"].models)) {
				const m = model as ModelsDevModel;
				if (m.tool_call !== true) continue;

				models.push({
					id: modelId,
					name: m.name || modelId,
					api: "anthropic-messages",
					provider: "cloudflare-ai-gateway",
					baseUrl: CLOUDFLARE_AI_GATEWAY_BASE_URL,
					reasoning: m.reasoning === true,
					input: m.modalities?.input?.includes("image") ? ["text", "image"] : ["text"],
					cost: {
						input: m.cost?.input || 0,
						output: m.cost?.output || 0,
						cacheRead: m.cost?.cache_read || 0,
						cacheWrite: m.cost?.cache_write || 0,
					},
					contextWindow: m.limit?.context || 4096,
					maxTokens: m.limit?.output || 4096,
				});
			}
		}
		// Process Mistral models
		if (data.mistral?.models) {
			for (const [modelId, model] of Object.entries(data.mistral.models)) {
				const m = model as ModelsDevModel;
				if (m.tool_call !== true) continue;

				models.push({
					id: modelId,
					name: m.name || modelId,
					api: "openai-completions",
					provider: "mistral",
					baseUrl: "https://api.mistral.ai/v1",
					reasoning: m.reasoning === true,
					input: m.modalities?.input?.includes("image") ? ["text", "image"] : ["text"],
					cost: {
						input: m.cost?.input || 0,
						output: m.cost?.output || 0,
						cacheRead: m.cost?.cache_read || 0,
						cacheWrite: m.cost?.cache_write || 0,
					},
					contextWindow: m.limit?.context || 4096,
					maxTokens: m.limit?.output || 4096,
				});
			}
		}

		// Process OpenCode Zen models
		// API mapping based on provider.npm field:
		// - @ai-sdk/openai → openai-responses
		// - @ai-sdk/anthropic → anthropic-messages
		// - @ai-sdk/google → google-generative-ai
		// - null/undefined/@ai-sdk/openai-compatible → openai-completions
		if (data.opencode?.models) {
			for (const [modelId, model] of Object.entries(data.opencode.models)) {
				const m = model as ModelsDevModel & { status?: string };
				if (m.tool_call !== true) continue;
				if (m.status === "deprecated") continue;

				const npm = m.provider?.npm;
				let api: Api;
				let baseUrl: string;

				if (npm === "@ai-sdk/openai") {
					api = "openai-responses";
					baseUrl = "https://opencode.ai/zen/v1";
				} else if (npm === "@ai-sdk/anthropic") {
					api = "anthropic-messages";
					// Anthropic SDK appends /v1/messages to baseURL
					baseUrl = "https://opencode.ai/zen";
				} else if (npm === "@ai-sdk/google") {
					api = "google-generative-ai";
					baseUrl = "https://opencode.ai/zen/v1";
				} else {
					// null, undefined, or @ai-sdk/openai-compatible
					api = "openai-completions";
					baseUrl = "https://opencode.ai/zen/v1";
				}

				models.push({
					id: modelId,
					name: m.name || modelId,
					api,
					provider: "opencode",
					baseUrl,
					reasoning: m.reasoning === true,
					input: m.modalities?.input?.includes("image") ? ["text", "image"] : ["text"],
					cost: {
						input: m.cost?.input || 0,
						output: m.cost?.output || 0,
						cacheRead: m.cost?.cache_read || 0,
						cacheWrite: m.cost?.cache_write || 0,
					},
					contextWindow: m.limit?.context || 4096,
					maxTokens: m.limit?.output || 4096,
				});
			}
		}

		// Process GitHub Copilot models
		if (data["github-copilot"]?.models) {
			for (const [modelId, model] of Object.entries(data["github-copilot"].models)) {
				const m = model as ModelsDevModel & { status?: string };
				if (m.tool_call !== true) continue;
				if (m.status === "deprecated") continue;

				// Claude 4.x models route to Anthropic Messages API
				const isCopilotClaude4 = /^claude-(haiku|sonnet|opus)-4([.\-]|$)/.test(modelId);
				// gpt-5 models require responses API, others use completions
				const needsResponsesApi = modelId.startsWith("gpt-5") || modelId.startsWith("oswe");
				const api: Api = isCopilotClaude4
					? "anthropic-messages"
					: needsResponsesApi
						? "openai-responses"
						: "openai-completions";

				const copilotModel: Model = {
					id: modelId,
					name: m.name || modelId,
					api,
					provider: "github-copilot",
					baseUrl: "https://api.individual.githubcopilot.com",
					reasoning: m.reasoning === true,
					input: m.modalities?.input?.includes("image") ? ["text", "image"] : ["text"],
					cost: {
						input: m.cost?.input || 0,
						output: m.cost?.output || 0,
						cacheRead: m.cost?.cache_read || 0,
						cacheWrite: m.cost?.cache_write || 0,
					},
					contextWindow: m.limit?.context || 128000,
					maxTokens: m.limit?.output || 8192,
					headers: { ...COPILOT_STATIC_HEADERS },
					// compat only applies to openai-completions
					...(api === "openai-completions"
						? {
								compat: {
									supportsStore: false,
									supportsDeveloperRole: false,
									supportsReasoningEffort: false,
								},
							}
						: {}),
				};

				models.push(copilotModel);
			}
		}

		// Process MiniMax models
		const minimaxVariants = [
			{ key: "minimax", provider: "minimax", baseUrl: "https://api.minimax.io/anthropic" },
			{ key: "minimax-cn", provider: "minimax-cn", baseUrl: "https://api.minimaxi.com/anthropic" },
		] as const;

		for (const { key, provider, baseUrl } of minimaxVariants) {
			if (data[key]?.models) {
				for (const [modelId, model] of Object.entries(data[key].models)) {
					const m = model as ModelsDevModel;
					if (m.tool_call !== true) continue;

					models.push({
						id: modelId,
						name: m.name || modelId,
						api: "anthropic-messages",
						provider,
						// MiniMax's Anthropic-compatible API - SDK appends /v1/messages
						baseUrl,
						reasoning: m.reasoning === true,
						input: m.modalities?.input?.includes("image") ? ["text", "image"] : ["text"],
						cost: {
							input: m.cost?.input || 0,
							output: m.cost?.output || 0,
							cacheRead: m.cost?.cache_read || 0,
							cacheWrite: m.cost?.cache_write || 0,
						},
						contextWindow: m.limit?.context || 4096,
						maxTokens: m.limit?.output || 4096,
					});
				}
			}
		}



		// Process Qwen Portal models
		if (data["qwen-portal"]?.models) {
			for (const [modelId, model] of Object.entries(data["qwen-portal"].models)) {
				const m = model as ModelsDevModel;
				if (m.tool_call !== true) continue;

				models.push({
					id: modelId,
					name: m.name || modelId,
					api: "openai-completions",
					provider: "qwen-portal",
					baseUrl: QWEN_PORTAL_BASE_URL,
					reasoning: m.reasoning === true,
					input: m.modalities?.input?.includes("image") ? ["text", "image"] : ["text"],
					cost: {
						input: m.cost?.input || 0,
						output: m.cost?.output || 0,
						cacheRead: m.cost?.cache_read || 0,
						cacheWrite: m.cost?.cache_write || 0,
					},
					contextWindow: m.limit?.context || 128000,
					maxTokens: m.limit?.output || 8192,
				});
			}
		}
		models.sort((a, b) => a.id.localeCompare(b.id));
		console.log(`Loaded ${models.length} tool-capable models from models.dev`);
		return models;
	} catch (error) {
		console.error("Failed to load models.dev data:", error);
		return [];
	}
}

const ANTIGRAVITY_ENDPOINT = "https://daily-cloudcode-pa.sandbox.googleapis.com";
/**
 * Try to get a fresh Antigravity access token from agent.db credentials.
 */
async function getAntigravityToken(): Promise<{ token: string; storage: CliAuthStorage } | null> {
	try {
		const storage = await CliAuthStorage.create();
		const creds = storage.getOAuth("google-antigravity");
		if (!creds) {
			storage.close();
			return null;
		}
		const result = await getOAuthApiKey("google-antigravity", { "google-antigravity": creds });
		if (!result) {
			storage.close();
			return null;
		}
		// Save refreshed credentials back
		storage.saveOAuth("google-antigravity", result.newCredentials);
		return { token: result.newCredentials.access, storage };
	} catch {
		return null;
	}
}

/**
 * Fetch available Antigravity models from the API using the discovery module.
 * Returns empty array if no auth is available (previous models used as fallback).
 */
async function fetchAntigravityModels(): Promise<Model<"google-gemini-cli">[]> {
	const auth = await getAntigravityToken();
	if (!auth) {
		console.log("No Antigravity credentials found, will use previous models");
		return [];
	}
	try {
		console.log("Fetching models from Antigravity API...");
		const discovered = await fetchAntigravityDiscoveryModels({
			token: auth.token,
			endpoint: ANTIGRAVITY_ENDPOINT,
		});
		if (discovered === null) {
			console.warn("Antigravity API fetch failed, will use previous models");
			return [];
		}
		if (discovered.length > 0) {
			console.log(`Fetched ${discovered.length} models from Antigravity API`);
			return discovered;
		}
		console.warn("Antigravity API returned no models, will use previous models");
		return [];
	} catch (error) {
		console.error("Failed to fetch Antigravity models:", error);
		return [];
	} finally {
		auth.storage.close();
	}
}

/**
 * Extract accountId from a Codex JWT access token.
 */
function extractCodexAccountId(accessToken: string): string | null {
	try {
		const parts = accessToken.split(".");
		if (parts.length !== 3) return null;
		const payload = parts[1] ?? "";
		const decoded = JSON.parse(Buffer.from(payload, "base64").toString("utf-8"));
		const accountId = decoded?.[JWT_CLAIM_PATH]?.chatgpt_account_id;
		return typeof accountId === "string" && accountId.length > 0 ? accountId : null;
	} catch {
		return null;
	}
}

/**
 * Try to get Codex (ChatGPT) OAuth credentials from agent.db.
 */
async function getCodexCredentials(): Promise<{ accessToken: string; accountId?: string; storage: CliAuthStorage } | null> {
	try {
		const storage = await CliAuthStorage.create();
		const creds = storage.getOAuth("openai-codex");
		if (!creds) {
			storage.close();
			return null;
		}

		const result = await getOAuthApiKey("openai-codex", { "openai-codex": creds });
		if (!result) {
			storage.close();
			return null;
		}

		storage.saveOAuth("openai-codex", result.newCredentials);
		const accessToken = result.newCredentials.access;
		const accountId = result.newCredentials.accountId ?? extractCodexAccountId(accessToken);
		return {
			accessToken,
			accountId: accountId ?? undefined,
			storage,
		};
	} catch {
		return null;
	}
}

/**
 * Try to get Cursor API key from agent.db.
 */
async function getCursorApiKey(): Promise<{ apiKey: string; storage: CliAuthStorage } | null> {
	try {
		const storage = await CliAuthStorage.create();
		const creds = storage.getOAuth("cursor");
		if (!creds) {
			storage.close();
			return null;
		}

		const result = await getOAuthApiKey("cursor", { cursor: creds });
		if (!result) {
			storage.close();
			return null;
		}

		storage.saveOAuth("cursor", result.newCredentials);
		return { apiKey: result.newCredentials.access, storage };
	} catch {
		return null;
	}
}

async function generateModels() {
	// Fetch models from dynamic sources
	const modelsDevModels = await loadModelsDevData();
	const catalogProviderModels = (
		await Promise.all(GENERATE_MODELS_PROVIDER_DESCRIPTORS.map(descriptor => fetchProviderModelsFromCatalog(descriptor)))
	).flat();

	// Combine models (models.dev has priority)
	const allModels = [...modelsDevModels, ...catalogProviderModels];

	if (!allModels.some((model) => model.provider === "cloudflare-ai-gateway")) {
		allModels.push({
			id: "claude-sonnet-4-5",
			name: "Claude Sonnet 4.5",
			api: "anthropic-messages",
			provider: "cloudflare-ai-gateway",
			baseUrl: CLOUDFLARE_AI_GATEWAY_BASE_URL,
			reasoning: true,
			input: ["text", "image"],
			cost: {
				input: 3,
				output: 15,
				cacheRead: 0.3,
				cacheWrite: 3.75,
			},
			contextWindow: 200000,
			maxTokens: 64000,
		});
	}

	// Fix incorrect cache pricing for Claude Opus 4.5 from models.dev
	// models.dev has 3x the correct pricing (1.5/18.75 instead of 0.5/6.25)
	const opus45 = allModels.find((m) => m.provider === "anthropic" && m.id === "claude-opus-4-5");
	if (opus45) {
		opus45.cost.cacheRead = 0.5;
		opus45.cost.cacheWrite = 6.25;
	}

	// Temporary overrides until upstream model metadata is corrected.
	for (const candidate of allModels) {
		if (candidate.provider === "amazon-bedrock" && candidate.id.includes("anthropic.claude-opus-4-6-v1")) {
			candidate.cost.cacheRead = 0.5;
			candidate.cost.cacheWrite = 6.25;
		}
		// Opus 4.6 / Sonnet 4.6 1M context is beta; all providers should use 200K
		if (candidate.id.includes("opus-4-6") || candidate.id.includes("opus-4.6") || candidate.id.includes("sonnet-4-6") || candidate.id.includes("sonnet-4.6")) {
			candidate.contextWindow = 200000;
		}
		// opencode lists Claude Sonnet 4/4.5 with 1M context, actual limit is 200K
		if (candidate.provider === "opencode" && (candidate.id === "claude-sonnet-4-5" || candidate.id === "claude-sonnet-4")) {
			candidate.contextWindow = 200000;
		}
	}

	// Antigravity models (Gemini 3, Claude, GPT-OSS via Google Cloud)
	const antigravityModels = await fetchAntigravityModels();
	allModels.push(...antigravityModels);

	// OpenAI Codex (ChatGPT OAuth) models
	const codexAuth = await getCodexCredentials();
	if (codexAuth) {
		try {
			console.log("Fetching models from Codex API...");
			const codexDiscovery = await fetchCodexModels({
				accessToken: codexAuth.accessToken,
				accountId: codexAuth.accountId,
			});
			if (codexDiscovery === null) {
				console.warn("Codex API fetch failed");
			} else if (codexDiscovery.models.length > 0) {
				console.log(`Fetched ${codexDiscovery.models.length} models from Codex API`);
				allModels.push(...codexDiscovery.models);
			}
		} catch (error) {
			console.error("Failed to fetch Codex models:", error);
		} finally {
			codexAuth.storage.close();
		}
	}

	// Cursor Agent models
	const cursorAuth = await getCursorApiKey();
	if (cursorAuth) {
		try {
			console.log("Fetching models from Cursor API...");
			const discoveredCursor = await fetchCursorUsableModels({
				apiKey: cursorAuth.apiKey,
			});
			if (discoveredCursor === null) {
				console.warn("Cursor API fetch failed");
			} else if (discoveredCursor.length > 0) {
				console.log(`Fetched ${discoveredCursor.length} models from Cursor API`);
				allModels.push(...discoveredCursor);
			}
		} catch (error) {
			console.error("Failed to fetch Cursor models:", error);
		} finally {
			cursorAuth.storage.close();
		}
	}

	// Normalize Codex models to input-token window (272K). The 400K figure includes output budget.
	for (const candidate of allModels) {
		if (candidate.id.includes("codex") && !candidate.id.includes("codex-spark")) {
			candidate.contextWindow = 272000;
		}
	}

	for (const candidate of allModels) {
		if (!candidate.id.endsWith("-spark")) continue;
		const baseId = candidate.id.slice(0, -"-spark".length);
		const fallback = allModels.find(
			model => model.provider === candidate.provider && model.api === candidate.api && model.id === baseId,
		);
		if (!fallback) continue;
		candidate.contextPromotionTarget = `${fallback.provider}/${fallback.id}`;
	}

	// Merge previous models.json entries as fallback for any provider/model
	// not fetched dynamically. This replaces all hardcoded fallback lists —
	// static-only providers (vertex, gemini-cli), auth-gated providers when
	// credentials are unavailable, and ad-hoc model additions all persist
	// through the existing models.json seed.
	const fetchedKeys = new Set(allModels.map((m) => `${m.provider}/${m.id}`));
	for (const models of Object.values(prevModelsJson as Record<string, Record<string, Model>>)) {
		for (const model of Object.values(models)) {
			if (!fetchedKeys.has(`${model.provider}/${model.id}`)) {
				allModels.push(model);
			}
		}
	}

	// Group by provider and sort each provider's models
	const providers: Record<string, Record<string, Model>> = {};
	for (const model of allModels) {
		if (!providers[model.provider]) {
			providers[model.provider] = {};
		}
		// Use model ID as key to automatically deduplicate
		// Only add if not already present (models.dev takes priority over endpoint discovery)
		if (!providers[model.provider][model.id]) {
			providers[model.provider][model.id] = model;
		}
	}

	// Sort models within each provider by ID
	for (const provider of Object.keys(providers)) {
		const models = Object.values(providers[provider]);

		models.sort((a, b) => a.id.localeCompare(b.id));
		// Rebuild the object with sorted keys
		providers[provider] = {};
		for (const model of models) {
			providers[provider][model.id] = model;
		}
	}

	// Generate JSON file
	const MODELS = providers;
	await Bun.write(path.join(packageRoot, "src/models.json"), JSON.stringify(MODELS, null, "	"));
	console.log("Generated src/models.json");

	// Print statistics
	const totalModels = allModels.length;
	const reasoningModels = allModels.filter((m) => m.reasoning).length;

	console.log(`
Model Statistics:`);
	console.log(`  Total tool-capable models: ${totalModels}`);
	console.log(`  Reasoning-capable models: ${reasoningModels}`);

	for (const [provider, models] of Object.entries(providers)) {
		console.log(`  ${provider}: ${Object.keys(models).length} models`);
	}
}

// Run the generator
generateModels().catch(console.error);
