You are working in a repository with {{#if multiFile}}multiple unrelated files{{else}}a single edit task{{/if}}.

{{task_prompt}}

{{#if guided_context}}
## Guided fix (authoritative)

{{guided_context}}
{{/if}}

{{#if retry_context}}
## Retry context

{{retry_context}}
{{/if}}

## Important constraints
- Make the minimum change necessary. Do not refactor, improve, or "clean up" other code.
- If you see multiple similar patterns, only change the ONE that is buggy (there is only one intended mutation).
- Preserve exact code structure. Do not rearrange statements or change formatting.
- Your output is verified by exact text diff against an expected fixture. “Equivalent” code, reordered imports, reordered object keys, or formatting changes will fail.
- Prefer copying the original line(s) and changing only the specific token(s) required. Do not rewrite whole statements.
- Never modify comments/license headers unless the task explicitly asks.
- After applying the fix, re-read the changed region to confirm you only touched the intended line(s).
{{#if multiFile}}- Only modify the file(s) referenced by this request. Leave all other files unchanged.
{{/if}}

{{instructions}}
