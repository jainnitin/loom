# Loom

Desktop app for browsing and resuming [Claude Code](https://claude.com/claude-code) CLI sessions on macOS.

Claude Code writes each session as a JSONL under `~/.claude/projects/`. Loom reads that archive and renders a per-project timeline. One click resumes a session in iTerm (`claude --resume <id>`, tmux-CC timing handled); a compose box on the dashboard launches new chats the same way.

## Features

- ⌘K fuzzy-search across projects, first-prompts, and `/title`-labeled sessions.
- Smart session titles — finds the real first prompt, skipping slash-command wrappers and compaction preambles.
- **Hide** (reversible, Loom-only) vs. **Delete** (moves the JSONL to macOS Trash, so `claude --resume` also loses it).
- Per-project color tags, hover recap cards, 5 themes.

## Build

Node 20+, Rust toolchain.

```bash
git clone https://github.com/jainnitin/loom.git
cd loom
npm install
npm run build   # DMG in src-tauri/target/release/bundle/
```

Ad-hoc signed locally; first launch needs right-click → Open.

Dev mode:

```bash
npm run dev
```

## Configuration

Settings (⌘, or gear in the sidebar):

- **New Chat Command** — template with `{projectPath}` and `{query}` placeholders.
- **Resume Command** — default `cd {projectPath} && claude --resume {sessionId}`.
- **Default project path** — where a new chat lands if none is picked. `~` by default.
- Theme, hover-preview toggle, tool-sequence preview count.

## Shortcuts

| Key | Action |
|---|---|
| `⌘K` | Palette |
| `/` | Filter |
| `⌘B` | Sidebar |
| `⌘T` / `⌘W` | New / close tab |
| `⌘+` / `⌘-` / `⌘0` | Zoom |
| `⌘,` | Settings |

## Stack

Tauri 2 · React 19 · Vite · TypeScript · Zustand · Tailwind v4.

## Credits

Fork of [esc5221/claude-code-viewer](https://github.com/esc5221/claude-code-viewer). Path resolution from [shukebeta](https://github.com/shukebeta). MIT.
