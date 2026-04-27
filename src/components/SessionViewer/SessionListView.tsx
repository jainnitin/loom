import React, { useEffect, useMemo, useRef, useState } from 'react'
import {
  Folder,
  MessageSquareDashed,
  Tag,
  Search,
  EyeOff,
  Eye,
  ArrowDownUp,
  ArrowUp,
  X,
} from 'lucide-react'
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
const LONG_THRESHOLD = 50

type FilterMode = 'all' | 'named' | 'long'

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

  const [filter, setFilter] = useState('')
  const [filterOpen, setFilterOpen] = useState(false)
  const [filterMode, setFilterMode] = useState<FilterMode>('all')
  const [sortMode, setSortMode] = useState<'recent' | 'oldest'>('recent')
  const [focusedRow, setFocusedRow] = useState<number>(-1)
  const filterInputRef = useRef<HTMLInputElement | null>(null)

  const openFilter = () => {
    setFilterOpen(true)
    requestAnimationFrame(() => filterInputRef.current?.focus())
  }
  const closeFilter = () => {
    setFilter('')
    setFilterOpen(false)
  }

  // Hover preview popup
  const [hoveredSession, setHoveredSession] = useState<string | null>(null)
  const [previewPosition, setPreviewPosition] = useState({ x: 0, y: 0, width: 0, height: 0 })
  const [showPreview, setShowPreview] = useState(false)
  const hoverTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>()

  useEffect(() => {
    const load = () => {
      const v = localStorage.getItem('claude-viewer-show-session-preview')
      setShowPreview(v === 'true')
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
      namedCount: projectSessions.filter((s) => s.customTitle).length,
      longCount: projectSessions.filter((s) => (s.messageCount || 0) > LONG_THRESHOLD).length,
      latestMtime,
    }
  }, [projectSessions])

  // Tagged chips — one per unique customTitle within this project.
  const labeledChips = useMemo(() => {
    const byTitle = new Map<string, { title: string; count: number; latest: Session }>()
    for (const s of projectSessions) {
      if (!s.customTitle) continue
      const prev = byTitle.get(s.customTitle)
      if (!prev) {
        byTitle.set(s.customTitle, { title: s.customTitle, count: 1, latest: s })
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
  }, [projectSessions])

  const filteredSessions = useMemo(() => {
    const q = filter.trim().toLowerCase()
    return projectSessions.filter((s) => {
      if (filterMode === 'named' && !s.customTitle) return false
      if (filterMode === 'long' && (s.messageCount || 0) <= LONG_THRESHOLD) return false
      if (!q) return true
      return (
        (s.customTitle || '').toLowerCase().includes(q) ||
        (s.firstUserMessage || '').toLowerCase().includes(q) ||
        (s.preview || '').toLowerCase().includes(q)
      )
    })
  }, [projectSessions, filter, filterMode])

  const recentByDay = useMemo(() => {
    const sorted = [...filteredSessions]
      .filter((s) => s.mtime)
      .sort((a, b) => {
        const at = new Date(a.mtime!).getTime()
        const bt = new Date(b.mtime!).getTime()
        return sortMode === 'oldest' ? at - bt : bt - at
      })
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
    // Map preserves insertion order, which equals the row sort order, so the
    // day groups already come out newest-first in `recent` mode and
    // oldest-first in `oldest` mode — no extra reverse needed.
    return [...groups.entries()].map(([, v]) => v)
  }, [filteredSessions, sortMode])

  const flatRows = useMemo(
    () => recentByDay.flatMap((g) => g.items),
    [recentByDay],
  )
  const totalMatches = flatRows.length

  useEffect(() => {
    setFocusedRow(-1)
  }, [filter, filterMode, currentProjectPath])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null
      const inField = !!t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || (t as any).isContentEditable)
      if (e.key === '/' && !inField) {
        e.preventDefault()
        openFilter()
        return
      }
      if (inField) return
      if (e.key === 'j') {
        e.preventDefault()
        setFocusedRow((i) => Math.min(flatRows.length - 1, (i < 0 ? -1 : i) + 1))
      } else if (e.key === 'k') {
        e.preventDefault()
        setFocusedRow((i) => Math.max(0, i - 1))
      } else if (e.key === 'Enter' && focusedRow >= 0 && focusedRow < flatRows.length) {
        e.preventDefault()
        const s = flatRows[focusedRow]
        if (e.metaKey || e.ctrlKey) launchSessionInTerminal(currentProjectPath || '', s.id)
        else handleSessionClick(s)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [flatRows, focusedRow, currentProjectPath])

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

  // Highlight occurrences of the filter query in a row title
  const renderTitle = (title: string) => {
    const q = filter.trim()
    if (!q) return title
    const idx = title.toLowerCase().indexOf(q.toLowerCase())
    if (idx < 0) return title
    return (
      <>
        {title.slice(0, idx)}
        <mark>{title.slice(idx, idx + q.length)}</mark>
        {title.slice(idx + q.length)}
      </>
    )
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
  const projectHue = hueForProject(displayName)

  let rowIdx = -1

  return (
    <div className="dash-root">
      <div className="dash-inner proj-compact" style={{ ['--tag-hue' as any]: projectHue }}>
        <header className="proj-hero">
          <div className="proj-hero-title-row">
            <Folder size={22} className="proj-hero-icon" />
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
                <span className="proj-stat-hint" style={{ display: 'inline-flex', alignItems: 'center', gap: 2 }}>
                  {weekDelta > 0 ? <ArrowUp size={9} strokeWidth={2.6} /> : '↓'}
                  {Math.abs(weekDelta)}
                  <span style={{ opacity: 0.65, fontSize: 10.5, marginLeft: 4 }}>vs last</span>
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

        {labeledChips.length > 0 && (
          <div className="tagged-strip">
            <span className="tagged-strip-label">
              <Tag size={11} /> tagged
            </span>
            {labeledChips.map((c) => (
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
        )}

        <div className="fs-strip" role="toolbar" aria-label="Session filters">
          <button
            type="button"
            className={`fs-chip${filterMode === 'all' ? ' is-active' : ''}`}
            onClick={() => setFilterMode('all')}
          >
            all
            <span className="fs-chip-count">{stats.sessionsTotal}</span>
          </button>
          <button
            type="button"
            className={`fs-chip${filterMode === 'named' ? ' is-active' : ''}`}
            onClick={() => setFilterMode(filterMode === 'named' ? 'all' : 'named')}
          >
            named
            <span className="fs-chip-count">{stats.namedCount}</span>
          </button>
          <button
            type="button"
            className={`fs-chip${filterMode === 'long' ? ' is-active' : ''}`}
            onClick={() => setFilterMode(filterMode === 'long' ? 'all' : 'long')}
          >
            &gt; {LONG_THRESHOLD}
            <span className="fs-chip-count">{stats.longCount}</span>
          </button>
          <button
            type="button"
            className="fs-chip is-active"
            onClick={() => setSortMode((m) => (m === 'recent' ? 'oldest' : 'recent'))}
            title={`Sort: ${sortMode}. Click to switch to ${sortMode === 'recent' ? 'oldest' : 'recent'}.`}
          >
            <ArrowDownUp size={11} /> {sortMode}
          </button>
          {filterOpen ? (
            <label className="fs-search">
              <span className="fs-search-icon">
                <Search size={13} />
              </span>
              <input
                ref={filterInputRef}
                type="text"
                className="fs-search-input"
                placeholder={`filter sessions in ${displayName}…`}
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') closeFilter()
                }}
              />
              {filter && <span className="fs-search-result">{totalMatches}</span>}
              <button
                type="button"
                className="fs-search-clear"
                onClick={closeFilter}
                title="Close filter (Esc)"
                aria-label="Close filter"
              >
                <X size={12} />
              </button>
            </label>
          ) : (
            <button
              type="button"
              className="fs-chip fs-trigger"
              onClick={openFilter}
              title="Filter (/)"
            >
              <Search size={11} /> filter
              <span className="fs-key">/</span>
            </button>
          )}
        </div>

        <section className="dash-recent">
          {projectSessions.length === 0 ? (
            <div className="dash-loading">No sessions in this project yet</div>
          ) : flatRows.length === 0 ? (
            <div className="dash-loading">No sessions match “{filter}”</div>
          ) : (
            recentByDay.map((group, gi) => (
              <div key={gi} className="dash-day-group">
                <div className="day-header">
                  <span className="day-header-label">{group.label}</span>
                  <span className="day-header-meta">
                    {group.items.length} {group.items.length === 1 ? 'session' : 'sessions'}
                  </span>
                </div>
                <div>
                  {group.items.map((s) => {
                    rowIdx += 1
                    const idx = rowIdx
                    const named = !!s.customTitle
                    const cleanedFirst = cleanTitle(s.firstUserMessage)
                    const cleanedPreview = cleanTitle(s.preview)
                    const cleanedSummary = cleanTitle(s.sessionSummary)
                    const title =
                      s.customTitle ||
                      cleanedFirst ||
                      cleanedPreview ||
                      cleanedSummary ||
                      'Untitled session'
                    const subline = named
                      ? (cleanedFirst || cleanedSummary)
                      : (cleanedSummary && cleanedSummary !== title ? cleanedSummary : undefined)
                    const timeLabel = s.mtime ? formatClockTime(new Date(s.mtime)) : ''
                    const isHidden = !!hiddenSessions[s.id]
                    const isFocused = idx === focusedRow
                    return (
                      <div
                        key={s.id}
                        className={`s-row is-project-scoped${named ? ' is-named' : ''}${isHidden ? ' is-hidden' : ''}${isFocused ? ' is-focused' : ''}`}
                        onClick={(e) => handleSessionClick(s, e)}
                        onMouseEnter={(e) => {
                          setFocusedRow(idx)
                          handlePreviewEnter(s, e)
                        }}
                        onMouseLeave={handlePreviewLeave}
                      >
                        <div className="s-row-tagcell">
                          {named ? <Tag size={12} aria-label="Named session" /> : null}
                        </div>
                        <span className="s-row-time">{timeLabel}</span>
                        <div className="s-row-title-cell">
                          <span className="s-row-title-text">{renderTitle(title)}</span>
                          {subline && <span className="s-row-subline">{subline}</span>}
                        </div>
                        <span className="s-row-msgs" title={`${s.messageCount} messages`}>
                          <MessageSquareDashed size={11} />
                          {s.messageCount}
                        </span>
                        <span className="s-row-actions">
                          <button
                            className="s-row-iconbtn"
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
                            className="s-row-resume"
                            onClick={(e) => {
                              e.stopPropagation()
                              launchSessionInTerminal(currentProjectPath || '', s.id)
                            }}
                            title="Resume in iTerm"
                          >
                            Resume <span className="key">⌥↵</span>
                          </button>
                        </span>
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
