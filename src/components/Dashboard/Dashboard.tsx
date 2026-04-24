import React, { useEffect, useMemo, useRef, useState } from 'react'
import {
  MessageSquare,
  Tag,
  Search,
  Terminal,
  EyeOff,
  Eye,
  Activity,
} from 'lucide-react'
import { useAppStore } from '@/store/appStore'
import { formatRelativeTime, formatClockTime, cleanTitle } from '@/utils/formatters'
import { launchSessionInTerminal, isTerminalModifier } from '@/utils/launchSession'
import { SessionPreview } from '../SessionViewer/SessionPreview'
import { ComposeHero } from '../Compose/ComposeHero'
import { hueForProject } from '@/utils/projectHue'
import type { Session } from '@/types'

interface SessionWithProject extends Session {
  projectName: string
  projectPath: string
}

const WEEK_MS = 7 * 24 * 60 * 60 * 1000

export const Dashboard: React.FC = () => {
  const {
    projects,
    createSessionTab,
    getRecentSessionsCache,
    setRecentSessionsCache,
    setSessionsForProject,
    hiddenSessions,
    showHidden,
    toggleHiddenSession,
    toggleShowHidden,
  } = useAppStore()
  const [allSessions, setAllSessions] = useState<SessionWithProject[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('')
  const [filterOpen, setFilterOpen] = useState(false)
  const [userName, setUserName] = useState<string>('')

  // Same source as the sidebar — derive a friendly first name from $HOME's basename.
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const home = await window.api?.getHomePath?.()
        if (cancelled || !home) return
        const base = String(home).split('/').filter(Boolean).pop() || ''
        setUserName(base ? base.charAt(0).toUpperCase() + base.slice(1) : '')
      } catch {}
    })()
    return () => {
      cancelled = true
    }
  }, [])

  // Press "/" anywhere on the Dashboard (except while typing) to open the filter
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== '/') return
      const t = e.target as HTMLElement | null
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || (t as any).isContentEditable)) return
      e.preventDefault()
      setFilterOpen(true)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // Hover preview popup (matches pattern used by SessionListView)
  const [hoveredSession, setHoveredSession] = useState<string | null>(null)
  const [previewPosition, setPreviewPosition] = useState({ x: 0, y: 0, width: 0, height: 0 })
  const [showPreview, setShowPreview] = useState(true)
  const hoverTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>()

  useEffect(() => {
    const load = () => {
      const v = localStorage.getItem('claude-viewer-show-session-preview')
      setShowPreview(v !== 'false')
    }
    load()
    window.addEventListener('storage', load)
    window.addEventListener('sessionPreviewSettingChanged', load)
    return () => {
      window.removeEventListener('storage', load)
      window.removeEventListener('sessionPreviewSettingChanged', load)
    }
  }, [])

  const handlePreviewEnter = (s: SessionWithProject, e: React.MouseEvent) => {
    if (!showPreview) return
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current)
    const rect = e.currentTarget.getBoundingClientRect()
    const pos = { x: rect.left, y: rect.top, width: rect.width, height: rect.height }
    hoverTimeoutRef.current = setTimeout(() => {
      setPreviewPosition(pos)
      setHoveredSession(s.id)
    }, 500)
  }
  const handlePreviewLeave = () => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current)
    hoverTimeoutRef.current = setTimeout(() => setHoveredSession(null), 200)
  }
  const handlePreviewPopupEnter = () => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current)
  }
  const handlePreviewPopupClose = () => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current)
    hoverTimeoutRef.current = setTimeout(() => setHoveredSession(null), 100)
  }

  useEffect(() => {
    const { data, isValid } = getRecentSessionsCache()
    if (isValid && data && data.length > 0) {
      setAllSessions(data)
      setLoading(false)
      return
    }
    loadAll()
  }, [])

  const loadAll = async () => {
    setLoading(true)
    try {
      const projects = await window.api.getProjects()
      const all: SessionWithProject[] = []
      for (const p of projects) {
        try {
          const ss = await window.api.getSessions(p.path)
          setSessionsForProject(p.name, ss)
          const name = p.name.split('/').pop() || p.name
          all.push(...ss.map((s) => ({ ...s, projectName: name, projectPath: p.name })))
        } catch {}
      }
      setAllSessions(all)
      setRecentSessionsCache(all)
    } finally {
      setLoading(false)
    }
  }

  const hiddenCount = useMemo(
    () => allSessions.filter((s) => hiddenSessions[s.id]).length,
    [allSessions, hiddenSessions],
  )

  const visibleSessions = useMemo(
    () => (showHidden ? allSessions : allSessions.filter((s) => !hiddenSessions[s.id])),
    [allSessions, hiddenSessions, showHidden],
  )

  // ---- aggregates ----
  const stats = useMemo(() => {
    const now = Date.now()
    const thisWeek = visibleSessions.filter((s) => s.mtime && now - new Date(s.mtime).getTime() < WEEK_MS)
    const latestMtime = visibleSessions.reduce<Date | null>((m, s) => {
      if (!s.mtime) return m
      const t = new Date(s.mtime)
      return !m || t > m ? t : m
    }, null)
    return {
      sessionsTotal: visibleSessions.length,
      sessionsThisWeek: thisWeek.length,
      messagesTotal: visibleSessions.reduce((a, s) => a + (s.messageCount || 0), 0),
      activeProjectsWeek: new Set(thisWeek.map((s) => s.projectPath)).size,
      totalProjects: new Set(visibleSessions.map((s) => s.projectPath)).size,
      latestMtime,
    }
  }, [visibleSessions])

  // Deduped labeled chips — one chip per unique customTitle across all projects,
  // scoped by project so two "Dashboard"-titled sessions in different folders stay distinct.
  const labeledChips = useMemo(() => {
    const byKey = new Map<string, { title: string; projectName: string; count: number; latest: SessionWithProject }>()
    for (const s of visibleSessions) {
      if (!s.customTitle) continue
      const key = `${s.projectPath}::${s.customTitle}`
      const prev = byKey.get(key)
      if (!prev) {
        byKey.set(key, { title: s.customTitle, projectName: s.projectName, count: 1, latest: s })
      } else {
        prev.count++
        const ts = s.mtime ? new Date(s.mtime).getTime() : 0
        const pts = prev.latest.mtime ? new Date(prev.latest.mtime).getTime() : 0
        if (ts > pts) prev.latest = s
      }
    }
    return Array.from(byKey.values()).sort((a, b) => {
      const ta = a.latest.mtime ? new Date(a.latest.mtime).getTime() : 0
      const tb = b.latest.mtime ? new Date(b.latest.mtime).getTime() : 0
      return tb - ta
    })
  }, [visibleSessions])

  // Apply filter across title, first-user-message, preview, project name
  const filteredSessions = useMemo(() => {
    const q = filter.trim().toLowerCase()
    if (!q) return visibleSessions
    return visibleSessions.filter((s) => {
      return (
        (s.customTitle || '').toLowerCase().includes(q) ||
        (s.firstUserMessage || '').toLowerCase().includes(q) ||
        (s.preview || '').toLowerCase().includes(q) ||
        s.projectName.toLowerCase().includes(q)
      )
    })
  }, [visibleSessions, filter])

  const recentByDay = useMemo(() => {
    const sorted = [...filteredSessions]
      .filter((s) => s.mtime)
      .sort((a, b) => new Date(b.mtime!).getTime() - new Date(a.mtime!).getTime())
      .slice(0, 60)
    const groups = new Map<string, { label: string; items: SessionWithProject[] }>()
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    for (const s of sorted) {
      const d = new Date(s.mtime!)
      const dayKey = new Date(d)
      dayKey.setHours(0, 0, 0, 0)
      const diffDays = Math.floor((today.getTime() - dayKey.getTime()) / (24 * 60 * 60 * 1000))
      let label = ''
      if (diffDays === 0) label = 'Today'
      else if (diffDays === 1) label = 'Yesterday'
      else if (diffDays < 7) label = `${diffDays} days ago`
      else label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      const k = dayKey.toISOString()
      const g = groups.get(k) || { label, items: [] }
      g.items.push(s)
      groups.set(k, g)
    }
    return [...groups.entries()].map(([, v]) => v)
  }, [filteredSessions])

  const handleSessionClick = (s: SessionWithProject, e?: React.MouseEvent) => {
    if (e && isTerminalModifier(e)) {
      launchSessionInTerminal(s.projectPath, s.id)
      return
    }
    createSessionTab(s.id, s.projectPath, s.id.substring(0, 8))
  }

  return (
    <div className="dash-root">
      <div className="dash-inner proj-compact">
        <header className="proj-hero">
          <div className="proj-hero-title-row">
            <Activity size={18} className="proj-hero-icon" />
            <h1 className="proj-hero-name">
              {userName ? `Hi, ${userName}` : 'Welcome back'}
            </h1>
          </div>
          <div className="proj-hero-stats">
            <span className="proj-stat">
              <strong>{stats.totalProjects}</strong>
              <span className="proj-stat-label">
                {stats.totalProjects === 1 ? 'project' : 'projects'}
              </span>
            </span>
            <span className="proj-stat-sep">·</span>
            <span className="proj-stat">
              <strong>{stats.sessionsTotal}</strong>
              <span className="proj-stat-label">
                {stats.sessionsTotal === 1 ? 'session' : 'sessions'}
              </span>
            </span>
            <span className="proj-stat-sep">·</span>
            <span className="proj-stat">
              <strong>{stats.messagesTotal.toLocaleString()}</strong>
              <span className="proj-stat-label">
                {stats.messagesTotal === 1 ? 'message' : 'messages'}
              </span>
            </span>
            {stats.sessionsThisWeek > 0 && (
              <>
                <span className="proj-stat-sep">·</span>
                <span className="proj-stat">
                  <strong>{stats.sessionsThisWeek}</strong>
                  <span className="proj-stat-label">this week</span>
                  {stats.activeProjectsWeek > 0 && (
                    <span className="proj-stat-hint">
                      across {stats.activeProjectsWeek}{' '}
                      {stats.activeProjectsWeek === 1 ? 'project' : 'projects'}
                    </span>
                  )}
                </span>
              </>
            )}
            {stats.latestMtime && (
              <>
                <span className="proj-stat-sep">·</span>
                <span className="proj-stat">
                  <span className="proj-stat-label">
                    last activity {formatRelativeTime(stats.latestMtime)}
                  </span>
                </span>
              </>
            )}
          </div>
        </header>

        <ComposeHero
          defaultTargetPath={null}
          projects={projects}
        />

        <div className="proj-labeled-row">
          <button
            className={`proj-labeled-icon-btn${filterOpen || filter ? ' is-active' : ''}`}
            onClick={() => setFilterOpen((v) => !v)}
            title="Filter (/)"
            aria-label="Filter sessions"
          >
            <Search size={12} />
          </button>
          {labeledChips.length > 0 && (
            <Tag size={12} className="proj-labeled-icon" />
          )}
          {labeledChips.length > 0 && labeledChips.map((c) => (
              <button
                key={`${c.latest.projectPath}::${c.title}`}
                className="proj-chip"
                onClick={(e) => handleSessionClick(c.latest, e)}
                onMouseEnter={(e) => handlePreviewEnter(c.latest, e)}
                onMouseLeave={handlePreviewLeave}
                title={`${c.title}${c.count > 1 ? ` — ${c.count} sessions` : ''} · ${c.projectName}${c.latest.mtime ? ` · most recent ${formatRelativeTime(new Date(c.latest.mtime))}` : ''}`}
              >
                <span className="proj-chip-title">{c.title}</span>
                {c.count > 1 ? (
                  <span className="proj-chip-count">×{c.count}</span>
                ) : (
                  <span className="proj-chip-sub">
                    {c.latest.mtime ? formatRelativeTime(new Date(c.latest.mtime)) : ''}
                  </span>
                )}
              </button>
            ))}
        </div>

        {(filterOpen || filter) && (
          <div className="proj-filter">
            <Search size={12} className="proj-filter-icon" />
            <input
              type="text"
              className="proj-filter-input"
              placeholder="Filter across all projects…"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              onBlur={() => { if (!filter) setFilterOpen(false) }}
              onKeyDown={(e) => {
                if (e.key === 'Escape') { setFilter(''); setFilterOpen(false) }
              }}
              autoFocus
            />
            <button
              className="proj-filter-clear"
              onClick={() => { setFilter(''); setFilterOpen(false) }}
              title="Close filter (Esc)"
            >
              ×
            </button>
          </div>
        )}

        <section className="dash-recent">
          {loading && allSessions.length === 0 ? (
            <div className="dash-loading">Loading…</div>
          ) : filteredSessions.length === 0 ? (
            <div className="dash-loading">
              {filter ? `No sessions match “${filter}”` : 'No sessions yet'}
            </div>
          ) : (
            recentByDay.map((group, gi) => (
              <div key={gi} className="dash-day-group">
                <div className="dash-day-label">{group.label}</div>
                <div>
                  {group.items.map((s) => {
                    const named = !!s.customTitle
                    const cleanedFirst = cleanTitle(s.firstUserMessage)
                    const cleanedPreview = cleanTitle(s.preview)
                    const cleanedSummary = cleanTitle(s.sessionSummary)
                    const title =
                      s.customTitle ||
                      cleanedFirst ||
                      cleanedPreview ||
                      'Untitled session'
                    const bodySubline = named
                      ? (cleanedFirst || cleanedSummary)
                      : cleanedSummary
                    const timeLabel = s.mtime ? formatClockTime(new Date(s.mtime)) : ''
                    const isHidden = !!hiddenSessions[s.id]
                    return (
                      <div
                        key={s.id}
                        className={`proj-row${named ? ' is-named' : ''}${isHidden ? ' is-hidden' : ''}`}
                        onClick={(e) => handleSessionClick(s, e)}
                        onMouseEnter={(e) => handlePreviewEnter(s, e)}
                        onMouseLeave={handlePreviewLeave}
                      >
                        <div className="proj-row-head">
                          {named && <Tag size={12} className="proj-row-tag" />}
                          <span className="proj-row-title">{title}</span>
                          <span className="proj-row-meta">
                            {timeLabel && <span>{timeLabel}</span>}
                            {timeLabel && <span className="proj-row-meta-sep">·</span>}
                            <span className="proj-row-msgs">
                              <MessageSquare size={11} />
                              {s.messageCount}
                            </span>
                          </span>
                          <button
                            className="proj-row-hide"
                            onClick={(e) => {
                              e.stopPropagation()
                              toggleHiddenSession(s.id)
                            }}
                            title={isHidden ? 'Unhide session' : 'Hide session'}
                            aria-label={isHidden ? 'Unhide session' : 'Hide session'}
                          >
                            {isHidden ? <Eye size={12} /> : <EyeOff size={12} />}
                          </button>
                          <button
                            className="proj-row-term"
                            onClick={(e) => {
                              e.stopPropagation()
                              launchSessionInTerminal(s.projectPath, s.id)
                            }}
                            title="Resume this session in iTerm"
                            aria-label="Resume in iTerm"
                          >
                            <Terminal size={12} />
                          </button>
                        </div>
                        <div className="proj-row-subline">
                          <span
                            className="dash-row-project-tag"
                            title={s.projectPath}
                            style={{ ['--tag-hue' as any]: hueForProject(s.projectName) }}
                          >
                            {s.projectName}
                          </span>
                          {bodySubline && (
                            <>
                              <span className="proj-row-meta-sep">·</span>
                              <span className="dash-row-subline-text">{bodySubline}</span>
                            </>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))
          )}

          {hiddenCount > 0 && (
            <button className="proj-hidden-link" onClick={toggleShowHidden}>
              {showHidden
                ? `Hide ${hiddenCount} ${hiddenCount === 1 ? 'session' : 'sessions'} again`
                : `Show ${hiddenCount} hidden ${hiddenCount === 1 ? 'session' : 'sessions'}`}
            </button>
          )}
        </section>
      </div>

      {hoveredSession && showPreview && (() => {
        const s = allSessions.find((x) => x.id === hoveredSession)
        return (
          <SessionPreview
            sessionId={hoveredSession}
            sessionFilePath={s?.filePath || ''}
            position={previewPosition}
            onClose={handlePreviewPopupClose}
            onMouseEnter={handlePreviewPopupEnter}
            summary={s?.sessionSummary}
            firstUserMessage={s?.firstUserMessage}
          />
        )
      })()}
    </div>
  )
}
