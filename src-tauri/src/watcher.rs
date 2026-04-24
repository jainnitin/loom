use notify_debouncer_mini::{new_debouncer, notify::RecursiveMode, DebouncedEventKind, Debouncer};
use once_cell::sync::Lazy;
use std::collections::HashMap;
use std::path::Path;
use std::sync::Mutex;
use std::time::{Duration, SystemTime};
use tauri::{AppHandle, Emitter};

type NotifyWatcher = Debouncer<notify::RecommendedWatcher>;

struct WatcherEntry {
    _watcher: NotifyWatcher,
    refcount: usize,
}

static WATCHERS: Lazy<Mutex<HashMap<String, WatcherEntry>>> =
    Lazy::new(|| Mutex::new(HashMap::new()));

/// Attach a debounced file watcher to `file_path`. Emits `fs:fileChanged` (payload: the path)
/// only when the file's (len, mtime) actually changes — raw notify events can fire on
/// metadata-only touches, and the renderer responds by re-reading and re-parsing the whole
/// JSONL, so we filter no-ops here rather than downstream.
/// Multiple watch requests for the same path are refcounted — we only close the underlying
/// watcher once every caller unwatches.
pub fn watch_file(app: AppHandle, file_path: String) -> Result<(), String> {
    let mut guard = WATCHERS.lock().unwrap();

    if let Some(entry) = guard.get_mut(&file_path) {
        entry.refcount += 1;
        return Ok(());
    }

    let path = file_path.clone();
    let app_clone = app.clone();
    let mut last_seen: Option<(u64, SystemTime)> = read_signature(Path::new(&file_path));
    let debouncer = new_debouncer(
        Duration::from_millis(300),
        move |res: notify_debouncer_mini::DebounceEventResult| match res {
            Ok(events) => {
                if !events.iter().any(|ev| matches!(ev.kind, DebouncedEventKind::Any)) {
                    return;
                }
                let sig = read_signature(Path::new(&path));
                if sig == last_seen {
                    return;
                }
                last_seen = sig;
                let _ = app_clone.emit("fs:fileChanged", path.clone());
            }
            Err(e) => eprintln!("watcher error for {path}: {e:?}"),
        },
    )
    .map_err(|e| format!("failed to create watcher: {e}"))?;

    let mut watcher = debouncer;
    watcher
        .watcher()
        .watch(Path::new(&file_path), RecursiveMode::NonRecursive)
        .map_err(|e| format!("failed to watch {file_path}: {e}"))?;

    guard.insert(
        file_path,
        WatcherEntry {
            _watcher: watcher,
            refcount: 1,
        },
    );
    Ok(())
}

pub fn unwatch_file(file_path: &str) {
    let mut guard = WATCHERS.lock().unwrap();
    if let Some(entry) = guard.get_mut(file_path) {
        if entry.refcount > 1 {
            entry.refcount -= 1;
        } else {
            guard.remove(file_path);
        }
    }
}

fn read_signature(path: &Path) -> Option<(u64, SystemTime)> {
    let meta = std::fs::metadata(path).ok()?;
    Some((meta.len(), meta.modified().ok()?))
}
