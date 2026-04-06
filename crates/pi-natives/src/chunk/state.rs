use std::{
	collections::HashMap,
	sync::{Arc, LazyLock},
};

use napi::{Error, Result};
use napi_derive::napi;
use regex::Regex;

use super::build_chunk_tree;
use crate::chunk::types::{
	ChunkInfo, ChunkNode, ChunkReadStatus, ChunkReadTarget, ChunkTree, EditParams, EditResult,
	ReadRenderParams, ReadResult, RenderParams, VisibleLineRange,
};

const CHECKSUM_SUFFIX_RE: &str = r"^(.*?)(?:\s+)?#([0-9A-Fa-f]{4})$";
const LINE_RANGE_SELECTOR_RE: &str = r"^L(\d+)(?:-L?(\d+))?$";
const TLAPLUS_BEGIN_TRANSLATION_RE: &str = r"^\s*\\\*\s*BEGIN TRANSLATION\s*$";
const TLAPLUS_END_TRANSLATION_RE: &str = r"^\s*\\\*\s*END TRANSLATION\s*$";

static CHECKSUM_SUFFIX_REGEX: LazyLock<Regex> =
	LazyLock::new(|| Regex::new(CHECKSUM_SUFFIX_RE).expect("checksum selector regex must compile"));
static LINE_RANGE_SELECTOR_REGEX: LazyLock<Regex> =
	LazyLock::new(|| Regex::new(LINE_RANGE_SELECTOR_RE).expect("line range regex must compile"));
static TLAPLUS_BEGIN_TRANSLATION_REGEX: LazyLock<Regex> = LazyLock::new(|| {
	Regex::new(TLAPLUS_BEGIN_TRANSLATION_RE).expect("tlaplus begin regex must compile")
});
static TLAPLUS_END_TRANSLATION_REGEX: LazyLock<Regex> = LazyLock::new(|| {
	Regex::new(TLAPLUS_END_TRANSLATION_RE).expect("tlaplus end regex must compile")
});

#[derive(Clone)]
pub struct ChunkStateInner {
	pub(crate) source:   String,
	pub(crate) language: String,
	pub(crate) tree:     ChunkTree,
	lookup:              HashMap<String, usize>,
}

impl ChunkStateInner {
	pub(crate) fn parse(source: String, language: String) -> Result<Self> {
		let normalized_language = normalize_language(language.as_str());
		let tree = build_chunk_tree(source.as_str(), normalized_language.as_str())?;
		Ok(Self::new(source, normalized_language, tree))
	}

	pub(crate) fn new(source: String, language: String, tree: ChunkTree) -> Self {
		let lookup = tree
			.chunks
			.iter()
			.enumerate()
			.map(|(index, chunk)| (chunk.path.clone(), index))
			.collect();
		Self { source, language, tree, lookup }
	}

	pub(crate) const fn source(&self) -> &str {
		self.source.as_str()
	}

	pub(crate) const fn language(&self) -> &str {
		self.language.as_str()
	}

	pub(crate) const fn tree(&self) -> &ChunkTree {
		&self.tree
	}

	pub(crate) fn root(&self) -> Option<&ChunkNode> {
		self.chunk("")
	}

	pub(crate) fn chunk(&self, path: &str) -> Option<&ChunkNode> {
		self
			.lookup
			.get(path)
			.and_then(|index| self.tree.chunks.get(*index))
	}

	pub(crate) fn chunk_info(&self, path: &str) -> Option<ChunkInfo> {
		self.chunk(path).map(chunk_info)
	}

	pub(crate) fn chunks(&self) -> impl Iterator<Item = &ChunkNode> {
		self.tree.chunks.iter()
	}

	pub(crate) fn child_chunks(&self, parent_path: &str) -> Vec<&ChunkNode> {
		self
			.chunk(parent_path)
			.map(|parent| {
				parent
					.children
					.iter()
					.filter_map(|path| self.chunk(path.as_str()))
					.collect()
			})
			.unwrap_or_default()
	}

	pub(crate) fn line_to_containing_chunk_path(&self, line: u32) -> Option<String> {
		crate::chunk::line_to_chunk_path(&self.tree, line)
	}
}

/// Parsed file as a chunk tree: query nodes, render views, format grep hits,
/// and apply edits.
#[napi]
#[derive(Clone)]
pub struct ChunkState {
	inner: Arc<ChunkStateInner>,
}

impl ChunkState {
	pub(crate) fn from_inner(inner: ChunkStateInner) -> Self {
		Self { inner: Arc::new(inner) }
	}

