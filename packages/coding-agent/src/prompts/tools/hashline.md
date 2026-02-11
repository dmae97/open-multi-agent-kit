# Edit (Replace lines)

Line-addressed edits using hash-verified line references. Read file with hashes first, then edit by referencing `LINE:HASH` pairs.

<instruction>
**Workflow:**
1. Read target file (hashes are included automatically in output)
2. Identify lines to change by their `LINE:HASH` prefix
3. Submit edit with `src` (structured spec) and `dst` (new content)
**Operations:**
- **Replace single**: `src: { kind: "single", ref: "5:ab" }` — replaces line 5
- **Replace range**: `src: { kind: "range", start: "5:ab", end: "9:ef" }` — replaces lines 5-9 with replacement (fewer dst lines = net deletion)
- **Delete range**: `src: { kind: "range", start: "5:ab", end: "9:ef" }, dst: ""` — deletes lines 5-9
- **Insert after**: `src: { kind: "insertAfter", after: "5:ab" }` — inserts after line 5 (line 5 unchanged)
- **Insert before**: `src: { kind: "insertBefore", before: "5:ab" }` — inserts before line 5 (line 5 unchanged)
**Rules:**
- `src` is an object with a `kind` field discriminating the operation type
- Line refs use `"LINE:HASH"` format from read output (e.g. `"5:ab"`)
- `dst` replaces the **entire line(s)** referenced by `src` — match the original indentation exactly in `dst`
- Do not merge multiple lines into one `dst` when `src` targets a single line — use a range instead
- Multiple edits in one call are applied bottom-up (safe for non-overlapping edits)
- Hashes verify file hasn't changed since your last read — stale hashes produce clear errors
- Hashes are derived from both line content and line number (copy them verbatim from read output)
</instruction>

<input>
- `path`: Path to the file to edit
- `edits`: Array of edit operations
	- `src`: Source spec object — one of:
		- `{ kind: "single", ref: "LINE:HASH" }` — single line
		- `{ kind: "range", start: "LINE:HASH", end: "LINE:HASH" }` — inclusive range
		- `{ kind: "insertAfter", after: "LINE:HASH" }` — insert after line
		- `{ kind: "insertBefore", before: "LINE:HASH" }` — insert before line
	- `dst`: Replacement content (`\n`-separated for multi-line, `""` for delete)
</input>

<output>
Returns success/failure; on failure, error message indicates:
- "Line N has changed since last read" — file was modified, re-read it
- "Line N does not exist" — line number out of range
- Validation errors for malformed line refs
</output>

<critical>
- Always read target file before editing — line hashes come from the read output
- If edit fails with hash mismatch, re-read the file to get fresh hashes
- Never fabricate hashes — always copy from read output
- Line refs use the format `LINE:HASH` as shown in read output (e.g., `"5:ab"`)
- `dst` contains plain content lines (no hash prefix)
</critical>

<example name="replace single line">
edit {"path":"src/app.py","edits":[{"src":{"kind":"single","ref":"2:9b"},"dst":"  print('Hello')"}]}
</example>

<example name="replace range">
edit {"path":"src/app.py","edits":[{"src":{"kind":"range","start":"5:ab","end":"8:ef"},"dst":"  combined = True"}]}
</example>

<example name="delete range">
edit {"path":"src/app.py","edits":[{"src":{"kind":"range","start":"5:ab","end":"6:ef"},"dst":""}]}
</example>

<example name="insert after">
edit {"path":"src/app.py","edits":[{"src":{"kind":"insertAfter","after":"3:e7"},"dst":"  # new comment"}]}
</example>

<example name="insert before">
edit {"path":"src/app.py","edits":[{"src":{"kind":"insertBefore","before":"3:e7"},"dst":"  # new comment"}]}
</example>

<example name="multiple edits">
edit {"path":"src/app.py","edits":[{"src":{"kind":"single","ref":"10:f1"},"dst":"  return True"},{"src":{"kind":"single","ref":"3:c4"},"dst":"  x = 42"}]}
</example>

<avoid>
- Fabricating or guessing hash values
- Using stale hashes after file has been modified
- Overlapping edits in the same call
</avoid>