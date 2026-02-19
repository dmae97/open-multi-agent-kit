# Edit

Apply precise file edits using `LINE#ID` tags, anchoring to the file content.

<workflow>
1. `read` the target range to capture current `LINE#ID` tags.
2. Pick the smallest operation per change site (line/range/insert/content-replace).
3. Direction-lock every edit: exact current text → intended text.
4. Submit one `edit` call per file containing all operations.
5. If another edit is needed in that file, re-read first (hashes changed).
6. Output tool calls only; no prose.
</workflow>

<operations>
- **Single line replace/delete**
  - `{ op: "set", tag: "N#ID", content: […] }`
  - `content: null` deletes the line; `content: [""]` keeps a blank line.
- **Range replace/delete**
  - `{ op: "replace", first: "N#ID", last: "N#ID", content: […] }`
  - Use for swaps, block rewrites, or deleting a full span (`content: null`).
- **Insert** (new content)
  - `{ op: "prepend", before: "N#ID", content: […] }` or `{ op: "prepend", content: […] }` (no `before` = insert at beginning of file)
  - `{ op: "append", after: "N#ID", content: […] }` or `{ op: "append", content: […] }` (no `after` = insert at end of file)
  - `{ op: "insert", after: "N#ID", before: "N#ID", content: […] }` (between adjacent anchors; safest for blocks)
{{#if allowReplaceText}}
- **Content replace**
  - `{ op: "replaceText", old_text: "…", new_text: "…", all?: boolean }`
{{/if}}
- **File-level controls**
  - `{ delete: true, edits: [] }` deletes the file (cannot be combined with `rename`).
  - `{ rename: "new/path.ts", edits: […] }` writes result to new path and removes old path.
**Atomicity:** all ops validate against the same pre-edit file snapshot; refs are interpreted against last `read`; applicator applies bottom-up.
</operations>

<rules>
1. **Minimize scope:** one logical mutation site per operation.
2. **Preserve formatting:** keep indentation, punctuation, line breaks, trailing commas, brace style.
3. **Prefer insertion over neighbor rewrites:** anchor on structural boundaries (`}`, `]`, `},`) not interior property lines.
4. **No no-ops:** replacement content must differ from current content.
5. **Touch only requested code:** avoid incidental edits.
6. **Use exact current tokens:** never rewrite approximately; mutate the token that exists now.
7. **For swaps/moves:** prefer one range operation over multiple single-line operations.
</rules>

<op_choice>
- One wrong line → `set`
- Adjacent block changed → `insert`
- Missing line/block → insert with `append`/`prepend`
</op_choice>

<tag_choice>
- Copy tags exactly from the prefix of the `read` or error output.
- Never guess tags.
- For inserts, prefer `insert` > `append`/`prepend` when both boundaries are known.
- Re-read after each successful edit call before issuing another on same file.
</tag_choice>

<recovery>
**Tag mismatch (`>>>`)**
- Retry with the updated tags shown in error output.
- Re-read only if required tags are missing from error snippet.
- If mismatch repeats, stop and re-read the exact block.
</recovery>

<example name="fix a value or type">
```ts
{{hlinefull 23 "  const timeout: number = 5000;"}}
```
```
op: "set"
tag: "{{hlineref 23 "  const timeout: number = 5000;"}}"
content: ["  const timeout: number = 30_000;"]
```
</example>

<example name="remove a line entirely">
```ts
{{hlinefull 7 "// @ts-ignore"}}
{{hlinefull 8 "const data = fetchSync(url);"}}
```
```
op: "set"
tag: "{{hlineref 7 "// @ts-ignore"}}"
content: null
```
</example>

<example name="clear content but keep the line break">
```ts
{{hlinefull 14 "  placeholder: \"DO NOT SHIP\","}}
```
```
op: "set"
tag: "{{hlineref 14 "  placeholder: \"DO NOT SHIP\","}}"
content: [""]
```
</example>

<example name="rewrite a block of logic">
```ts
{{hlinefull 60 "    } catch (err) {"}}
{{hlinefull 61 "      console.error(err);"}}
{{hlinefull 62 "      return null;"}}
{{hlinefull 63 "    }"}}
```
```
op: "replace"
first: "{{hlineref 60 "    } catch (err) {"}}"
last: "{{hlineref 63 "    }"}}"
content: ["    } catch (err) {", "      if (isEnoent(err)) return null;", "      throw err;", "    }"]
```
</example>

<example name="remove a full block">
```ts
{{hlinefull 80 "  // TODO: remove after migration"}}
{{hlinefull 81 "  if (legacy) {"}}
{{hlinefull 82 "    legacyHandler(req);"}}
{{hlinefull 83 "  }"}}
```
```
op: "replace"
first: "{{hlineref 80 "  // TODO: remove after migration"}}"
last: "{{hlineref 83 "  }"}}"
content: null
```
</example>

<example name="add an import above the first import">
```ts
{{hlinefull 1 "import * as fs from \"node:fs/promises\";"}}
{{hlinefull 2 "import * as path from \"node:path\";"}}
```
```
op: "prepend"
before: "{{hlineref 1 "import * as fs from \"node:fs/promises\";"}}"
content: ["import * as os from \"node:os\";"]
```
Use `before` for anchored insertion before a specific line. Omit `before` to prepend at BOF.
</example>

<example name="append at end of file">
```ts
{{hlinefull 260 "export { serialize, deserialize };"}}
```
```
op: "append"
after: "{{hlineref 260 "export { serialize, deserialize };"}}"
content: ["export { validate };"]
```
Use `after` for anchored insertion after a specific line. Omit `after` to append at EOF.
</example>

<example name="add an entry between known siblings">
```ts
{{hlinefull 44 "  \"build\": \"bun run compile\","}}
{{hlinefull 45 "  \"test\": \"bun test\""}}
```
```
op: "insert"
after: "{{hlineref 44 "  \"build\": \"bun run compile\","}}"
before: "{{hlineref 45 "  \"test\": \"bun test\""}}"
content: ["  \"lint\": \"biome check\","]
```
Dual anchors pin the insert to exactly one gap, preventing drift from edits elsewhere in the file. **Always prefer dual anchors when both boundaries are content lines.**
</example>

<example name="insert a function before another function">
```ts
{{hlinefull 100 "  return buf.toString(\"hex\");"}}
{{hlinefull 101 "}"}}
{{hlinefull 102 ""}}
{{hlinefull 103 "export function serialize(data: unknown): string {"}}
```
```
op: "insert"
before: "{{hlineref 103 "export function serialize(data: unknown): string {"}}"
content: ["function validate(data: unknown): boolean {", "  return data != null && typeof data === \"object\";", "}", ""]
```
The trailing `""` in `content` preserves the blank-line separator. **Anchor to the structural line (`export function ...`), not the blank line above it** — blank lines are ambiguous and may be added or removed by other edits.
</example>

{{#if allowReplaceText}}
<example name="content replace (rare)">
```
op: "replaceText"
old_text: "x = 42"
new_text: "x = 99"
```

Use only when line anchors aren't available. `old_text` must match exactly one location in the file (or set `"all": true` for all occurrences).
</example>
{{/if}}

<example name="file delete">
```
path: "src/deprecated/legacy.ts"
delete: true
```
</example>

<example name="file rename with edits">
```
path: "src/utils.ts"
rename: "src/helpers/utils.ts"
edits: […]
```
</example>

<example name="anti-pattern: anchoring to whitespace">
Bad — tags to a blank line; fragile if blank lines shift:
```
after: "{{hlineref 102 ""}}"
content: ["function validate() {", …, "}"]
```

Good — anchors to the structural target:

```
before: "{{hlineref 103 "export function serialize(data: unknown): string {"}}"
content: ["function validate() {", …, "}"]
```
</example>

<critical>
Ensure:
- Payload shape is `{ "path": string, "edits": [operation, …], "delete"?: boolean, "rename"?: string }`
- Every edit matches exactly one variant
- Every tag has been copied EXACTLY from a tool result as `N#ID`
- Scope is minimal and formatting is preserved except targeted token changes
</critical>
**Final reminder:** tags are immutable references to the last read snapshot. Re-read when state changes, then edit.