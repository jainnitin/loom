import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Search, Folder, Tag, Clock, Terminal as TerminalIcon, CornerDownLeft } from 'lucide-react'
import { useAppStore } from '@/store/appStore'
import { formatRelativeTime } from '@/utils/formatters'
import { launchSessionInTerminal } from '@/utils/launchSession'
import type { Project, Session } from '@/types'

type Item =
  | { kind: 'project'; project: Project; sub?: string }
  | { kind: 'session'; session: Session; project: Project; labeled: boolean; sub?: string }

interface Props {
  open: boolean
  onClose: () => void
}

export const CommandPalette: React.FC<Props> = ({ open, onClose }) => {
  const {
    projects,
    sessionsByProject,
    selectProject,
    createSessionTab,
    selectSession,
    preloadAllSessions,
  } = useAppStore()
  const [query, setQuery] = useState('')
  const [cursor, setCursor] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (open) {
      setQuery('')
      setCursor(0)
      // Give browser a tick to mount so the focus actually sticks
      setTimeout(() => inputRef.current?.focus(), 0)
      // Kick off a lazy load so labeled sessions across all projects are available
      preloadAllSessions()
    }
  }, [open, preloadAllSessions])

  // Build & rank results
  const items = useMemo<Item[]>(() => {
    const q = query.trim().toLowerCase()
    const out: Item[] = []

    // Projects — always show; matched projects float up
    const projectMatches = projects.filter((p) =>
      !q || p.name.toLowerCase().includes(q),
    )
    for (const p of projectMatches) {
      out.push({ kind: 'project', project: p, sub: p.name })
    }

    // Sessions — labeled first, then prompt matches
    type Triple = { s: Session; p: Project; score: number; labeled: boolean }
    const sessionHits: Triple[] = []
    for (const p of projects) {
      const sessions = sessionsByProject[p.name] || []
      for (const s of sessions) {
        const labeled = !!s.customTitle
        const title = (s.customTitle || '').toLowerCase()
        const prompt = (s.firstUserMessage || '').toLowerCase()
        if (!q) {
          if (labeled) sessionHits.push({ s, p, score: 0, labeled })
          continue
        }
        let score = 0
        if (title.includes(q)) score = labeled ? 100 : 80
        else if (prompt.includes(q)) score = 40
        else continue
        if (title.startsWith(q)) score += 20
        sessionHits.push({ s, p, score, labeled })
      }
    }
    sessionHits.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score
      if (a.labeled !== b.labeled) return a.labeled ? -1 : 1
      const ta = a.s.mtime ? new Date(a.s.mtime).getTime() : 0
      const tb = b.s.mtime ? new Date(b.s.mtime).getTime() : 0
      return tb - ta
    })
    for (const h of sessionHits.slice(0, q ? 40 : 12)) {
      out.push({
        kind: 'session',
        session: h.s,
        project: h.p,
        labeled: h.labeled,
        sub:
          (h.labeled ? h.s.customTitle : h.s.firstUserMessage || h.s.preview || 'Untitled session') || '',
      })
    }

    return out
  }, [projects, sessionsByProject, query])

  // Clamp cursor when results change
  useEffect(() => {
    setCursor((c) => Math.max(0, Math.min(c, Math.max(0, items.length - 1))))
  }, [items.length])

  // Keep active item in view
  useEffect(() => {
    if (!listRef.current) return
    const el = listRef.current.querySelector(`[data-idx="${cursor}"]`) as HTMLElement | null
    el?.scrollIntoView({ block: 'nearest' })
  }, [cursor])

  // Global Esc / arrows / Enter
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      } else if (e.key === 'ArrowDown') {
        e.preventDefault()
        setCursor((c) => Math.min(items.length - 1, c + 1))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setCursor((c) => Math.max(0, c - 1))
      } else if (e.key === 'Enter') {
        e.preventDefault()
        const it = items[cursor]
        if (!it) return
        if (e.metaKey || e.ctrlKey) {
          if (it.kind === 'session') {
            launchSessionInTerminal(it.project.name, it.session.id)
          } else {
            // cmd+enter on project: no-op for now
          }
        } else {
          openItem(it)
        }
        onClose()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, items, cursor, onClose])

  const openItem = (it: Item) => {
    if (it.kind === 'project') {
      selectProject(it.project.name)
    } else {
      selectSession(it.session.id)
      createSessionTab(it.session.id, it.project.name, it.session.id.substring(0, 8))
    }
  }

  if (!open) return null

  return (
    <div className="cmdk-backdrop" onMouseDown={onClose}>
      <div className="cmdk-card" onMouseDown={(e) => e.stopPropagation()}>
        <div className="cmdk-input-row">
          <Search size={16} className="cmdk-search-icon" />
          <input
            ref={inputRef}
            className="cmdk-input"
            placeholder="Jump to a project, label, or ask…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <kbd className="cmdk-kbd">esc</kbd>
        </div>

        <div ref={listRef} className="cmdk-list">
          {items.length === 0 ? (
            <div className="cmdk-empty">
              No matches for “{query}”. Try a project name or labeled session.
            </div>
          ) : (
            items.map((it, i) => {
              const active = i === cursor
              const key = it.kind === 'project' ? `p-${it.project.path}` : `s-${it.session.id}`
              return (
                <div
                  key={key}
                  data-idx={i}
                  className={`cmdk-item${active ? ' is-active' : ''}`}
                  onMouseEnter={() => setCursor(i)}
                  onClick={() => {
                    openItem(it)
                    onClose()
                  }}
                >
                  <div className="cmdk-icon">
                    {it.kind === 'project' ? (
                      <Folder size={14} />
                    ) : it.labeled ? (
                      <Tag size={14} style={{ color: 'hsl(var(--accent-main-000))' }} />
                    ) : (
                      <Clock size={14} />
                    )}
                  </div>
                  <div className="cmdk-body">
                    <div className="cmdk-title">
                      {it.kind === 'project'
                        ? (it.project.name.split('/').pop() || it.project.name)
                        : it.labeled
                        ? it.session.customTitle
                        : it.session.firstUserMessage?.trim() || it.session.preview?.trim() || 'Untitled session'}
                    </div>
                    <div className="cmdk-sub">
                      {it.kind === 'project' ? (
                        <span className="cmdk-sub-path">{it.project.name}</span>
                      ) : (
                        <>
                          <span>{it.project.name.split('/').pop()}</span>
                          {it.session.mtime && (
                            <>
                              <span className="cmdk-sub-sep">·</span>
                              <span>{formatRelativeTime(new Date(it.session.mtime))}</span>
                            </>
                          )}
                          {it.session.messageCount !== undefined && (
                            <>
                              <span className="cmdk-sub-sep">·</span>
                              <span>{it.session.messageCount} msgs</span>
                            </>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                  {active && (
                    <div className="cmdk-hint">
                      {it.kind === 'session' ? (
                        <>
                          <span className="cmdk-hint-item">
                            <CornerDownLeft size={11} /> open
                          </span>
                          <span className="cmdk-hint-item">
                            <kbd className="cmdk-kbd-sm">⌘↵</kbd>
                            <TerminalIcon size={11} /> iTerm
                          </span>
                        </>
                      ) : (
                        <span className="cmdk-hint-item">
                          <CornerDownLeft size={11} /> open
                        </span>
                      )}
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>

        <div className="cmdk-footer">
          <span><kbd className="cmdk-kbd-sm">↑↓</kbd> navigate</span>
          <span><kbd className="cmdk-kbd-sm">↵</kbd> open</span>
          <span><kbd className="cmdk-kbd-sm">⌘↵</kbd> launch in iTerm</span>
          <span><kbd className="cmdk-kbd-sm">esc</kbd> close</span>
        </div>
      </div>
    </div>
  )
}
