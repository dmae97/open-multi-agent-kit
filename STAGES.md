# ChunkState Migration — Parallelization Stages

## Stage 0: Types (sequential, ~5 min)
**Owner:** main agent

Write the shared type definitions that all subsequent stages depend on.

**File:** `crates/pi-natives/src/chunk/types.rs`
- Remove `#[napi(object)]` from `ChunkNode` and `ChunkTree` (become Rust-internal)
- Remove `RenderChunkTreeParams` napi object (replaced by method params)
- Add `ChunkInfo` — lightweight `#[napi(object)]` returned to JS from queries
- Add `EditOperation`, `EditParams` — `#[napi(object)]` input types
- Add `EditResult` — `#[napi(object)]` output with `ChunkState` instance
- Add `ReadRenderParams`, `ReadResult` — `#[napi(object)]` for render_read
- Keep `ChunkAnchorStyle` and `VisibleLineRange` as-is

**Output:** committed types.rs that `cargo check` won't pass yet (consumers not updated), but all type definitions are final.

---

## Stage 1: Parallel Rust modules (4 agents, worktree isolation)

All agents receive the finalized types from Stage 0 in their prompt. Each writes a single new file.

### Agent 1A: `resolve.rs` — Selector resolution
**File:** `crates/pi-natives/src/chunk/resolve.rs` (new)

Port from `chunk-tree.ts` lines 875–990:
- `sanitize_selector(sel) -> Option<String>` — strip filename prefix, leading colon, trailing #XXXX
- `resolve_exact(chunks, path) -> Option<usize>` — index lookup
- `resolve_suffix(chunks, sel) -> Result<usize>` — suffix match ("fn_foo" → "class_Bar.fn_foo")
- `resolve_prefix(chunks, sel) -> Result<usize>` — CHUNK_NAME_PREFIXES expansion
- `resolve_kind_path(chunks, sel) -> Result<usize>` — "class.fn" → "class_Server.fn_start"
- `resolve_by_crc(chunks, crc) -> Option<usize>` — checksum lookup
- `resolve_selector(chunks, sel) -> Result<usize, ResolveError>` — orchestrates all of the above
- `suggest_paths(chunks, query, limit) -> Vec<String>` — similarity-based suggestions for errors
- `sanitize_crc(crc) -> Option<String>`

**Reads:** `chunk-tree.ts` (resolveAnchorChunk, sanitizeChunkSelector, sanitizeCrc, chunkPathSimilarity, suggestChunkPaths, CHUNK_NAME_PREFIXES, CONTAINER_NAME_PREFIXES)

### Agent 1B: `indent.rs` — Indentation & content normalization
**File:** `crates/pi-natives/src/chunk/indent.rs` (new)

Port from `chunk-tree.ts` lines 217–410:
- `detect_common_indent(text) -> (String, usize)`
- `dedent_python_style(text) -> String`
- `indent_non_empty_lines(text, prefix) -> String`
- `detect_space_indent_step(text) -> usize`
- `normalize_leading_whitespace_char(text, target_char, file_indent_step) -> String`
- `reindent_inserted_block(content, target_indent, file_indent_step) -> String`
- `normalize_inserted_content(content, target_indent, file_indent_step) -> String`
- `strip_content_prefixes(content) -> String` (line-number gutter stripping)
- `detect_file_indent_step(chunks) -> u32`

**Reads:** `chunk-tree.ts` (all indentation helpers, stripContentPrefixes, CHUNK_GUTTER_CODE_ROW_RE)

### Agent 1C: `edit.rs` — Edit engine
**File:** `crates/pi-natives/src/chunk/edit.rs` (new)

Port from `chunk-tree.ts` lines 1040–1850. Assumes `resolve.rs` and `indent.rs` exist with the signatures above.
- `validate_crc(chunk, crc) -> Result<()>`
- `validate_line_range(chunk, line, end_line) -> Result<()>`
- `compute_insert_indent(state, anchor, inside) -> String`
- `get_insertion_point(state, anchor, placement) -> InsertionPoint`
- `compute_insert_spacing(state, anchor, pos) -> Spacing`
- `normalize_insertion_boundary(source, offset, content, spacing) -> String`
- `cleanup_blank_line_artifacts(text, offset) -> String`
- `go_type_append_child_insertion_point(state, anchor, content) -> Option<InsertionPoint>`
- `apply_edits(state: &ChunkStateInner, params: EditParams) -> Result<EditResult>`
  - The main entry point. Schedules ops, sorts line-scoped, executes in order, rebuilds tree after each, validates parse errors, generates response.

