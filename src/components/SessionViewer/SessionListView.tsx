import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Folder, MessageSquare, Tag, Search, Terminal, EyeOff, Eye } from 'lucide-react'
import { useAppStore } from '@/store/appStore'
import { formatRelativeTime, formatClockTime, cleanTitle } from '@/utils/formatters'
import { launchSessionInTerminal, isTerminalModifier } from '@/utils/launchSession'
import { hueForProject } from '@/utils/projectHue'
import { SessionPreview } from './SessionPreview'
import { ComposeHero } from '../Compose/ComposeHero'
import type { Session } from '@/types'

interface SessionListViewProps {
  projectPath?: string
}

const WEEK_MS = 7 * 24 * 60 * 60 * 1000

export const SessionListView: React.FC<SessionListViewProps> = ({ projectPath }) => {
  const {
    sessions,
    sessionsByProject,
    projects,
    selectedProjectPath,
    loadSessionsForProject,
    createSessionTab,
    selectSession,
    hiddenSessions,
    showHidden,
    toggleHiddenSession,
    toggleShowHidden,
  } = useAppStore()

  // In-project filter input — press "/" anywhere (except while typing) to open
  const [filter, setFilter] = useState('')
  const [filterOpen, setFilterOpen] = useState(false)

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

  // Hover preview popup
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

  const currentProjectPath = projectPath || selectedProjectPath
  const selectedProject = projects.find((p) => p.name === currentProjectPath)

  useEffect(() => {
    if (currentProjectPath && !sessionsByProject[currentProjectPath]) {
      loadSessionsForProject(currentProjectPath)
    }
  }, [currentProjectPath, sessionsByProject, loadSessionsForProject])

  const allProjectSessions: Session[] =
    currentProjectPath && sessionsByProject[currentProjectPath]
      ? sessionsByProject[currentProjectPath]
      : sessions

  const hiddenInProjectCount = useMemo(
    () => allProjectSessions.filter((s) => hiddenSessions[s.id]).length,
    [allProjectSessions, hiddenSessions],
  )

  const projectSessions: Session[] = useMemo(
    () => (showHidden ? allProjectSessions : allProjectSessions.filter((s) => !hiddenSessions[s.id])),
    [allProjectSessions, hiddenSessions, showHidden],
  )

  // ---- aggregates ----
  const stats = useMemo(() => {
    const now = Date.now()
    const thisWeek = projectSessions.filter((s) => s.mtime && now - new Date(s.mtime).getTime() < WEEK_MS)
    const lastWeek = projectSessions.filter((s) => {
      if (!s.mtime) return false
      const t = new Date(s.mtime).getTime()
      return now - t >= WEEK_MS && now - t < 2 * WEEK_MS
    })
    const latestMtime = projectSessions.reduce<Date | null>((m, s) => {
      if (!s.mtime) return m
      const t = new Date(s.mtime)
      return !m || t > m ? t : m
    }, null)
    return {
      sessionsTotal: projectSessions.length,
      sessionsThisWeek: thisWeek.length,
      sessionsLastWeek: lastWeek.length,
      messagesTotal: projectSessions.reduce((a, s) => a + (s.messageCount || 0), 0),
      messagesThisWeek: thisWeek.reduce((a, s) => a + (s.messageCount || 0), 0),
      messagesLastWeek: lastWeek.reduce((a, s) => a + (s.messageCount || 0), 0),
      namedCount: projectSessions.filter((s) => s.customTitle).length,
      latestMtime,
    }
  }, [projectSessions])

  const labeled = useMemo(() => {
    return projectSessions
      .filter((s) => s.customTitle)
      .sort((a, b) => {
        const ta = a.mtime ? new Date(a.mtime).getTime() : 0
        const tb = b.mtime ? new Date(b.mtime).getTime() : 0
        return tb - ta
      })
  }, [projectSessions])

  // Deduped labeled chips — one chip per unique customTitle, most-recent session
  // surfaced on click, count badge when the label occurs >1×.
  const labeledChips = useMemo(() => {
    const byTitle = new Map<string, { title: string; count: number; latest: Session }>()
    for (const s of labeled) {
      const key = s.customTitle!
      const prev = byTitle.get(key)
      if (!prev) {
        byTitle.set(key, { title: key, count: 1, latest: s })
      } else {
        prev.count++
        const ts = s.mtime ? new Date(s.mtime).getTime() : 0
        const pts = prev.latest.mtime ? new Date(prev.latest.mtime).getTime() : 0
        if (ts > pts) prev.latest = s
      }
    }
    return Array.from(byTitle.values()).sort((a, b) => {
      const ta = a.latest.mtime ? new Date(a.latest.mtime).getTime() : 0
      const tb = b.latest.mtime ? new Date(b.latest.mtime).getTime() : 0
      return tb - ta
    })
  }, [labeled])

  // Filter applied over title, firstUserMessage, preview
  const filteredSessions = useMemo(() => {
    const q = filter.trim().toLowerCase()
    if (!q) return projectSessions
    return projectSessions.filter((s) => {
      return (
        (s.customTitle || '').toLowerCase().includes(q) ||
        (s.firstUserMessage || '').toLowerCase().includes(q) ||
        (s.preview || '').toLowerCase().includes(q)
      )
    })
  }, [projectSessions, filter])

  const recentByDay = useMemo(() => {
    const sorted = [...filteredSessions]
      .filter((s) => s.mtime)
      .sort((a, b) => new Date(b.mtime!).getTime() - new Date(a.mtime!).getTime())
    const groups = new Map<string, { label: string; items: Session[] }>()
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

  const handleSessionClick = (s: Session, e?: React.MouseEvent) => {
    if (e && isTerminalModifier(e)) {
      launchSessionInTerminal(currentProjectPath || '', s.id)
      return
    }
    selectSession(s.id)
    createSessionTab(s.id, currentProjectPath || '', s.id.substring(0, 8))
  }

  const handlePreviewEnter = (s: Session, e: React.MouseEvent) => {
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

  if (!selectedProject || !currentProjectPath) {
    return (
      <div className="dash-root" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', color: 'var(--muted-foreground)' }}>
          <Folder size={48} style={{ opacity: 0.5, marginBottom: 16 }} />
          <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>Select a Project</h2>
          <p style={{ fontSize: 14 }}>Choose a project from the sidebar to view its sessions</p>
        </div>
      </div>
    )
  }

  const displayName = selectedProject.name.split('/').pop() || selectedProject.name

  const weekDelta = stats.sessionsThisWeek - stats.sessionsLastWeek

  return (
    <div className="dash-root">
      <div className="dash-inner proj-compact" style={{ ['--tag-hue' as any]: hueForProject(displayName) }}>
        <header className="proj-hero">
          <div className="proj-hero-title-row">
            <Folder size={18} className="proj-hero-icon" />
            <h1 className="proj-hero-name">{displayName}</h1>
          </div>
          <div className="proj-hero-path">{selectedProject.name}</div>
          <div className="proj-hero-stats">
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
            <span className="proj-stat-sep">·</span>
            <span className="proj-stat">
              <strong>{stats.sessionsThisWeek}</strong>
              <span className="proj-stat-label">this week</span>
              {stats.sessionsLastWeek > 0 && weekDelta !== 0 && (
                <span className="proj-stat-hint">
                  {weekDelta > 0 ? '↑' : '↓'} {Math.abs(weekDelta)} vs last
                </span>
              )}
            </span>
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
          defaultTargetPath={selectedProject.name}
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
              key={c.title}
              className="proj-chip"
              onClick={(e) => handleSessionClick(c.latest, e)}
              onMouseEnter={(e) => handlePreviewEnter(c.latest, e)}
              onMouseLeave={handlePreviewLeave}
              title={`${c.title}${c.count > 1 ? ` — ${c.count} sessions` : ''}${c.latest.mtime ? ` · most recent ${formatRelativeTime(new Date(c.latest.mtime))}` : ''}`}
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
              placeholder="Filter sessions in this project…"
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
          {projectSessions.length === 0 ? (
            <div className="dash-loading">No sessions in this project yet</div>
          ) : filteredSessions.length === 0 ? (
            <div className="dash-loading">No sessions match “{filter}”</div>
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
                    const subline = named
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
                              launchSessionInTerminal(currentProjectPath || '', s.id)
                            }}
                            title="Resume this session in iTerm"
                            aria-label="Resume in iTerm"
                          >
                            <Terminal size={12} />
                          </button>
                        </div>
                        {subline && <div className="proj-row-subline">{subline}</div>}
                      </div>
                    )
                  })}
                </div>
              </div>
            ))
          )}

          {hiddenInProjectCount > 0 && (
            <button className="proj-hidden-link" onClick={toggleShowHidden}>
              {showHidden
                ? `Hide ${hiddenInProjectCount} ${hiddenInProjectCount === 1 ? 'session' : 'sessions'} again`
                : `Show ${hiddenInProjectCount} hidden ${hiddenInProjectCount === 1 ? 'session' : 'sessions'}`}
            </button>
          )}
        </section>
      </div>

      {hoveredSession && showPreview && (() => {
        const s = projectSessions.find((x) => x.id === hoveredSession)
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
