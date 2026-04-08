//! SQL-specific chunk classifier.

use tree_sitter::Node;

use super::{classify::LangClassifier, common::*};

pub struct SqlClassifier;

impl LangClassifier for SqlClassifier {
	fn classify_root<'t>(&self, node: Node<'t>, source: &str) -> Option<RawChunkCandidate<'t>> {
		classify_sql_root(node, source)
	}

	fn classify_class<'t>(&self, node: Node<'t>, source: &str) -> Option<RawChunkCandidate<'t>> {
		classify_sql_class(node, source)
	}

	fn classify_function<'t>(&self, node: Node<'t>, source: &str) -> Option<RawChunkCandidate<'t>> {
		classify_sql_function(node, source)
	}

	fn is_trivia(&self, kind: &str) -> bool {
		matches!(kind, "empty_statement" | "dollar_quote" | "keyword_from")
	}
}

fn classify_sql_root<'t>(node: Node<'t>, source: &str) -> Option<RawChunkCandidate<'t>> {
	if node.kind() == "statement" {
		return classify_sql_statement_root(node, source);
	}

	classify_sql_root_node(node, node, source).or_else(|| classify_sql_query_node(node, source))
}

fn classify_sql_statement_root<'t>(node: Node<'t>, source: &str) -> Option<RawChunkCandidate<'t>> {
	let children = named_children(node);
	if children.len() == 1 {
		return classify_sql_root_node(node, children[0], source)
			.or_else(|| classify_sql_query_node(children[0], source));
	}

	if children.iter().any(|child| is_sql_query_kind(child.kind())) {
		return Some(make_container_chunk(
			node,
			"query".to_string(),
			source,
			Some(recurse_self(node, ChunkContext::FunctionBody)),
		));
	}

	None
}

fn classify_sql_root_node<'t>(
	range_node: Node<'t>,
	node: Node<'t>,
	source: &str,
) -> Option<RawChunkCandidate<'t>> {
	Some(match node.kind() {
		"create_schema" => make_named_chunk_from(
			range_node,
			node,
			format!(
				"schema_{}",
				extract_sql_identifier(node, source).unwrap_or_else(|| "anonymous".to_string())
			),
			source,
			None,
		),
		"create_table" => make_container_chunk_from(
			range_node,
			node,
			format!(
				"table_{}",
				extract_sql_object_name(node, source).unwrap_or_else(|| "anonymous".to_string())
			),
			source,
			recurse_into(node, ChunkContext::ClassBody, &[], &["column_definitions"]),
		),
		"create_view" => make_container_chunk_from(
			range_node,
			node,
			format!(
				"view_{}",
				extract_sql_object_name(node, source).unwrap_or_else(|| "anonymous".to_string())
			),
			source,
			recurse_into(node, ChunkContext::FunctionBody, &[], &["create_query"]),
		),
		"create_materialized_view" => make_container_chunk_from(
			range_node,
			node,
			format!(
				"matview_{}",
				extract_sql_object_name(node, source).unwrap_or_else(|| "anonymous".to_string())
			),
			source,
			recurse_into(node, ChunkContext::FunctionBody, &[], &["create_query"]),
		),
		"create_function" => make_container_chunk_from(
			range_node,
			node,
			format!(
				"fn_{}",
				extract_sql_object_name(node, source).unwrap_or_else(|| "anonymous".to_string())
			),
			source,
			recurse_sql_function_query(node),
		),
		"create_trigger" => make_named_chunk_from(
			range_node,
			node,
			format!(
				"trigger_{}",
				extract_sql_object_name(node, source).unwrap_or_else(|| "anonymous".to_string())
			),
			source,
			None,
		),
		"create_index" => make_named_chunk_from(
			range_node,
			node,
			format!(
				"index_{}",
				extract_sql_identifier(node, source).unwrap_or_else(|| "anonymous".to_string())
			),
			source,
			None,
		),
		_ => return None,
	})
}

fn classify_sql_class<'t>(node: Node<'t>, source: &str) -> Option<RawChunkCandidate<'t>> {
	Some(match node.kind() {
		"column_definition" => make_named_chunk(
			node,
			format!(
				"field_{}",
				extract_sql_identifier(node, source).unwrap_or_else(|| "anonymous".to_string())
			),
			source,
			None,
		),
		_ => return None,
	})
}

fn classify_sql_function<'t>(node: Node<'t>, source: &str) -> Option<RawChunkCandidate<'t>> {
	if node.kind() == "statement" {
		return Some(make_container_chunk(
			node,
			"query".to_string(),
			source,
			Some(recurse_self(node, ChunkContext::FunctionBody)),
		));
	}

	classify_sql_query_node(node, source)
}

fn classify_sql_query_node<'t>(node: Node<'t>, source: &str) -> Option<RawChunkCandidate<'t>> {
	Some(match node.kind() {
		"insert" => group_candidate(node, "stmts", source),
		"keyword_with" => group_candidate(node, "with", source),
		"cte" => make_container_chunk(
			node,
			format!(
				"cte_{}",
				extract_sql_identifier(node, source).unwrap_or_else(|| "anonymous".to_string())
			),
			source,
			recurse_into(node, ChunkContext::FunctionBody, &[], &["statement"]),
		),
		"select" => positional_candidate(node, "select", source),
		"from" => make_container_chunk(
			node,
			"from".to_string(),
			source,
			Some(recurse_self(node, ChunkContext::FunctionBody)),
		),
		"relation" => group_candidate(node, "relations", source),
		"join" => positional_candidate(node, "join", source),
		"where" => positional_candidate(node, "where", source),
		"group_by" => positional_candidate(node, "group_by", source),
		"order_by" => positional_candidate(node, "order_by", source),
		_ => return None,
	})
}

fn recurse_sql_function_query(node: Node<'_>) -> Option<RecurseSpec<'_>> {
	let body = child_by_kind(node, &["function_body"])?;
	recurse_into(body, ChunkContext::FunctionBody, &[], &["statement"])
}

fn is_sql_query_kind(kind: &str) -> bool {
	matches!(
		kind,
		"insert"
			| "keyword_with"
			| "cte"
			| "select"
			| "from"
			| "where"
			| "group_by"
			| "order_by"
			| "join"
	)
}

fn extract_sql_identifier(node: Node<'_>, source: &str) -> Option<String> {
	child_by_kind(node, &["identifier"])
		.and_then(|name| sanitize_identifier(node_text(source, name.start_byte(), name.end_byte())))
}

fn extract_sql_object_name(node: Node<'_>, source: &str) -> Option<String> {
	child_by_kind(node, &["object_reference"]).and_then(|name| last_identifier(name, source))
}

fn last_identifier(node: Node<'_>, source: &str) -> Option<String> {
	if node.kind() == "identifier" {
		return sanitize_identifier(node_text(source, node.start_byte(), node.end_byte()));
	}

	for child in named_children(node).into_iter().rev() {
		if let Some(identifier) = last_identifier(child, source) {
			return Some(identifier);
		}
	}

	None
}
