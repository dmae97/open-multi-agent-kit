/**
 * Ollama login flow.
 *
 * Ollama is typically used locally without authentication, but some hosted
 * deployments require a bearer token/API key.
 *
 * This flow is API-key based (not OAuth):
 * 1. Optionally open Ollama docs
 * 2. Prompt user for API key/token (optional)
 * 3. Persist key only when provided
 */

import type { OAuthController } from "./types";

const OLLAMA_DOCS_URL = "https://github.com/ollama/ollama/blob/main/docs/api.md";

/**
 * Login to Ollama.
 *
 * Returns a trimmed API key/token string. Empty string means local no-auth mode.
 */
export async function loginOllama(options: OAuthController): Promise<string> {
	if (options.signal?.aborted) {
		throw new Error("Login cancelled");
	}
	if (!options.onPrompt) {
		return "";
	}

	options.onAuth?.({
		url: OLLAMA_DOCS_URL,
		instructions:
			"Optional: paste an Ollama API key/token for authenticated hosts. Leave empty for local no-auth mode.",
	});

	const apiKey = await options.onPrompt({
		message: "Paste your Ollama API key/token (optional)",
		placeholder: "ollama-local",
		allowEmpty: true,
	});

	if (options.signal?.aborted) {
		throw new Error("Login cancelled");
	}

	return apiKey.trim();
}
