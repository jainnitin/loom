# Loom

Desktop app for browsing and resuming [Claude Code](https://claude.com/claude-code) CLI sessions on macOS.

Claude Code is great for doing the work, but finding what you did two weeks ago means grep'ing UUID-named JSONL files, and resuming a specific chat means scrolling the `claude --resume` menu. Loom reads your `~/.claude/projects/` archive and turns it into a browseable timeline. The Dashboard shows recent activity across every project; clicking one opens its session list. You can resume any session — or start a new one — in iTerm with a single click.

## Features

- **Terminal launch** — resume a session with `claude --resume <id>` from its row, or start a new chat from the Dashboard compose box. Both open in iTerm with tmux-CC timing handled.
- **⌘K palette** — fuzzy-search across projects, first-prompts, and `/title`-labeled sessions.
- **Smart titles** — finds the real first prompt, skipping slash-command wrappers and compaction preambles.
- **Hide vs Delete** — hide removes from Loom only (reversible); delete moves the JSONL to macOS Trash, so `claude --resume` also loses it.
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

## Stack

Tauri 2 · React 19 · Vite · TypeScript · Zustand · Tailwind v4.

## Credits

Fork of [esc5221/claude-code-viewer](https://github.com/esc5221/claude-code-viewer). Path resolution from [shukebeta](https://github.com/shukebeta). MIT.
