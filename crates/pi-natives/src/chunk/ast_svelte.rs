//! Language-specific chunk classifier for Svelte.

use tree_sitter::Node;

use super::{classify::LangClassifier, common::*};

pub struct SvelteClassifier;

impl LangClassifier for SvelteClassifier {
	fn classify_root<'t>(&self, node: Node<'t>, source: &str) -> Option<RawChunkCandidate<'t>> {
		classify_svelte_node(node, source, true)
	}

	fn classify_class<'t>(&self, node: Node<'t>, source: &str) -> Option<RawChunkCandidate<'t>> {
		classify_svelte_node(node, source, false)
	}

	fn classify_function<'t>(&self, node: Node<'t>, source: &str) -> Option<RawChunkCandidate<'t>> {
		classify_svelte_node(node, source, false)
	}

	fn is_root_wrapper(&self, kind: &str) -> bool {
		kind == "document"
	}
}

fn classify_svelte_node<'t>(
	node: Node<'t>,
	source: &str,
	include_plain_elements: bool,
) -> Option<RawChunkCandidate<'t>> {
	match node.kind() {
		"script_element" => Some(classify_script_element(node, source)),
		"style_element" => Some(classify_style_element(node, source)),
		"snippet_statement" => Some(classify_snippet_statement(node, source)),
		"if_statement" => Some(classify_if_statement(node, source)),
		"else_if_statement" => Some(classify_else_if_statement(node, source)),
		"else_statement" => Some(make_block_chunk(node, "else", source)),
		"each_statement" => Some(classify_each_statement(node, source)),
		"await_statement" => Some(classify_await_statement(node, source)),
		"then_statement" => Some(classify_then_statement(node, source)),
		"catch_statement" => Some(classify_catch_statement(node, source)),
		"render_expr" => Some(classify_render_expr(node, source)),
		"html_interpolation" => Some(group_candidate(node, "html", source)),
		"interpolation" => Some(group_candidate(node, "interpolation", source)),
		"expression" => Some(group_candidate(node, "expr", source)),
		"element" if include_plain_elements || element_has_structure(node) => {
			classify_element(node, source)
		},
		_ => None,
	}
}

fn classify_script_element<'t>(node: Node<'t>, source: &str) -> RawChunkCandidate<'t> {
	let name = if has_attribute(node, "module", source)
		|| attribute_value(node, "context", source).as_deref() == Some("module")
	{
		"script_module".to_string()
	} else {
		"script".to_string()
	};

	// The grammar exposes script contents as a single `raw_text` child, so the
	// element boundary is the most truthful chunk.
	make_named_chunk(node, name, source, None)
}

fn classify_style_element<'t>(node: Node<'t>, source: &str) -> RawChunkCandidate<'t> {
	let name = if has_attribute(node, "scoped", source) {
		"style_scoped".to_string()
	} else {
		"style".to_string()
	};
	make_named_chunk(node, name, source, None)
}

fn classify_snippet_statement<'t>(node: Node<'t>, source: &str) -> RawChunkCandidate<'t> {
	let name = child_by_kind(node, &["snippet_start_expr"])
		.and_then(|start| child_by_kind(start, &["snippet_name"]))
		.and_then(|name| sanitize_identifier(node_text(source, name.start_byte(), name.end_byte())))
		.map_or_else(|| "snippet".to_string(), |name| format!("snippet_{name}"));
	make_block_chunk(node, &name, source)
}

fn classify_if_statement<'t>(node: Node<'t>, source: &str) -> RawChunkCandidate<'t> {
	let name = block_expr_name(node, source, "if_start_expr", &["raw_text_expr"], "if");
	make_block_chunk(node, &name, source)
}

fn classify_else_if_statement<'t>(node: Node<'t>, source: &str) -> RawChunkCandidate<'t> {
	let name = block_expr_name(node, source, "else_if_expr", &["raw_text_expr"], "else_if");
	make_block_chunk(node, &name, source)
}

fn classify_each_statement<'t>(node: Node<'t>, source: &str) -> RawChunkCandidate<'t> {
	let name = block_expr_name(node, source, "each_start_expr", &["raw_text_each"], "each");
	make_block_chunk(node, &name, source)
}

