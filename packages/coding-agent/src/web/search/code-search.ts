import type { Component } from "@oh-my-pi/pi-tui";
import { Text } from "@oh-my-pi/pi-tui";
import { callExaTool, findApiKey as findExaKey, formatSearchResults, isSearchResponse } from "../../exa/mcp-client";
import type { CustomToolResult, RenderResultOptions } from "../../extensibility/custom-tools/types";
import type { Theme } from "../../modes/theme/theme";
import {
	formatCount,
	formatExpandHint,
	formatMoreItems,
	formatStatusIcon,
	replaceTabs,
	truncateToWidth,
} from "../../tools/render-utils";
import { decodeHtmlEntities } from "../scrapers/types";
import type { CodeSearchProviderId } from "./types";

export interface CodeSearchToolParams {
	query: string;
	code_context?: string;
}

export interface CodeSearchSource {
	title: string;
	url: string;
	repository: string;
	path: string;
	branch: string;
	snippet?: string;
	totalMatches?: string;
}

export interface CodeSearchResponse {
	provider: CodeSearchProviderId;
	query: string;
	totalResults?: number;
	sources: CodeSearchSource[];
}

export interface CodeSearchRenderDetails {
	response?: CodeSearchResponse;
	error?: string;
	provider: CodeSearchProviderId;
}

interface GrepApiHit {
	repo: string;
	branch: string;
	path: string;
	contentSnippet?: string;
	totalMatches?: string;
}

interface GrepApiResponse {
	totalResults?: number;
	hits: GrepApiHit[];
}

let preferredCodeSearchProvider: CodeSearchProviderId = "grep";

export function setPreferredCodeSearchProvider(provider: CodeSearchProviderId): void {
	preferredCodeSearchProvider = provider;
}

function stringifyExaCodeResponse(payload: unknown): string {
	if (typeof payload === "string") return payload;
	if (typeof payload === "number" || typeof payload === "boolean") return String(payload);
	if (payload === null || payload === undefined) return "";
	const serialized = JSON.stringify(payload, null, 2);
	return typeof serialized === "string" ? serialized : "";
}

function normalizeExaCodeSearchResponse(
	params: CodeSearchToolParams,
	payload: unknown,
	formattedSearchResponse?: string,
): CodeSearchResponse {
	const snippet = formattedSearchResponse ?? stringifyExaCodeResponse(payload);
	return {
		provider: "exa",
		query: params.query,
		sources: [
			{
				title: params.query,
				url: "https://exa.ai/",
				repository: "exa",
				path: "code-search",
				branch: "public-mcp",
				snippet: snippet.length > 0 ? snippet : undefined,
			},
		],
	};
}

function getStringProperty(value: object, key: string): string | undefined {
	const candidate = Reflect.get(value, key);
	return typeof candidate === "string" ? candidate : undefined;
}

function getNumberProperty(value: object, key: string): number | undefined {
	const candidate = Reflect.get(value, key);
	return typeof candidate === "number" && Number.isFinite(candidate) ? candidate : undefined;
}

function getObjectProperty(value: object, key: string): object | undefined {
	const candidate = Reflect.get(value, key);
	return typeof candidate === "object" && candidate !== null ? candidate : undefined;
}

function getArrayProperty(value: object, key: string): unknown[] | undefined {
	const candidate = Reflect.get(value, key);
	return Array.isArray(candidate) ? candidate : undefined;
}

function stripHtmlTags(value: string): string {
	return value
		.replace(/<br\s*\/?>/gi, "")
		.replace(/<\/?mark>/gi, "")
		.replace(/<span[^>]*>/gi, "")
		.replace(/<\/span>/gi, "")
		.replace(/<[^>]+>/g, "");
}

function formatGrepSnippet(snippetHtml: string | undefined): string | undefined {
	if (!snippetHtml) return undefined;

	const rowPattern = /<tr[^>]*data-line="(\d+)"[^>]*>[\s\S]*?<pre>([\s\S]*?)<\/pre>[\s\S]*?<\/tr>/gi;
	const lines: string[] = [];

	for (const match of snippetHtml.matchAll(rowPattern)) {
		const lineNumber = match[1];
		const rawCode = match[2] ?? "";
		const text = decodeHtmlEntities(stripHtmlTags(rawCode)).trimEnd();
		if (text.length === 0) continue;
		lines.push(`${lineNumber}: ${text}`);
	}

	if (lines.length > 0) {
		return lines.join("\n");
	}

	const plainText = decodeHtmlEntities(stripHtmlTags(snippetHtml)).replace(/\s+\n/g, "\n").trim();
	return plainText.length > 0 ? plainText : undefined;
}

