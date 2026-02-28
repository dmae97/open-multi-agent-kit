Performs structural AST-aware rewrites via native ast-grep.

<instruction>
- Use for codemods and structural rewrites where plain text replace is unsafe
- Narrow scope with `path` before replacing (`path` accepts files, directories, or glob patterns)
- Default to language-scoped rewrites in mixed repositories: set `lang` and keep `path` narrow
- `pattern` + `rewrite` are required; `lang` is optional only when all matched files resolve to a single language
- Keep `dry_run` enabled unless explicit apply intent is clear
- Use `max_files` and `max_replacements` as safety caps on broad rewrites
- Treat parse issues as a scoping signal: tighten `path`/`lang` before retrying
- Metavariables captured in `pattern` (`$A`, `$$$ARGS`) are substituted into `rewrite` — this is the core mechanism
- Each rewrite is a 1:1 structural substitution; you cannot split one capture into multiple nodes or merge multiple captures into one node
</instruction>

<output>
- Returns replacement summary, per-file replacement counts, and change previews
- Reports whether changes were applied or only previewed
- Includes parse issues when files cannot be processed
</output>

<examples>
- Preview a single exact-shape rewrite in one file:
  `{"pattern":"renderStatusLine({ icon: \"pending\", title: \"AST Find\", description, meta }, uiTheme)","rewrite":"renderStatusLine({ icon: \"success\", title: \"AST Find\", description, meta }, uiTheme)","lang":"typescript","path":"packages/coding-agent/src/tools/ast-find.ts","dry_run":true}`
- Preview with safety caps across multiple files (demonstrates cap behavior):
  `{"pattern":"renderPromptTemplate($A)","rewrite":"String(renderPromptTemplate($A))","lang":"typescript","path":"packages/coding-agent/src/tools/**/*.ts","dry_run":true,"max_files":2,"max_replacements":3}`
- Swap two arguments using captures:
  `{"pattern":"assertEqual($A, $B)","rewrite":"assertEqual($B, $A)","lang":"typescript","path":"tests/**/*.ts","dry_run":true}`
- Preserve variadic arguments through a rewrite:
  `{"pattern":"oldApi($$$ARGS)","rewrite":"newApi($$$ARGS)","lang":"typescript","path":"src/**/*.ts","dry_run":true}`
</examples>

<critical>
- `pattern` + `rewrite` are required
- If the path pattern spans multiple languages, set `lang` explicitly for deterministic rewrites
- Run `dry_run: true` first, review preview, then rerun with `dry_run: false` only when intent is explicit
- For one-off local text edits, prefer the Edit tool instead of AST replace
</critical>