mod fs_ops;
mod path_resolver;
mod terminal;
mod watcher;

use serde::{Deserialize, Serialize};
use std::path::Path;
use tauri::menu::{
    AboutMetadata, Menu, MenuBuilder, MenuItem, MenuItemBuilder, PredefinedMenuItem, Submenu,
    SubmenuBuilder,
};
use tauri::{AppHandle, Emitter, Manager, WebviewWindow};
use url::Url;

use fs_ops::{claude_projects_path, get_projects, get_sessions, read_session_file, Project, Session};

const SCHEME: &str = "claude-viewer";
const EVENT_DEEP_LINK_OPEN: &str = "deep-link-open";
const EVENT_MENU_ACTION: &str = "menu-action";

#[derive(Serialize)]
pub struct OpResult {
    pub ok: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error: Option<String>,
}

impl OpResult {
    pub fn success() -> Self {
        Self { ok: true, error: None }
    }
    pub fn err(msg: impl Into<String>) -> Self {
        Self { ok: false, error: Some(msg.into()) }
    }
}

#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
struct DeepLinkParams {
    #[serde(skip_serializing_if = "Option::is_none")]
    session_id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    project_path: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    jsonl_file: Option<String>,
}

#[tauri::command]
fn fs_get_projects() -> Vec<Project> {
    get_projects()
}

#[tauri::command]
fn fs_get_sessions(project_path: String) -> Vec<Session> {
    get_sessions(&project_path)
}

#[tauri::command]
fn fs_read_file(path: String) -> Vec<serde_json::Value> {
    read_session_file(&path)
}

#[tauri::command]
fn fs_watch_file(app: AppHandle, path: String) -> Result<(), String> {
    watcher::watch_file(app, path)
}

#[tauri::command]
fn fs_unwatch_file(path: String) {
    watcher::unwatch_file(&path);
}

#[tauri::command]
fn fs_trash_session(file_path: String) -> OpResult {
    if file_path.is_empty() {
        return OpResult::err("missing filePath");
    }
    let target = Path::new(&file_path);
    if !target.starts_with(claude_projects_path()) {
        return OpResult::err("path outside ~/.claude/projects");
    }
    if target.extension().and_then(|e| e.to_str()) != Some("jsonl") {
        return OpResult::err("not a .jsonl file");
    }

    match trash::delete(&file_path) {
        Ok(_) => OpResult::success(),
        Err(e) => OpResult::err(e.to_string()),
    }
}

#[tauri::command]
fn system_launch_in_terminal(command: String) -> OpResult {
    terminal::launch_in_terminal(&command)
}

#[tauri::command]
fn path_get_home() -> String {
    dirs::home_dir()
        .map(|p| p.to_string_lossy().to_string())
        .unwrap_or_default()
}

fn parse_deep_link(url_str: &str) -> Option<DeepLinkParams> {
    let url = Url::parse(url_str).ok()?;
    let mut params = DeepLinkParams {
        session_id: None,
        project_path: None,
        jsonl_file: None,
    };
    for (k, v) in url.query_pairs() {
        match k.as_ref() {
            "sessionId" => params.session_id = Some(v.to_string()),
            "projectPath" => params.project_path = Some(v.to_string()),
            "jsonlFile" => params.jsonl_file = Some(v.to_string()),
            _ => {}
        }
    }
    Some(params)
}

fn emit_deep_link_to_window(win: &WebviewWindow, params: &DeepLinkParams) {
    let _ = win.show();
    let _ = win.set_focus();
    let _ = win.emit(EVENT_DEEP_LINK_OPEN, params);
}

fn handle_deep_links(app: &AppHandle, urls: Vec<String>) {
    for url in urls {
        let Some(params) = parse_deep_link(&url) else { continue };
        if let Some(win) = app.get_webview_window("main") {
            emit_deep_link_to_window(&win, &params);
        }
    }
}

fn menu_item(
    app: &AppHandle,
    label: &str,
    id: &str,
    accel: &str,
) -> tauri::Result<MenuItem<tauri::Wry>> {
    MenuItemBuilder::new(label).id(id).accelerator(accel).build(app)
}