function parseGrepApiResponse(payload: unknown): GrepApiResponse | null {
	if (typeof payload !== "object" || payload === null) return null;

	const hitsObject = getObjectProperty(payload, "hits");
	if (!hitsObject) return null;

	const hitValues = getArrayProperty(hitsObject, "hits") ?? [];
	const hits: GrepApiHit[] = [];
	for (const item of hitValues) {
		if (typeof item !== "object" || item === null) continue;
		const repo = getStringProperty(item, "repo");
		const branch = getStringProperty(item, "branch");
		const path = getStringProperty(item, "path");
		if (!repo || !branch || !path) continue;

		const content = getObjectProperty(item, "content");
		hits.push({
			repo,
			branch,
			path,
			contentSnippet: content ? getStringProperty(content, "snippet") : undefined,
			totalMatches: getStringProperty(item, "total_matches"),
		});
	}
	if (hitValues.length > 0 && hits.length === 0) return null;

	return {
		totalResults: getNumberProperty(hitsObject, "total"),
		hits,
	};
}

function buildGrepQuery(params: CodeSearchToolParams): string {
	return params.query.trim();
}

function tokenizeCodeContext(codeContext: string | undefined): string[] {
	if (!codeContext) return [];
	return codeContext
		.toLowerCase()
		.split(/[^a-z0-9_./:-]+/i)
		.filter(token => token.length >= 2);
}

function scoreGrepHit(hit: GrepApiHit, contextTokens: string[]): number {
	if (contextTokens.length === 0) return 0;
	const snippet = formatGrepSnippet(hit.contentSnippet)?.toLowerCase() ?? "";
	const repo = hit.repo.toLowerCase();
	const path = hit.path.toLowerCase();

	let score = 0;
	for (const token of contextTokens) {
		if (repo.includes(token)) score += 4;
		if (path.includes(token)) score += 3;
		if (snippet.includes(token)) score += 2;
	}

	return score;
}

export async function searchCodeWithGrep(params: CodeSearchToolParams): Promise<CodeSearchResponse> {
	const query = buildGrepQuery(params);
	const url = new URL("https://grep.app/api/search");
	url.searchParams.set("q", query);

	const response = await fetch(url, {
		headers: {
			Accept: "application/json",
			Referer: `https://grep.app/search?q=${encodeURIComponent(query)}`,
		},
	});

	if (!response.ok) {
		const message = await response.text();
		throw new Error(`grep.app API error (${response.status}): ${message}`);
	}

	const payload: unknown = await response.json();
	const parsed = parseGrepApiResponse(payload);
	if (!parsed) {
		throw new Error("grep.app returned an unexpected response shape.");
	}

	const contextTokens = tokenizeCodeContext(params.code_context);
	const rankedHits = [...parsed.hits].sort(
		(left, right) => scoreGrepHit(right, contextTokens) - scoreGrepHit(left, contextTokens),
	);

	return {
		provider: "grep",
		query,
		totalResults: parsed.totalResults,
		sources: rankedHits.map(hit => ({
			title: `${hit.repo}/${hit.path}`,
			url: `https://github.com/${hit.repo}/blob/${hit.branch}/${hit.path}`,
			repository: hit.repo,
			path: hit.path,
			branch: hit.branch,
			snippet: formatGrepSnippet(hit.contentSnippet),
			totalMatches: hit.totalMatches,
		})),
	};
}

async function searchCodeWithExa(params: CodeSearchToolParams): Promise<CodeSearchResponse> {
	const exaParams = params.code_context
		? { query: params.query, code_context: params.code_context }
		: { query: params.query };
	const response = await callExaTool("get_code_context_exa", exaParams, findExaKey());
	if (isSearchResponse(response)) {
		return normalizeExaCodeSearchResponse(params, response, formatSearchResults(response));
	}

	return normalizeExaCodeSearchResponse(params, response);
}

export function formatCodeSearchForLlm(response: CodeSearchResponse): string {
	const parts: string[] = [];
	const summaryParts: string[] = [response.provider];
	if (response.totalResults !== undefined) {
		summaryParts.push(`${response.totalResults.toLocaleString()} total matches`);
	}
	parts.push(`Code search via ${summaryParts.join(" · ")}`);

	if (response.sources.length === 0) {
		parts.push("No results found.");
		return parts.join("\n");
	}

	for (const [index, source] of response.sources.entries()) {
		const metadata: string[] = [source.repository, source.path];
		if (source.totalMatches) metadata.push(`${source.totalMatches} matches`);
		parts.push(`[${index + 1}] ${metadata.join(" · ")}`);
		parts.push(`    ${source.url}`);
		if (source.snippet) {
			for (const line of source.snippet.split("\n").slice(0, 8)) {
				parts.push(`    ${line}`);
			}
		}
	}

	return parts.join("\n");
}