	pub(crate) fn inner(&self) -> &ChunkStateInner {
		self.inner.as_ref()
	}
}

#[napi]
impl ChunkState {
	/// Build chunk state by parsing `source` with the given `language` id (e.g.
	/// `typescript`).
	#[napi(factory, js_name = "parse")]
	pub fn parse(source: String, language: String) -> Result<Self> {
		ChunkStateInner::parse(source, language).map(Self::from_inner)
	}

	/// Normalized language identifier used for the tree-sitter parse.
	#[napi(getter)]
	pub fn language(&self) -> String {
		self.inner.language().to_string()
	}

	/// Full source text for this file.
	#[napi(getter)]
	pub fn source(&self) -> String {
		self.inner.source().to_string()
	}

	/// Stable checksum for the entire file contents.
	#[napi(getter)]
	pub fn checksum(&self) -> String {
		self.inner.tree().checksum.clone()
	}

	/// Line count of the source buffer.
	#[napi(getter, js_name = "lineCount")]
	pub fn line_count(&self) -> u32 {
		self.inner.tree().line_count
	}

	/// Count of tree-sitter error nodes seen while building the tree.
	#[napi(getter, js_name = "parseErrors")]
	pub fn parse_errors(&self) -> u32 {
		self.inner.tree().parse_errors
	}

	/// True when a fallback classifier produced the tree.
	#[napi(getter)]
	pub fn fallback(&self) -> bool {
		self.inner.tree().fallback
	}

	/// Selector path string for the synthetic root (often empty).
	#[napi(getter, js_name = "rootPath")]
	pub fn root_path(&self) -> String {
		self.inner.tree().root_path.clone()
	}

	/// Top-level child chunk paths under the root.
	#[napi(getter, js_name = "rootChildren")]
	pub fn root_children(&self) -> Vec<String> {
		self.inner.tree().root_children.clone()
	}

	/// Total number of chunk nodes.
	#[napi(getter, js_name = "chunkCount")]
	pub fn chunk_count(&self) -> u32 {
		self.inner.tree().chunks.len() as u32
	}

	/// Summary for the root chunk, if it exists.
	#[napi]
	pub fn root(&self) -> Option<ChunkInfo> {
		self.inner.root().map(chunk_info)
	}

	/// Look up [`ChunkInfo`] for a chunk selector path.
	#[napi(js_name = "chunk")]
	pub fn chunk_info_for_path(&self, chunk_path: String) -> Option<ChunkInfo> {
		self.inner.chunk_info(chunk_path.as_str())
	}

	/// Every chunk node as a [`ChunkInfo`] list.
	#[napi]
	pub fn chunks(&self) -> Vec<ChunkInfo> {
		self.inner.chunks().map(chunk_info).collect()
	}

	/// Direct children of `chunkPath` (use empty or omit for root); errors if
	/// the path is missing.
	#[napi]
	pub fn children(&self, chunk_path: Option<String>) -> Result<Vec<ChunkInfo>> {
		let parent_path = chunk_path.unwrap_or_default();
		if self.inner.chunk(parent_path.as_str()).is_none() {
			return Err(Error::from_reason(format!(
				"Chunk path not found: \"{parent_path}\". Re-read the file to see the full chunk tree \
				 with paths and checksums."
			)));
		}
		Ok(self
			.inner
			.child_chunks(parent_path.as_str())
			.into_iter()
			.map(chunk_info)
			.collect())
	}

	/// Chunk selector path that contains 1-based source line `line`, if any.
	#[napi(js_name = "lineToContainingChunkPath")]
	pub fn line_to_containing_chunk_path(&self, line: u32) -> Option<String> {
		self.inner.line_to_containing_chunk_path(line)
	}

	/// Render a chunk subtree or listing as UTF-8 text for tools.
	#[napi]
	pub fn render(&self, params: RenderParams) -> String {
		crate::chunk::render::render_state(self.inner(), &params)
	}

