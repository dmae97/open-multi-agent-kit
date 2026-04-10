//! Language-specific chunk classifiers for Bash, Make, and Diff.

use tree_sitter::Node;

use super::{classify::LangClassifier, common::*, kind::ChunkKind};

pub struct ShellBuildClassifier;

impl ShellBuildClassifier {
	/// Extract a Make rule target name (child node of kind `targets`).
	fn extract_rule_target(node: Node<'_>, source: &str) -> Option<String> {
		child_by_kind(node, &["targets"])
			.and_then(|t| sanitize_identifier(node_text(source, t.start_byte(), t.end_byte())))
	}

	/// Extract a Make variable/define name (field `name`).
	fn extract_var_name(node: Node<'_>, source: &str) -> Option<String> {
		node
			.child_by_field_name("name")
			.and_then(|n| sanitize_identifier(node_text(source, n.start_byte(), n.end_byte())))
	}

	/// Strip the conventional `a/` or `b/` prefix from git diff paths.
	fn strip_ab_prefix(path: &str) -> &str {
		path
			.strip_prefix("a/")
			.or_else(|| path.strip_prefix("b/"))
			.unwrap_or(path)
	}

	/// Extract the file path from a diff `block` node.
	///
	/// Extraction priority:
	/// 1. `new_file` child -> `filename` child text (skip if `/dev/null`)
	/// 2. `old_file` child -> `filename` child text (skip if `/dev/null`)
	/// 3. `command` child -> parse `a/path b/path` from filename children
	fn extract_diff_filename(node: Node<'_>, source: &str) -> Option<String> {
		// Try new_file first (most diffs have it)
		if let Some(new_file) = child_by_kind(node, &["new_file"])
			&& let Some(filename) = child_by_kind(new_file, &["filename"])
		{
			let text = node_text(source, filename.start_byte(), filename.end_byte()).trim();
			if text != "/dev/null" {
				return sanitize_identifier(Self::strip_ab_prefix(text));
			}
		}

		// Fall back to old_file (deleted files)
		if let Some(old_file) = child_by_kind(node, &["old_file"])
			&& let Some(filename) = child_by_kind(old_file, &["filename"])
		{
			let text = node_text(source, filename.start_byte(), filename.end_byte()).trim();
			if text != "/dev/null" {
				return sanitize_identifier(Self::strip_ab_prefix(text));
			}
		}

		// Last resort: extract from the `command` line ("diff --git a/path b/path").
		// The grammar's `filename` rule is `repeat1(/\S+/)`, so it captures both
		// paths as a single node like "a/foo.ts b/foo.ts". Take the last
		// space-delimited segment (the b-side path).
		if let Some(command) = child_by_kind(node, &["command"])
			&& let Some(filename) = child_by_kind(command, &["filename"])
		{
			let text = node_text(source, filename.start_byte(), filename.end_byte()).trim();
			let b_side = text.rsplit_once(' ').map_or(text, |(_, b)| b);
			return sanitize_identifier(Self::strip_ab_prefix(b_side));
		}

		None
	}
}

impl LangClassifier for ShellBuildClassifier {
	fn classify_root<'t>(&self, node: Node<'t>, source: &str) -> Option<RawChunkCandidate<'t>> {
		match node.kind() {
			"rule" => {
				let name =
					Self::extract_rule_target(node, source).unwrap_or_else(|| "anonymous".to_string());
				Some(make_container_chunk(
					node,
					ChunkKind::Rule,
					Some(name),
					source,
					recurse_into(node, ChunkContext::ClassBody, &[], &["recipe"]),
				))
			},
			"variable_assignment" | "shell_assignment" => {
				let name =
					Self::extract_var_name(node, source).unwrap_or_else(|| "anonymous".to_string());
				Some(make_kind_chunk(node, ChunkKind::Variable, Some(name), source, None))
			},
			"define_directive" => {
				let name =
					Self::extract_var_name(node, source).unwrap_or_else(|| "anonymous".to_string());
				Some(make_kind_chunk(node, ChunkKind::Define, Some(name), source, None))
			},
			"conditional" => Some(positional_candidate(node, ChunkKind::If, source)),
			// Bash commands and pipelines
			"command" | "pipeline" => Some(group_candidate(node, ChunkKind::Statements, source)),
			// Bash control flow
			"if_statement" => Some(positional_candidate(node, ChunkKind::If, source)),
			"case_statement" => Some(positional_candidate(node, ChunkKind::Switch, source)),
			"while_statement" | "for_statement" => {
				Some(positional_candidate(node, ChunkKind::Loop, source))
			},
			// Bash function definition
			"function_definition" => Some(named_candidate(
				node,
				ChunkKind::Function,
				source,
				recurse_body(node, ChunkContext::FunctionBody),
			)),
			// Diff: top-level file block (one per file in git diff output)
			"block" => {
				let identifier = Self::extract_diff_filename(node, source);
				let recurse = recurse_into(node, ChunkContext::ClassBody, &[], &["hunks"]);
				let mut candidate =
					make_container_chunk(node, ChunkKind::File, identifier, source, recurse);
				// Always expand hunks so individual @@ sections are addressable,
				// even for small diffs below the leaf threshold.
				candidate.force_recurse = recurse.is_some();
				Some(candidate)
			},
			// Diff: standalone hunks (plain patches without a diff --git header)
			"hunks" => Some(group_candidate(node, ChunkKind::Hunks, source)),
			_ => None,
		}
	}

	fn classify_class<'t>(&self, node: Node<'t>, source: &str) -> Option<RawChunkCandidate<'t>> {
		match node.kind() {
			// Individual hunk inside a block's hunks container
			"hunk" => Some(positional_candidate(node, ChunkKind::Hunk, source)),
			_ => None,
		}
	}

	fn classify_function<'t>(&self, node: Node<'t>, source: &str) -> Option<RawChunkCandidate<'t>> {
		match node.kind() {
			"if_statement" => Some(positional_candidate(node, ChunkKind::If, source)),
			"case_statement" => Some(positional_candidate(node, ChunkKind::Switch, source)),
			"while_statement" | "for_statement" => {
				Some(positional_candidate(node, ChunkKind::Loop, source))
			},
			"command" | "pipeline" => Some(group_candidate(node, ChunkKind::Statements, source)),
			"subshell" => Some(positional_candidate(node, ChunkKind::Block, source)),
			_ => None,
		}
	}

	fn preserve_children(
		&self,
		_parent: &RawChunkCandidate<'_>,
		children: &[RawChunkCandidate<'_>],
	) -> bool {
		// Diff file blocks should always preserve hunk children
		children.iter().any(|c| c.kind == ChunkKind::Hunk)
	}

	fn is_root_wrapper(&self, kind: &str) -> bool {
		kind == "makefile"
	}
}
