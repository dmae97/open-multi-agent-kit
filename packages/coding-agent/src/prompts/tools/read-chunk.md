Reads files using syntax-aware chunks.

<instruction>
## Parameters
- `path` -- file path or URL; may include `:selector` suffix as an alternative to `sel`
- `sel` -- optional selector (see table below)
- `timeout` -- seconds, for URLs only

## Selectors

|Input|Behavior|
|---|---|
|_(omitted)_|Render the file root chunk|
|`class_Foo`|Read a chunk by path|
|`class_Foo.fn_bar`|Read a nested chunk path|
|`L50` or `L50-L120`|Absolute **file** line range: show chunks that overlap those lines, or that contain a child under those lines (e.g. Go receiver methods under a type whose header is outside the range)|
|`raw`|Read full raw file content (no chunk rendering)|

Each anchor line shows `<:name#CCCC>` or `<.name#CCCC>` — `#CCCC` is the edit checksum. Copy it when editing with `chunk-edit`.

Selectors can overlap. For example, Rust `attribute_N` chunks and the following `enum_` / `struct_` chunk may cover the same leading doc-comment or attribute lines. Use the attribute selector when you only want to edit the attached comments/attributes; use the type selector when you want to replace the declaration together with those attached lines.

If a `path:chunk` suffix and `sel` are both provided, `sel` wins unless `path` carries the chunk selector and `sel` is a line range (`L<n>` or `L<n>-L<m>`). In that case `L…` is still **absolute file lines**, clipped to that chunk; if the range does not overlap the chunk, the tool reports the chunk’s file line span and a suggested `sel=`. Missing chunk paths return `[Chunk not found]`.

The header `N lines` reports the actual file line count for a file-root read. For nested chunk selectors, it reports the lines this selector currently renders, not a raw parser field. That count can be larger than the chunk’s lexical header when the renderer groups related descendants under the parent (for example Go receiver methods shown beneath their receiver type).
Code rows use **absolute file line numbers** in the gutter. Middle elisions use `sel=L<start>-L<end>` with the same absolute indices. `chunk-edit` **splice** `beg`/`end` use those same **absolute file line numbers** (see `chunk-edit` tool docs).

Rendered gap lines are visual context, not checksum ownership. If you need to edit the separator between two chunks, use zero-width `splice` on the adjacent chunk boundary instead of `replace` on either neighboring chunk.
## Examples

`read(path="src/math.ts")`

```text
   │ src/math.ts  ·  120 lines  ·  ts  ·  #A744
   │

 5 │ export function sum(values: readonly number[]): number {
   │ <:sum#3286>
 6 │   return values.reduce((total, value) => total + value, 0);
 7 │ }

10 │ export class Calculator {
   │ <:Calculator#5D36>
11 │   multiply(left: number, right: number): number {
   │   <.multiply#B592>
12 │     return left * right;
13 │   }
14 │ }
```

`read(path="src/math.ts", sel="class_Calculator")`

```text
   │ src/math.ts:class_Calculator  ·  5 lines  ·  ts  ·  #5D36
   │

10 │ export class Calculator {
   │ <:Calculator#5D36>
11 │   multiply(left: number, right: number): number {
   │   <.multiply#B592>
12 │     return left * right;
13 │   }
14 │ }
```

`read(path="src/math.ts", sel="L7-L12")`

```text
[Notice: chunk view scoped to requested lines L7-L12; non-overlapping lines omitted.]

   │ src/math.ts  ·  120 lines  ·  ts  ·  #A744
   │
```

`read(path="src/math.ts:class_Calculator.fn_square", sel="L11-L12")`

```text
   │ src/math.ts:class_Calculator.fn_square  ·  3 lines  ·  ts  ·  #C9A8
   │

11 │   square(value: number): number {
12 │     return this.multiply(value, value);
```

## Language Support

Chunk trees: JavaScript, TypeScript, TSX, Python, Rust, Go. Others use blank-line fallback.
</instruction>

<critical>
- You **MUST** use `read` instead of shell commands for file reading.
- You **MUST** copy the current checksum before editing a chunk with `chunk-edit`.
- You **MUST** not assume chunk names; always read the current output first.
</critical>
