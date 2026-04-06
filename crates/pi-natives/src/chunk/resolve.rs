use std::{cmp::Ordering, collections::BTreeSet};

use crate::chunk::{
	state::ChunkStateInner,
	types::{ChunkNode, ChunkTree},
};

const CHUNK_NAME_PREFIXES: &[&str] =
	&["fn_", "var_", "class_", "stmts_", "type_", "interface_", "enum_", "const_"];

pub struct ResolvedChunk<'a> {
	pub chunk: &'a ChunkNode,
	pub crc:   Option<String>,
}

pub fn sanitize_chunk_selector(selector: Option<&str>) -> Option<String> {
	let mut value = selector?.trim().to_owned();
	if matches!(value.as_str(), "null" | "undefined") {
		return None;
	}

	if let Some(index) = chunk_read_path_separator_index(&value) {
		value = value[index + 1..].to_owned();
	}

	let value = strip_trailing_checksum(&value).trim();
	if value.is_empty() {
		None
	} else {
		Some(value.to_owned())
	}
}

pub fn sanitize_crc(crc: Option<&str>) -> Option<String> {
	let value = crc?.trim();
	if matches!(value, "" | "null" | "undefined") {
		None
	} else {
		Some(value.to_ascii_uppercase())
	}
}

pub fn resolve_chunk_selector<'a>(
	state: &'a ChunkStateInner,
	selector: Option<&str>,
	warnings: &mut Vec<String>,
) -> Result<&'a ChunkNode, String> {
	resolve_chunk_selector_in_tree(&state.tree, selector, warnings)
}

pub fn resolve_chunk_selector_in_tree<'a>(
	tree: &'a ChunkTree,
	selector: Option<&str>,
	warnings: &mut Vec<String>,
) -> Result<&'a ChunkNode, String> {
	let Some(cleaned) = sanitize_chunk_selector(selector) else {
		return find_chunk_by_path(tree, "")
			.ok_or_else(|| "Chunk tree is missing the root chunk".to_owned());
	};

	if let Some(chunk) = find_chunk_by_path(tree, &cleaned) {
		return Ok(chunk);
	}

	let suffix = format!(".{cleaned}");
	if let Some(chunk) = resolve_unique_chunks(
		collect_matches(tree, |candidate| {
			candidate.path == cleaned || candidate.path.ends_with(&suffix)
		}),
		&cleaned,
		warnings,
		"chunk selector",
		"Auto-resolved chunk selector",
	)? {
		return Ok(chunk);
	}

	if !cleaned.contains('.') {
		let prefixed = CHUNK_NAME_PREFIXES
			.iter()
			.map(|prefix| format!("{prefix}{cleaned}"))
			.collect::<Vec<_>>();
		if let Some(chunk) = resolve_unique_chunks(
			collect_matches(tree, |candidate| {
				prefixed
					.iter()
					.any(|name| candidate.path == *name || candidate.path.ends_with(&format!(".{name}")))
			}),
			&cleaned,
			warnings,
			"chunk selector",
			"Auto-resolved chunk selector",
		)? {
			return Ok(chunk);
		}
	}

	let kind_segments = cleaned.split('.').collect::<Vec<_>>();
	if let Some(chunk) = resolve_unique_chunks(
		collect_matches(tree, |candidate| kind_path_matches(candidate, &kind_segments)),
		&cleaned,
		warnings,
		"kind selector",
		"Auto-resolved kind selector",
	)? {
		return Ok(chunk);
	}

	Err(build_not_found_error(tree, &cleaned))
}

pub fn resolve_chunk_with_crc<'a>(
	state: &'a ChunkStateInner,
	selector: Option<&str>,
	crc: Option<&str>,
	warnings: &mut Vec<String>,
) -> Result<ResolvedChunk<'a>, String> {
	resolve_chunk_with_crc_in_tree(&state.tree, selector, crc, warnings)
}

