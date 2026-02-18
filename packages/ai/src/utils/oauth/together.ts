/**
 * Together login flow.
 *
 * Together provides OpenAI-compatible models via https://api.together.xyz/v1.
 *
 * This is not OAuth - it's a simple API key flow:
 * 1. Open browser to Together API keys page
 * 2. User copies their API key
 * 3. User pastes the API key into the CLI
 */

import { validateOpenAICompatibleApiKey } from "./api-key-validation";
import type { OAuthController } from "./types";

const AUTH_URL = "https://api.together.xyz/settings/api-keys";
const API_BASE_URL = "https://api.together.xyz/v1";
const VALIDATION_MODEL = "moonshotai/Kimi-K2.5";

/**
 * Login to Together.
 *
 * Opens browser to API keys page, prompts user to paste their API key.
 * Returns the API key directly (not OAuthCredentials - this isn't OAuth).
 */
export async function loginTogether(options: OAuthController): Promise<string> {
	if (!options.onPrompt) {
		throw new Error("Together login requires onPrompt callback");
	}

	options.onAuth?.({
		url: AUTH_URL,
		instructions: "Copy your API key from the Together dashboard",
	});

	const apiKey = await options.onPrompt({
		message: "Paste your Together API key",
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
		provider: "together",
		apiKey: trimmed,
		baseUrl: API_BASE_URL,
		model: VALIDATION_MODEL,
		signal: options.signal,
	});

	return trimmed;
}
