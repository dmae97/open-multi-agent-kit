/**
 * Tavily login flow.
 *
 * Tavily web search uses an API key from the account settings page.
 * This is an API key flow:
 * 1. Open browser to Tavily settings
 * 2. User copies API key
 * 3. User pastes key into CLI
 */

import type { OAuthController } from "./types";

const AUTH_URL = "https://app.tavily.com/home";

/**
 * Login to Tavily.
 *
 * Opens browser to API keys page and prompts user to paste their API key.
 * Returns the API key directly (not OAuthCredentials - this isn't OAuth).
 */
export async function loginTavily(options: OAuthController): Promise<string> {
	if (!options.onPrompt) {
		throw new Error("Tavily login requires onPrompt callback");
	}

	options.onAuth?.({
		url: AUTH_URL,
		instructions: "Copy your Tavily API key from the API Keys page.",
	});

	const apiKey = await options.onPrompt({
		message: "Paste your Tavily API key",
		placeholder: "tvly-...",
	});

	if (options.signal?.aborted) {
		throw new Error("Login cancelled");
	}

	const trimmed = apiKey.trim();
	if (!trimmed) {
		throw new Error("API key is required");
	}

	return trimmed;
}
