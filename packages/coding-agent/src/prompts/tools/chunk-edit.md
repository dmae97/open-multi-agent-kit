Edits files by addressing syntax-aware chunks from `read` output.

Read the file first with `read(path="file.ts")`. Use chunk paths exactly as shown by the latest `read` result. {{#if chunkSplices}}For `replace`, `delete`, and `splice`, supply{{else}}For `replace` and `delete`, supply{{/if}} the chunk checksum separately as `crc`.

Successful edit responses already include the updated root chunk rendering for that file. Do not immediately re-read the file just to refresh checksums unless the file may have changed externally.

**Checksum scope:** Each chunk has its own CRC over that chunk's source span. Editing non-overlapping lines elsewhere in the file does not change unrelated chunks' checksums. There is no separate whole-file guard.

<operations>
{{#if chunkSplices}}
**Choosing the right operation:**
- To fix a single line → `splice` with `beg`=`end`=that line number
- To fix a contiguous range of lines → `splice` with `beg`=first line, `end`=last line
- To rewrite an entire function/method from scratch → `replace` (without `beg`/`end`)
- `splice` is almost always the right choice for small, targeted fixes
- `replace` with `beg`/`end` also works for line-level fixes (same behavior as `splice`)
{{/if}}
|operation|format|effect|
|---|---|---|
|`append_child`|`{ "append_child": { "sel": "…", "content": "…" } }`|insert as last child inside a container (before closing delimiter)|
|`prepend_child`|`{ "prepend_child": { "sel": "…", "content": "…" } }`|insert as first child inside a container (after opening delimiter)|
|`append_sibling`|`{ "append_sibling": { "sel": "…", "content": "…" } }`|insert after the selected chunk|
|`prepend_sibling`|`{ "prepend_sibling": { "sel": "…", "content": "…" } }`|insert before the selected chunk|
|`replace`|`{ "replace": { "sel": "…", "crc": "…", "content": "…" } }`|without `beg`/`end`: rewrite the **entire** chunk from first line to last line; supply full replacement content. With `beg`/`end`: replace only those **file lines** within the chunk (same as `splice` but semantically a replacement). `splice` is almost always the right choice for small, targeted fixes|
|`delete`|`{ "delete": { "sel": "…", "crc": "…" } }`|remove the entire chunk|
{{#if chunkSplices}}
|`splice`|`{ "splice": { "sel": "…", "crc": "…", "beg": N, "end": N } }`|when `beg` ≤ `end`, replace **file** lines `beg`–`end` (inclusive) within the selected chunk; empty `content` deletes them. When `beg` = `end` + 1, **zero-width splice**: insert in the gap after file line `end` and before file line `beg` (no lines removed)|
{{/if}}
- `sel` is the chunk path
- `crc` is the chunk checksum used for staleness validation on `replace`, `delete`{{#if chunkSplices}}, and `splice`{{/if}}; it guards the selected chunk, not unrelated file changes elsewhere in the file
{{#if chunkSplices}}
- `beg`/`end` are **absolute file line numbers** (same as the gutter in `read`). They must fall within the selected chunk's file line span (or form a valid zero-width gap on its boundary).
{{/if}}
- `path="file.ts:chunk_path"` sets a default `sel` for operations that omit it
- top-level `crc` sets the default checksum for the path-level selector
- **Auto-indent (flat):** The tool adds the target insertion column's base indent to every **non-empty** line of your `content`. It does not parse or understand block nesting; put any deeper relative indentation in the `content` yourself (extra leading spaces/tabs on inner lines).
- Chunk paths are always fully qualified: `class_Server.fn_start`, not bare `fn_start`
- Batch ops observe earlier edits in the same request. If op 1 changes a chunk's checksum, span, or path, op 2 must use the **post-op-1** checksum/span/path.
- `replace`/`delete` operate on the selected chunk range, including leading comments or attributes that the parser attached to that chunk.
</operations>

{{#if chunkSplices}}
<splice>
**Zero-width `splice` (insert only, `beg` = `end` + 1), using file line numbers `S` = chunk's first line, `E` = chunk's last line:**

Use zero-width splice for separator gaps between neighboring chunks. Gap edits are independent from either chunk's checksum: inserting into the gap does not update the following chunk's `crc`, and later `replace`/`delete` operations only affect that chunk's own selected range.

|Goal|`beg`|`end`|
|---|---|---|
|Insert before file line L|L|L − 1|
|Insert after file line L|L + 1|L|
|Insert before the chunk's first line S|S|S − 1|
|Insert after the chunk's last line E|E + 1|E|
</splice>
{{/if}}

<examples>
All examples reference this `read` output (`beg`/`end` match the gutter):
```
   │ server.ts  ·  40 lines  ·  ts  ·  #VSKB
   │

 1 │ import { log, warn } from "./logger";
   │ <:imports#SPVY>

 3 │ const MAX_RETRIES = 3;
   │ <:var_MAX_RETRIES#ZHZM>

 5 │ class Server {
   │ <:class_Server#XKQZ>
 6 │   private port: number;
   │   <.fields#NMYB>

 8 │   constructor(port: number) {
   │   <.constructor#BNNH>
 9 │     this.port = port;
10 │   }

12 │   start(): void {
   │   <.fn_start#HTST>
13 │     log("booting on " + this.port);
14 │     for (let i = 0; i < MAX_RETRIES; i++) {
15 │       this.tryBind();
16 │     }
17 │   }

19 │   private tryBind(): boolean {
   │   <.fn_tryBind#VNWR>
20 │     // TODO: add backoff
21 │     return bind(this.port);
22 │   }
```

<example name="replace a method">
```
"path": "server.ts",
"operations": [
  {
    "replace": {
      "sel": "class_Server.fn_start",
      "crc": "HTST",
      "content": "start(): void {\n  log(\"starting\");\n  this.tryBind();\n}"
    }
  }
]
```
</example>

{{#if chunkSplices}}
<example name="splice a line subrange">
```
"path": "server.ts",
"operations": [
  {
    "splice": {
      "sel": "class_Server.fn_start",
      "crc": "HTST",
      "beg": 13,
      "end": 13,
      "content": " warn(\"booting on \" + this.port);"
    }
  }
]
```
</example>

<example name="insert a line inside a method (zero-width splice)">
```
"path": "server.ts",
"operations": [
  {
    "splice": {
      "sel": "class_Server.fn_start",
      "crc": "HTST",
      "beg": 13,
      "end": 12,
      "content": "const startedAt = Date.now();"
    }
  }
]
```
</example>
{{/if}}
<example name="delete a chunk">
```
"path": "server.ts",
"operations": [
  {
    "delete": {
      "sel": "class_Server.fn_tryBind",
      "crc": "VNWR"
    }
  }
]
```
</example>

{{#if chunkSplices}}
<example name="batch multiple edits">
```
"path": "server.ts",
"operations": [
  {
    "splice": {
      "sel": "class_Server.fn_start",
      "crc": "HTST",
      "beg": 13,
      "end": 13,
      "content": " warn(\"booting on \" + this.port);"
    }
  },
  {
    "delete": {
      "sel": "class_Server.fn_tryBind",
      "crc": "VNWR"
    }
  }
]
```
</example>
{{else}}
<example name="batch multiple edits">
```
"path": "server.ts",
"operations": [
  {
    "replace": {
      "sel": "class_Server.fn_start",
      "crc": "HTST",
      "content": "start(): void {\n  warn(\"booting on \" + this.port);\n  for (let i = 0; i < MAX_RETRIES; i++) {\n    this.tryBind();\n  }\n}"
    }
  },
  {
    "delete": {
      "sel": "class_Server.fn_tryBind",
      "crc": "VNWR"
    }
  }
]
```
</example>
{{/if}}
</examples>

<critical>
- You **MUST** always include `path` in every edit call.
- You **MUST** read the latest chunk output before editing.
- You **MUST** provide `crc` for `replace`, `delete`{{#if chunkSplices}}, and `splice`{{/if}}.
- You **MUST** use the updated root chunk output from the edit response for follow-up edits in the same file when possible.
- You **MUST** use the smallest correct chunk; do not rewrite siblings unnecessarily.
- You **MUST NOT** invent chunk paths. Read the current listing first and copy the actual path names, including `fn_*` prefixes as shown. Chunk nesting uses `.`.
{{#if chunkSplices}}
- For `splice`, copy `beg`/`end` from the **file line numbers** in `read` output (the same values as elision `sel=L…` ranges).
- **Do NOT batch multiple `splice` operations on the same chunk** in one edit call. Each splice changes the chunk's checksum, and you cannot predict the new checksum. Instead: either combine the changes into a single splice with a wider `beg`/`end` range covering all affected lines, or make separate edit calls (one splice per call).
{{/if}}
- When restoring a deleted statement, check surrounding lines carefully — insert at the exact position relative to existing code. Do not duplicate adjacent lines.
- Use only chunk paths that appear in the `read` output. If you need deeper chunks, `read` the parent chunk first to discover its children.
</critical>
</output>
