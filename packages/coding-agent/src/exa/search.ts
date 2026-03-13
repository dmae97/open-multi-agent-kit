/**
 * Exa Search Tools
 *
 * Basic neural/keyword search, deep research, code search, and URL crawling.
 */
import { StringEnum } from "@oh-my-pi/pi-ai";
import { Type } from "@sinclair/typebox";
import type { CustomTool } from "../extensibility/custom-tools/types";
import { createExaTool } from "./factory";
import type { ExaRenderDetails } from "./types";

/** exa_search - Basic neural/keyword search */
const exaSearchTool = createExaTool(
	"exa_search",
	"Exa Search",
	`Search the web using Exa's neural or keyword search.

Returns structured search results with optional text content and highlights.

Parameters:
- query: Search query (required)
- type: Search type - "neural" (semantic), "keyword" (exact), or "auto" (default: auto)
- include_domains: Array of domains to include in results
- exclude_domains: Array of domains to exclude from results
- start_published_date: Filter results published after this date (ISO 8601)
- end_published_date: Filter results published before this date (ISO 8601)
- use_autoprompt: Let Exa optimize your query automatically (default: true)
- text: Include page text content in results (default: false, costs more)
- highlights: Include highlighted relevant snippets (default: false)
- num_results: Maximum number of results to return (default: 10, max: 100)`,

	Type.Object({
		query: Type.String({ description: "Search query" }),
		type: Type.Optional(
			StringEnum(["keyword", "neural", "auto"], {
				description: "Search type - neural (semantic), keyword (exact), or auto",
			}),
		),
		include_domains: Type.Optional(
			Type.Array(Type.String(), {
				description: "Only include results from these domains",
			}),
		),
		exclude_domains: Type.Optional(
			Type.Array(Type.String(), {
				description: "Exclude results from these domains",
			}),
		),
		start_published_date: Type.Optional(
			Type.String({
				description: "Filter results published after this date (ISO 8601 format)",
			}),
		),
		end_published_date: Type.Optional(
			Type.String({
				description: "Filter results published before this date (ISO 8601 format)",
			}),
		),
		use_autoprompt: Type.Optional(
			Type.Boolean({
				description: "Let Exa optimize your query automatically (default: true)",
			}),
		),
		text: Type.Optional(
			Type.Boolean({
				description: "Include page text content in results (costs more, default: false)",
			}),
		),
		highlights: Type.Optional(
			Type.Boolean({
				description: "Include highlighted relevant snippets (default: false)",
			}),
		),
		num_results: Type.Optional(
			Type.Number({
				description: "Maximum number of results to return (default: 10, max: 100)",
				minimum: 1,
				maximum: 100,
			}),
		),
	}),
	"web_search_exa",
);

export const searchTools: CustomTool<any, ExaRenderDetails>[] = [exaSearchTool];
