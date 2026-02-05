import { findApiKey as findExaKey } from "../../exa/mcp-client";
import { findAnthropicAuth } from "./auth";
import { searchAnthropic } from "./providers/anthropic";
import { hasCodexSearch, searchCodex } from "./providers/codex";
import { searchExa } from "./providers/exa";
import { findGeminiAuth, searchGemini } from "./providers/gemini";
import { findApiKey as findJinaKey, searchJina } from "./providers/jina";
import { findApiKey as findPerplexityKey, searchPerplexity } from "./providers/perplexity";
import type { SearchProviderId, SearchResponse } from "./types";

export interface SearchParams {
	query: string;
	limit?: number;
	recency?: "day" | "week" | "month" | "year";
	systemPrompt: string;
	signal?: AbortSignal;
	maxOutputTokens?: number;
	numSearchResults?: number;
	temperature?: number;
}

export abstract class SearchProvider {
	abstract readonly id: SearchProviderId;
	abstract readonly label: string;

	abstract isAvailable(): Promise<boolean> | boolean;
	abstract search(params: SearchParams): Promise<SearchResponse>;
}

export class ExaProvider extends SearchProvider {
	readonly id: SearchProviderId = "exa";
	readonly label = "Exa";

	isAvailable(): boolean {
		try {
			return !!findExaKey();
		} catch {
			return false;
		}
	}

	search(params: SearchParams): Promise<SearchResponse> {
		return searchExa(params);
	}
}

export class JinaProvider extends SearchProvider {
	readonly id: SearchProviderId = "jina";
	readonly label = "Jina";

	isAvailable() {
		try {
			return !!findJinaKey();
		} catch {
			return false;
		}
	}

	search(params: SearchParams): Promise<SearchResponse> {
		return searchJina(params);
	}
}

export class PerplexityProvider extends SearchProvider {
	readonly id: SearchProviderId = "perplexity";
	readonly label = "Perplexity";

	isAvailable() {
		try {
			return !!findPerplexityKey();
		} catch {
			return false;
		}
	}

	search(params: SearchParams): Promise<SearchResponse> {
		return searchPerplexity({
			query: params.query,
			temperature: params.temperature,
			max_tokens: params.maxOutputTokens,
			num_search_results: params.numSearchResults,
			system_prompt: params.systemPrompt,
			search_recency_filter: params.recency,
			num_results: params.limit,
		});
	}
}

export class AnthropicProvider extends SearchProvider {
	readonly id: SearchProviderId = "anthropic";
	readonly label = "Anthropic";

	isAvailable() {
		return findAnthropicAuth().then(Boolean);
	}

	search(params: SearchParams): Promise<SearchResponse> {
		return searchAnthropic({
			query: params.query,
			system_prompt: params.systemPrompt,
			num_results: params.limit,
		});
	}
}

export class GeminiProvider extends SearchProvider {
	readonly id: SearchProviderId = "gemini";
	readonly label = "Gemini";

	isAvailable() {
		return findGeminiAuth().then(Boolean);
	}

	search(params: SearchParams): Promise<SearchResponse> {
		return searchGemini({
			query: params.query,
			system_prompt: params.systemPrompt,
			num_results: params.limit,
		});
	}
}

export class CodexProvider extends SearchProvider {
	readonly id: SearchProviderId = "codex";
	readonly label = "Codex";

	isAvailable(): Promise<boolean> {
		return Promise.resolve(hasCodexSearch());
	}

	search(params: SearchParams): Promise<SearchResponse> {
		return searchCodex({
			signal: params.signal,
			query: params.query,
			system_prompt: params.systemPrompt,
			num_results: params.limit,
		});
	}
}

export const SEARCH_PROVIDERS: Record<SearchProviderId, SearchProvider> = {
	exa: new ExaProvider(),
	jina: new JinaProvider(),
	perplexity: new PerplexityProvider(),
	anthropic: new AnthropicProvider(),
	gemini: new GeminiProvider(),
	codex: new CodexProvider(),
} as const;

export const SEARCH_PROVIDER_ORDER: SearchProviderId[] = ["exa", "jina", "perplexity", "anthropic", "gemini", "codex"];

export function getSearchProvider(provider: SearchProviderId): SearchProvider {
	return SEARCH_PROVIDERS[provider];
}

/** Preferred provider set via settings (default: auto) */
let preferredProvId: SearchProviderId | "auto" = "auto";

/** Set the preferred web search provider from settings */
export function setPreferredSearchProvider(provider: SearchProviderId | "auto"): void {
	preferredProvId = provider;
}

/** Determine which providers are configured (priority order) */
export async function resolveProviderChain(
	_preferredProvider: SearchProviderId | "auto" = preferredProvId,
): Promise<SearchProvider[]> {
	const providers: SearchProvider[] = [];

	if (preferredProvId !== "auto") {
		if (await getSearchProvider(preferredProvId).isAvailable()) {
			providers.push(getSearchProvider(preferredProvId));
		}
	}

	for (const id of SEARCH_PROVIDER_ORDER) {
		if (id === preferredProvId) continue;

		const provider = getSearchProvider(id);
		if (await provider.isAvailable()) {
			providers.push(provider);
		}
	}

	return providers;
}
