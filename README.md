# Loom

Desktop app for browsing and resuming [Claude Code](https://claude.com/claude-code) CLI sessions on macOS.

Claude Code is great for doing the work, but finding what you did two weeks ago means grep'ing UUID-named JSONL files, and resuming a specific chat means scrolling the `claude --resume` menu. Loom reads your `~/.claude/projects/` archive and turns it into a browseable timeline. The Dashboard shows recent activity across every project; clicking one opens its session list. You can resume any session — or start a new one — in iTerm with a single click.

## Features

- **Terminal launch** — resume a session with `claude --resume <id>` from its row, or start a new chat from the Dashboard compose box. Both open in iTerm with tmux-CC timing handled.
- **⌘K palette** — fuzzy-search across projects, first-prompts, and `/title`-labeled sessions.
- **Smart titles** — finds the real first prompt, skipping slash-command wrappers and compaction preambles.
- **Hide vs Delete** — hide removes from Loom only (reversible); delete moves the JSONL to macOS Trash, so `claude --resume` also loses it.
- Per-project color tags, hover recap cards, 5 themes.

## Setup

Loom is a Tauri app — Node builds the React/Vite frontend, Rust compiles the native macOS shell.

Each line below installs only if the tool is missing (`||` short-circuits when the version check succeeds):

```bash
node --version  || brew install node
cargo --version || curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
```

If rustup ran, restart your shell so `cargo` lands on `$PATH`. Then build and launch the Mac app:

```bash
git clone https://github.com/jainnitin/loom.git
cd loom
npm install
npm start          # builds Loom.app and opens it
```

The build is ad-hoc signed locally — on first launch macOS will block it; right-click the app → **Open** → **Open**. Drag `Loom.app` into `/Applications` if you want it in Spotlight.

Other scripts:

- `npm run build` — same build as `npm start` but doesn't auto-open. Use this when distributing the DMG.
- `npm run dev` — runs the desktop app against Vite's dev server with HMR. Use this for frontend work.

All three preflight-check for `cargo` and bail with the rustup line if it's missing.

## Stack

Tauri 2 · React 19 · Vite · TypeScript · Zustand · Tailwind v4.

## Credits

Fork of [esc5221/claude-code-viewer](https://github.com/esc5221/claude-code-viewer). Path resolution from [shukebeta](https://github.com/shukebeta). MIT.
