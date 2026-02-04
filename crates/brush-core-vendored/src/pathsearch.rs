//! Path searching utilities.

use std::{collections::VecDeque, path::PathBuf};


use crate::sys::fs::PathExt;

/// Encapsulates the result of a path search.
pub struct ExecutablePathSearch<PI>
where
    PI: AsRef<str>,
{
    paths: VecDeque<PI>,
    filenames: Vec<String>,
}

#[cfg(windows)]
fn candidate_filenames(filename: &str) -> Vec<String> {
    if std::path::Path::new(filename).extension().is_some() {
        return vec![filename.to_string()];
    }

    let mut candidates = Vec::new();
    candidates.push(filename.to_string());
    for ext in crate::sys::fs::executable_extensions() {
        candidates.push(format!("{filename}{ext}"));
    }
    candidates
}

#[cfg(not(windows))]
fn candidate_filenames(filename: &str) -> Vec<String> {
    vec![filename.to_string()]
}

impl<PI> Iterator for ExecutablePathSearch<PI>
where
    PI: AsRef<str>,
{
    type Item = PathBuf;

    fn next(&mut self) -> Option<Self::Item> {
        while let Some(path) = self.paths.pop_front() {
            let base_path = PathBuf::from(path.as_ref());
            for filename in &self.filenames {
                let path = base_path.join(filename);
                if path.is_file() && path.as_path().executable() {
                    return Some(path);
                }
            }
        }

        None
    }
}

pub(crate) struct ExecutablePathPrefixSearch<PI>
where
    PI: AsRef<str>,
{
    paths: VecDeque<PI>,
    queued_items: VecDeque<PathBuf>,
    filename_prefix: String,
    case_insensitive: bool,
}

impl<PI> Iterator for ExecutablePathPrefixSearch<PI>
where
    PI: AsRef<str>,
{
    type Item = PathBuf;

    fn next(&mut self) -> Option<Self::Item> {
        // If we already found some items and queued them, then yield one now.
        if let Some(item) = self.queued_items.pop_front() {
            return Some(item);
        }

        while let Some(path) = self.paths.pop_front() {
            let path = PathBuf::from(path.as_ref());

            if let Ok(readdir) = path.read_dir() {
                for entry in readdir.flatten() {
                    if let Ok(mut filename) = entry.file_name().into_string() {
                        if self.case_insensitive {
                            filename = filename.to_ascii_lowercase();
                        }

                        if !filename.starts_with(&self.filename_prefix) {
                            continue;
                        }
                    }

                    let entry_path = entry.path();

                    if let Ok(file_type) = entry.file_type() {
                        if file_type.is_file() && entry_path.executable() {
                            self.queued_items.push_back(entry_path);
                        }
                    }
                }
            }

            if let Some(item) = self.queued_items.pop_front() {
                return Some(item);
            }
        }

        None
    }
}

/// Search for the given executable name in the provided paths.
///
/// # Arguments
///
/// * `paths` - An iterator over the paths to search.
/// * `filename` - The name of the executable file to search for.
pub fn search_for_executable<P, PI, N>(paths: P, filename: N) -> ExecutablePathSearch<PI>
where
    P: Iterator<Item = PI>,
    PI: AsRef<str>,
    N: AsRef<str>,
{
    let filenames = candidate_filenames(filename.as_ref());
    ExecutablePathSearch {
        paths: paths.collect(),
        filenames,
    }
}

pub(crate) fn search_for_executable_with_prefix<P, PI>(
    paths: P,
    filename_prefix: &str,
    case_insensitive: bool,
) -> ExecutablePathPrefixSearch<PI>
where
    P: Iterator<Item = PI>,
    PI: AsRef<str>,
{
    let stored_prefix = if case_insensitive {
        filename_prefix.to_ascii_lowercase()
    } else {
        filename_prefix.into()
    };

    ExecutablePathPrefixSearch {
        paths: paths.collect(),
        queued_items: VecDeque::new(),
        filename_prefix: stored_prefix,
        case_insensitive,
    }
}
