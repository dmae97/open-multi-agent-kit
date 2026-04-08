//! Language-specific chunk classifier for Vue single-file components.

use tree_sitter::Node;

use super::{classify::LangClassifier, common::*};

pub struct VueClassifier;

impl LangClassifier for VueClassifier {
	fn classify_root<'t>(&self, node: Node<'t>, source: &str) -> Option<RawChunkCandidate<'t>> {
		classify_root_node(node, source)
	}

	fn classify_class<'t>(&self, node: Node<'t>, source: &str) -> Option<RawChunkCandidate<'t>> {
		classify_nested_node(node, source)
	}

	fn classify_function<'t>(&self, node: Node<'t>, source: &str) -> Option<RawChunkCandidate<'t>> {
		classify_nested_node(node, source)
	}

	fn is_root_wrapper(&self, kind: &str) -> bool {
		kind == "document"
	}
}

fn classify_root_node<'t>(node: Node<'t>, source: &str) -> Option<RawChunkCandidate<'t>> {
	match node.kind() {
		"template_element" => Some(classify_template_element(node, source)),
		"script_element" => Some(classify_script_element(node, source)),
		"style_element" => Some(classify_style_element(node, source)),
		// Vue custom blocks (for example <i18n>) currently parse as plain `element`
		// nodes at the document root, so infer custom-block semantics from position.
		"element" => Some(classify_custom_block(node, source)),
		_ => None,
	}
}

fn classify_nested_node<'t>(node: Node<'t>, source: &str) -> Option<RawChunkCandidate<'t>> {
	match node.kind() {
		"template_element" => Some(classify_template_element(node, source)),
		"element" => classify_element(node, source),
		"start_tag" => classify_start_tag(node, source),
		"directive_attribute" => Some(classify_directive_attribute(node, source)),
		"attribute" => Some(classify_attribute(node, source)),
		"interpolation" => Some(make_named_chunk(node, "expr".to_string(), source, None)),
		"text" => Some(group_candidate(node, "text", source)),
		"raw_text" => Some(group_candidate(node, "text", source)),
		_ => None,
	}
}

fn classify_template_element<'t>(node: Node<'t>, source: &str) -> RawChunkCandidate<'t> {
	let name = extract_slot_name(node, source)
		.map_or_else(|| "template".to_string(), |slot_name| format!("slot_{slot_name}"));
	make_container_chunk(node, name, source, Some(recurse_self(node, ChunkContext::ClassBody)))
}

fn classify_script_element<'t>(node: Node<'t>, source: &str) -> RawChunkCandidate<'t> {
	let name = if has_attribute(node, "setup", source) {
		"script_setup".to_string()
	} else if attribute_value(node, "context", source).as_deref() == Some("module") {
		"script_module".to_string()
	} else {
		"script".to_string()
	};
	// tree-sitter-vue exposes script bodies as `raw_text`, not injected JS/TS.
	make_named_chunk(node, name, source, None)
}

fn classify_style_element<'t>(node: Node<'t>, source: &str) -> RawChunkCandidate<'t> {
	let name = if has_attribute(node, "scoped", source) {
		"style_scoped".to_string()
	} else {
		"style".to_string()
	};
	// Styles are likewise exposed as `raw_text`, so preserve only the SFC block.
	make_named_chunk(node, name, source, None)
}

fn classify_custom_block<'t>(node: Node<'t>, source: &str) -> RawChunkCandidate<'t> {
	let tag_name = extract_markup_tag_name(node, source).unwrap_or_else(|| "anonymous".to_string());
	make_container_chunk(
		node,
		format!("custom_{tag_name}"),
		source,
		Some(recurse_self(node, ChunkContext::ClassBody)),
	)
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

fn classify_start_tag<'t>(node: Node<'t>, source: &str) -> Option<RawChunkCandidate<'t>> {
	if !named_children(node)
		.into_iter()
		.any(|child| matches!(child.kind(), "attribute" | "directive_attribute"))
	{
		return None;
	}
	let tag_name = child_by_kind(node, &["tag_name"])
		.and_then(|tag| sanitize_identifier(node_text(source, tag.start_byte(), tag.end_byte())))
		.unwrap_or_else(|| "anonymous".to_string());
	Some(make_container_chunk(
		node,
		format!("attrs_{tag_name}"),
		source,
		Some(recurse_self(node, ChunkContext::ClassBody)),
	))
}

