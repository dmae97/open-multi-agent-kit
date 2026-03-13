import { afterEach, describe, expect, it } from "bun:test";
import { hookFetch } from "@oh-my-pi/pi-utils";
import {
	executeCodeSearch,
	searchCodeWithGrep,
	setPreferredCodeSearchProvider,
} from "../../src/web/search/code-search";

function getFirstTextContent(result: { content: Array<{ type: string; text?: string }> }): string {
	const firstContent = result.content[0];
	if (firstContent?.type === "text") return firstContent.text ?? "";
	return "";
}

describe("code_search", () => {
	afterEach(() => {
		setPreferredCodeSearchProvider("exa");
	});

	it("maps grep.app results into normalized code search sources", async () => {
		let requestedUrl = "";
		using _hook = hookFetch(input => {
			requestedUrl = String(input);
			return new Response(
				JSON.stringify({
					hits: {
						total: 42,
						hits: [
							{
								repo: "misc/example",
								branch: "main",
								path: "src/other.ts",
								content: {
									snippet:
										'<table class="highlight-table"><tr data-line="2"><td><div class="lineno">2</div></td><td><div class="highlight"><pre><span class="kd">const</span><span class="w"> </span><span class="nx">withResolvers</span><span class="w"> </span><span class="o">=</span><span class="w"> </span><span class="s2">"polyfill"</span></pre></div></td></tr></table>',
								},
								total_matches: "2",
							},
							{
								repo: "oven-sh/bun",
								branch: "main",
								path: "src/runtime.ts",
								content: {
									snippet:
										'<table class="highlight-table"><tr data-line="12"><td><div class="lineno">12</div></td><td><div class="highlight"><pre><span class="kd">const</span><span class="w"> </span><span class="nx"><mark>Promise</mark>.withResolvers</span><span class="p">();</span></pre></div></td></tr><tr data-line="13"><td><div class="lineno">13</div></td><td><div class="highlight"><pre><span class="k">return</span><span class="w"> </span><span class="nx">pair</span><span class="p">;</span></pre></div></td></tr></table>',
								},
								total_matches: "12",
							},
						],
					},
				}),
				{ status: 200, headers: { "Content-Type": "application/json" } },
			);
		});

		const result = await searchCodeWithGrep({
			query: "Promise.withResolvers",
			code_context: "bun runtime",
		});

		expect(requestedUrl).toContain("https://grep.app/api/search?q=Promise.withResolvers");
		expect(result.provider).toBe("grep");
		expect(result.query).toBe("Promise.withResolvers");
		expect(result.totalResults).toBe(42);
		expect(result.sources).toHaveLength(2);
		expect(result.sources[0]).toMatchObject({
			title: "oven-sh/bun/src/runtime.ts",
			url: "https://github.com/oven-sh/bun/blob/main/src/runtime.ts",
			repository: "oven-sh/bun",
			path: "src/runtime.ts",
			branch: "main",
			totalMatches: "12",
		});
		expect(result.sources[0]?.snippet).toContain("12: const Promise.withResolvers();");
		expect(result.sources[0]?.snippet).toContain("13: return pair;");
		expect(result.sources[1]).toMatchObject({
			title: "misc/example/src/other.ts",
			url: "https://github.com/misc/example/blob/main/src/other.ts",
			repository: "misc/example",
			path: "src/other.ts",
			branch: "main",
			totalMatches: "2",
		});
		expect(result.sources[1]?.snippet).toContain('2: const withResolvers = "polyfill"');
	});

	it("does not append code_context to grep.app q", async () => {
		let requestedUrl = "";
		using _hook = hookFetch(input => {
			requestedUrl = String(input);
			return new Response(JSON.stringify({ hits: { total: 0, hits: [] } }), {
				status: 200,
				headers: { "Content-Type": "application/json" },
			});
		});

		await searchCodeWithGrep({ query: "DIRENV_LOG_FORMAT", code_context: "direnv shell" });
		expect(requestedUrl).toContain("https://grep.app/api/search?q=DIRENV_LOG_FORMAT");
		expect(requestedUrl).not.toContain("direnv");
	});

	it("executes code search through the configured grep provider", async () => {
		setPreferredCodeSearchProvider("grep");

		using _hook = hookFetch(
			() =>
				new Response(
					JSON.stringify({
						hits: {
							total: 1,
							hits: [
								{
									repo: "facebook/react",
									branch: "main",
									path: "packages/react/src/ReactHooks.js",
									content: {
										snippet:
											'<table class="highlight-table"><tr data-line="101"><td><div class="lineno">101</div></td><td><div class="highlight"><pre><span class="k">export</span><span class="w"> </span><span class="kd">function</span><span class="w"> </span><span class="nx">useState</span><span class="p">()</span></pre></div></td></tr></table>',
									},
									total_matches: "1",
								},
							],
						},
					}),
					{ status: 200, headers: { "Content-Type": "application/json" } },
				),
		);

		const result = await executeCodeSearch({ query: "useState" });
		const output = getFirstTextContent(result);
		expect(output).toContain("Code search via grep");
		expect(output).toContain("https://github.com/facebook/react/blob/main/packages/react/src/ReactHooks.js");
		expect(result.details?.provider).toBe("grep");
		expect(result.details?.response?.sources[0]?.snippet).toContain("101: export function useState()");
	});

	it("preserves Exa raw-response fallback for code search", async () => {
		setPreferredCodeSearchProvider("exa");

		using _hook = hookFetch(
			() =>
				new Response(
					JSON.stringify({
						result: {
							content: [
								{
									type: "text",
									text: "Need the official or source-backed way to silence direnv loading output.",
								},
							],
						},
					}),
					{ status: 200, headers: { "Content-Type": "application/json" } },
				),
		);

		const result = await executeCodeSearch({ query: "DIRENV_LOG_FORMAT direnv loading silence" });
		const output = getFirstTextContent(result);
		expect(output).toContain("Code search via exa");
		expect(output).toContain("Need the official or source-backed way to silence direnv loading output.");
		expect(result.details?.provider).toBe("exa");
		expect(result.details?.response?.sources[0]?.snippet).toContain(
			"Need the official or source-backed way to silence direnv loading output.",
		);
	});

	it("returns a structured error when grep.app responds with an unexpected shape", async () => {
		setPreferredCodeSearchProvider("grep");

		using _hook = hookFetch(
			() =>
				new Response(JSON.stringify({ hits: { total: 1, hits: [{ repo: "missing-fields" }] } }), { status: 200 }),
		);

		const result = await executeCodeSearch({ query: "broken" });
		expect(getFirstTextContent(result)).toBe("Error: grep.app returned an unexpected response shape.");
		expect(result.details?.provider).toBe("grep");
		expect(result.details?.error).toBe("grep.app returned an unexpected response shape.");
	});
});
