import { findAnthropicAuth } from "./auth";
import { searchAnthropic } from "./providers/anthropic";
import { searchCodex, hasCodexWebSearch } from "./providers/codex";
import { searchExa } from "./providers/exa";
import { searchGemini, hasGeminiWebSearch } from "./providers/gemini";
import { findApiKey as findJinaKey, searchJina } from "./providers/jina";
import { findApiKey as findPerplexityKey, searchPerplexity } from "./providers/perplexity";
import type { WebSearchProvider, WebSearchResponse } from "./types";
import { findApiKey as findExaKey } from "../../exa/mcp-client";

export interface WebSearchProviderInfo {
	id: WebSearchProvider;
	label: string;
	/** Authentication requirement summary. */
	auth: string;
	/** Query hint for UI or docs. */
	query: string;
	isAvailable: () => Promise<boolean>;
	search: (params: {
		query: string;
		limit?: number;
		recency?: "day" | "week" | "month" | "year";
		systemPrompt: string;
		signal?: AbortSignal;
	}) => Promise<WebSearchResponse>;
}

export const WEB_SEARCH_PROVIDER_ORDER: WebSearchProvider[] = [
	"exa",
	"jina",
	"perplexity",
	"anthropic",
	"gemini",
	"codex",
];

export const WEB_SEARCH_PROVIDERS: Record<WebSearchProvider, WebSearchProviderInfo> = {
	exa: {
		id: "exa",
		label: "Exa",
		auth: "EXA_API_KEY",
		query: "Search query",
		isAvailable: async () => Boolean(findExaKey()),
		search: async ({ query, limit }) =>
			searchExa({
				query,
				num_results: limit,
			}),
	},
	jina: {
		id: "jina",
		label: "Jina",
		auth: "JINA_API_KEY",
		query: "Search query",
		isAvailable: async () => Boolean(findJinaKey()),
		search: async ({ query, limit }) =>
			searchJina({
				query,
				num_results: limit,
			}),
	},
	perplexity: {
		id: "perplexity",
		label: "Perplexity",
		auth: "PERPLEXITY_API_KEY / PPLX_API_KEY",
		query: "Search query",
		isAvailable: async () => Boolean(findPerplexityKey()),
		search: async ({ query, limit, recency, systemPrompt }) =>
			searchPerplexity({
				query,
				system_prompt: systemPrompt,
				search_recency_filter: recency,
				num_results: limit,
			}),
	},
	anthropic: {
		id: "anthropic",
		label: "Anthropic",
		auth: "ANTHROPIC_SEARCH_API_KEY / OAuth",
		query: "Search query",
		isAvailable: async () => Boolean(await findAnthropicAuth()),
		search: async ({ query, limit, systemPrompt }) =>
			searchAnthropic({
				query,
				system_prompt: systemPrompt,
				num_results: limit,
			}),
	},
	gemini: {
		id: "gemini",
		label: "Gemini",
		auth: "OAuth (agent.db: google-antigravity/google-gemini-cli)",
		query: "Search query",
		isAvailable: hasGeminiWebSearch,
		search: async ({ query, limit, systemPrompt }) =>
			searchGemini({
				query,
				system_prompt: systemPrompt,
				num_results: limit,
			}),
	},
	codex: {
		id: "codex",
		label: "Codex",
		auth: "OAuth (agent.db: openai-codex)",
		query: "Search query",
		isAvailable: hasCodexWebSearch,
		search: async ({ query, limit, systemPrompt, signal }) =>
			searchCodex({
				signal,
				query,
				system_prompt: systemPrompt,
				num_results: limit,
			}),
	},
};

export function formatWebSearchProviderLabel(provider: WebSearchProvider): string {
	return WEB_SEARCH_PROVIDERS[provider]?.label ?? "Unknown";
}

export function getWebSearchProviderInfo(provider: WebSearchProvider): WebSearchProviderInfo {
	return WEB_SEARCH_PROVIDERS[provider];
}
