/**
 * Cloudflare AI Gateway login flow.
 *
 * Cloudflare AI Gateway proxies upstream model providers.
 *
 * This is not OAuth - it's a simple API key flow:
 * 1. Open Cloudflare AI Gateway docs/dashboard
 * 2. User copies their Cloudflare AI Gateway token/API key
 * 3. User pastes the API key into the CLI
 */

import type { OAuthController } from "./types";

const AUTH_URL = "https://developers.cloudflare.com/ai-gateway/configuration/authentication/";

/**
 * Login to Cloudflare AI Gateway.
 *
 * Opens browser to Cloudflare AI Gateway authentication docs and prompts for a gateway token/API key.
 * Returns the API key directly (not OAuthCredentials - this isn't OAuth).
 */
export async function loginCloudflareAiGateway(options: OAuthController): Promise<string> {
	if (!options.onPrompt) {
		throw new Error("Cloudflare AI Gateway login requires onPrompt callback");
	}

	options.onAuth?.({
		url: AUTH_URL,
		instructions:
			"Copy your Cloudflare AI Gateway token/API key. Configure account/gateway base URL in models config.",
	});

	const apiKey = await options.onPrompt({
		message: "Paste your Cloudflare AI Gateway token/API key",
		placeholder: "cf-aig-...",
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