**Reads:** `chunk-tree.ts` (applyChunkEdits and everything it calls: validateCrc, validateLineRange, computeInsertIndent, getInsertionPoint, getInsertionPointForPosition, computeInsertSpacing, normalizeInsertionBoundaryContent, cleanupBlankLineArtifactsAtOffset, goTypeAppendChildInsertionPoint, isContainerLikeChunk, renderChangedHunks)

### Agent 1D: `state.rs` — ChunkState napi class
**File:** `crates/pi-natives/src/chunk/state.rs` (new)

The napi class that ties everything together. Assumes `resolve.rs`, `indent.rs`, `edit.rs` exist.
- `ChunkState` struct with `Arc<ChunkStateInner>`
- `ChunkStateInner` struct (source, language, checksum, line_count, parse_errors, chunks, chunk_index)
- `#[napi(factory)] fn parse(source, language) -> Result<ChunkState>`
- `#[napi(getter)]` for source, language, checksum, line_count, parse_errors
- `#[napi] fn resolve(&self, path) -> Option<ChunkInfo>`
- `#[napi] fn resolve_selector(&self, selector) -> Result<ChunkInfo>`
- `#[napi] fn resolve_by_crc(&self, crc) -> Option<ChunkInfo>`
- `#[napi] fn line_to_chunk_path(&self, line) -> Option<String>`
- `#[napi] fn line_to_containing_chunk_path(&self, line) -> Option<String>`
- `#[napi] fn render(&self, params: RenderParams) -> String` — delegates to render.rs
- `#[napi] fn render_read(&self, params: ReadRenderParams) -> ReadResult` — replaces formatChunkedRead
- `#[napi] fn format_grep_line(&self, line, text, display_path) -> String`
- `#[napi] fn format_anchor(&self, name, checksum, depth, style, omit_checksum) -> String`
- `#[napi] fn apply_edits(&self, params: EditParams) -> Result<EditResult>` — delegates to edit.rs

**Reads:** `chunk-tree.ts` (loadChunkTreeForFile, formatChunkedRead, formatChunkedGrepLine — for the render_read and format_grep_line signatures/logic), existing `mod.rs` build_chunk_tree, render.rs

---

## Stage 2: Parallel wiring (2 agents)

### Agent 2A: Rust integration
**Files:** `crates/pi-natives/src/chunk/mod.rs`, `crates/pi-natives/src/chunk/render.rs`
- Add `mod state; mod resolve; mod indent; mod edit;` to mod.rs
- Remove old napi function exports (parseChunkTree, resolveChunkPath, etc)
- Export `ChunkState` from mod.rs
- Adapt render.rs to accept `&[ChunkNodeInternal]` / `&ChunkStateInner` instead of `&RenderChunkTreeParams`
- `cargo check -p pi-natives`

### Agent 2B: TS rewrite
**Files:** `packages/natives/src/chunk/{types.ts, index.ts}`, `packages/coding-agent/src/tools/chunk-tree.ts`, `packages/coding-agent/src/tools/read.ts`, `packages/coding-agent/src/patch/index.ts`
- New `types.ts`: `ChunkState` class interface, `ChunkInfo`, `EditParams`, `EditResult`, etc
- New `index.ts`: export `ChunkState` class from native
- Gut `chunk-tree.ts` to ~200 lines: LRU cache of `ChunkState` instances, thin async wrappers
- Update `read.ts` and `patch/index.ts` to use new API
- `bun run tsc --noEmit`

---

## Stage 3: Test & fix (sequential)
**Owner:** main agent

- `cargo check -p pi-natives` + `cargo test`
- `bun run tsc --noEmit`
- `bun test packages/coding-agent/test/core/chunk-tree.test.ts`
- `bun test packages/coding-agent/test/tools/chunk-mode.test.ts`
- Fix any integration issues
- Render prompt templates with all anchor styles to verify
