//! Tab width resolution from `.editorconfig` and process defaults.

use std::{
	collections::HashMap,
	path::{Path, PathBuf},
	sync::LazyLock,
};

use dashmap::DashMap;
use globset::GlobSet;
use napi::bindgen_prelude::*;
use napi_derive::napi;
use path_clean::PathClean;

use crate::{glob_util::compile_glob, text};

const MIN_TAB_WIDTH: u32 = 1;
const MAX_TAB_WIDTH: u32 = 16;
const EDITORCONFIG_NAME: &str = ".editorconfig";

static EDITOR_CONFIG_CACHE: LazyLock<DashMap<String, ParsedEditorConfig>> =
	LazyLock::new(DashMap::new);
static EDITOR_CONFIG_CHAIN_CACHE: LazyLock<DashMap<String, Vec<(PathBuf, ParsedEditorConfig)>>> =
	LazyLock::new(DashMap::new);
static INDENTATION_CACHE: LazyLock<DashMap<String, u32>> = LazyLock::new(DashMap::new);

#[derive(Clone)]
struct EditorConfigSection {
	pattern:    String,
	properties: HashMap<String, String>,
}

#[derive(Clone)]
struct ParsedEditorConfig {
	root:     bool,
	sections: Vec<EditorConfigSection>,
}

#[derive(Clone, Copy, PartialEq, Eq)]
enum IndentStyle {
	Space,
	Tab,
}

#[derive(Clone, Copy, PartialEq, Eq)]
enum IndentSize {
	Spaces(u32),
	Tab,
}

struct EditorConfigMatch {
	indent_style: Option<IndentStyle>,
	indent_size:  Option<IndentSize>,
	tab_width:    Option<u32>,
}

fn clamp_tab_width(value: u32) -> u32 {
	value.clamp(MIN_TAB_WIDTH, MAX_TAB_WIDTH)
}

fn parse_positive_integer(value: Option<&str>) -> Option<u32> {
	let value = value?;
	if !value.chars().all(|c| c.is_ascii_digit()) {
		return None;
	}
	let parsed: u32 = value.parse().ok()?;
	if parsed == 0 {
		return None;
	}
	Some(clamp_tab_width(parsed))
}

fn parse_editor_config_file(content: &str) -> ParsedEditorConfig {
	let mut parsed = ParsedEditorConfig { root: false, sections: Vec::new() };
	let mut current_section_idx: Option<usize> = None;

	for raw_line in content.lines() {
		let line = raw_line.trim();
		if line.is_empty() {
			continue;
		}
		if line.starts_with('#') || line.starts_with(';') {
			continue;
		}

		if line.starts_with('[') && line.ends_with(']') && line.len() >= 2 {
			let pattern = line[1..line.len() - 1].trim();
			if pattern.is_empty() {
				current_section_idx = None;
				continue;
			}
			parsed.sections.push(EditorConfigSection {
				pattern:    pattern.to_string(),
				properties: HashMap::new(),
			});
			current_section_idx = Some(parsed.sections.len() - 1);
			continue;
		}

		let Some((key, value)) = line.split_once('=') else {
			continue;
		};
		let key = key.trim().to_lowercase();
		let value = value.trim().to_lowercase();
		if key.is_empty() {
			continue;
		}

		if let Some(idx) = current_section_idx {
			parsed.sections[idx].properties.insert(key, value);
		} else if key == "root" {
			parsed.root = value == "true";
		}
	}

	parsed
}

fn parse_cached_editor_config(config_path: &Path) -> Option<ParsedEditorConfig> {
	let key = config_path.to_string_lossy().into_owned();
	if let Some(cached) = EDITOR_CONFIG_CACHE.get(&key) {
		return Some(cached.clone());
	}

	let content = std::fs::read_to_string(config_path).ok()?;
	let parsed = parse_editor_config_file(&content);
	EDITOR_CONFIG_CACHE.insert(key, parsed.clone());
	Some(parsed)
}

fn matches_editor_config_pattern(pattern: &str, relative_path: &str) -> bool {
	let normalized = pattern.trim_start_matches('/');
	if normalized.is_empty() {
		return false;
	}

	let candidates: Vec<Result<GlobSet, _>> = if normalized.contains('/') {
		vec![compile_glob(normalized, false)]
	} else {
		vec![compile_glob(normalized, false), compile_glob(normalized, true)]
	};

	for gs in candidates {
		if let Ok(set) = gs
			&& set.is_match(relative_path)
		{
			return true;
		}
	}

	false
}

fn resolve_file_path(project_dir: &Path, file: &str) -> PathBuf {
	let p = Path::new(file);
	if p.is_absolute() {
		p.to_path_buf().clean()
	} else {
		project_dir.join(file).clean()
	}
}