fn classify_attribute<'t>(node: Node<'t>, source: &str) -> RawChunkCandidate<'t> {
	let name = child_by_kind(node, &["attribute_name"])
		.and_then(|name| sanitize_identifier(node_text(source, name.start_byte(), name.end_byte())))
		.unwrap_or_else(|| "attr".to_string());
	make_named_chunk(node, format!("attr_{name}"), source, None)
}

fn classify_directive_attribute<'t>(node: Node<'t>, source: &str) -> RawChunkCandidate<'t> {
	let raw = node_text(source, node.start_byte(), node.end_byte()).trim();
	let directive_name =
		extract_directive_name(node, source).unwrap_or_else(|| "directive".to_string());
	let modifier_suffix = extract_directive_modifiers(node, source)
		.filter(|mods| !mods.is_empty())
		.map(|mods| format!("_{mods}"))
		.unwrap_or_default();
	let chunk_name = if raw.starts_with('@') {
		format!("on_{directive_name}{modifier_suffix}")
	} else if raw.starts_with(':') {
		format!("bind_{directive_name}{modifier_suffix}")
	} else if raw.starts_with('#') {
		format!("slot_{directive_name}{modifier_suffix}")
	} else {
		format!("dir_{directive_name}{modifier_suffix}")
	};
	make_named_chunk(node, chunk_name, source, None)
}

fn extract_markup_tag_name(node: Node<'_>, source: &str) -> Option<String> {
	start_like(node)
		.and_then(|start| child_by_kind(start, &["tag_name"]))
		.and_then(|tag| sanitize_identifier(node_text(source, tag.start_byte(), tag.end_byte())))
}

fn extract_slot_name(node: Node<'_>, source: &str) -> Option<String> {
	let start = start_like(node)?;
	named_children(start)
		.into_iter()
		.find(|child| {
			node_text(source, child.start_byte(), child.end_byte())
				.trim()
				.starts_with('#')
		})
		.and_then(|child| extract_directive_name(child, source))
}

fn extract_directive_name(node: Node<'_>, source: &str) -> Option<String> {
	child_by_kind(node, &["directive_name", "directive_value"])
		.and_then(|name| sanitize_identifier(node_text(source, name.start_byte(), name.end_byte())))
}

fn extract_directive_modifiers(node: Node<'_>, source: &str) -> Option<String> {
	child_by_kind(node, &["directive_modifiers"])
		.and_then(|mods| sanitize_identifier(node_text(source, mods.start_byte(), mods.end_byte())))
}

fn has_attribute(node: Node<'_>, name: &str, source: &str) -> bool {
	start_like(node)
		.into_iter()
		.flat_map(named_children)
		.filter(|child| matches!(child.kind(), "attribute" | "directive_attribute"))
		.filter_map(|attr| extract_attribute_name(attr, source))
		.any(|attr_name| attr_name == name)
}

fn attribute_value(node: Node<'_>, name: &str, source: &str) -> Option<String> {
	let start = start_like(node)?;
	for child in named_children(start) {
		if !matches!(child.kind(), "attribute" | "directive_attribute") {
			continue;
		}
		if extract_attribute_name(child, source).as_deref() != Some(name) {
			continue;
		}
		if let Some(value) =
			child_by_kind(child, &["attribute_value", "quoted_attribute_value", "directive_value"])
		{
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
	child_by_kind(node, &["attribute_name", "directive_name"])
		.and_then(|name| sanitize_identifier(node_text(source, name.start_byte(), name.end_byte())))
		.or_else(|| {
			if node_text(source, node.start_byte(), node.end_byte())
				.trim()
				.starts_with('#')
			{
				extract_directive_name(node, source)
			} else {
				None
			}
		})
}

fn start_like(node: Node<'_>) -> Option<Node<'_>> {
	child_by_kind(node, &["start_tag", "self_closing_tag"])
}
