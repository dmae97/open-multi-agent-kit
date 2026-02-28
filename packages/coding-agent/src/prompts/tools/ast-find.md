Performs structural code search using AST matching via native ast-grep.

<instruction>
- Use this when syntax shape matters more than raw text (calls, declarations, specific language constructs)
- Prefer a precise `path` scope to keep results targeted and deterministic (`path` accepts files, directories, or glob patterns)
- Default to language-scoped search in mixed repositories: pair `path` glob + explicit `lang` to avoid parse-noise from non-source files
- `pattern` is required; `lang` is optional (`lang` is inferred per file extension when omitted)
- Use `selector` only for contextual pattern mode; otherwise provide a direct pattern
- Enable `include_meta` when metavariable captures are needed in output
- For variadic arguments/fields, use `$$$NAME` (not `$$NAME`)
- Patterns match AST structure, not text — whitespace/formatting differences are ignored
- When the same metavariable appears multiple times, all occurrences must match identical code
</instruction>

<output>
- Returns grouped matches with file path, byte range, and line/column ranges
- Includes summary counts (`totalMatches`, `filesWithMatches`, `filesSearched`) and parse issues when present
</output>

<examples>
- Find prompt-template call sites in tool code (scoped + typed):
  `{"pattern":"renderPromptTemplate($A)","lang":"typescript","path":"packages/coding-agent/src/tools/**/*.ts","include_meta":true}`
- Match variadic call arguments correctly:
  `{"pattern":"renderStatusLine($$$ARGS)","lang":"typescript","path":"packages/coding-agent/src/tools/**/*.ts","include_meta":true}`
- Exact call-shape match in one file:
  `{"pattern":"renderStatusLine({ icon: \"pending\", title: \"AST Find\", description, meta }, uiTheme)","lang":"typescript","path":"packages/coding-agent/src/tools/ast-find.ts"}`
- Contextual pattern with selector — match only the identifier `foo`, not the whole call:
  `{"pattern":"foo()","selector":"identifier","lang":"typescript","path":"src/utils.ts"}`
</examples>

<critical>
- `pattern` is required
- Set `lang` explicitly to constrain matching when path pattern spans mixed-language trees
- Avoid repo-root AST scans when the target is language-specific; narrow `path` first
- If exploration is broad/open-ended across subsystems, use Task tool with explore subagent first
</critical>