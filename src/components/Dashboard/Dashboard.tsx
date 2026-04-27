import React, { useEffect, useMemo, useRef, useState } from 'react'
import {
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
import { formatClockTime, cleanTitle } from '@/utils/formatters'
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
const LONG_THRESHOLD = 100

type FilterMode = 'all' | 'named' | 'long'

export const Dashboard: React.FC = () => {
  const {
    projects,
    createSessionTab,
    selectProject,
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
  const [filterMode, setFilterMode] = useState<FilterMode>('all')
  const [sortMode, setSortMode] = useState<'recent' | 'oldest'>('recent')
  const [focusedRow, setFocusedRow] = useState<number>(-1)
  const [userName, setUserName] = useState<string>('')
  const filterInputRef = useRef<HTMLInputElement | null>(null)

  // Friendly first name from $HOME's basename — same source as the sidebar.
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

  const openFilter = () => {
    setFilterOpen(true)
    requestAnimationFrame(() => filterInputRef.current?.focus())
  }
  const closeFilter = () => {
    setFilter('')
    setFilterOpen(false)
  }

  // Hover preview popup (matches pattern used by SessionListView)
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
      // Fan out to all projects concurrently. Tauri runs sync commands on a
      // blocking thread pool, so multiple in-flight invokes parse files in
      // parallel — cold-start drops from O(N projects) to roughly O(slowest).
      const perProject = await Promise.all(
        projects.map(async (p) => {
          try {
            const ss = await window.api.getSessions(p.path)
            setSessionsForProject(p.name, ss)
            const name = p.name.split('/').pop() || p.name
            return ss.map((s) => ({ ...s, projectName: name, projectPath: p.name }))
          } catch {
            return [] as SessionWithProject[]
          }
        }),
      )
      const all = perProject.flat()
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
    return {
      sessionsTotal: visibleSessions.length,
      sessionsThisWeek: thisWeek.length,
      messagesTotal: visibleSessions.reduce((a, s) => a + (s.messageCount || 0), 0),
      totalProjects: new Set(visibleSessions.map((s) => s.projectPath)).size,
      namedCount: visibleSessions.filter((s) => s.customTitle).length,
      longCount: visibleSessions.filter((s) => (s.messageCount || 0) > LONG_THRESHOLD).length,
    }
  }, [visibleSessions])

  // Apply filter mode + text query across title, first-user-message, preview, project name
  const filteredSessions = useMemo(() => {
    const q = filter.trim().toLowerCase()
    return visibleSessions.filter((s) => {
      if (filterMode === 'named' && !s.customTitle) return false
      if (filterMode === 'long' && (s.messageCount || 0) <= LONG_THRESHOLD) return false
      if (!q) return true
      return (
        (s.customTitle || '').toLowerCase().includes(q) ||
        (s.firstUserMessage || '').toLowerCase().includes(q) ||
        (s.preview || '').toLowerCase().includes(q) ||
        s.projectName.toLowerCase().includes(q)
      )
    })
  }, [visibleSessions, filter, filterMode])

  const recentByDay = useMemo(() => {
    const sorted = [...filteredSessions]
      .filter((s) => s.mtime)
      .sort((a, b) => {
        const at = new Date(a.mtime!).getTime()
        const bt = new Date(b.mtime!).getTime()
        return sortMode === 'oldest' ? at - bt : bt - at
      })
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
    // Map preserves insertion order, which equals the row sort order, so the
    // day groups already come out newest-first in `recent` mode and
    // oldest-first in `oldest` mode — no extra reverse needed.
    return [...groups.entries()].map(([, v]) => v)
  }, [filteredSessions, sortMode])

  // Flat ordered list of currently-rendered sessions for j/k focus + match-count
  const flatRows = useMemo(
    () => recentByDay.flatMap((g) => g.items),
    [recentByDay],
  )
  const totalMatches = flatRows.length

  // 12-week activity grid. Columns are weeks (rightmost = current week).
  // Rows are weekday — row 0 Mon → row 6 Sun. Cells store the session count
  // for that day; we then bucket counts into 4 alpha levels (0-3) for the
  // accent ramp.
  const activity = useMemo(() => {
    const dayMs = 24 * 60 * 60 * 1000
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const todayDow = (today.getDay() + 6) % 7 // 0 = Mon, 6 = Sun
    // Anchor the grid on the Monday at the start of *this* week. The current
    // week's column will be partially populated.
    const mondayOfThisWeek = today.getTime() - todayDow * dayMs

    const cells: number[][] = Array.from({ length: 12 }, () => Array(7).fill(0))
    for (const s of allSessions) {
      if (!s.mtime) continue
      const t = new Date(s.mtime)
      t.setHours(0, 0, 0, 0)
      const tDow = (t.getDay() + 6) % 7
      const mondayOfThatWeek = t.getTime() - tDow * dayMs
      const weeksAgo = Math.round((mondayOfThisWeek - mondayOfThatWeek) / (7 * dayMs))
      if (weeksAgo < 0 || weeksAgo > 11) continue
      const col = 11 - weeksAgo // rightmost = current week
      cells[col][tDow]++
    }

    const flat = cells.flat()
    const max = Math.max(1, ...flat)
    return cells.map((week, ci) =>
      week.map((count, ri) => {
        let level: 0 | 1 | 2 | 3 = 0
        if (count > 0) {
          const r = count / max
          if (r >= 0.67) level = 3
          else if (r >= 0.34) level = 2
          else level = 1
        }
        // Compute the actual date this cell represents for the tooltip.
        const weeksAgo = 11 - ci
        const cellDate = new Date(mondayOfThisWeek - weeksAgo * 7 * dayMs + ri * dayMs)
        return { count, level, date: cellDate }
      }),
    )
  }, [allSessions])

  // Top 5 projects by session count, with a per-project hue used for both the
  // leading dot and the bar fill.
  const topProjects = useMemo(() => {
    const counts = new Map<string, { name: string; path: string; count: number }>()
    for (const s of allSessions) {
      const key = s.projectPath
      const prev = counts.get(key)
      if (prev) prev.count++
      else counts.set(key, { name: s.projectName, path: s.projectPath, count: 1 })
    }
    const arr = Array.from(counts.values())
      .filter((p) => p.count > 0)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)
    const max = Math.max(1, ...arr.map((p) => p.count))
    return arr.map((p) => ({ ...p, hue: hueForProject(p.name), max }))
  }, [allSessions])

  // Reset focus on filter changes
  useEffect(() => {
    setFocusedRow(-1)
  }, [filter, filterMode])

  // Global keys: "/" opens filter, "j"/"k" move focus, Enter opens focused row.
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
        if (e.metaKey || e.ctrlKey) launchSessionInTerminal(s.projectPath, s.id)
        else createSessionTab(s.id, s.projectPath, s.id.substring(0, 8))
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [flatRows, focusedRow, createSessionTab])

  const handleSessionClick = (s: SessionWithProject, e?: React.MouseEvent) => {
    if (e && isTerminalModifier(e)) {
      launchSessionInTerminal(s.projectPath, s.id)
      return
    }
    createSessionTab(s.id, s.projectPath, s.id.substring(0, 8))
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

  const formatN = (n: number) => n.toLocaleString()

  let rowIdx = -1

  return (
    <div className="dash-root">
      <div className="dash-inner has-rail">
        <div className="dash-main">
        <header className="dash-hero">
          <h1 className="dash-hero-greeting">
            {userName ? (
              <>
                Hi, <em>{userName}</em>
              </>
            ) : (
              'Welcome back'
            )}
          </h1>
          <div className="dash-stats">
            <span><b>{stats.totalProjects}</b> projects</span>
            <span><b>{formatN(stats.sessionsTotal)}</b> sessions</span>
            <span><b>{formatN(stats.messagesTotal)}</b> msgs</span>
            <span className="is-accent">
              <b>{stats.sessionsThisWeek}</b>
              <ArrowUp size={10} strokeWidth={2.6} /> wk
            </span>
          </div>
        </header>

        <ComposeHero
          defaultTargetPath={null}
          projects={projects}
          placeholder="Start a new session"
        />

        {/* Filter strip — peer pill chips with chip-expand search.
            Reads as one row of equal-weight chips, not a chip + a separate input. */}
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
                placeholder="filter sessions, projects, message text…"
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
          {loading && allSessions.length === 0 ? (
            <div className="dash-loading">Loading…</div>
          ) : flatRows.length === 0 ? (
            <div className="dash-loading">
              {filter ? `No sessions match “${filter}”` : 'No sessions yet'}
            </div>
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
                    // Subline appears only when the row expands on hover.
                    // Skip showing the title repeated as its own subline.
                    const subline = named
                      ? (cleanedFirst || cleanedSummary)
                      : (cleanedSummary && cleanedSummary !== title ? cleanedSummary : undefined)
                    const timeLabel = s.mtime ? formatClockTime(new Date(s.mtime)) : ''
                    const isHidden = !!hiddenSessions[s.id]
                    const isFocused = idx === focusedRow
                    return (
                      <div
                        key={s.id}
                        className={`s-row${named ? ' is-named' : ''}${isHidden ? ' is-hidden' : ''}${isFocused ? ' is-focused' : ''}`}
                        style={{ ['--tag-hue' as any]: hueForProject(s.projectName) }}
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
                        <span className="s-row-tag" title={s.projectPath}>
                          {s.projectName}
                        </span>
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
                              launchSessionInTerminal(s.projectPath, s.id)
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

          {hiddenCount > 0 && (
            <button className="proj-hidden-link" onClick={toggleShowHidden}>
              {showHidden
                ? `Hide ${hiddenCount} ${hiddenCount === 1 ? 'session' : 'sessions'} again`
                : `Show ${hiddenCount} hidden ${hiddenCount === 1 ? 'session' : 'sessions'}`}
            </button>
          )}
        </section>
        </div>{/* /.dash-main */}

        <aside className="dash-rail" aria-label="Activity overview">
          <section className="dash-rail-section">
            <div className="dash-rail-title">Activity · 12 weeks</div>
            <div className="dash-heatmap">
              {activity.map((week, ci) => (
                <div key={ci} className="dash-heatcol">
                  {week.map((cell, ri) => (
                    <div
                      key={ri}
                      className="dash-heatcell"
                      data-l={cell.level}
                      title={`${cell.count} ${cell.count === 1 ? 'session' : 'sessions'} · ${cell.date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}`}
                    />
                  ))}
                </div>
              ))}
            </div>
            <div className="dash-heat-foot">
              <span>12 weeks ago</span>
              <span>today</span>
            </div>
          </section>

          {topProjects.length > 0 && (
            <section className="dash-rail-section">
              <div className="dash-rail-title">Top projects</div>
              <div className="dash-bars">
                {topProjects.map((p) => (
                  <button
                    key={p.path}
                    className="dash-bar"
                    style={{ ['--tag-hue' as any]: p.hue }}
                    onClick={() => selectProject(p.path)}
                    title={p.path}
                  >
                    <span className="dash-bar-name">{p.name}</span>
                    <span className="dash-bar-count">{p.count}</span>
                    <div className="dash-bar-track">
                      <div className="dash-bar-fill" style={{ width: `${(p.count / p.max) * 100}%` }} />
                    </div>
                  </button>
                ))}
              </div>
            </section>
          )}

        </aside>
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
