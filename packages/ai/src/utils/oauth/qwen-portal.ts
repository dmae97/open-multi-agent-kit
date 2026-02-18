/**
 * Qwen Portal login flow.
 *
 * Qwen Portal exposes an OpenAI-compatible endpoint at https://portal.qwen.ai/v1
 * and accepts OAuth bearer tokens or API keys.
 *
 * This is a token/API-key flow:
 * 1. Open Qwen Portal
 * 2. Copy either your OAuth token or API key
 * 3. Paste it into the CLI
 */

import { validateOpenAICompatibleApiKey } from "./api-key-validation";
import type { OAuthController } from "./types";

const AUTH_URL = "https://chat.qwen.ai";
const API_BASE_URL = "https://portal.qwen.ai/v1";
const VALIDATION_MODEL = "coder-model";

/**
 * Login to Qwen Portal.
 *
 * Prompts for either `QWEN_OAUTH_TOKEN` or `QWEN_PORTAL_API_KEY` value.
 * Returns the value directly (stored as api_key credential in auth storage).
 */
export async function loginQwenPortal(options: OAuthController): Promise<string> {
	if (!options.onPrompt) {
		throw new Error("Qwen Portal login requires onPrompt callback");
	}

	options.onAuth?.({
		url: AUTH_URL,
		instructions: "Copy your Qwen OAuth token or API key",
	});

	const token = await options.onPrompt({
		message: "Paste your Qwen OAuth token or API key",
		placeholder: "sk-...",
	});

	if (options.signal?.aborted) {
		throw new Error("Login cancelled");
	}

	const trimmed = token.trim();
	if (!trimmed) {
		throw new Error("Qwen token/API key is required");
	}

	options.onProgress?.("Validating credentials...");
	await validateOpenAICompatibleApiKey({
		provider: "qwen-portal",
		apiKey: trimmed,
		baseUrl: API_BASE_URL,
		model: VALIDATION_MODEL,
		signal: options.signal,
	});

	return trimmed;
}
