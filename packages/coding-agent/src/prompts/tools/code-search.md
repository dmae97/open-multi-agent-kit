Search code snippets, and technical content.
This tool behaves more like grep than natural-language web search.

<instruction>
- Query with exact symbols, identifiers, error strings, CLI flags, filenames, import paths, and short code fragments
- Start with the smallest distinctive token; widen or add one nearby token only if the first query is too broad
- Prefer exact syntax when punctuation carries meaning, such as `Promise.withResolvers`, `useEffect(`, `--watch`, or `"direnv loading"`
- Keep `query` terse; remove filler words, prose, and request framing
- Use `code_context` only for a few disambiguating tokens such as language, library, framework, repo, runtime, or API name
- If a multi-word literal matters exactly, quote the shortest stable phrase first, then refine
- When looking for usage examples of a specific API, search the symbol first; add surrounding call syntax only when needed
</instruction>

<parameters>
- query: Grep-style code search query; use exact tokens, short fragments, or short quoted phrases
- code_context: Optional disambiguation tokens only, not a sentence
</parameters>

<examples>
Good queries:
- `Promise.withResolvers`
- `DIRENV_LOG_FORMAT`
- `"direnv loading"`
- `useState` with `code_context: react hooks`
- `app.get(` with `code_context: express`
- `ERR_REQUIRE_ESM` with `code_context: node`

Bad queries:
- `Need the official or source-backed way to silence direnv loading output`
- `How do I use Promise.withResolvers in Bun?`
- `find examples of React state hooks in TypeScript projects`
- `search GitHub for express routing docs`
</examples>

<avoid>
- Do not use this tool for broad conceptual research, comparisons, or authoritative sourcing; use `web_search`, `web_search_deep`, or `fetch` instead
- Do not put full-sentence instructions into `query` or `code_context`
- Do not pack many weak terms into one query; one strong token plus minimal context usually works better
</avoid>

<critical>
- `query` should be grep-style code search, not a natural-language request
- `code_context` is optional and should stay short
- If you need explanations, best practices, or comprehensive answers, use broader web search tools instead of this one
</critical>