	/// Parse `readPath` (selector, line scope, etc.) and return rendered text or
	/// errors.
	#[napi(js_name = "renderRead")]
	pub fn render_read(&self, params: ReadRenderParams) -> Result<ReadResult> {
		let ParsedChunkReadPath { selector } = parse_chunk_read_path(params.read_path.as_str());
		let visible_range = selector.as_deref().and_then(parse_visible_line_range);
		let Some(root) = self.inner.root() else {
			return Ok(ReadResult {
				text:  format!("{}\n\n[Chunk tree root missing]", params.display_path),
				chunk: None,
			});
		};

		if let Some(visible_range) = visible_range {
			if visible_range.start_line > self.inner.tree().line_count {
				let suggestion = if self.inner.tree().line_count == 0 {
					"The file is empty.".to_string()
				} else {
					format!(
						"Use sel=L1 to read from the start, or sel=L{} to read the last line.",
						self.inner.tree().line_count
					)
				};
				return Ok(ReadResult {
					text:  format!(
						"Line {} is beyond end of file ({} lines total). {}",
						visible_range.start_line,
						self.inner.tree().line_count,
						suggestion,
					),
					chunk: None,
				});
			}

			let clamped_range = VisibleLineRange {
				start_line: visible_range.start_line,
				end_line:   visible_range.end_line.min(self.inner.tree().line_count),
			};
			let notice = format!(
				"[Notice: chunk view scoped to requested lines L{}-L{}; non-overlapping lines \
				 omitted.]",
				clamped_range.start_line, clamped_range.end_line
			);
			let text = self.render(RenderParams {
				chunk_path:           Some(root.path.clone()),
				title:                params.display_path.clone(),
				language_tag:         params.language_tag.clone(),
				visible_range:        Some(clamped_range),
				render_children_only: true,
				omit_checksum:        params.omit_checksum,
				anchor_style:         params.anchor_style,
				show_leaf_preview:    true,
				tab_replacement:      params.tab_replacement,
			});
			return Ok(ReadResult { text: format!("{notice}\n\n{text}"), chunk: None });
		}

		if selector.as_deref().is_none_or(str::is_empty) {
			return Ok(ReadResult {
				text:  self.render(RenderParams {
					chunk_path:           Some(root.path.clone()),
					title:                params.display_path.clone(),
					language_tag:         params.language_tag.clone(),
					visible_range:        None,
					render_children_only: true,
					omit_checksum:        params.omit_checksum,
					anchor_style:         params.anchor_style,
					show_leaf_preview:    true,
					tab_replacement:      params.tab_replacement,
				}),
				chunk: None,
			});
		}

		let selector = selector.unwrap_or_default();
		let Some(chunk) = self.inner.chunk(selector.as_str()) else {
			return Ok(ReadResult {
				text:  format!("{}:{}\n\n[Chunk not found]", params.display_path, selector),
				chunk: Some(ChunkReadTarget { status: ChunkReadStatus::NotFound, selector }),
			});
		};

		if let Some(absolute_line_range) = params.absolute_line_range {
			let req_start = absolute_line_range.start_line;
			let req_end = absolute_line_range.end_line;
			let low = chunk.start_line.max(req_start.min(req_end));
			let high = chunk.end_line.min(req_start.max(req_end));
			if low > high {
				let requested = if req_start == req_end {
					format!("L{req_start}")
				} else {
					format!("L{req_start}-L{req_end}")
				};
				return Ok(ReadResult {
					text:  format!(
						"Requested lines {requested} do not overlap chunk \"{}\" (file lines {}-{}). \
						 Use sel=L{}-L{} to read this chunk.",
						chunk.path, chunk.start_line, chunk.end_line, chunk.start_line, chunk.end_line
					),
					chunk: Some(ChunkReadTarget {
						status:   ChunkReadStatus::Ok,
						selector: chunk.path.clone(),
					}),
				});
			}
			return Ok(ReadResult {
				text:  self.render(RenderParams {
					chunk_path:           Some(chunk.path.clone()),
					title:                format!("{}:{}", params.display_path, chunk.path),
					language_tag:         params.language_tag.clone(),
					visible_range:        Some(VisibleLineRange { start_line: low, end_line: high }),
					render_children_only: false,
					omit_checksum:        params.omit_checksum,
					anchor_style:         params.anchor_style,
					show_leaf_preview:    true,
					tab_replacement:      params.tab_replacement,
				}),
				chunk: Some(ChunkReadTarget {
					status:   ChunkReadStatus::Ok,
					selector: chunk.path.clone(),
				}),
			});
		}

		Ok(ReadResult {
			text:  self.render(RenderParams {
				chunk_path:           Some(chunk.path.clone()),
				title:                format!("{}:{}", params.display_path, chunk.path),
				language_tag:         params.language_tag.clone(),
				visible_range:        None,
				render_children_only: false,
				omit_checksum:        params.omit_checksum,
				anchor_style:         params.anchor_style,
				show_leaf_preview:    true,
				tab_replacement:      params.tab_replacement,
			}),
			chunk: Some(ChunkReadTarget {
				status:   ChunkReadStatus::Ok,
				selector: chunk.path.clone(),
			}),
		})
	}

