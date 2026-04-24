import React, { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowUp, Folder, ChevronDown } from 'lucide-react'
import { hueForProject } from '@/utils/projectHue'
import { startNewChatInTerminal, DEFAULT_NEW_CHAT_PATH } from '@/utils/launchSession'
import type { Project } from '@/types'

interface ComposeHeroProps {
  greeting?: string
  caption?: React.ReactNode
  placeholder?: string
  // Initial project target. null = home (default from Settings). Otherwise a
  // project real-path like "/Users/nitin/code/foo".
  defaultTargetPath: string | null
  projects: Project[]
}

const DEFAULT_PLACEHOLDER = 'Start a new chat — type your prompt and press Enter'

/**
 * Shared compose hero — single-line prompt that fires `claude "query"` into
 * iTerm. Used on the Dashboard and on every project page. Greeting and
 * caption are optional — when omitted, the input + placeholder carry the
 * prompt on their own.
 */
export const ComposeHero: React.FC<ComposeHeroProps> = ({
  greeting,
  caption,
  placeholder = DEFAULT_PLACEHOLDER,
  defaultTargetPath,
  projects,
}) => {
  const [composeQuery, setComposeQuery] = useState('')
  const [composeTargetPath, setComposeTargetPath] = useState<string | null>(defaultTargetPath)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [pickerFilter, setPickerFilter] = useState('')
  const pickerRef = useRef<HTMLDivElement | null>(null)

  // Settings-configured home path (fallback when composeTargetPath === null)
  const [homeChatPath, setHomeChatPath] = useState(DEFAULT_NEW_CHAT_PATH)
  useEffect(() => {
    const read = () => {
      setHomeChatPath(localStorage.getItem('claude-viewer-new-chat-path') || DEFAULT_NEW_CHAT_PATH)
    }
    read()
    window.addEventListener('storage', read)
    return () => window.removeEventListener('storage', read)
  }, [])

  // Re-sync when the owning page switches (e.g. user clicks a different project tab)
  useEffect(() => {
    setComposeTargetPath(defaultTargetPath)
  }, [defaultTargetPath])

  // Close picker on click-outside or Escape
  useEffect(() => {
    if (!pickerOpen) return
    const onDown = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setPickerOpen(false)
      }
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setPickerOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [pickerOpen])

  const filteredProjects = useMemo(() => {
    const q = pickerFilter.trim().toLowerCase()
    const sorted = [...projects].sort((a, b) => {
      const ta = a.lastActivity ? new Date(a.lastActivity).getTime() : 0
      const tb = b.lastActivity ? new Date(b.lastActivity).getTime() : 0
      return tb - ta
    })
    if (!q) return sorted
    return sorted.filter((p) => p.name.toLowerCase().includes(q))
  }, [projects, pickerFilter])

  const handleSubmit = () => {
    const q = composeQuery.trim()
    if (!q) return
    const target = composeTargetPath || homeChatPath
    startNewChatInTerminal({ query: q, projectPath: target })
    setComposeQuery('')
  }

  const activeTargetPath = composeTargetPath || homeChatPath
  const activeTargetLabel = activeTargetPath === '~'
    ? '~ (home)'
    : (activeTargetPath.split('/').filter(Boolean).pop() || activeTargetPath)
  const activeTargetHue = composeTargetPath === null && homeChatPath === '~'
    ? null
    : hueForProject(activeTargetLabel)

  return (
    <header className="dash-compose-hero">
      {greeting && (
        <div className="dash-compose-title-row">
          <svg className="dash-compose-glyph" width="22" height="22" viewBox="0 0 48 48" aria-hidden="true">
            <g stroke="currentColor" strokeWidth="3" strokeLinecap="round" fill="none">
              <line x1="18" y1="8" x2="18" y2="40" />
              <line x1="30" y1="8" x2="30" y2="40" />
              <line x1="8" y1="18" x2="40" y2="18" />
              <line x1="8" y1="30" x2="40" y2="30" />
            </g>
          </svg>
          <h1 className="dash-compose-greeting">{greeting}</h1>
        </div>
      )}
      {caption && <p className="dash-compose-caption">{caption}</p>}

      <form
        className="dash-compose"
        onSubmit={(e) => {
          e.preventDefault()
          handleSubmit()
        }}
      >
        <input
          type="text"
          className="dash-compose-input"
          placeholder={placeholder}
          value={composeQuery}
          onChange={(e) => setComposeQuery(e.target.value)}
          autoFocus
        />
        <button
          type="submit"
          className={`dash-compose-send${composeQuery.trim() ? ' is-active' : ''}`}
          disabled={!composeQuery.trim()}
          title="Launch in iTerm (Enter)"
          aria-label="Launch in iTerm"
        >
          <ArrowUp size={14} strokeWidth={2.4} />
        </button>
      </form>

      <div className="dash-compose-footer">
        <div className="dash-compose-picker" ref={pickerRef}>
          <button
            type="button"
            className={`dash-compose-pill is-interactive${pickerOpen ? ' is-open' : ''}`}
            onClick={() => setPickerOpen((v) => !v)}
            title={`Chat will start in ${activeTargetPath}`}
            style={activeTargetHue !== null ? ({ ['--tag-hue' as any]: activeTargetHue }) : undefined}
          >
            <Folder size={12} />
            <span>{activeTargetLabel}</span>
            <ChevronDown size={11} style={{ opacity: 0.6 }} />
          </button>
          {pickerOpen && (
            <div className="dash-compose-picker-popover">
              <input
                type="text"
                className="dash-compose-picker-search"
                placeholder="Filter projects…"
                value={pickerFilter}
                onChange={(e) => setPickerFilter(e.target.value)}
                autoFocus
              />
              <button
                type="button"
                className={`dash-compose-picker-item${composeTargetPath === null ? ' is-selected' : ''}`}
                onClick={() => {
                  setComposeTargetPath(null)
                  setPickerOpen(false)
                  setPickerFilter('')
                }}
              >
                <Folder size={12} style={{ color: 'var(--muted-foreground)' }} />
                <span>Home ({homeChatPath})</span>
                <span className="dash-compose-picker-sub">default</span>
              </button>
              <div className="dash-compose-picker-divider" />
              {filteredProjects.length === 0 ? (
                <div className="dash-compose-picker-empty">No projects match</div>
              ) : (
                filteredProjects.map((p) => {
                  const base = p.name.split('/').pop() || p.name
                  const hue = hueForProject(base)
                  const selected = composeTargetPath === p.name
                  return (
                    <button
                      key={p.name}
                      type="button"
                      className={`dash-compose-picker-item${selected ? ' is-selected' : ''}`}
                      onClick={() => {
                        setComposeTargetPath(p.name)
                        setPickerOpen(false)
                        setPickerFilter('')
                      }}
                      style={{ ['--tag-hue' as any]: hue }}
                    >
                      <Folder size={12} className="dash-compose-picker-folder" />
                      <span className="dash-compose-picker-name">{base}</span>
                      <span className="dash-compose-picker-sub">
                        {p.sessionCount} {p.sessionCount === 1 ? 'session' : 'sessions'}
                      </span>
                    </button>
                  )
                })
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
