//! OCaml-specific chunk classifier.

use tree_sitter::Node;

use super::{classify::LangClassifier, common::*};

pub struct OcamlClassifier;

impl LangClassifier for OcamlClassifier {
	fn classify_root<'t>(&self, node: Node<'t>, source: &str) -> Option<RawChunkCandidate<'t>> {
		classify_ocaml_item(node, source)
	}

	fn classify_class<'t>(&self, node: Node<'t>, source: &str) -> Option<RawChunkCandidate<'t>> {
		match node.kind() {
			"method_definition" => Some(make_named_chunk(
				node,
				format!("fn_{}", ocaml_named_text(node, source, &["method_name"])?),
				source,
				ocaml_method_recurse(node),
			)),
			"method_specification" => Some(make_named_chunk(
				node,
				format!("fn_{}", ocaml_named_text(node, source, &["method_name"])?),
				source,
				None,
			)),
			"instance_variable_definition" => {
				Some(match ocaml_named_text(node, source, &["instance_variable_name"]) {
					Some(name) => make_named_chunk(node, format!("field_{name}"), source, None),
					None => group_candidate(node, "fields", source),
				})
			},
			_ => classify_ocaml_item(node, source),
		}
	}

	fn classify_function<'t>(&self, node: Node<'t>, source: &str) -> Option<RawChunkCandidate<'t>> {
		match node.kind() {
			"function_expression" | "match_expression" => Some(make_named_chunk(
				node,
				"match".to_string(),
				source,
				Some(recurse_self(node, ChunkContext::FunctionBody)),
			)),
			"match_case" => Some(make_named_chunk(
				node,
				"case".to_string(),
				source,
				Some(recurse_self(node, ChunkContext::FunctionBody)),
			)),
			"let_expression" => Some(make_named_chunk(
				node,
				"let".to_string(),
				source,
				Some(recurse_self(node, ChunkContext::FunctionBody)),
			)),
			_ => classify_ocaml_item(node, source),
		}
	}
}

fn classify_ocaml_item<'t>(node: Node<'t>, source: &str) -> Option<RawChunkCandidate<'t>> {
	Some(match node.kind() {
		"open_module" => group_candidate(node, "imports", source),
		"module_definition" => make_container_chunk(
			node,
			format!("mod_{}", ocaml_named_text(node, source, &["module_name"])?),
			source,
			ocaml_module_recurse(node),
		),
		"module_type_definition" => make_container_chunk(
			node,
			format!("modtype_{}", ocaml_named_text(node, source, &["module_type_name"])?),
			source,
			ocaml_module_type_recurse(node),
		),
		"class_definition" => make_container_chunk(
			node,
			format!("class_{}", ocaml_named_text(node, source, &["class_name"])?),
			source,
			ocaml_class_recurse(node),
		),
		"class_type_definition" => make_container_chunk(
			node,
			format!("classtype_{}", ocaml_named_text(node, source, &["class_type_name"])?),
			source,
			ocaml_class_type_recurse(node),
		),
		"type_definition" => make_named_chunk(
			node,
			format!("type_{}", ocaml_named_text(node, source, &["type_constructor"])?),
			source,
			None,
		),
		"exception_definition" => make_named_chunk(
			node,
			format!("exception_{}", ocaml_named_text(node, source, &["constructor_name"])?),
			source,
			None,
		),
		"value_definition" => classify_ocaml_value_definition(node, source)?,
		"value_specification" => make_named_chunk(
			node,
			format!("val_{}", ocaml_named_text(node, source, &["value_name"])?),
			source,
			None,
		),
		_ => return None,
	})
}

fn classify_ocaml_value_definition<'t>(
	node: Node<'t>,
	source: &str,
) -> Option<RawChunkCandidate<'t>> {
	let name = ocaml_named_text(node, source, &["value_name"])?;
	let recurse = ocaml_value_recurse(node);
	if ocaml_value_definition_is_function(node) {
		Some(make_named_chunk(node, format!("fn_{name}"), source, recurse))
	} else {
		Some(make_named_chunk(node, format!("val_{name}"), source, recurse))
	}
}

fn ocaml_named_text(node: Node<'_>, source: &str, kinds: &[&str]) -> Option<String> {
	find_named_text(node, source, kinds).and_then(sanitize_identifier)
}

fn find_named_text<'a>(node: Node<'_>, source: &'a str, kinds: &[&str]) -> Option<&'a str> {
	if kinds.iter().any(|kind| node.kind() == *kind) {
		return Some(node_text(source, node.start_byte(), node.end_byte()));
	}
	for child in named_children(node) {
		if let Some(text) = find_named_text(child, source, kinds) {
			return Some(text);
		}
	}
	None
}

fn ocaml_module_recurse(node: Node<'_>) -> Option<RecurseSpec<'_>> {
	recurse_into(node, ChunkContext::ClassBody, &[], &["module_binding"]).and_then(|binding| {
		recurse_into(binding.node, ChunkContext::ClassBody, &["body"], &["structure", "signature"])
	})
}

fn ocaml_module_type_recurse(node: Node<'_>) -> Option<RecurseSpec<'_>> {
	recurse_into(node, ChunkContext::ClassBody, &["body"], &["signature"])
}

fn ocaml_class_recurse(node: Node<'_>) -> Option<RecurseSpec<'_>> {
	recurse_into(node, ChunkContext::ClassBody, &[], &["class_binding"]).and_then(|binding| {
		recurse_into(binding.node, ChunkContext::ClassBody, &["body"], &["object_expression"])
	})
}

fn ocaml_class_type_recurse(node: Node<'_>) -> Option<RecurseSpec<'_>> {
	recurse_into(node, ChunkContext::ClassBody, &[], &["class_type_binding"]).and_then(|binding| {
		recurse_into(binding.node, ChunkContext::ClassBody, &["body"], &["class_body_type"])
	})
}

fn ocaml_method_recurse(node: Node<'_>) -> Option<RecurseSpec<'_>> {
	recurse_into(node, ChunkContext::FunctionBody, &["body"], &[
		"function_expression",
		"match_expression",
		"let_expression",
	])
}

fn ocaml_value_recurse(node: Node<'_>) -> Option<RecurseSpec<'_>> {
	recurse_into(node, ChunkContext::FunctionBody, &[], &["let_binding"]).and_then(|binding| {
		named_children(binding.node)
			.into_iter()
			.find(|child| {
				matches!(child.kind(), "function_expression" | "match_expression" | "let_expression")
			})
			.map(|child| RecurseSpec { node: child, context: ChunkContext::FunctionBody })
	})
}

fn ocaml_value_definition_is_function(node: Node<'_>) -> bool {
	recurse_into(node, ChunkContext::FunctionBody, &[], &["let_binding"]).is_some_and(|binding| {
		named_children(binding.node)
			.into_iter()
			.any(|child| matches!(child.kind(), "parameter" | "function_expression"))
	})
}
