import React, { useEffect, useState } from 'react'
import { ArrowUp } from 'lucide-react'
import { startNewChatInTerminal, DEFAULT_NEW_CHAT_PATH } from '@/utils/launchSession'
import type { Project } from '@/types'

interface ComposeHeroProps {
  greeting?: string
  caption?: React.ReactNode
  placeholder?: string
  // Initial project target. null = home (default from Settings). Otherwise a
  // project real-path like "/Users/nitin/code/foo".
  defaultTargetPath: string | null
  // Kept on the prop type so existing callers don't have to change. The
  // picker UI was removed — the target is decided by defaultTargetPath alone.
  projects?: Project[]
}

const DEFAULT_PLACEHOLDER = 'Start a new session'

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
}) => {
  const [composeQuery, setComposeQuery] = useState('')

  // Settings-configured home path (used when defaultTargetPath === null)
  const [homeChatPath, setHomeChatPath] = useState(DEFAULT_NEW_CHAT_PATH)
  useEffect(() => {
    const read = () => {
      setHomeChatPath(localStorage.getItem('claude-viewer-new-chat-path') || DEFAULT_NEW_CHAT_PATH)
    }
    read()
    window.addEventListener('storage', read)
    return () => window.removeEventListener('storage', read)
  }, [])

  const handleSubmit = () => {
    const q = composeQuery.trim()
    if (!q) return
    const target = defaultTargetPath || homeChatPath
    startNewChatInTerminal({ query: q, projectPath: target })
    setComposeQuery('')
  }

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
        className="dash-compose is-utility"
        onSubmit={(e) => {
          e.preventDefault()
          handleSubmit()
        }}
      >
        <span className="dash-compose-glyph-prefix" aria-hidden="true">›_</span>
        <input
          type="text"
          className="dash-compose-input"
          placeholder={placeholder}
          value={composeQuery}
          onChange={(e) => setComposeQuery(e.target.value)}
          autoFocus
        />
        <span className="dash-compose-key" aria-hidden="true">⌘↵</span>
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
    </header>
  )
}
