//! GraphQL-specific chunk classifier.

use tree_sitter::Node;

use super::{classify::LangClassifier, common::*};

pub struct GraphqlClassifier;

impl LangClassifier for GraphqlClassifier {
	fn classify_root<'t>(&self, node: Node<'t>, source: &str) -> Option<RawChunkCandidate<'t>> {
		classify_graphql_root(node, source)
	}

	fn classify_class<'t>(&self, node: Node<'t>, source: &str) -> Option<RawChunkCandidate<'t>> {
		classify_graphql_class(node, source)
	}

	fn classify_function<'t>(&self, node: Node<'t>, source: &str) -> Option<RawChunkCandidate<'t>> {
		classify_graphql_function(node, source)
	}

	fn is_root_wrapper(&self, kind: &str) -> bool {
		matches!(
			kind,
			"document"
				| "definition"
				| "type_system_definition"
				| "type_definition"
				| "executable_definition"
		)
	}

	fn is_trivia(&self, kind: &str) -> bool {
		matches!(kind, "comma")
	}
}

fn classify_graphql_root<'t>(node: Node<'t>, source: &str) -> Option<RawChunkCandidate<'t>> {
	match node.kind() {
		"schema_definition" => Some(make_container_chunk(
			node,
			"schema".to_string(),
			source,
			Some(recurse_self(node, ChunkContext::ClassBody)),
		)),
		"directive_definition" => Some(make_container_chunk(
			node,
			format!(
				"directive_{}",
				extract_graphql_name(node, source).unwrap_or_else(|| "anonymous".to_string())
			),
			source,
			recurse_into(node, ChunkContext::ClassBody, &[], &["arguments_definition"]),
		)),
		"scalar_type_definition" => Some(make_named_chunk(
			node,
			format!(
				"scalar_{}",
				extract_graphql_name(node, source).unwrap_or_else(|| "anonymous".to_string())
			),
			source,
			None,
		)),
		"object_type_definition" => Some(make_container_chunk(
			node,
			format!(
				"type_{}",
				extract_graphql_name(node, source).unwrap_or_else(|| "anonymous".to_string())
			),
			source,
			recurse_into(node, ChunkContext::ClassBody, &[], &["fields_definition"]),
		)),
		"interface_type_definition" => Some(make_container_chunk(
			node,
			format!(
				"interface_{}",
				extract_graphql_name(node, source).unwrap_or_else(|| "anonymous".to_string())
			),
			source,
			recurse_into(node, ChunkContext::ClassBody, &[], &["fields_definition"]),
		)),
		"union_type_definition" => Some(make_named_chunk(
			node,
			format!(
				"union_{}",
				extract_graphql_name(node, source).unwrap_or_else(|| "anonymous".to_string())
			),
			source,
			None,
		)),
		"enum_type_definition" => Some(make_container_chunk(
			node,
			format!(
				"enum_{}",
				extract_graphql_name(node, source).unwrap_or_else(|| "anonymous".to_string())
			),
			source,
			recurse_into(node, ChunkContext::ClassBody, &[], &["enum_values_definition"]),
		)),
		"input_object_type_definition" => Some(make_container_chunk(
			node,
			format!(
				"input_{}",
				extract_graphql_name(node, source).unwrap_or_else(|| "anonymous".to_string())
			),
			source,
			recurse_into(node, ChunkContext::ClassBody, &[], &["input_fields_definition"]),
		)),
		"operation_definition" => Some(make_container_chunk(
			node,
			extract_graphql_operation_chunk_name(node, source),
			source,
			recurse_into(node, ChunkContext::FunctionBody, &[], &["selection_set"]),
		)),
		"fragment_definition" => Some(make_container_chunk(
			node,
			format!(
				"fragment_{}",
				extract_graphql_name(node, source).unwrap_or_else(|| "anonymous".to_string())
			),
			source,
			recurse_into(node, ChunkContext::FunctionBody, &[], &["selection_set"]),
		)),
		_ => None,
	}
}

