/**
 * MiniMax Coding Plan login flow.
 *
 * MiniMax Coding Plan is a subscription service that provides access to
 * MiniMax models (M2, M2.1) through an OpenAI-compatible API.
 *
 * This is not OAuth - it's a simple API key flow:
 * 1. Open browser to https://platform.minimax.io/subscribe/coding-plan
 * 2. User subscribes and copies their API key
 * 3. User pastes the API key back into the CLI
 *
 * International: https://api.minimax.io/v1
 * China: https://api.minimaxi.com/v1
 */

import type { OAuthController } from "./types";

const AUTH_URL = "https://platform.minimax.io/subscribe/coding-plan";

/**
 * Login to MiniMax Coding Plan (international).
 *
 * Opens browser to subscription page, prompts user to paste their API key.
 * Returns the API key directly (not OAuthCredentials - this isn't OAuth).
 */
export async function loginMiniMaxCode(options: OAuthController): Promise<string> {
	if (!options.onPrompt) {
		throw new Error("MiniMax Coding Plan login requires onPrompt callback");
	}

	// Open browser to subscription page
	options.onAuth?.({
		url: AUTH_URL,
		instructions: "Subscribe to Coding Plan and copy your API key",
	});

	// Prompt user to paste their API key
	const apiKey = await options.onPrompt({
		message: "Paste your MiniMax Coding Plan API key",
		placeholder: "sk-...",
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

/**
 * Login to MiniMax Coding Plan (China).
 *
 * Same flow as international but uses China endpoint.
 */
export async function loginMiniMaxCodeCn(options: OAuthController): Promise<string> {
	// Same flow, just different provider ID for storage
	return loginMiniMaxCode(options);
}