fn classify_await_statement<'t>(node: Node<'t>, source: &str) -> RawChunkCandidate<'t> {
	let name = block_expr_name(node, source, "await_start_expr", &["raw_text_expr"], "await");
	make_block_chunk(node, &name, source)
}

fn classify_then_statement<'t>(node: Node<'t>, source: &str) -> RawChunkCandidate<'t> {
	let name = block_expr_name(node, source, "then_expr", &["raw_text_expr"], "then");
	make_block_chunk(node, &name, source)
}

fn classify_catch_statement<'t>(node: Node<'t>, source: &str) -> RawChunkCandidate<'t> {
	let name = block_expr_name(node, source, "catch_expr", &["raw_text_expr"], "catch");
	make_block_chunk(node, &name, source)
}

fn classify_render_expr<'t>(node: Node<'t>, source: &str) -> RawChunkCandidate<'t> {
	let name = child_by_kind(node, &["snippet_name"])
		.and_then(|name| sanitize_identifier(node_text(source, name.start_byte(), name.end_byte())))
		.map_or_else(|| "render".to_string(), |name| format!("render_{name}"));
	make_named_chunk(node, name, source, None)
}

fn classify_element<'t>(node: Node<'t>, source: &str) -> Option<RawChunkCandidate<'t>> {
	let tag_name = extract_markup_tag_name(node, source)?;
	Some(make_container_chunk(
		node,
		format!("tag_{tag_name}"),
		source,
		Some(recurse_self(node, ChunkContext::ClassBody)),
	))
}

fn make_block_chunk<'t>(node: Node<'t>, name: &str, source: &str) -> RawChunkCandidate<'t> {
	make_container_chunk(
		node,
		name.to_string(),
		source,
		Some(recurse_self(node, ChunkContext::ClassBody)),
	)
}

fn block_expr_name(
	node: Node<'_>,
	source: &str,
	header_kind: &str,
	expr_kinds: &[&str],
	prefix: &str,
) -> String {
	child_by_kind(node, &[header_kind])
		.and_then(|header| child_by_kind(header, expr_kinds))
		.and_then(|expr| sanitize_identifier(node_text(source, expr.start_byte(), expr.end_byte())))
		.map_or_else(|| prefix.to_string(), |expr| format!("{prefix}_{expr}"))
}

fn element_has_structure(node: Node<'_>) -> bool {
	named_children(node).into_iter().any(|child| {
		matches!(
			child.kind(),
			"snippet_statement"
				| "if_statement"
				| "else_if_statement"
				| "else_statement"
				| "each_statement"
				| "await_statement"
				| "then_statement"
				| "catch_statement"
				| "render_expr"
				| "html_interpolation"
				| "interpolation"
				| "expression"
				| "element"
		)
	})
}

fn extract_markup_tag_name(node: Node<'_>, source: &str) -> Option<String> {
	start_like(node)
		.and_then(|start| child_by_kind(start, &["tag_name"]))
		.and_then(|tag| sanitize_identifier(node_text(source, tag.start_byte(), tag.end_byte())))
}

fn has_attribute(node: Node<'_>, name: &str, source: &str) -> bool {
	start_like(node)
		.into_iter()
		.flat_map(named_children)
		.filter(|child| child.kind() == "attribute")
		.filter_map(|attr| extract_attribute_name(attr, source))
		.any(|attr_name| attr_name == name)
}

fn attribute_value(node: Node<'_>, name: &str, source: &str) -> Option<String> {
	let start = start_like(node)?;
	for child in named_children(start) {
		if child.kind() != "attribute" {
			continue;
		}
		if extract_attribute_name(child, source).as_deref() != Some(name) {
			continue;
		}
		if let Some(value) = child_by_kind(child, &["attribute_value", "quoted_attribute_value"]) {
			return sanitize_identifier(&unquote_text(node_text(
				source,
				value.start_byte(),
				value.end_byte(),
			)));
		}
		return Some(name.to_string());
	}
	None
}

fn extract_attribute_name(node: Node<'_>, source: &str) -> Option<String> {
	child_by_kind(node, &["attribute_name"])
		.and_then(|name| sanitize_identifier(node_text(source, name.start_byte(), name.end_byte())))
}

fn start_like(node: Node<'_>) -> Option<Node<'_>> {
	child_by_kind(node, &["start_tag", "self_closing_tag"])
}