pub fn resolve_chunk_with_crc_in_tree<'a>(
	tree: &'a ChunkTree,
	selector: Option<&str>,
	crc: Option<&str>,
	warnings: &mut Vec<String>,
) -> Result<ResolvedChunk<'a>, String> {
	let cleaned_crc = sanitize_crc(crc);
	let cleaned_selector = sanitize_chunk_selector(selector);

	if cleaned_selector.is_none()
		&& let Some(cleaned_crc) = cleaned_crc.clone()
	{
		let chunk = resolve_chunk_by_checksum(tree, &cleaned_crc)?;
		return Ok(ResolvedChunk { chunk, crc: Some(cleaned_crc) });
	}

	let chunk = resolve_chunk_selector_in_tree(tree, cleaned_selector.as_deref(), warnings)?;
	Ok(ResolvedChunk { chunk, crc: cleaned_crc })
}

pub fn resolve_chunk_by_checksum<'a>(
	tree: &'a ChunkTree,
	crc: &str,
) -> Result<&'a ChunkNode, String> {
	let cleaned_crc = sanitize_crc(Some(crc)).ok_or_else(|| "Checksum is required".to_owned())?;
	let matches = tree
		.chunks
		.iter()
		.filter(|chunk| chunk.checksum == cleaned_crc)
		.collect::<Vec<_>>();

	match matches.len() {
		0 => Err(format!(
			"Checksum \"{cleaned_crc}\" did not match any chunk. Re-read the file to get current \
			 checksums."
		)),
		1 => Ok(matches[0]),
		_ => Err(format!(
			"Ambiguous checksum \"{cleaned_crc}\" matches {} chunks: {}. Provide sel to disambiguate.",
			matches.len(),
			matches
				.iter()
				.map(|chunk| if chunk.path.is_empty() {
					"<root>"
				} else {
					chunk.path.as_str()
				})
				.collect::<Vec<_>>()
				.join(", "),
		)),
	}
}

fn find_chunk_by_path<'a>(tree: &'a ChunkTree, path: &str) -> Option<&'a ChunkNode> {
	tree.chunks.iter().find(|chunk| chunk.path == path)
}

fn collect_matches<F>(tree: &ChunkTree, mut predicate: F) -> Vec<&ChunkNode>
where
	F: FnMut(&ChunkNode) -> bool,
{
	let mut seen = BTreeSet::new();
	let mut matches = Vec::new();
	for chunk in &tree.chunks {
		if chunk.path.is_empty() || !predicate(chunk) || !seen.insert(chunk.path.as_str()) {
			continue;
		}
		matches.push(chunk);
	}
	matches
}

fn resolve_unique_chunks<'a>(
	matches: Vec<&'a ChunkNode>,
	cleaned: &str,
	warnings: &mut Vec<String>,
	selector_label: &str,
	warning_label: &str,
) -> Result<Option<&'a ChunkNode>, String> {
	match matches.len() {
		0 => Ok(None),
		1 => {
			warnings.push(format!(
				"{warning_label} \"{cleaned}\" to \"{}\". Use the full path from read output.",
				matches[0].path
			));
			Ok(Some(matches[0]))
		},
		_ => Err(format!(
			"Ambiguous {selector_label} \"{cleaned}\" matches {} chunks: {}. Use the full path from \
			 read output.",
			matches.len(),
			matches
				.iter()
				.map(|chunk| chunk.path.as_str())
				.collect::<Vec<_>>()
				.join(", "),
		)),
	}
}

fn kind_path_matches(candidate: &ChunkNode, kind_segments: &[&str]) -> bool {
	if candidate.path.is_empty() {
		return false;
	}
	let path_segments = candidate.path.split('.').collect::<Vec<_>>();
	path_segments.len() == kind_segments.len()
		&& kind_segments
			.iter()
			.zip(path_segments)
			.all(|(kind, segment)| segment == *kind || segment.starts_with(&format!("{kind}_")))
}

