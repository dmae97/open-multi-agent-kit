/**
 * vLLM login flow.
 *
 * vLLM is commonly self-hosted with an OpenAI-compatible API at a local base URL.
 * Some deployments require a bearer token, others allow unauthenticated access.
 *
 * This flow stores an API-key-style credential used by `/login` and auth storage.
 */

import type { OAuthController, OAuthProvider } from "./types";

const PROVIDER_ID: OAuthProvider = "vllm";
const AUTH_URL = "https://docs.vllm.ai/en/latest/serving/openai_compatible_server.html";
const DEFAULT_LOCAL_BASE_URL = "http://127.0.0.1:8000/v1";
const DEFAULT_LOCAL_TOKEN = "vllm-local";
/**
 * Login to vLLM.
 *
 * Opens vLLM OpenAI-compatible auth docs, prompts for an optional token,
 * and returns a stored key value.
 */
export async function loginVllm(options: OAuthController): Promise<string> {
	if (!options.onPrompt) {
		throw new Error(`${PROVIDER_ID} login requires onPrompt callback`);
	}
	options.onAuth?.({
		url: AUTH_URL,
		instructions: `Paste your vLLM API key if your server requires auth. Leave empty for local no-auth mode (default base URL: ${DEFAULT_LOCAL_BASE_URL}).`,
	});
	const apiKey = await options.onPrompt({
		message: "Paste your vLLM API key (optional for local no-auth)",
		placeholder: DEFAULT_LOCAL_TOKEN,
		allowEmpty: true,
	});
	if (options.signal?.aborted) {
		throw new Error("Login cancelled");
	}
	const trimmed = apiKey.trim();
	return trimmed || DEFAULT_LOCAL_TOKEN;
}
