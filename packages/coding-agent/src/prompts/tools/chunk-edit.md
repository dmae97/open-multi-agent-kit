Edits files via syntax-aware chunks. Run `read(path="file.ts")` first. The edit target is a chunk selector, optionally qualified with a region.

<rules>
- **MUST** `read` first. Never invent chunk paths or CRCs. Copy them from the latest `read` output or edit response.
- `target` format:
  - insertions: `chunk` or `chunk@region`
  - replacements: `chunk#CRC` or `chunk#CRC@region`
- Without a `@region` it defaults to the entire chunk. Valid regions: `head`, `inner`, `tail`.
- If the exact chunk path is unclear, run `read(path="file", sel="?")` and copy a selector from that listing.
- Use `\t` for indentation in `content`. Do **NOT** include the chunk's base indentation. Only indent relative to the chunk's opening level.
- `replace` requires the current CRC. Insertions do not.
- Successful edits return refreshed chunk anchors. Use the latest selectors/CRCs for follow-up edits.
</rules>

<regions>
- `@head` — attached trivia, header/signature, and opening delimiter.
- `@inner` — the editable interior only.
- `@tail` — the closing delimiter or trailing owned trailer.

For leaf chunks (fields, variants, single-line items), omit the region, they don't support regions.

**Important:** `append`/`prepend` without a `@region` inserts *outside* the chunk. To add children *inside* a class, struct, enum, or function body, use `@inner`:
- `class_Foo@inner` + `append` → adds inside the class before `}`
- `class_Foo@inner` + `prepend` → adds inside the class after `{`
- `class_Foo` + `append` → adds after the entire class (after `}`)
</regions>

<ops>
|op|target form|effect|
|---|---|---|
|`replace`|`chunk#CRC` or `chunk#CRC@region`|rewrite the addressed region|
|`before`|`chunk` or `chunk@region`|insert before the region span|
|`after`|`chunk` or `chunk@region`|insert after the region span|
|`prepend`|`chunk` or `chunk@region`|insert at the start inside the region|
|`append`|`chunk` or `chunk@region`|insert at the end inside the region|
</ops>

<examples>
- Replace only a function body without touching the closing brace:
  - `target: "fn_main#ABCD@inner"`
  - `op: "replace"`
  - `content: "\treturn compute();\n"`
- Insert a new top-level function after another top-level function:
  - `target: "fn_prev"`
  - `op: "after"`
  - `content: "function next(): void {\n\twork();\n}\n"`
- Add a struct field:
  - `target: "type_Server@inner"`
  - `op: "append"`
  - `content: "\tport int\n"`
- Add a Go receiver method owned by the type, not a struct field:
  - `target: "type_Server"`
  - `op: "append"`
  - `content: "func (s *Server) Stop() error {\n\treturn nil\n}\n"`
- Edit a doc comment or header block:
  - `target: "fn_foo#WXYZ@head"`
  - `op: "replace"`
  - `content: "/**\n * Updated docs.\n */\nfunction foo() {"`
- Indentation rules (important):
  - Use `\t` for each indent level. The tool converts tabs to the file's actual style (2-space, 4-space, etc.).
  - Do NOT include the chunk's base indentation — only indent relative to the region's opening level.
  - For `@inner` of a function: `\t` = one level inside the body. Write `"\treturn x;\n"`, not `"\t\t\treturn x;\n"`.
  - For `@head`: `\t` = one level at the chunk's own depth. A class member's head uses `"\t/** doc */\n\tstart(): void {"`.
  - For a top-level item: start at zero indent. Write `"function foo() {\n\treturn 1;\n}\n"`.
  - The tool strips common leading indentation from your content as a safety net, so accidental over-indentation is corrected.
</examples>