fn collect_editor_config_chain(start_dir: &Path) -> Vec<(PathBuf, ParsedEditorConfig)> {
	let key = start_dir.to_string_lossy().into_owned();
	if let Some(cached) = EDITOR_CONFIG_CHAIN_CACHE.get(&key) {
		return cached.clone();
	}

	let mut chain = Vec::new();
	let mut cursor = start_dir.to_path_buf();
	loop {
		let config_path = cursor.join(EDITORCONFIG_NAME);
		if let Some(parsed) = parse_cached_editor_config(&config_path) {
			let stop = parsed.root;
			chain.push((cursor.clone(), parsed));
			if stop {
				break;
			}
		}

		let Some(parent) = cursor.parent() else {
			break;
		};
		if parent == cursor {
			break;
		}
		cursor = parent.to_path_buf();
	}

	chain.reverse();
	EDITOR_CONFIG_CHAIN_CACHE.insert(key, chain.clone());
	chain
}

fn relative_path_unified(base: &Path, file: &Path) -> String {
	pathdiff::diff_paths(file, base)
		.unwrap_or_else(|| PathBuf::from("."))
		.to_string_lossy()
		.replace('\\', "/")
}

fn resolve_editor_config_match(absolute_file: &Path) -> Option<EditorConfigMatch> {
	let file_dir = absolute_file.parent()?;
	let chain = collect_editor_config_chain(file_dir);
	if chain.is_empty() {
		return None;
	}

	let mut match_ =
		EditorConfigMatch { indent_style: None, indent_size: None, tab_width: None };

	for (dir, parsed) in chain {
		let relative_path = relative_path_unified(&dir, absolute_file);
		for section in &parsed.sections {
			if !matches_editor_config_pattern(&section.pattern, &relative_path) {
				continue;
			}

			if let Some(style) = section.properties.get("indent_style") {
				match style.as_str() {
					"space" => match_.indent_style = Some(IndentStyle::Space),
					"tab" => match_.indent_style = Some(IndentStyle::Tab),
					_ => {},
				}
			}

			if let Some(raw) = section.properties.get("indent_size") {
				if raw == "tab" {
					match_.indent_size = Some(IndentSize::Tab);
				} else if let Some(n) = parse_positive_integer(Some(raw.as_str())) {
					match_.indent_size = Some(IndentSize::Spaces(n));
				}
			}

			if let Some(tw) =
				parse_positive_integer(section.properties.get("tab_width").map(|s| s.as_str()))
			{
				match_.tab_width = Some(tw);
			}
		}
	}

	if match_.indent_style.is_some() || match_.indent_size.is_some() || match_.tab_width.is_some() {
		Some(match_)
	} else {
		None
	}
}

fn resolve_editor_config_tab_width(
	match_: Option<&EditorConfigMatch>,
	fallback: u32,
) -> Option<u32> {
	let m = match_?;

	if let Some(IndentSize::Spaces(n)) = m.indent_size {
		return Some(n);
	}

	if m.indent_size == Some(IndentSize::Tab) {
		if let Some(tw) = m.tab_width {
			return Some(tw);
		}
		return Some(fallback);
	}

	if let Some(tw) = m.tab_width {
		return Some(tw);
	}

	if m.indent_style == Some(IndentStyle::Tab) {
		return Some(fallback);
	}

	None
}

/// Returns a string of spaces used to replace one tab, using `.editorconfig`
/// when present.
pub fn get_indentation(project_dir: &Path, file: Option<String>, fallback: u32) -> u32 {
	let Some(file) = file else {
		return fallback;
	};

	let absolute_file = resolve_file_path(project_dir, &file);
	let abs_key = absolute_file.to_string_lossy().into_owned();
	if let Some(cached) = INDENTATION_CACHE.get(&abs_key) {
		return *cached;
	}

	let editor_match = resolve_editor_config_match(&absolute_file);
	let resolved_width =
		resolve_editor_config_tab_width(editor_match.as_ref(), fallback).unwrap_or(fallback);
	let clamped = clamp_tab_width(resolved_width);
	INDENTATION_CACHE.insert(abs_key, clamped);
	clamped
}

/// Get the indentation for a file.
#[napi(js_name = "getIndentation")]
pub fn get_indentation_napi(
	env: &napi::Env,
	file: Option<String>,
	project_dir: Option<String>,
) -> u32 {
	let fallback = text::operation_tab_width(env, None);
	let project_dir: &Path = match &project_dir {
		Some(p) => Path::new(p),
		None => &std::env::current_dir().unwrap(),
	};

	get_indentation(project_dir, file, fallback as u32)
}
