/**
 * Moonshot login flow.
 *
 * Moonshot provides OpenAI-compatible models through https://api.moonshot.ai/v1.
 *
 * This is not OAuth - it's a simple API key flow:
 * 1. Open browser to Moonshot API key settings
 * 2. User copies their API key
 * 3. User pastes the API key into the CLI
 */

import { validateOpenAICompatibleApiKey } from "./api-key-validation";
import type { OAuthController } from "./types";

const AUTH_URL = "https://platform.moonshot.ai/console/api-keys";
const API_BASE_URL = "https://api.moonshot.ai/v1";
const VALIDATION_MODEL = "kimi-k2.5";

/**
 * Login to Moonshot.
 *
 * Opens browser to API keys page, prompts user to paste their API key.
 * Returns the API key directly (not OAuthCredentials - this isn't OAuth).
 */
export async function loginMoonshot(options: OAuthController): Promise<string> {
	if (!options.onPrompt) {
		throw new Error("Moonshot login requires onPrompt callback");
	}

	options.onAuth?.({
		url: AUTH_URL,
		instructions: "Copy your API key from the Moonshot dashboard",
	});

	const apiKey = await options.onPrompt({
		message: "Paste your Moonshot API key",
		placeholder: "sk-...",
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
		provider: "moonshot",
		apiKey: trimmed,
		baseUrl: API_BASE_URL,
		model: VALIDATION_MODEL,
		signal: options.signal,
	});

	return trimmed;
}
