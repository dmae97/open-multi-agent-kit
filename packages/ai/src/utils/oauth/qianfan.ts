/**
 * Qianfan login flow.
 *
 * Qianfan provides an OpenAI-compatible API endpoint.
 * Login is API-key based:
 * 1. Open browser to Qianfan API key console
 * 2. User copies API key
 * 3. User pastes key into CLI prompt
 */

import { validateOpenAICompatibleApiKey } from "./api-key-validation";
import type { OAuthController } from "./types";

const AUTH_URL = "https://console.bce.baidu.com/qianfan/ais/console/apiKey";
const API_BASE_URL = "https://qianfan.baidubce.com/v2";
const VALIDATION_MODEL = "deepseek-v3.2";

/**
 * Login to Qianfan.
 *
 * Opens browser to API key page, prompts user to paste their API key.
 * Returns the API key directly (not OAuthCredentials - this isn't OAuth).
 */
export async function loginQianfan(options: OAuthController): Promise<string> {
	if (!options.onPrompt) {
		throw new Error("Qianfan login requires onPrompt callback");
	}

	options.onAuth?.({
		url: AUTH_URL,
		instructions: "Copy your Qianfan API key from the console",
	});

	const apiKey = await options.onPrompt({
		message: "Paste your Qianfan API key",
		placeholder: "bce-v3/ALTAK-...",
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
		provider: "qianfan",
		apiKey: trimmed,
		baseUrl: API_BASE_URL,
		model: VALIDATION_MODEL,
		signal: options.signal,
	});

	return trimmed;
}
