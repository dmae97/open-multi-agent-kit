/**
 * Venice login flow.
 *
 * Venice provides OpenAI-compatible models via https://api.venice.ai/api/v1.
 *
 * This is not OAuth - it's a simple API key flow:
 * 1. Open browser to Venice API key settings
 * 2. User copies their API key
 * 3. User pastes the API key into the CLI
 */

import { validateOpenAICompatibleApiKey } from "./api-key-validation";
import type { OAuthController } from "./types";

const AUTH_URL = "https://venice.ai/settings/api";
const API_BASE_URL = "https://api.venice.ai/api/v1";
const VALIDATION_MODEL = "qwen3-4b";

/**
 * Login to Venice.
 *
 * Opens browser to API keys page, prompts user to paste their API key.
 * Returns the API key directly (not OAuthCredentials - this isn't OAuth).
 */
export async function loginVenice(options: OAuthController): Promise<string> {
	if (!options.onPrompt) {
		throw new Error("Venice login requires onPrompt callback");
	}

	options.onAuth?.({
		url: AUTH_URL,
		instructions: "Copy your API key from the Venice dashboard",
	});

	const apiKey = await options.onPrompt({
		message: "Paste your Venice API key",
		placeholder: "vapi_...",
	});

	if (options.signal?.aborted) {
		throw new Error("Login cancelled");
	}

	const trimmed = apiKey.trim();
	if (!trimmed) {
		throw new Error("API key is required");
	}

	options.onProgress?.("Validating API key...");
	await validateOpenAICompatibleApiKey({
		provider: "Venice",
		apiKey: trimmed,
		baseUrl: API_BASE_URL,
		model: VALIDATION_MODEL,
		signal: options.signal,
	});

	return trimmed;
}
