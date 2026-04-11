//! Language-specific chunk classifiers for HTML and XML.

use tree_sitter::Node;

use super::{
	classify::{
		ClassifierTables, LangClassifier, NamingMode, RecurseMode, RuleStyle, semantic_rule,
	},
	common::*,
	kind::ChunkKind,
};
use crate::language::SupportLang;

pub struct HtmlXmlClassifier;

const HTML_XML_SHARED_RULES: &[super::classify::SemanticRule] = &[semantic_rule(
	"text_node",
	ChunkKind::Text,
	RuleStyle::Group,
	NamingMode::None,
	RecurseMode::None,
)];

const HTML_XML_TABLES: ClassifierTables = ClassifierTables {
	root:                 HTML_XML_SHARED_RULES,
	class:                HTML_XML_SHARED_RULES,
	function:             &[],
	structural_overrides: super::classify::StructuralOverrides::EMPTY,
};

/// Classify an element-like node as a container with tag semantics.
///
/// Uses `extract_markup_tag_name` directly because the shared
/// `extract_identifier` does not handle HTML/XML start-tag structures.
fn classify_element<'t>(node: Node<'t>, source: &str) -> Option<RawChunkCandidate<'t>> {
	match node.kind() {
		"script_element" => Some(classify_script_element(node, source)),
		"style_element" => Some(classify_style_element(node, source)),
		"element" => {
			let tag_name =
				extract_markup_tag_name(node, source).unwrap_or_else(|| "anonymous".to_string());
			// HTML: child elements are direct children of `element`.
			// XML: child elements are inside a `content` wrapper node.
			let recurse_target = child_by_kind(node, &["content"]).unwrap_or(node);
			Some(force_container(make_container_chunk(
				node,
				ChunkKind::Tag,
				Some(tag_name),
				source,
				Some(recurse_self(recurse_target, ChunkContext::ClassBody)),
			)))
		},
		"text_node" => Some(group_candidate(node, ChunkKind::Text, source)),
		_ => None,
	}
}

fn classify_script_element<'t>(node: Node<'t>, source: &str) -> RawChunkCandidate<'t> {
	classify_injected_raw_text_block(node, ChunkKind::Script, source, SupportLang::JavaScript)
}

fn classify_style_element<'t>(node: Node<'t>, source: &str) -> RawChunkCandidate<'t> {
	classify_injected_raw_text_block(node, ChunkKind::Style, source, SupportLang::Css)
}

fn classify_injected_raw_text_block<'t>(
	node: Node<'t>,
	kind: ChunkKind,
	source: &str,
	default_language: SupportLang,
) -> RawChunkCandidate<'t> {
	let Some(content_node) = child_by_kind(node, &["raw_text"]) else {
		return positional_candidate(node, kind, source);
	};

	let candidate = with_region_node(positional_candidate(node, kind, source), Some(content_node));
	match resolve_embedded_language(node, source, default_language) {
		Some(language) => with_injected_subtree(candidate, language, content_node),
		None => candidate,
	}
}

/// Extract the tag name from an HTML/XML element node.
///
/// HTML: `element` → `start_tag`/`self_closing_tag` → `tag_name`
/// XML (tree-sitter-xml): `element` → `STag`/`EmptyElemTag` → `Name`
fn extract_markup_tag_name(node: Node<'_>, source: &str) -> Option<String> {
	named_children(node).into_iter().find_map(|child| {
		let tag_name_kinds: &[&str] = match child.kind() {
			// HTML
			"start_tag" | "self_closing_tag" => &["tag_name"],
			// XML (tree-sitter-xml grammar)
			"STag" | "EmptyElemTag" => &["Name"],
			_ => return None,
		};
		child_by_kind(child, tag_name_kinds)
			.and_then(|tag| sanitize_identifier(node_text(source, tag.start_byte(), tag.end_byte())))
	})
}

fn resolve_embedded_language(
	node: Node<'_>,
	source: &str,
	default_language: SupportLang,
) -> Option<SupportLang> {
	if let Some(language) = attribute_value(node, "lang", source) {
		return SupportLang::from_alias(language.as_str());
	}
	Some(default_language)
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

const fn force_container(mut candidate: RawChunkCandidate<'_>) -> RawChunkCandidate<'_> {
	candidate.force_recurse = true;
	candidate
}

impl LangClassifier for HtmlXmlClassifier {
	fn tables(&self) -> &'static ClassifierTables {
		&HTML_XML_TABLES
	}

	fn classify_override<'t>(
		&self,
		context: ChunkContext,
		node: Node<'t>,
		source: &str,
	) -> Option<RawChunkCandidate<'t>> {
		if matches!(context, ChunkContext::Root | ChunkContext::ClassBody) {
			return classify_element(node, source);
		}
		None
	}
}
