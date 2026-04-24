use std::process::Command;

use crate::OpResult;

/// Launch a terminal window (iTerm2 preferred, Terminal.app fallback) and run `command`.
///
/// The 0.8s delay inside the iTerm AppleScript is load-bearing: Claude Code's tmux -CC
/// integration races a freshly-created iTerm tab that's still loading shell rc files.
/// Writing the command too early leaves the user stranded at tmux's command-menu prompt,
/// so we let iTerm settle before `write text`.
pub fn launch_in_terminal(command: &str) -> OpResult {
    let trimmed = command.trim();
    if trimmed.is_empty() {
        return OpResult::err("empty command");
    }

    let escaped = trimmed.replace('\\', "\\\\").replace('"', "\\\"");

    let iterm_script = format!(
        r#"tell application "iTerm"
  activate
  if (count of windows) = 0 then
    create window with default profile
  else
    tell current window
      create tab with default profile
    end tell
  end if
  delay 0.8
  tell current session of current window
    write text "{esc}"
  end tell
end tell"#,
        esc = escaped
    );

    let terminal_script = format!(
        r#"tell application "Terminal"
  activate
  do script "{esc}"
end tell"#,
        esc = escaped
    );

    if run_osascript(&iterm_script) || run_osascript(&terminal_script) {
        OpResult::success()
    } else {
        OpResult::err("failed to launch terminal")
    }
}

fn run_osascript(script: &str) -> bool {
    Command::new("osascript")
        .arg("-e")
        .arg(script)
        .status()
        .map(|s| s.success())
        .unwrap_or(false)
}