	/// Prefix a grep line with `display_path` and the chunk path for
	/// `line_number`, when known.
	#[napi(js_name = "formatGrepLine")]
	pub fn format_grep_line(&self, display_path: String, line_number: u32, line: String) -> String {
		let chunk_path = self.inner.line_to_containing_chunk_path(line_number);
		let location = chunk_path.map_or_else(
			|| display_path.clone(),
			|chunk_path| {
				if chunk_path.is_empty() {
					display_path.clone()
				} else {
					format!("{display_path}:{chunk_path}")
				}
			},
		);
		format!("{location}>{line_number}|{line}")
	}

	/// Apply batch edits, re-parse, write files, and return updated state and
	/// messaging.
	#[napi(js_name = "applyEdits")]
	pub fn apply_edits(&self, params: EditParams) -> Result<EditResult> {
		crate::chunk::edit::apply_edits(self, &params).map_err(Error::from_reason)
	}
}

#[derive(Clone)]
struct ParsedChunkReadPath {
	selector: Option<String>,
}

fn normalize_language(language: &str) -> String {
	language.trim().to_ascii_lowercase()
}

fn chunk_info(chunk: &ChunkNode) -> ChunkInfo {
	ChunkInfo {
		path:       chunk.path.clone(),
		name:       chunk.name.clone(),
		checksum:   chunk.checksum.clone(),
		start_line: chunk.start_line,
		end_line:   chunk.end_line,
		leaf:       chunk.leaf,
	}
}

fn sanitize_chunk_selector(selector: Option<&str>) -> Option<String> {
	let mut selector = selector?.trim().to_string();
	if selector.is_empty() || selector == "null" || selector == "undefined" {
		return None;
	}
	if let Some(colon_index) = chunk_read_path_separator_index(selector.as_str()) {
		selector = selector[(colon_index + 1)..].to_string();
	}
	if let Some(captures) = CHECKSUM_SUFFIX_REGEX.captures(selector.as_str())
		&& let Some(prefix) = captures.get(1)
	{
		selector = prefix.as_str().to_string();
	}
	let selector = selector.trim().to_string();
	(!selector.is_empty()).then_some(selector)
}

fn chunk_read_path_separator_index(read_path: &str) -> Option<usize> {
	if read_path.len() >= 3 {
		let bytes = read_path.as_bytes();
		if bytes[0].is_ascii_alphabetic() && bytes[1] == b':' && matches!(bytes[2], b'/' | b'\\') {
			return read_path[2..].find(':').map(|index| index + 2);
		}
	}
	read_path.find(':')
}

fn parse_chunk_read_path(read_path: &str) -> ParsedChunkReadPath {
	let selector = chunk_read_path_separator_index(read_path)
		.and_then(|index| sanitize_chunk_selector(Some(&read_path[(index + 1)..])));
	ParsedChunkReadPath { selector }
}

fn parse_visible_line_range(selector: &str) -> Option<VisibleLineRange> {
	let captures = LINE_RANGE_SELECTOR_REGEX.captures(selector)?;
	let start_line = captures.get(1)?.as_str().parse::<u32>().ok()?.max(1);
	let end_line = captures
		.get(2)
		.and_then(|m| m.as_str().parse::<u32>().ok())
		.unwrap_or(start_line)
		.max(start_line);
	Some(VisibleLineRange { start_line, end_line })
}

pub fn mask_chunk_display_source(source: &str, language: &str) -> String {
	if language != "tlaplus" {
		return source.to_string();
	}
	let lines = source.split('\n').collect::<Vec<_>>();
	let mut masked = lines
		.iter()
		.map(|line| (*line).to_string())
		.collect::<Vec<_>>();
	let mut index = 0usize;
	while index < lines.len() {
		if !TLAPLUS_BEGIN_TRANSLATION_REGEX.is_match(lines[index]) {
			index += 1;
			continue;
		}
		let begin_index = index;
		let mut end_index = begin_index + 1;
		while end_index < lines.len() && !TLAPLUS_END_TRANSLATION_REGEX.is_match(lines[end_index]) {
			end_index += 1;
		}
		if begin_index + 1 < lines.len() {
			masked[begin_index + 1] = "\\* [translation hidden]".to_string();
			for line in masked
				.iter_mut()
				.take(end_index.min(lines.len()))
				.skip(begin_index + 2)
			{
				line.clear();
			}
		}
		index = end_index + 1;
	}
	masked.join("\n")
}
