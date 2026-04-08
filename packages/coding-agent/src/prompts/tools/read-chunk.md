Reads files using syntax-aware chunks.

<instruction>
- `path` — file path or URL; may include `:selector` suffix
- `sel` — optional selector: `class_Foo`, `class_Foo.fn_bar#ABCD@inner`, `?`, `L50`, `L50-L120`, or `raw`
- `timeout` — seconds, for URLs only

Each anchor `[full.chunk.path#CCCC]` in the default output identifies a chunk. Use `full.chunk.path#CCCC` as-is to read truncated chunks.
If you need a canonical target list, run `read(path="file", sel="?")`. That listing shows chunk paths plus the regions each chunk supports.
Line numbers in the gutter are absolute file line numbers.

Chunk trees: JS, TS, TSX, Python, Rust, Go. Others use blank-line fallback.
</instruction>

<critical>
- **MUST** `read` before editing — never invent chunk names or CRCs.
</critical>
