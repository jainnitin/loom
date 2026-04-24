# 🧵 Loom

**A desktop workspace for your Claude Code CLI sessions.**

Claude Code CLI is fantastic for doing the work, but finding what you did two weeks ago means grep'ing UUID-named JSONL files, and resuming a specific chat means scrolling the `claude --resume` menu. Loom is the desktop app that reads your session archive and turns it into a browseable timeline — every session one click away from resuming in iTerm, every project color-tagged, every labeled chat searchable via ⌘K. New chats start from a compose box at the top of every page and launch straight into iTerm with your prompt already typed.

Designed for anyone on Claude Code CLI — especially teams on enterprise plans where Claude Desktop isn't available.

---

## ✨ Why you'll like it

### 🏠 A dashboard that feels like a writing desk
A large serif greeting, a single-line compose box, and a live timeline of recent activity across every project. Type a prompt, hit Enter, and Loom fires `claude "your query"` in iTerm — at home, or in whichever project you pick from the popover. No tab-switching.

### 🎨 Editorial typography, genuinely
Fraunces for display, Instrument Sans for body, JetBrains Mono for code — paired with a warm chocolate-and-peach palette inspired by Claude Desktop's Honeycomb theme. Ships with **5 themes**: Claude Light, Claude Dark, Honeycomb, Honeycomb Bloom, Honeycomb Sable.

### 🌈 Per-project color tags
Every project gets a stable hue from a curated 6-color palette (warm orange, amber, teal, blue, purple, rose — deliberately no green to stay friendly with the accent). The same project reads the same everywhere: sidebar, Dashboard timeline, project hero.

### 🗂️ Quiet, Claude-Desktop-style sidebar
Pinned / Recents / All buckets. Drag projects between them to pin or unpin — no star chrome, no expand chevrons, no dots. Pure text. Search tucked behind a single ⌘K palette that fuzzy-matches across projects, labeled sessions, and first-prompts.

### 🚀 One-click resume
Every session row has an iTerm launcher pill. Click it (or ⌘-click anywhere on the row) and Loom opens iTerm at the project directory and runs `claude --resume {sessionId}` with tmux-CC timing handled correctly. The whole resume template is configurable in Settings.

### 🧠 Smart session titles
Loom walks past slash-command wrappers, compaction preambles, and caveat blocks to find each session's *actual* first prompt — so "analyze this code" becomes the title, not `<command-name>/model</command-name>`. Plus full support for `/title` custom labels.

### 🏷️ Labeled session chips
If you use Claude's `/title` command, Loom surfaces every labeled session as a quick-jump chip row on every page — deduped by title with a ×N count when the same label repeats.

### 💨 Hover recap
Hover any session row → after a 500ms delay, a compact card shows the session's distilled recap so you know what you're clicking into before you click.

### 🔒 Hide vs. 🗑 Delete — two different needs
- **Hide** (eye-off on row hover) → hides from Loom's UI. Reversible. Perfect for screen-shares or when you just don't want to see that one.
- **Delete** (trash button on the session detail page) → moves the JSONL to macOS Trash. Gone from Loom *and* `claude --resume`. Recoverable via Finder until you empty Trash.

### 📐 Small things that compound
- Filter behind `/` hotkey — no permanent toolbar clutter
- AM/PM timestamps, relative dates grouped by day
- Right-rail recap panel on the session viewer, collapsible
- Copy-to-clipboard on session IDs
- Native macOS feel — hidden-inset title bar, traffic-light spacing, draggable top strip
- Zero-vulnerability dependency tree (Electron 41, Vite 7, React 19)

---

## 📦 Install

Clone and build. Requires Node 20+ (Node 22 LTS recommended) and an Apple Silicon Mac.

```bash
git clone https://github.com/jainnitin/loom.git
cd loom
npm install
npm run dist:mac    # → release/Loom-*-arm64.dmg
open release/Loom-*-arm64.dmg
```

Drag **Loom.app** into `/Applications`. The build is ad-hoc signed locally, so Gatekeeper will prompt on first launch — right-click the app → **Open** → **Open**.

Or just run it in dev mode with hot reload:
```bash
npm run dev
```

---

## ⚙️ Configuration

Open **Settings** (gear icon, bottom of the sidebar).

- **Theme** — 5 presets, live-swappable
- **New Chat Command** — template with `{projectPath}` and `{query}` placeholders. Default: `cd {projectPath}; agency claude --mcp workiq`. Query is shell-quoted safely.
- **Resume Command** — what runs when you click a session's iTerm pill. Default: `cd {projectPath} && claude --resume {sessionId}`
- **Project path** — where a new chat starts when you don't pick one. Defaults to `~` (your home).
- **Session preview** — toggle hover cards on/off
- **Tool sequence preview count** — how many recent tools to show in collapsed tool sequences

---

## ⌨️ Keyboard shortcuts

| Shortcut | Action |
|---|---|
| `⌘K` | Command palette — jump to any project or session |
| `/` | Open the filter input on Dashboard or project page |
| `Esc` | Close filter / popover |
| `⌘B` | Toggle sidebar |
| `⌘W` | Close current tab |
| `⌘T` | New Dashboard tab |
| `⌘+` / `⌘-` / `⌘0` | Zoom in / out / reset |
| `⌘,` | Settings |

---

## 🧑‍💻 Development

```bash
npm run dev          # dev server + Electron with HMR
npm run build        # production build (all three bundles)
npm run dist:mac     # package into a DMG + ZIP
```

Run dead-code analysis anytime:
```bash
npx knip             # uses checked-in knip.json
```

---

## 🛠️ Tech stack

Electron 41 · Vite 7 · React 19 · TypeScript 5.9 · Zustand · Tailwind v4 · Lucide · Fraunces / Instrument Sans / JetBrains Mono

---

## 🙏 Credits

Loom is a personal fork of [**esc5221/claude-code-viewer**](https://github.com/esc5221/claude-code-viewer) with an editorial redesign. Cross-platform path-resolution logic comes from the excellent work by [**shukebeta**](https://github.com/shukebeta). Thanks to both — standing on shoulders.

MIT License, same as upstream.