export async function executeCodeSearch(
	params: CodeSearchToolParams,
): Promise<CustomToolResult<CodeSearchRenderDetails>> {
	try {
		const response =
			preferredCodeSearchProvider === "grep" ? await searchCodeWithGrep(params) : await searchCodeWithExa(params);

		return {
			content: [{ type: "text", text: formatCodeSearchForLlm(response) }],
			details: { provider: response.provider, response },
		};
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		return {
			content: [{ type: "text", text: `Error: ${message}` }],
			details: { provider: preferredCodeSearchProvider, error: message },
		};
	}
}

export function renderCodeSearchCall(
	args: CodeSearchToolParams,
	_options: RenderResultOptions,
	theme: Theme,
): Component {
	let text = `${theme.fg("toolTitle", "Code Search")} ${theme.fg("accent", truncateToWidth(args.query, 80))}`;
	text += ` ${theme.fg("muted", `provider:${preferredCodeSearchProvider}`)}`;
	if (args.code_context) {
		text += ` ${theme.fg("dim", truncateToWidth(args.code_context, 40))}`;
	}
	return new Text(text, 0, 0);
}

export function renderCodeSearchResult(
	result: { content: Array<{ type: string; text?: string }>; details?: CodeSearchRenderDetails },
	options: RenderResultOptions,
	uiTheme: Theme,
): Component {
	const details = result.details;
	if (details?.error) {
		return new Text(
			`${formatStatusIcon("error", uiTheme)} ${uiTheme.fg("error", `Error: ${replaceTabs(details.error)}`)}`,
			0,
			0,
		);
	}

	const response = details?.response;
	if (!response) {
		return new Text(`${formatStatusIcon("warning", uiTheme)} ${uiTheme.fg("muted", "No code search results")}`, 0, 0);
	}

	const resultCount = response.sources.length;
	const meta: string[] = [formatCount("result", resultCount), `provider:${response.provider}`];
	if (response.totalResults !== undefined) {
		meta.push(`${response.totalResults.toLocaleString()} total`);
	}
	const expandHint = formatExpandHint(uiTheme, options.expanded, resultCount > 1);
	let text = `${formatStatusIcon(resultCount > 0 ? "success" : "warning", uiTheme)} ${uiTheme.fg("dim", meta.join(uiTheme.sep.dot))}${expandHint}`;

	if (resultCount === 0) {
		text += `\n ${uiTheme.fg("dim", uiTheme.tree.last)} ${uiTheme.fg("muted", "No results")}`;
		return new Text(text, 0, 0);
	}

	const visibleSources = options.expanded ? response.sources : response.sources.slice(0, 1);
	for (const [index, source] of visibleSources.entries()) {
		const isLast = index === visibleSources.length - 1;
		const branch = isLast ? uiTheme.tree.last : uiTheme.tree.branch;
		const cont = isLast ? " " : uiTheme.tree.vertical;
		text += `\n ${uiTheme.fg("dim", branch)} ${uiTheme.fg("accent", truncateToWidth(replaceTabs(source.title), 100))}`;
		text += `\n ${uiTheme.fg("dim", cont)} ${uiTheme.fg("dim", uiTheme.tree.hook)} ${uiTheme.fg("mdLinkUrl", source.url)}`;

		if (source.totalMatches) {
			text += `\n ${uiTheme.fg("dim", cont)} ${uiTheme.fg("dim", uiTheme.tree.hook)} ${uiTheme.fg("muted", `Matches: ${source.totalMatches}`)}`;
		}

		if (source.snippet) {
			const snippetLines = source.snippet.split("\n").slice(0, options.expanded ? 6 : 3);
			for (const line of snippetLines) {
				text += `\n ${uiTheme.fg("dim", cont)} ${uiTheme.fg("dim", uiTheme.tree.hook)} ${uiTheme.fg(
					"toolOutput",
					truncateToWidth(replaceTabs(line), 100),
				)}`;
			}
		}
	}

	if (!options.expanded && response.sources.length > visibleSources.length) {
		text += `\n ${uiTheme.fg("dim", uiTheme.tree.last)} ${uiTheme.fg(
			"muted",
			formatMoreItems(response.sources.length - visibleSources.length, "result"),
		)}`;
	}

	return new Text(text, 0, 0);
}