fn build_not_found_error(tree: &ChunkTree, cleaned: &str) -> String {
	let (direct_children_parent, direct_children, matched_empty_prefix) =
		matching_prefix_context(tree, cleaned);
	let available_paths = tree
		.chunks
		.iter()
		.filter(|chunk| !chunk.path.is_empty() && !chunk.path.contains('.'))
		.map(|chunk| chunk.path.as_str())
		.collect::<Vec<_>>();
	let similarity = suggest_chunk_paths(tree, cleaned, 8);

	let hint = if let Some(parent) = direct_children_parent {
		format!(" Direct children of \"{parent}\": {}.", direct_children.join(", "))
	} else if let Some(prefix) = matched_empty_prefix {
		if similarity.is_empty() {
			format!(" The prefix \"{prefix}\" exists but has no child chunks.")
		} else {
			format!(
				" The prefix \"{prefix}\" exists but has no child chunks. Similar paths: {}.",
				similarity.join(", ")
			)
		}
	} else if !similarity.is_empty() {
		format!(" Similar paths: {}.", similarity.join(", "))
	} else if !available_paths.is_empty() {
		format!(" Available top-level chunks: {}.", available_paths.join(", "))
	} else {
		" Re-read the file to see available chunk paths.".to_owned()
	};

	format!(
		"Chunk path not found: \"{cleaned}\".{hint} Re-read the file to see the full chunk tree \
		 with paths and checksums."
	)
}

fn matching_prefix_context(
	tree: &ChunkTree,
	cleaned: &str,
) -> (Option<String>, Vec<String>, Option<String>) {
	let mut direct_children = None;
	let mut direct_children_parent = None;
	let mut matched_empty_prefix = None;

	if cleaned.contains('.') {
		let parts = cleaned.split('.').collect::<Vec<_>>();
		for index in (1..parts.len()).rev() {
			let prefix = parts[..index].join(".");
			let Some(parent) = find_chunk_by_path(tree, &prefix) else {
				continue;
			};
			if !parent.children.is_empty() {
				let mut children = parent.children.clone();
				children.sort();
				direct_children_parent = Some(prefix);
				direct_children = Some(children);
				break;
			}
			if matched_empty_prefix.is_none() {
				matched_empty_prefix = Some(prefix);
			}
		}
	}

	(direct_children_parent, direct_children.unwrap_or_default(), matched_empty_prefix)
}

fn suggest_chunk_paths(tree: &ChunkTree, query: &str, limit: usize) -> Vec<String> {
	let mut scored = tree
		.chunks
		.iter()
		.filter(|chunk| !chunk.path.is_empty())
		.map(|chunk| (chunk.path.as_str(), chunk_path_similarity(query, &chunk.path)))
		.filter(|(_, score)| *score > 0.1)
		.collect::<Vec<_>>();
	scored.sort_by(|left, right| {
		right
			.1
			.partial_cmp(&left.1)
			.unwrap_or(Ordering::Equal)
			.then_with(|| left.0.cmp(right.0))
	});
	scored
		.into_iter()
		.take(limit)
		.map(|(path, _)| path.to_owned())
		.collect()
}

fn chunk_path_similarity(query: &str, candidate: &str) -> f64 {
	if candidate.ends_with(query) || candidate.ends_with(&format!(".{query}")) {
		return 0.9;
	}

	let query_leaf = query.rsplit('.').next().unwrap_or(query);
	let candidate_leaf = candidate.rsplit('.').next().unwrap_or(candidate);
	if query_leaf == candidate_leaf {
		return 0.85;
	}

	if candidate.contains(query) || query.contains(candidate) {
		return 0.6;
	}

	let query_parts = query.split('.').collect::<BTreeSet<_>>();
	let overlap = candidate
		.split('.')
		.filter(|part| query_parts.contains(part))
		.count();
	if overlap > 0 {
		0.1f64.mul_add(overlap as f64, 0.3)
	} else {
		0.0
	}
}

fn strip_trailing_checksum(value: &str) -> &str {
	let Some((prefix, suffix)) = value.rsplit_once('#') else {
		return value;
	};
	if suffix.len() == 4 && suffix.chars().all(|ch| ch.is_ascii_hexdigit()) {
		prefix
	} else {
		value
	}
}

/// Find the `:` separating a file path from a chunk selector in
/// `file.ts:chunk_path`. Skips Windows `C:\` / `C:/` drive prefixes.
fn chunk_read_path_separator_index(value: &str) -> Option<usize> {
	let bytes = value.as_bytes();
	// Skip Windows drive prefix: `C:\` or `C:/`
	let start = if bytes.len() >= 3
		&& bytes[0].is_ascii_alphabetic()
		&& bytes[1] == b':'
		&& matches!(bytes[2], b'/' | b'\\')
	{
		value[2..].find(':').map(|i| i + 2)?
	} else {
		value.find(':')?
	};
	Some(start)
}
