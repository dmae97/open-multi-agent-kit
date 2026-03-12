import type { SearchResponse } from "../../../web/search/types";
import { SearchProviderError } from "../../../web/search/types";
import { findParallelApiKey, ParallelApiError, searchWithParallel } from "../../parallel";
import { clampNumResults, dateToAgeSeconds } from "../utils";
import type { SearchParams } from "./base";
import { SearchProvider } from "./base";

const DEFAULT_NUM_RESULTS = 10;
const MAX_NUM_RESULTS = 40;

export async function searchParallel(params: {
	query: string;
	num_results?: number;
	signal?: AbortSignal;
}): Promise<SearchResponse> {
	const numResults = clampNumResults(params.num_results, DEFAULT_NUM_RESULTS, MAX_NUM_RESULTS);

	try {
		const result = await searchWithParallel(params.query, [params.query], {
			mode: "fast",
			maxCharsPerResult: 10_000,
			signal: params.signal,
		});

		return {
			provider: "parallel",
			sources: result.sources.slice(0, numResults).map(source => ({
				title: source.title,
				url: source.url,
				snippet: source.snippet,
				publishedDate: source.publishedDate,
				ageSeconds: dateToAgeSeconds(source.publishedDate),
			})),
			requestId: result.requestId,
		};
	} catch (err) {
		if (err instanceof ParallelApiError) {
			throw new SearchProviderError("parallel", err.message, err.statusCode);
		}
		throw err;
	}
}

export class ParallelProvider extends SearchProvider {
	readonly id = "parallel";
	readonly label = "Parallel";

	async isAvailable() {
		try {
			return !!(await findParallelApiKey());
		} catch {
			return false;
		}
	}

	search(params: SearchParams): Promise<SearchResponse> {
		return searchParallel({
			query: params.query,
			num_results: params.numSearchResults ?? params.limit,
			signal: params.signal,
		});
	}
}
