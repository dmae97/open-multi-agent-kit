# Edit (Replace lines)

Line-addressed edits using hash-verified line references. Read file with hashes first, then edit by referencing `LINE:HASH` pairs.

<critical>
- Copy `LINE:HASH` refs verbatim from read output — never fabricate or guess hashes
- `content` contains plain replacement lines only — no `LINE:HASH|` prefix, no diff `+` markers
- On hash mismatch: use the updated `LINE:HASH` refs shown by `>>>` directly; only `read` again if you need additional lines/context
- If you already edited a file in this turn, re-read that file before the next edit to it
- For code-change requests, respond with tool calls, not prose
- Edit only requested lines. Do not reformat unrelated code.
</critical>

<instruction>
**Workflow:**
1. Read target file (`read` with `hashes: true`)
2. Collect the exact `LINE:HASH` refs you need
3. Submit one `edit` call with all known operations for that file
4. If another change on same file is needed later: re-read first, then edit

**Edit variants:**
- `{ replaceLine: { loc: "LINE:HASH", content: "..." } }`
- `{ replaceLines: { start: "LINE:HASH", end: "LINE:HASH", content: "..." } }`
- `{ insertAfter: { loc: "LINE:HASH", content: "..." } }`
- `{ insertBefore: { loc: "LINE:HASH", content: "..." } }`
- `{ substr: { needle: "unique substring", content: "..." } }` — use when line hashes unavailable; needle must match exactly one line

`content: ""` means delete (for `replaceLine`/`replaceLines`).
</instruction>

<input>
- `path`: File path
- `edits`: Array of edit operations (one of the variants above)
</input>

<example name="replace single line">
edit {"path":"src/app.py","edits":[{"replaceLine":{"loc":"{{hashline 2 'x = 42'}}","content":"  x = 99"}}]}
</example>

<example name="replace range">
edit {"path":"src/app.py","edits":[{"replaceLines":{"start":"{{hashline 5 'old_value = True'}}","end":"{{hashline 8 'return result'}}","content":"  combined = True"}}]}
</example>

<example name="delete lines">
edit {"path":"src/app.py","edits":[{"replaceLines":{"start":"{{hashline 5 'old_value = True'}}","end":"{{hashline 6 'unused = None'}}","content":""}}]}
</example>

<example name="insert after">
edit {"path":"src/app.py","edits":[{"insertAfter":{"loc":"{{hashline 3 'def hello'}}","content":"  # new comment"}}]}
</example>

<example name="insert before">
edit {"path":"src/app.py","edits":[{"insertBefore":{"loc":"{{hashline 3 'def hello'}}","content":"  # new comment"}}]}
</example>

<example name="multiple edits (bottom-up safe)">
edit {"path":"src/app.py","edits":[{"replaceLine":{"loc":"{{hashline 10 'return True'}}","content":"  return False"}},{"replaceLine":{"loc":"{{hashline 3 'def hello'}}","content":"  x = 42"}}]}
</example>
