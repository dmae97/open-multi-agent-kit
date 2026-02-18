/**
 * Xiaomi MiMo login flow.
 *
 * Xiaomi MiMo provides Anthropic-compatible models via
 * https://api.xiaomimimo.com/anthropic.
 *
 * This is not OAuth - it's a simple API key flow:
 * 1. Open browser to Xiaomi MiMo API key console
 * 2. User copies their API key
 * 3. User pastes the API key into the CLI
 */

import type { OAuthController } from "./types";

const PROVIDER_ID = "xiaomi";
const PROVIDER_NAME = "Xiaomi MiMo";
const AUTH_URL = "https://platform.xiaomimimo.com/#/console/api-keys";
const API_BASE_URL = "https://api.xiaomimimo.com/anthropic";
const VALIDATION_MODEL = "mimo-v2-flash";
const ANTHROPIC_VERSION = "2023-06-01";
const VALIDATION_TIMEOUT_MS = 15_000;

async function validateXiaomiApiKey(apiKey: string, signal?: AbortSignal): Promise<void> {
	const timeoutSignal = AbortSignal.timeout(VALIDATION_TIMEOUT_MS);
	const requestSignal = signal ? AbortSignal.any([signal, timeoutSignal]) : timeoutSignal;

	const response = await fetch(`${API_BASE_URL}/v1/messages`, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			"x-api-key": apiKey,
			"anthropic-version": ANTHROPIC_VERSION,
		},
		body: JSON.stringify({
			model: VALIDATION_MODEL,
			max_tokens: 1,
			messages: [{ role: "user", content: "ping" }],
		}),
		signal: requestSignal,
	});

	if (response.ok) {
		return;
	}

	let details = "";
	try {
		details = (await response.text()).trim();
	} catch {
		// ignore body parse errors, status is enough
	}

	const message = details
		? `${PROVIDER_NAME} API key validation failed (${response.status}): ${details}`
		: `${PROVIDER_NAME} API key validation failed (${response.status})`;
	throw new Error(message);
}

/**
 * Login to Xiaomi MiMo.
 *
 * Opens browser to API keys page, prompts user to paste their API key.
 * Returns the API key directly (not OAuthCredentials - this isn't OAuth).
 */
export async function loginXiaomi(options: OAuthController): Promise<string> {
	if (!options.onPrompt) {
		throw new Error(`${PROVIDER_NAME} login requires onPrompt callback`);
	}
	options.onAuth?.({
		url: AUTH_URL,
		instructions: "Copy your API key from the Xiaomi MiMo console",
	});
	const apiKey = await options.onPrompt({
		message: "Paste your Xiaomi API key",
		placeholder: "sk-...",
	});
	if (options.signal?.aborted) {
		throw new Error("Login cancelled");
	}
	const trimmed = apiKey.trim();
	if (!trimmed) {
		throw new Error("API key is required");
	}

	options.onProgress?.(`Validating ${PROVIDER_ID} API key...`);
	await validateXiaomiApiKey(trimmed, options.signal);
	return trimmed;
}
