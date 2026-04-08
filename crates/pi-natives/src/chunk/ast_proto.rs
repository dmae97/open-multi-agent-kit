//! Chunk classifier for Protocol Buffers.
//!
//! Mirror the grammar's declaration structure directly: the root owns headers,
//! imports, options, messages, enums, and services; message bodies own fields,
//! oneofs, and nested messages/enums; services own rpc declarations and service
//! options; rpc blocks may contain rpc-scoped options.

use tree_sitter::Node;

use super::{classify::LangClassifier, common::*};

pub struct ProtoClassifier;

impl LangClassifier for ProtoClassifier {
	fn classify_root<'t>(&self, node: Node<'t>, source: &str) -> Option<RawChunkCandidate<'t>> {
		classify_proto_root(node, source)
	}

	fn classify_class<'t>(&self, node: Node<'t>, source: &str) -> Option<RawChunkCandidate<'t>> {
		classify_proto_class(node, source)
	}
}

fn classify_proto_root<'t>(node: Node<'t>, source: &str) -> Option<RawChunkCandidate<'t>> {
	Some(match node.kind() {
		"syntax" | "package" => group_candidate(node, "headers", source),
		"import" => group_candidate(node, "imports", source),
		"option" => group_candidate(node, "options", source),
		"message" => make_container_chunk(
			node,
			format!("msg_{}", proto_name(node, source)?),
			source,
			recurse_into(node, ChunkContext::ClassBody, &[], &["message_body"]),
		),
		"enum" => make_container_chunk(
			node,
			format!("enum_{}", proto_name(node, source)?),
			source,
			recurse_into(node, ChunkContext::ClassBody, &[], &["enum_body"]),
		),
		"service" => make_container_chunk(
			node,
			format!("service_{}", proto_name(node, source)?),
			source,
			Some(recurse_self(node, ChunkContext::ClassBody)),
		),
		_ => return None,
	})
}

fn classify_proto_class<'t>(node: Node<'t>, source: &str) -> Option<RawChunkCandidate<'t>> {
	Some(match node.kind() {
		"option" => group_candidate(node, "options", source),
		"field" if is_proto_message_field(node) => {
			make_named_chunk(node, format!("field_{}", proto_name(node, source)?), source, None)
		},
		"oneof" => make_container_chunk(
			node,
			format!("oneof_{}", proto_name(node, source)?),
			source,
			Some(recurse_self(node, ChunkContext::ClassBody)),
		),
		"oneof_field" => {
			make_named_chunk(node, format!("field_{}", proto_name(node, source)?), source, None)
		},
		"message" => make_container_chunk(
			node,
			format!("msg_{}", proto_name(node, source)?),
			source,
			recurse_into(node, ChunkContext::ClassBody, &[], &["message_body"]),
		),
		"enum" => make_container_chunk(
			node,
			format!("enum_{}", proto_name(node, source)?),
			source,
			recurse_into(node, ChunkContext::ClassBody, &[], &["enum_body"]),
		),
		"enum_field" => {
			make_named_chunk(node, format!("variant_{}", proto_name(node, source)?), source, None)
		},
		"rpc" => make_container_chunk(
			node,
			format!("rpc_{}", proto_name(node, source)?),
			source,
			proto_rpc_recurse(node),
		),
		_ => return None,
	})
}

fn is_proto_message_field(node: Node<'_>) -> bool {
	node
		.parent()
		.is_some_and(|parent| parent.kind() == "message_body")
}

fn proto_rpc_recurse(node: Node<'_>) -> Option<RecurseSpec<'_>> {
	let has_nested_option = named_children(node)
		.into_iter()
		.any(|child| child.kind() == "option");
	if has_nested_option {
		Some(recurse_self(node, ChunkContext::ClassBody))
	} else {
		None
	}
}

fn proto_name(node: Node<'_>, source: &str) -> Option<String> {
	child_by_kind(node, &["message_name", "enum_name", "service_name", "rpc_name", "identifier"])
		.and_then(|name| sanitize_identifier(node_text(source, name.start_byte(), name.end_byte())))
}
