/**
 * Kagi Web Search Provider
 *
 * Calls Kagi's Search API (v0) and maps results into the unified
 * SearchResponse shape used by the web search tool.
 */
import { getEnvApiKey } from "@oh-my-pi/pi-ai";
import type { SearchResponse, SearchSource } from "../../../web/search/types";
import { SearchProviderError } from "../../../web/search/types";
import { clampNumResults, dateToAgeSeconds } from "../utils";
import type { SearchParams } from "./base";
import { SearchProvider } from "./base";

const KAGI_SEARCH_URL = "https://kagi.com/api/v0/search";
const DEFAULT_NUM_RESULTS = 10;
const MAX_NUM_RESULTS = 40;

interface KagiSearchResult {
	t: 0;
	url: string;
	title: string;
	snippet?: string;
	published?: string;
	thumbnail?: {
		url: string;
		width?: number | null;
		height?: number | null;
	};
}

interface KagiRelatedSearches {
	t: 1;
	list: string[];
}

type KagiSearchObject = KagiSearchResult | KagiRelatedSearches;

interface KagiMeta {
	id: string;
	node: string;
	ms: number;
	api_balance?: number;
}

interface KagiSearchResponse {
	meta: KagiMeta;
	data: KagiSearchObject[];
	error?: Array<{ code: number; msg: string; ref?: unknown }>;
}

/** Find KAGI_API_KEY from environment or .env files. */
export function findApiKey(): string | null {
	return getEnvApiKey("kagi") ?? null;
}

async function callKagiSearch(
	apiKey: string,
	query: string,
	limit: number,
	signal?: AbortSignal,
): Promise<KagiSearchResponse> {
	const url = new URL(KAGI_SEARCH_URL);
	url.searchParams.set("q", query);
	url.searchParams.set("limit", String(limit));

	const response = await fetch(url, {
		headers: {
			Authorization: `Bot ${apiKey}`,
			Accept: "application/json",
		},
		signal,
	});

	if (!response.ok) {
		const errorText = await response.text();
		throw new SearchProviderError("kagi", `Kagi API error (${response.status}): ${errorText}`, response.status);
	}

	const data = (await response.json()) as KagiSearchResponse;

	if (data.error && data.error.length > 0) {
		const firstError = data.error[0];
		throw new SearchProviderError("kagi", `Kagi API error: ${firstError.msg}`, firstError.code);
	}

	return data;
}

/** Execute Kagi web search. */
export async function searchKagi(params: {
	query: string;
	num_results?: number;
	signal?: AbortSignal;
}): Promise<SearchResponse> {
	const numResults = clampNumResults(params.num_results, DEFAULT_NUM_RESULTS, MAX_NUM_RESULTS);
	const apiKey = findApiKey();
	if (!apiKey) {
		throw new Error("KAGI_API_KEY not found. Set it in environment or .env file.");
	}

	const data = await callKagiSearch(apiKey, params.query, numResults, params.signal);

	const sources: SearchSource[] = [];
	const relatedQuestions: string[] = [];

	for (const item of data.data) {
		if (item.t === 0) {
			sources.push({
				title: item.title,
				url: item.url,
				snippet: item.snippet,
				publishedDate: item.published ?? undefined,
				ageSeconds: dateToAgeSeconds(item.published),
			});
		} else if (item.t === 1) {
			relatedQuestions.push(...item.list);
		}
	}

	return {
		provider: "kagi",
		sources: sources.slice(0, numResults),
		relatedQuestions: relatedQuestions.length > 0 ? relatedQuestions : undefined,
		requestId: data.meta.id,
	};
}

/** Search provider for Kagi web search. */
export class KagiProvider extends SearchProvider {
	readonly id = "kagi";
	readonly label = "Kagi";

	isAvailable() {
		try {
			return !!findApiKey();
		} catch {
			return false;
		}
	}

	search(params: SearchParams): Promise<SearchResponse> {
		return searchKagi({
			query: params.query,
			num_results: params.numSearchResults ?? params.limit,
			signal: params.signal,
		});
	}
}
