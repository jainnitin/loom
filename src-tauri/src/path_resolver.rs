use once_cell::sync::Lazy;
use std::collections::HashMap;
use std::path::{Path, PathBuf};
use std::sync::Mutex;

static CACHE: Lazy<Mutex<HashMap<String, String>>> = Lazy::new(|| Mutex::new(HashMap::new()));

/// Turn a flattened Claude project folder name back into its original filesystem path:
///   "-Users-nitin-code-loom"      → "/Users/nitin/code/loom"
///   "-Users-nitin-claude-code-web" → "/Users/nitin/claude-code-web" (dashes in dir names stay)
///   "C--Users-name-project"       → "C:\Users\name\project" (Windows drive-letter variant)
///
/// The ambiguity between `/` and `-` is resolved by checking which candidate exists on disk;
/// we also try substituting `_` so paths like `/Users/my_user` round-trip correctly.
pub fn resolve_project_path(project_name: &str) -> String {
    if let Some(hit) = CACHE.lock().unwrap().get(project_name).cloned() {
        return hit;
    }

    let result = resolve_uncached(project_name);
    CACHE
        .lock()
        .unwrap()
        .insert(project_name.to_string(), result.clone());
    result
}

fn resolve_uncached(project_name: &str) -> String {
    if project_name.is_empty() || project_name == "-" {
        return std::path::MAIN_SEPARATOR.to_string();
    }

    // Windows drive-letter pattern: "C--Users-name-project"
    let is_windows_folder = project_name.len() >= 3
        && project_name.as_bytes()[0].is_ascii_alphabetic()
        && &project_name[1..3] == "--";

    if !project_name.starts_with('-') && !is_windows_folder {
        return project_name.to_string();
    }

    if is_windows_folder {
        let drive = project_name.chars().next().unwrap().to_ascii_uppercase();
        let rest = &project_name[3..];
        let mut out = String::new();
        out.push(drive);
        out.push_str(":\\");
        out.push_str(&rest.replace('-', "\\"));
        return out;
    }

    // Unix walk: consume leading empty segments, then greedily split on `-`,
    // preferring matches that actually exist on disk.
    let mut remaining = &project_name[1..];
    let sep = std::path::MAIN_SEPARATOR.to_string();
    let mut current = PathBuf::from(&sep);

    while remaining.starts_with('-') {
        // Consecutive `-` denotes an empty path segment — consume without advancing.
        remaining = &remaining[1..];
    }

    while !remaining.is_empty() {
        let Some(next_dash) = remaining.find('-') else {
            current.push(remaining);
            break;
        };

        let candidate = &remaining[..next_dash];
        let slash_path = current.join(candidate);
        let underscore_path = current.join(candidate.replace('-', "_"));

        if slash_path.exists() {
            current = slash_path;
            remaining = &remaining[next_dash + 1..];
        } else if underscore_path.exists() {
            current = underscore_path;
            remaining = &remaining[next_dash + 1..];
        } else {
            // Try progressively longer chunks — e.g. "claude-code-web" where the
            // dashes are literal in the directory name.
            if let Some((consumed, path)) =
                find_longer_match(&current, remaining, next_dash + 1)
            {
                current = path;
                remaining = consumed;
            } else {
                current.push(remaining);
                break;
            }
        }
    }

    current.to_string_lossy().to_string()
}

/// Starting after the first dash we already rejected, keep extending the candidate
/// to include additional dashes until we find a directory that exists. Returns the
/// unconsumed tail and the new current path on success.
fn find_longer_match<'a>(
    current: &Path,
    remaining: &'a str,
    mut search_from: usize,
) -> Option<(&'a str, PathBuf)> {
    loop {
        let next = remaining[search_from..].find('-').map(|i| search_from + i);

        match next {
            Some(idx) => {
                let part = &remaining[..idx];
                let slash_path = current.join(part);
                let underscore_path = current.join(part.replace('-', "_"));
                if slash_path.exists() {
                    return Some((&remaining[idx + 1..], slash_path));
                }
                if underscore_path.exists() {
                    return Some((&remaining[idx + 1..], underscore_path));
                }
                search_from = idx + 1;
            }
            None => {
                let slash_path = current.join(remaining);
                let underscore_path = current.join(remaining.replace('-', "_"));
                if slash_path.exists() {
                    return Some(("", slash_path));
                }
                if underscore_path.exists() {
                    return Some(("", underscore_path));
                }
                return None;
            }
        }
    }
}
