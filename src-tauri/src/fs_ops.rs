use chrono::{DateTime, Utc};
use once_cell::sync::Lazy;
use regex::Regex;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::path::{Path, PathBuf};

use crate::path_resolver::resolve_project_path;

pub fn claude_projects_path() -> PathBuf {
    dirs::home_dir()
        .unwrap_or_else(|| PathBuf::from("/"))
        .join(".claude")
        .join("projects")
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct Project {
    pub name: String,
    pub path: String,
    pub session_count: usize,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub last_activity: Option<DateTime<Utc>>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct Session {
    pub id: String,
    pub project_path: String,
    pub file_path: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub start_time: Option<DateTime<Utc>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub end_time: Option<DateTime<Utc>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub mtime: Option<DateTime<Utc>>,
    pub message_count: usize,
    pub total_cost: f64,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub preview: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub custom_title: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub first_user_message: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub session_summary: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub last_prompt: Option<String>,
}

pub fn get_projects() -> Vec<Project> {
    let root = claude_projects_path();
    let Ok(entries) = std::fs::read_dir(&root) else {
        return Vec::new();
    };

    let mut projects = Vec::new();
    for entry in entries.flatten() {
        let Ok(file_type) = entry.file_type() else { continue };
        if !file_type.is_dir() {
            continue;
        }
        let dir_name = entry.file_name().to_string_lossy().to_string();
        let project_path = entry.path();

        let mut session_count = 0usize;
        let mut last_activity: Option<DateTime<Utc>> = None;
        if let Ok(files) = std::fs::read_dir(&project_path) {
            for f in files.flatten() {
                let name = f.file_name().to_string_lossy().to_string();
                if !name.ends_with(".jsonl") {
                    continue;
                }
                session_count += 1;
                if let Ok(meta) = f.metadata() {
                    if let Ok(mtime) = meta.modified() {
                        let dt: DateTime<Utc> = mtime.into();
                        if last_activity.map_or(true, |cur| dt > cur) {
                            last_activity = Some(dt);
                        }
                    }
                }
            }
        }

        let resolved_name = resolve_project_path(&dir_name);
        projects.push(Project {
            name: resolved_name,
            path: project_path.to_string_lossy().to_string(),
            session_count,
            last_activity,
        });
    }

    projects
}

pub fn get_sessions(project_name_or_path: &str) -> Vec<Session> {
    let project_path = if Path::new(project_name_or_path).is_absolute() {
        PathBuf::from(project_name_or_path)
    } else {
        claude_projects_path().join(project_name_or_path.replace('/', "-"))
    };

    let Ok(entries) = std::fs::read_dir(&project_path) else {
        return Vec::new();
    };

    let mut sessions = Vec::new();
    for entry in entries.flatten() {
        let file_name = entry.file_name().to_string_lossy().to_string();
        if !file_name.ends_with(".jsonl") {
            continue;
        }
        let file_path = entry.path();
        let Ok(meta) = std::fs::metadata(&file_path) else { continue };
        let mtime: Option<DateTime<Utc>> = meta.modified().ok().map(Into::into);

        let Ok(content) = std::fs::read_to_string(&file_path) else { continue };

        let s = parse_session(&file_path, &project_path, &content, mtime, &file_name);
        sessions.push(s);
    }

    sessions.sort_by(|a, b| match (a.mtime, b.mtime) {
        (Some(am), Some(bm)) => bm.cmp(&am),
        _ => std::cmp::Ordering::Equal,
    });

    sessions
}

fn parse_session(
    file_path: &Path,
    project_path: &Path,
    content: &str,
    mtime: Option<DateTime<Utc>>,
    file_name: &str,
) -> Session {
    let mut start_time: Option<DateTime<Utc>> = None;
    let mut end_time: Option<DateTime<Utc>> = None;
    let mut message_count = 0usize;
    let mut total_cost = 0.0f64;
    let mut custom_title: Option<String> = None;
    let mut first_user_message: Option<String> = None;
    let mut compact_fallback: Option<String> = None;
    let mut last_prompt: Option<String> = None;
    let mut last_assistant_text: Option<String> = None;
    let mut recent_messages: Vec<String> = Vec::with_capacity(3);
    let mut session_id: Option<String> = None;

    for (line_idx, line) in content.lines().enumerate() {
        let Ok(data) = serde_json::from_str::<Value>(line) else { continue };

        if line_idx == 0 {
            if let Some(id) = data.get("sessionId").and_then(|v| v.as_str()) {
                session_id = Some(id.to_string());
            }
        }

        let ty = data.get("type").and_then(|v| v.as_str()).unwrap_or("");

        if ty == "custom-title" {
            if let Some(s) = data.get("customTitle").and_then(|v| v.as_str()) {
                let t = s.trim();
                if !t.is_empty() {
                    custom_title = Some(t.to_string());
                }
            }
        }
        if ty == "last-prompt" {
            if let Some(s) = data.get("lastPrompt").and_then(|v| v.as_str()) {
                let t = s.trim();
                if !t.is_empty() {
                    last_prompt = Some(truncate_chars(t, 240));
                }
            }
        }

        if let Some(ts) = data.get("timestamp").and_then(|v| v.as_str()) {
            if let Ok(dt) = DateTime::parse_from_rfc3339(ts) {
                let dt = dt.with_timezone(&Utc);
                if start_time.map_or(true, |cur| dt < cur) {
                    start_time = Some(dt);
                }
                if end_time.map_or(true, |cur| dt > cur) {
                    end_time = Some(dt);
                }
            }
        }

        if ty == "user" || ty == "assistant" {
            message_count += 1;

            let (message_text, is_tool_result) = extract_message_text(&data);

            let is_sidechain = data
                .get("isSidechain")
                .and_then(|v| v.as_bool())
                .unwrap_or(false);
            let is_meta = data.get("isMeta").and_then(|v| v.as_bool()).unwrap_or(false);

            if first_user_message.is_none()
                && ty == "user"
                && !is_tool_result
                && !is_sidechain
                && !is_meta
                && !message_text.is_empty()
            {
                let cleaned = clean_user_message(&message_text);
                let is_compact_preamble = cleaned.starts_with(
                    "This session is being continued from a previous conversation",
                );

                if !is_compact_preamble && cleaned.chars().count() >= 2 {
                    first_user_message = Some(truncate_chars(&cleaned, 240));
                } else if is_compact_preamble && compact_fallback.is_none() {
                    if let Some(section) = extract_primary_request(&cleaned)
                        .filter(|s| s.chars().count() >= 2)
                    {
                        compact_fallback = Some(truncate_chars(&section, 240));
                    }
                }
            }

            if !message_text.is_empty() {
                recent_messages.push(truncate_chars(&message_text, 150));
                if recent_messages.len() > 3 {
                    recent_messages.remove(0);
                }
                if ty == "assistant" && !is_tool_result {
                    last_assistant_text = Some(message_text);
                }
            }
        }

        if let Some(cost) = data.get("costUSD").and_then(|v| v.as_f64()) {
            total_cost += cost;
        }
    }

    let preview = if recent_messages.is_empty() {
        None
    } else {
        Some(truncate_chars(&recent_messages.join("\n"), 200))
    };

    let id = session_id.unwrap_or_else(|| {
        file_name
            .strip_suffix(".jsonl")
            .map(|s| s.to_string())
            .unwrap_or_else(|| file_name.to_string())
    });

    let session_summary = distill_summary(last_assistant_text.as_deref());
    let first = first_user_message.or(compact_fallback);

    Session {
        id,
        project_path: project_path.to_string_lossy().to_string(),
        file_path: file_path.to_string_lossy().to_string(),
        start_time,
        end_time,
        mtime,
        message_count,
        total_cost,
        preview,
        custom_title,
        first_user_message: first,
        session_summary,
        last_prompt,
    }
}

fn extract_message_text(data: &Value) -> (String, bool) {
    let mut text = String::new();
    let mut is_tool_result = false;

    if let Some(content) = data.pointer("/message/content") {
        if let Some(s) = content.as_str() {
            text = s.to_string();
        } else if let Some(arr) = content.as_array() {
            is_tool_result = arr.iter().any(|item| {
                item.get("type").and_then(|v| v.as_str()) == Some("tool_result")
            });
            if let Some(t) = arr.iter().find(|item| {
                item.get("type").and_then(|v| v.as_str()) == Some("text")
            }) {
                if let Some(s) = t.get("text").and_then(|v| v.as_str()) {
                    text = s.to_string();
                }
            }
        }
    } else if let Some(c) = data.get("content").and_then(|v| v.as_str()) {
        text = c.to_string();
    }

    (text, is_tool_result)
}

static COMMAND_BLOCK_RE: Lazy<Regex> = Lazy::new(|| {
    // Matches <command-foo ...>...</command-foo> and <local-command-foo ...>...</local-command-foo>
    Regex::new(r"(?is)<(local-)?command-[\w-]+[^>]*>.*?</(local-)?command-[\w-]+>").unwrap()
});
static COMMAND_SELF_CLOSE_RE: Lazy<Regex> =
    Lazy::new(|| Regex::new(r"(?i)<(local-)?command-[\w-]+[^>]*/>").unwrap());
static ANSI_RE: Lazy<Regex> = Lazy::new(|| Regex::new(r"\x1b\[[0-9;]*[A-Za-z]").unwrap());
static WS_RE: Lazy<Regex> = Lazy::new(|| Regex::new(r"\s+").unwrap());

fn clean_user_message(raw: &str) -> String {
    let t = raw.trim();
    let t = COMMAND_BLOCK_RE.replace_all(t, " ");
    let t = COMMAND_SELF_CLOSE_RE.replace_all(&t, " ");
    let t = ANSI_RE.replace_all(&t, "");
    let t = WS_RE.replace_all(&t, " ");
    t.trim().to_string()
}

static PRIMARY_REQUEST_RE: Lazy<Regex> = Lazy::new(|| {
    // Capture body under "1. Primary Request[ and Intent]:" up until the next numbered heading.
    Regex::new(r"(?is)1\.\s*Primary Request(?:\s+and\s+Intent)?:\s*(.*?)(?:\s+\d+\.\s+[A-Z]|$)")
        .unwrap()
});

fn extract_primary_request(cleaned: &str) -> Option<String> {
    let caps = PRIMARY_REQUEST_RE.captures(cleaned)?;
    let inner = caps.get(1)?.as_str();
    let collapsed = WS_RE.replace_all(inner, " ").trim().to_string();
    if collapsed.is_empty() {
        None
    } else {
        Some(collapsed)
    }
}

static SUMMARY_HEADER_RE: Lazy<Regex> = Lazy::new(|| {
    Regex::new(
        r"(?im)(?:^|\n)\s*#{1,4}\s*(?:Summary(?:\s+of\s+\w+)?|Overview|Findings|Analysis|Recap|Conclusion|Results|What I did)\b[^\n]*\n",
    )
    .unwrap()
});
static FILLER_LEADIN_RE: Lazy<Regex> = Lazy::new(|| {
    Regex::new(r"(?i)^(Perfect!|Done\.|Great!|Excellent!|Got it!|I have\b|Now I\b|Now let me\b|Let me\b)[^\n]*\n+")
        .unwrap()
});
static FENCED_CODE_RE: Lazy<Regex> = Lazy::new(|| Regex::new(r"(?s)```.*?```").unwrap());
static INLINE_CODE_RE: Lazy<Regex> = Lazy::new(|| Regex::new(r"`([^`]+)`").unwrap());
static BOLD_AST_RE: Lazy<Regex> = Lazy::new(|| Regex::new(r"\*\*([^*]+)\*\*").unwrap());
static BOLD_UND_RE: Lazy<Regex> = Lazy::new(|| Regex::new(r"__([^_]+)__").unwrap());
static HEADER_RE: Lazy<Regex> = Lazy::new(|| Regex::new(r"(?m)^\s*#{1,6}\s+").unwrap());
static BULLET_RE: Lazy<Regex> = Lazy::new(|| Regex::new(r"(?m)^\s*[-*]\s+").unwrap());
static MULTINL_RE: Lazy<Regex> = Lazy::new(|| Regex::new(r"\n{3,}").unwrap());

fn distill_summary(text: Option<&str>) -> Option<String> {
    let text = text?.trim();
    if text.is_empty() {
        return None;
    }

    let t = if let Some(m) = SUMMARY_HEADER_RE.find(text) {
        text[m.end()..].trim().to_string()
    } else {
        FILLER_LEADIN_RE.replace(text, "").trim().to_string()
    };

    let t = FENCED_CODE_RE.replace_all(&t, "");
    let t = INLINE_CODE_RE.replace_all(&t, "$1");
    let t = BOLD_AST_RE.replace_all(&t, "$1");
    let t = BOLD_UND_RE.replace_all(&t, "$1");
    let t = HEADER_RE.replace_all(&t, "");
    let t = BULLET_RE.replace_all(&t, "• ");
    let t = MULTINL_RE.replace_all(&t, "\n\n");
    let t = t.trim().to_string();

    if t.is_empty() {
        return None;
    }

    if t.chars().count() > 400 {
        let mut cut: String = t.chars().take(400).collect();
        // Trim to last whitespace-terminated word, matching the TS `/\s+\S*$/` rule
        if let Some(idx) = cut.rfind(char::is_whitespace) {
            cut.truncate(idx);
        }
        cut.push('…');
        Some(cut)
    } else {
        Some(t)
    }
}

fn truncate_chars(s: &str, max: usize) -> String {
    s.chars().take(max).collect()
}

pub fn read_session_file(file_path: &str) -> Vec<Value> {
    let Ok(content) = std::fs::read_to_string(file_path) else {
        return Vec::new();
    };
    content
        .lines()
        .filter_map(|line| serde_json::from_str::<Value>(line).ok())
        .collect()
}
