/**
 * Parallel login flow.
 *
 * Parallel uses an API key from the account settings page.
 * This is an API key flow:
 * 1. Open browser to Parallel API key settings
 * 2. User copies API key
 * 3. User pastes key into the CLI/TUI
 */

import type { OAuthController } from "./types";

const AUTH_URL = "https://platform.parallel.ai/settings?tab=api-keys";

/**
 * Login to Parallel.
 *
 * Opens browser to the API keys page, prompts the user to paste their API key,
 * and returns the API key directly.
 */
export async function loginParallel(options: OAuthController): Promise<string> {
	if (!options.onPrompt) {
		throw new Error("Parallel login requires onPrompt callback");
	}

	options.onAuth?.({
		url: AUTH_URL,
		instructions: "Copy your Parallel API key from the Parallel settings page.",
	});

	const apiKey = await options.onPrompt({
		message: "Paste your Parallel API key",
		placeholder: "sk_...",
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