fn build_app_menu(app: &AppHandle) -> tauri::Result<Menu<tauri::Wry>> {
    let app_submenu = SubmenuBuilder::new(app, "Loom")
        .item(&PredefinedMenuItem::about(
            app,
            Some("About Loom"),
            Some(AboutMetadata {
                name: Some("Loom".into()),
                version: Some(app.package_info().version.to_string()),
                copyright: Some("MIT · Built on esc5221/claude-code-viewer".into()),
                comments: Some(
                    "A desktop workspace for your Claude Code CLI sessions.\n\n\
                     Every chat is a thread — Loom keeps them browseable, resumable, and quietly yours."
                        .into(),
                ),
                ..Default::default()
            }),
        )?)
        .separator()
        .services()
        .separator()
        .hide()
        .hide_others()
        .show_all()
        .separator()
        .quit()
        .build()?;

    let file_submenu: Submenu<tauri::Wry> = SubmenuBuilder::new(app, "File")
        .item(&menu_item(app, "New Window", "menu-new-window", "CmdOrCtrl+N")?)
        .item(&menu_item(app, "New Tab", "menu-new-tab", "CmdOrCtrl+T")?)
        .item(&menu_item(app, "Close Tab", "menu-close-tab", "CmdOrCtrl+W")?)
        .separator()
        .item(&menu_item(app, "Close Window", "menu-close-window", "CmdOrCtrl+Shift+W")?)
        .build()?;

    let edit_submenu = SubmenuBuilder::new(app, "Edit")
        .undo()
        .redo()
        .separator()
        .cut()
        .copy()
        .paste()
        .select_all()
        .build()?;

    let view_submenu = SubmenuBuilder::new(app, "View")
        .item(&menu_item(app, "Toggle Sidebar", "menu-toggle-sidebar", "CmdOrCtrl+B")?)
        .separator()
        .item(&menu_item(app, "Zoom In", "menu-zoom-in", "CmdOrCtrl+Plus")?)
        .item(&menu_item(app, "Zoom Out", "menu-zoom-out", "CmdOrCtrl+-")?)
        .item(&menu_item(app, "Reset Zoom", "menu-zoom-reset", "CmdOrCtrl+0")?)
        .separator()
        .item(&PredefinedMenuItem::fullscreen(app, None)?)
        .build()?;

    let window_submenu = SubmenuBuilder::new(app, "Window")
        .minimize()
        .maximize()
        .separator()
        .item(&PredefinedMenuItem::close_window(app, None)?)
        .build()?;

    MenuBuilder::new(app)
        .item(&app_submenu)
        .item(&file_submenu)
        .item(&edit_submenu)
        .item(&view_submenu)
        .item(&window_submenu)
        .build()
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let scheme_prefix = format!("{SCHEME}://");
    tauri::Builder::default()
        .plugin(tauri_plugin_single_instance::init(move |app, args, _cwd| {
            if let Some(win) = app.get_webview_window("main") {
                let _ = win.show();
                let _ = win.set_focus();
            }
            let urls: Vec<String> = args
                .into_iter()
                .filter(|a| a.starts_with(&scheme_prefix))
                .collect();
            if !urls.is_empty() {
                handle_deep_links(&app.app_handle().clone(), urls);
            }
        }))
        .plugin(tauri_plugin_deep_link::init())
        .setup(|app| {
            let handle = app.handle().clone();

            // On Windows/Linux the scheme registration happens at runtime (macOS
            // populates it from Info.plist at install time).
            #[cfg(any(windows, target_os = "linux"))]
            {
                use tauri_plugin_deep_link::DeepLinkExt;
                let _ = handle.deep_link().register(SCHEME);
            }

            {
                use tauri_plugin_deep_link::DeepLinkExt;
                let handle_for_links = handle.clone();
                handle.deep_link().on_open_url(move |event| {
                    let urls: Vec<String> =
                        event.urls().iter().map(|u| u.to_string()).collect();
                    handle_deep_links(&handle_for_links, urls);
                });
            }

            let menu = build_app_menu(&handle)?;
            app.set_menu(menu)?;
            app.on_menu_event(|app, event| {
                let id = event.id.as_ref();
                let Some(win) = app.get_webview_window("main") else { return };
                match id {
                    "menu-new-window" => {
                        let _ = win.show();
                        let _ = win.set_focus();
                    }
                    "menu-new-tab"
                    | "menu-close-tab"
                    | "menu-toggle-sidebar"
                    | "menu-zoom-in"
                    | "menu-zoom-out"
                    | "menu-zoom-reset" => {
                        let action = id.strip_prefix("menu-").unwrap_or(id).to_string();
                        let _ = win.emit(EVENT_MENU_ACTION, action);
                    }
                    "menu-close-window" => {
                        let _ = win.close();
                    }
                    _ => {}
                }
            });

            if let Some(main) = app.get_webview_window("main") {
                let _ = main.show();
                #[cfg(debug_assertions)]
                main.open_devtools();
            }

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            fs_get_projects,
            fs_get_sessions,
            fs_read_file,
            fs_watch_file,
            fs_unwatch_file,
            fs_trash_session,
            system_launch_in_terminal,
            path_get_home,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
