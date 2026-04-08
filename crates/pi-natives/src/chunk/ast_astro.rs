//! Language-specific chunk classifiers for Astro.

use tree_sitter::Node;

use super::{classify::LangClassifier, common::*};

pub struct AstroClassifier;

impl LangClassifier for AstroClassifier {
	fn classify_root<'t>(&self, node: Node<'t>, source: &str) -> Option<RawChunkCandidate<'t>> {
		classify_astro_node(node, source)
	}

	fn classify_class<'t>(&self, node: Node<'t>, source: &str) -> Option<RawChunkCandidate<'t>> {
		classify_astro_node(node, source)
	}

	fn classify_function<'t>(&self, node: Node<'t>, source: &str) -> Option<RawChunkCandidate<'t>> {
		classify_astro_node(node, source)
	}

	fn is_root_wrapper(&self, kind: &str) -> bool {
		kind == "document"
	}
}

fn classify_astro_node<'t>(node: Node<'t>, source: &str) -> Option<RawChunkCandidate<'t>> {
	match node.kind() {
		"frontmatter" => Some(classify_frontmatter(node, source)),
		"frontmatter_js_block" => Some(group_candidate(node, "code", source)),
		"element" => classify_element(node, source),
		"script_element" => Some(classify_script_element(node, source)),
		"style_element" => Some(classify_style_element(node, source)),
		"html_interpolation" => Some(classify_html_interpolation(node, source)),
		"attribute_interpolation" => Some(classify_attribute_interpolation(node, source)),
		"attribute_js_expr" => Some(group_candidate(node, "expr", source)),
		"text" => Some(group_candidate(node, "text", source)),
		_ => None,
	}
}

fn classify_frontmatter<'t>(node: Node<'t>, source: &str) -> RawChunkCandidate<'t> {
	make_container_chunk(
		node,
		"frontmatter".to_string(),
		source,
		recurse_into(node, ChunkContext::ClassBody, &[], &["frontmatter_js_block"]),
	)
}

fn classify_element<'t>(node: Node<'t>, source: &str) -> Option<RawChunkCandidate<'t>> {
	let tag_name = extract_tag_name(node, source)?;
	let prefix = if is_component_name(tag_name.as_str()) {
		"component"
	} else {
		"tag"
	};
	Some(make_container_chunk(
		node,
		format!("{prefix}_{tag_name}"),
		source,
		Some(recurse_self(node, ChunkContext::ClassBody)),
	))
}

fn classify_script_element<'t>(node: Node<'t>, source: &str) -> RawChunkCandidate<'t> {
	let name = if has_attribute(node, "is:inline", source) {
		"script_inline"
	} else {
		"script"
	};
	// The Astro grammar exposes script bodies as `raw_text`, not nested JS AST.
	make_named_chunk(node, name.to_string(), source, None)
}

fn classify_style_element<'t>(node: Node<'t>, source: &str) -> RawChunkCandidate<'t> {
	let name = if has_attribute(node, "define:vars", source) {
		"style_vars"
	} else if has_attribute(node, "is:global", source) {
		"style_global"
	} else {
		"style"
	};
	// The Astro grammar exposes style bodies as `raw_text`, so the section itself
	// is the truthful chunk boundary.
	make_named_chunk(node, name.to_string(), source, None)
}

fn classify_html_interpolation<'t>(node: Node<'t>, source: &str) -> RawChunkCandidate<'t> {
	let name = child_by_kind(node, &["permissible_text"])
		.and_then(|expr| sanitize_identifier(node_text(source, expr.start_byte(), expr.end_byte())))
		.map_or_else(|| "expr".to_string(), |expr| format!("expr_{expr}"));

	if let Some(nested_element) =
		child_by_kind(node, &["element", "script_element", "style_element"])
	{
		make_container_chunk(
			node,
			name,
			source,
			Some(recurse_self(nested_element, ChunkContext::ClassBody)),
		)
	} else {
		make_named_chunk(node, name, source, None)
	}
}

fn classify_attribute_interpolation<'t>(node: Node<'t>, source: &str) -> RawChunkCandidate<'t> {
	let name = child_by_kind(node, &["attribute_js_expr"])
		.and_then(|expr| sanitize_identifier(node_text(source, expr.start_byte(), expr.end_byte())))
		.map_or_else(|| "attr_expr".to_string(), |expr| format!("attr_expr_{expr}"));
	make_named_chunk(node, name, source, None)
}

fn extract_tag_name(node: Node<'_>, source: &str) -> Option<String> {
	child_by_kind(node, &["start_tag", "self_closing_tag"])
		.and_then(|tag| child_by_kind(tag, &["tag_name"]))
		.and_then(|tag_name| {
			sanitize_identifier(node_text(source, tag_name.start_byte(), tag_name.end_byte()))
		})
}

fn has_attribute(node: Node<'_>, name: &str, source: &str) -> bool {
	child_by_kind(node, &["start_tag", "self_closing_tag"])
		.into_iter()
		.flat_map(named_children)
		.filter(|child| child.kind() == "attribute")
		.filter_map(|attr| extract_attribute_name(attr, source))
		.any(|attr_name| attr_name == name)
}

fn extract_attribute_name(node: Node<'_>, source: &str) -> Option<String> {
	child_by_kind(node, &["attribute_name"]).map(|name| {
		node_text(source, name.start_byte(), name.end_byte())
			.trim()
			.to_string()
	})
}

fn is_component_name(tag_name: &str) -> bool {
	tag_name.chars().next().is_some_and(char::is_uppercase)
}