fn classify_graphql_class<'t>(node: Node<'t>, source: &str) -> Option<RawChunkCandidate<'t>> {
	match node.kind() {
		"root_operation_type_definition" => Some(make_named_chunk(
			node,
			format!(
				"root_{}",
				extract_graphql_operation_type(node, source).unwrap_or_else(|| "anonymous".to_string())
			),
			source,
			None,
		)),
		"field_definition" => {
			let name = extract_graphql_name(node, source).unwrap_or_else(|| "anonymous".to_string());
			let recurse = recurse_into(node, ChunkContext::ClassBody, &[], &["arguments_definition"]);
			Some(match recurse {
				Some(recurse) => {
					make_container_chunk(node, format!("field_{name}"), source, Some(recurse))
				},
				None => make_named_chunk(node, format!("field_{name}"), source, None),
			})
		},
		"input_value_definition" => Some(classify_graphql_input_value(node, source)),
		"enum_value_definition" => Some(make_named_chunk(
			node,
			format!(
				"value_{}",
				extract_graphql_name(node, source).unwrap_or_else(|| "anonymous".to_string())
			),
			source,
			None,
		)),
		_ => None,
	}
}

fn classify_graphql_function<'t>(node: Node<'t>, source: &str) -> Option<RawChunkCandidate<'t>> {
	match node.kind() {
		"selection" => classify_graphql_selection(node, source),
		_ => None,
	}
}

fn classify_graphql_selection<'t>(node: Node<'t>, source: &str) -> Option<RawChunkCandidate<'t>> {
	let child = first_named_child(node)?;
	match child.kind() {
		"field" => {
			let name = extract_graphql_name(child, source).unwrap_or_else(|| "anonymous".to_string());
			let recurse = recurse_into(child, ChunkContext::FunctionBody, &[], &["selection_set"]);
			Some(match recurse {
				Some(recurse) => make_container_chunk_from(
					node,
					child,
					format!("field_{name}"),
					source,
					Some(recurse),
				),
				None => make_named_chunk_from(node, child, format!("field_{name}"), source, None),
			})
		},
		"fragment_spread" => Some(make_named_chunk_from(
			node,
			child,
			format!(
				"spread_{}",
				extract_graphql_name(child, source).unwrap_or_else(|| "anonymous".to_string())
			),
			source,
			None,
		)),
		"inline_fragment" => Some(make_container_chunk_from(
			node,
			child,
			"inline_fragment".to_string(),
			source,
			recurse_into(child, ChunkContext::FunctionBody, &[], &["selection_set"]),
		)),
		_ => None,
	}
}

fn classify_graphql_input_value<'t>(node: Node<'t>, source: &str) -> RawChunkCandidate<'t> {
	let prefix = match node.parent().map(|parent| parent.kind()) {
		Some("input_fields_definition") => "field",
		_ => "arg",
	};
	make_named_chunk(
		node,
		format!(
			"{prefix}_{}",
			extract_graphql_name(node, source).unwrap_or_else(|| "anonymous".to_string())
		),
		source,
		None,
	)
}

fn extract_graphql_name(node: Node<'_>, source: &str) -> Option<String> {
	find_graphql_name_node(node)
		.and_then(|name| sanitize_identifier(node_text(source, name.start_byte(), name.end_byte())))
}

fn find_graphql_name_node(node: Node<'_>) -> Option<Node<'_>> {
	match node.kind() {
		"name" | "fragment_name" => Some(node),
		_ => named_children(node)
			.into_iter()
			.find_map(find_graphql_name_node),
	}
}

fn extract_graphql_operation_type(node: Node<'_>, source: &str) -> Option<String> {
	child_by_kind(node, &["operation_type"])
		.and_then(|kind| sanitize_identifier(node_text(source, kind.start_byte(), kind.end_byte())))
}

fn extract_graphql_operation_chunk_name(node: Node<'_>, source: &str) -> String {
	let operation =
		extract_graphql_operation_type(node, source).unwrap_or_else(|| "operation".to_string());
	match extract_graphql_name(node, source) {
		Some(name) => format!("{operation}_{name}"),
		None => operation,
	}
}

fn first_named_child(node: Node<'_>) -> Option<Node<'_>> {
	(0..node.named_child_count()).find_map(|index| node.named_child(index))
}
