//! CMake-specific chunk classifier.

use tree_sitter::Node;

use super::{classify::LangClassifier, common::*};

pub struct CMakeClassifier;

fn child_text<'a>(source: &'a str, node: Node<'_>) -> &'a str {
	node_text(source, node.start_byte(), node.end_byte())
}

fn first_named_child(node: Node<'_>) -> Option<Node<'_>> {
	named_children(node).into_iter().next()
}

fn first_named_child_of_kind<'t>(node: Node<'t>, kind: &str) -> Option<Node<'t>> {
	named_children(node)
		.into_iter()
		.find(|child| child.kind() == kind)
}

fn command_name(node: Node<'_>, source: &str) -> Option<String> {
	first_named_child(node).and_then(|child| sanitize_identifier(child_text(source, child)))
}

fn argument_nodes(node: Node<'_>) -> Vec<Node<'_>> {
	first_named_child_of_kind(node, "argument_list")
		.map(named_children)
		.unwrap_or_default()
		.into_iter()
		.filter(|child| child.kind() == "argument")
		.collect()
}

fn nth_argument_name(node: Node<'_>, index: usize, source: &str) -> Option<String> {
	argument_nodes(node)
		.into_iter()
		.nth(index)
		.and_then(|arg| sanitize_identifier(child_text(source, arg)))
}

fn classify_definition<'t>(node: Node<'t>, source: &str) -> Option<RawChunkCandidate<'t>> {
	match node.kind() {
		"function_def" => {
			let header = first_named_child_of_kind(node, "function_command")?;
			let name = nth_argument_name(header, 0, source).unwrap_or_else(|| "anonymous".to_string());
			Some(make_container_chunk(
				node,
				format!("fn_{name}"),
				source,
				recurse_into(node, ChunkContext::FunctionBody, &[], &["body"]),
			))
		},
		"macro_def" => {
			let header = first_named_child_of_kind(node, "macro_command")?;
			let name = nth_argument_name(header, 0, source).unwrap_or_else(|| "anonymous".to_string());
			Some(make_container_chunk(
				node,
				format!("macro_{name}"),
				source,
				recurse_into(node, ChunkContext::FunctionBody, &[], &["body"]),
			))
		},
		"if_condition" => Some(make_container_chunk(
			node,
			"if".to_string(),
			source,
			Some(recurse_self(node, ChunkContext::FunctionBody)),
		)),
		"foreach_loop" | "while_loop" => Some(make_container_chunk(
			node,
			"loop".to_string(),
			source,
			recurse_into(node, ChunkContext::FunctionBody, &[], &["body"]),
		)),
		_ => None,
	}
}

fn classify_command<'t>(node: Node<'t>, source: &str) -> Option<RawChunkCandidate<'t>> {
	if node.kind() != "normal_command" {
		return None;
	}

	let command = command_name(node, source)?;
	Some(match command.as_str() {
		"cmake_minimum_required" => make_named_chunk(node, "version_gate".to_string(), source, None),
		"project" => {
			let name = nth_argument_name(node, 0, source).unwrap_or_else(|| "anonymous".to_string());
			make_named_chunk(node, format!("project_{name}"), source, None)
		},
		"include" | "find_package" => group_candidate(node, "imports", source),
		"option" => {
			let name = nth_argument_name(node, 0, source).unwrap_or_else(|| "anonymous".to_string());
			make_named_chunk(node, format!("option_{name}"), source, None)
		},
		"set" => {
			let name = nth_argument_name(node, 0, source).unwrap_or_else(|| "anonymous".to_string());
			make_named_chunk(node, format!("var_{name}"), source, None)
		},
		"add_library" | "add_executable" | "add_custom_target" => {
			let name = nth_argument_name(node, 0, source).unwrap_or_else(|| "anonymous".to_string());
			make_named_chunk(node, format!("target_{name}"), source, None)
		},
		"install" | "export" => group_candidate(node, "install", source),
		other => group_candidate(node, &format!("cmd_{other}"), source),
	})
}

fn classify_if_child<'t>(node: Node<'t>, source: &str) -> Option<RawChunkCandidate<'t>> {
	match node.kind() {
		"if_command" => Some(group_candidate(node, "cond", source)),
		"elseif_command" => Some(positional_candidate(node, "elif", source)),
		"else_command" => Some(positional_candidate(node, "else", source)),
		"body" => Some(make_container_chunk(
			node,
			"block".to_string(),
			source,
			Some(recurse_self(node, ChunkContext::FunctionBody)),
		)),
		_ => None,
	}
}

impl LangClassifier for CMakeClassifier {
	fn classify_root<'t>(&self, node: Node<'t>, source: &str) -> Option<RawChunkCandidate<'t>> {
		classify_definition(node, source).or_else(|| classify_command(node, source))
	}

	fn classify_function<'t>(&self, node: Node<'t>, source: &str) -> Option<RawChunkCandidate<'t>> {
		classify_definition(node, source)
			.or_else(|| classify_if_child(node, source))
			.or_else(|| classify_command(node, source))
	}

	fn is_trivia(&self, kind: &str) -> bool {
		matches!(
			kind,
			"endif_command"
				| "endforeach_command"
				| "endwhile_command"
				| "endfunction_command"
				| "endmacro_command"
		)
	}
}
