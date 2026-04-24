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

Loom is a Tauri app, so it needs two toolchains:

- **Node 20+** — builds the React/Vite frontend (the UI you see).
- **Rust (cargo)** — compiles the native macOS shell (the `.app` binary that hosts the window and talks to the filesystem / iTerm).

**1. Check Node ≥ 20:**

```bash
node --version
```

If the command isn't found or the version is lower than 20, install with Homebrew:

```bash
brew install node
```

**2. Check Rust (cargo):**

```bash
cargo --version
```

If the command isn't found, install via [rustup](https://rustup.rs):

```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
```

Restart your shell after the install finishes so `cargo` lands on `$PATH`, then re-run `cargo --version` to confirm.

**3. Clone, install, run:**

```bash
git clone https://github.com/jainnitin/loom.git
cd loom
npm install
npm run dev          # development build with HMR
# or
npm run build        # release DMG → src-tauri/target/release/bundle/
```

`npm run dev` and `npm run build` run a preflight check that fails fast with the rustup install line if `cargo` is missing.

The release build is ad-hoc signed locally, so on first launch macOS will block it — right-click the app → **Open** → **Open**.

## Configuration

Settings (⌘, or gear in the sidebar):

- **New Chat Command** — template with `{projectPath}` and `{query}` placeholders.
- **Resume Command** — default `cd {projectPath}; claude --resume {sessionId}`.
- **Default project path** — where a new chat lands if none is picked. `~` by default.
- Theme, hover-preview toggle, tool-sequence preview count.

## Stack

Tauri 2 · React 19 · Vite · TypeScript · Zustand · Tailwind v4.

## Credits

Fork of [esc5221/claude-code-viewer](https://github.com/esc5221/claude-code-viewer). Path resolution from [shukebeta](https://github.com/shukebeta). MIT.
