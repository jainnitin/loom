import React, { useEffect, useState, useRef } from 'react'
import { useAppStore } from '@/store/appStore'
import { Message, Tab } from '@/types'
import { MessageBlock } from './MessageBlock'
import { Timeline } from './Timeline'
import { ToolGroup } from './ToolGroup'
import { Copy, Check, Settings, ChevronRight, Terminal, Tag, PanelRight, PanelRightClose, Trash2 } from 'lucide-react'
import { launchSessionInTerminal } from '@/utils/launchSession'

interface SessionViewerProps {
  tab: Tab
}

export const SessionViewer: React.FC<SessionViewerProps> = ({ tab }) => {
  const { messages, setMessages, sessionsByProject, selectProject, setActiveTab, loadSessionsForProject, createProjectTab, trashSession } = useAppStore()
  // Auto-scroll is always on; Live/Offline indicator removed as unhelpful chrome.
  const autoScroll = true
  const [currentMessageIndex, setCurrentMessageIndex] = useState<number | undefined>()
  const [copied, setCopied] = useState(false)
  const [isNarrow, setIsNarrow] = useState(false)
  const [infoRailOpen, setInfoRailOpen] = useState<boolean>(() => {
    const v = localStorage.getItem('sessionInfoRailOpen')
    return v === null ? true : v === 'true'
  })
  const toggleInfoRail = () => {
    setInfoRailOpen((v) => {
      localStorage.setItem('sessionInfoRailOpen', String(!v))
      return !v
    })
  }
  const [sessionLoading, setSessionLoading] = useState(false)
  const [sessionError, setSessionError] = useState<string | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const messageRefs = useRef<(HTMLDivElement | null)[]>([])
  const sessionMessages = messages[tab.sessionId || ''] || []
  
  // Drop metadata/system messages (attachment, last-prompt, custom-title,
  // agent-name, agent-color, permission-mode, file-history-snapshot, progress,
  // queue-operation, system) — they render as empty "No content available" rows.
  // Also drop user/assistant messages whose content is genuinely empty.
  const visibleMessages = React.useMemo(() => {
    return sessionMessages.filter((m) => {
      if (m.type !== 'user' && m.type !== 'assistant') return false

      // Check for any meaningful content
      const c = m.message?.content ?? m.content
      if (!c) return false
      if (typeof c === 'string') return c.trim().length > 0
      if (Array.isArray(c)) {
        return c.some((item: any) => {
          if (!item) return false
          if (item.type === 'tool_use' || item.type === 'tool_result') return true
          if (item.type === 'text' && typeof item.text === 'string') return item.text.trim().length > 0
          return false
        })
      }
      return true
    })
  }, [sessionMessages])

  // Process messages to merge tool calls and results
  const processedMessages = React.useMemo(() => {
    const result: Message[] = []
    const pendingToolCalls = new Map<string, Message>()

    visibleMessages.forEach((message) => {
      // Check if this is a tool invocation
      if (message.message?.content && Array.isArray(message.message.content)) {
        const toolUse = message.message.content.find((item: any) => item.type === 'tool_use')
        if (toolUse && toolUse.id) {
          // Store pending tool call
          pendingToolCalls.set(toolUse.id, message)
          return // Don't add to result yet
        }
      }
      
      // Check if this is a tool result
      if (message.message?.content && Array.isArray(message.message.content)) {
        const toolResult = message.message.content.find((item: any) => item.type === 'tool_result')
        if (toolResult && toolResult.tool_use_id && pendingToolCalls.has(toolResult.tool_use_id)) {
          // Merge with pending tool call
          const toolCall = pendingToolCalls.get(toolResult.tool_use_id)!
          const toolUse = toolCall.message.content.find((item: any) => item.type === 'tool_use')
          
          const mergedMessage: Message = {
            ...message,
            type: 'tool',
            toolName: toolUse.name,
            toolUseResult: toolResult.content,
            message: {
              ...message.message,
              content: [toolUse, toolResult]
            }
          }
          
          result.push(mergedMessage)
          pendingToolCalls.delete(toolResult.tool_use_id)
          return
        }
      }
      
      // Regular message or unmatched tool message
      result.push(message)
    })
    
    // Add any remaining pending tool calls (without results)
    pendingToolCalls.forEach((toolCall) => {
      result.push(toolCall)
    })

    return result
  }, [visibleMessages])

  // Group consecutive tool messages
  const groupedMessages = React.useMemo(() => {
    const groups: Array<{ type: 'single' | 'tool-group', messages: Message[] }> = []
    let currentToolGroup: Message[] = []
    
    processedMessages.forEach((message, index) => {
      const isToolMessage = message.type === 'tool' || 
        (message.message?.content && Array.isArray(message.message.content) && 
         message.message.content.some((item: any) => item.type === 'tool_use' || item.type === 'tool_result'))
      
      if (isToolMessage) {
        currentToolGroup.push(message)
      } else {
        // End current tool group if exists
        if (currentToolGroup.length > 0) {
          groups.push({ type: 'tool-group', messages: currentToolGroup })
          currentToolGroup = []
        }
        // Add non-tool message
        groups.push({ type: 'single', messages: [message] })
      }
    })
    
    // Don't forget the last group
    if (currentToolGroup.length > 0) {
      groups.push({ type: 'tool-group', messages: currentToolGroup })
    }
    
    return groups
  }, [processedMessages])
  
  // Find the session details - first check if sessions are loaded for this project
  const projectSessions = sessionsByProject[tab.projectPath] || []
  const session = projectSessions.find(s => s.id === tab.sessionId) || null
  
  // Load sessions for this project if not already loaded
  useEffect(() => {
    const loadSessionsIfNeeded = async () => {
      if (!sessionsByProject[tab.projectPath] && tab.sessionId && !sessionLoading) {
        setSessionLoading(true)
        setSessionError(null)
        try {
          await loadSessionsForProject(tab.projectPath)
        } catch (error) {
          console.error('Failed to load sessions:', error)
          setSessionError('Failed to load session data')
        } finally {
          setSessionLoading(false)
        }
      }
    }
    loadSessionsIfNeeded()
  }, [tab.projectPath, tab.sessionId, sessionsByProject, loadSessionsForProject, sessionLoading])
  
  console.log('[SessionViewer] Looking for session:', tab.sessionId)
  console.log('[SessionViewer] Project sessions loaded:', !!sessionsByProject[tab.projectPath])
  console.log('[SessionViewer] Found session:', session)
  
  const handleCopyCommand = () => {
    if (!session || !tab.sessionId) return

    const projectPath = tab.projectPath
    const sessionId = tab.sessionId

    // Get custom command from localStorage
    const customCommand = localStorage.getItem('claude-viewer-custom-command')
    const template = customCommand || 'cd {projectPath} && claude --resume {sessionId}'
    const command = template
      .replace('{projectPath}', projectPath)
      .replace('{sessionId}', sessionId)

    navigator.clipboard.writeText(command)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleLaunchInTerminal = () => {
    if (!tab.sessionId || !tab.projectPath) return
    launchSessionInTerminal(tab.projectPath, tab.sessionId)
  }

  const handleDeleteSession = async () => {
    if (!tab.sessionId || !session) return
    const title = session.customTitle || session.firstUserMessage?.slice(0, 80) || 'this session'
    const ok = window.confirm(
      `Delete "${title}"?\n\nThe JSONL is moved to macOS Trash so it's recoverable via Finder, but it will no longer show up in Loom or \`claude --resume\`.`,
    )
    if (!ok) return
    const res = await trashSession(tab.projectPath, tab.sessionId, session.filePath)
    if (!res.ok) alert(`Failed to move to Trash: ${res.error || 'unknown error'}`)
    // Tab closes automatically via the store's trashSession action.
  }


  useEffect(() => {
    if (!session) return
    
    // Load initial messages
    loadMessages()
    
    // Start watching file for changes
    window.api.watchFile(session.filePath)

    const handleFileChange = (changedPath: string) => {
      if (changedPath === session.filePath) {
        loadMessages()
      }
    }

    const unsubscribe = window.api.onFileChange(handleFileChange)

    return () => {
      unsubscribe()
      window.api.unwatchFile(session.filePath)
    }
  }, [session])
  
  useEffect(() => {
    if (autoScroll && containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight
    }
  }, [sessionMessages, autoScroll])
  
  const loadMessages = async () => {
    if (!session) return
    
    try {
      const newMessages = await window.api.readFile(session.filePath)
      setMessages(tab.sessionId || '', newMessages)
    } catch (error) {
      console.error('Error loading messages:', error)
    }
  }
  
  const handleTimelineJump = (index: number) => {
    const element = messageRefs.current[index]
    if (element && containerRef.current) {
      const container = containerRef.current
      const elementTop = element.offsetTop
      const elementHeight = element.offsetHeight
      const containerHeight = container.clientHeight
      
      // Center the message in the viewport
      const scrollTop = elementTop - (containerHeight / 2) + (elementHeight / 2)
      container.scrollTo({
        top: scrollTop,
        behavior: 'smooth'
      })
      
      setCurrentMessageIndex(index)
    }
  }
  
  // Track visible messages for timeline
  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    
    const handleScroll = () => {
      const containerTop = container.scrollTop
      const containerBottom = containerTop + container.clientHeight
      
      // Find the first visible message
      for (let i = 0; i < messageRefs.current.length; i++) {
        const element = messageRefs.current[i]
        if (element) {
          const elementTop = element.offsetTop
          const elementBottom = elementTop + element.offsetHeight
          
          if (elementBottom > containerTop && elementTop < containerBottom) {
            setCurrentMessageIndex(i)
            break
          }
        }
      }
    }
    
    container.addEventListener('scroll', handleScroll)
    return () => container.removeEventListener('scroll', handleScroll)
  }, [sessionMessages])
  
  // Track window width for responsive behavior
  useEffect(() => {
    const handleResize = () => {
      setIsNarrow(window.innerWidth <= 720)
    }
    
    handleResize() // Check initial width
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])
  
  // Show loading state if sessions are being loaded
  if (sessionLoading) {
    return (
      <div style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'var(--muted-foreground)'
      }}>
        Loading session...
      </div>
    )
  }
  
  // Show error state if there was an error loading sessions
  if (sessionError) {
    return (
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'var(--destructive-foreground)',
        gap: '8px'
      }}>
        <div>Error: {sessionError}</div>
        <button 
          onClick={() => window.location.reload()}
          style={{
            padding: '8px 16px',
            border: '1px solid var(--border)',
            borderRadius: '6px',
            background: 'var(--background)',
            color: 'var(--foreground)',
            cursor: 'pointer'
          }}
        >
          Reload
        </button>
      </div>
    )
  }
  
  // Show session not found if session is not available after loading
  if (!session) {
    return (
      <div style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'var(--muted-foreground)'
      }}>
        Session not found
      </div>
    )
  }
  
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      backgroundColor: 'var(--background)'
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 24px',
        borderBottom: '1px solid var(--border)',
        backgroundColor: 'var(--background)',
        minHeight: '48px',
        flexWrap: 'nowrap'
      }}>
        <div className="sv-breadcrumb">
          <button
            className="sv-crumb-project"
            onClick={() => createProjectTab(tab.projectPath)}
            title={tab.projectPath}
          >
            {tab.projectPath.split('/').pop() || 'Unknown Project'}
          </button>
          <ChevronRight size={14} className="sv-crumb-sep" />
          {session?.customTitle ? (
            <div className="sv-crumb-label" title={session.customTitle}>
              <Tag size={12} />
              <span>{session.customTitle}</span>
            </div>
          ) : (
            <button
              className="sv-crumb-id"
              onClick={() => {
                if (tab.sessionId) {
                  navigator.clipboard.writeText(tab.sessionId)
                  setCopied(true)
                  setTimeout(() => setCopied(false), 1500)
                }
              }}
              title={`${tab.sessionId} — click to copy`}
            >
              {copied ? <Check size={11} /> : null}
              <span>{tab.sessionId?.substring(0, 8) ?? '—'}</span>
            </button>
          )}
        </div>
        <div className="sv-actions">
              <button
                className="sv-iconbtn"
                onClick={handleCopyCommand}
                title="Copy resume command"
                style={{ color: copied ? 'hsl(var(--accent-main-000))' : undefined }}
              >
                {copied ? <Check size={14} /> : <Copy size={14} />}
              </button>
              <button
                className={`sv-iconbtn${infoRailOpen ? ' is-active' : ''}`}
                onClick={toggleInfoRail}
                title={infoRailOpen ? 'Hide info panel' : 'Show info panel'}
              >
                {infoRailOpen ? <PanelRightClose size={14} /> : <PanelRight size={14} />}
              </button>
              <button
                className="sv-iconbtn sv-iconbtn-danger"
                onClick={handleDeleteSession}
                title="Delete session (moves JSONL to Trash)"
                aria-label="Delete session"
              >
                <Trash2 size={14} />
              </button>
        </div>
      </div>

      {/* Main split: messages column + info rail */}
      <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
        <div
          ref={containerRef}
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '0',
          backgroundColor: 'var(--background)'
        }}
      >
        <div style={{
          maxWidth: '800px',
          margin: '0 auto',
          padding: '40px 24px'
        }}>
          {groupedMessages.map((group, groupIndex) => {
            if (group.type === 'single') {
              return group.messages.map((message, index) => (
                <div 
                  key={message.uuid || `${groupIndex}-${index}`}
                  ref={el => messageRefs.current[groupIndex] = el}
                >
                  <MessageBlock message={message} />
                </div>
              ))
            } else {
              // Tool group
              return (
                <div 
                  key={`tool-group-${groupIndex}`}
                  ref={el => messageRefs.current[groupIndex] = el}
                >
                  <ToolGroup messages={group.messages} />
                </div>
              )
            }
          })}
          {sessionMessages.length === 0 && (
            <div style={{
              textAlign: 'center',
              color: 'var(--muted-foreground)',
              marginTop: '64px'
            }}>
              No messages yet...
            </div>
          )}
        </div>
        </div>

        {/* Info rail: You asked + Recap — editorial delighter */}
        {infoRailOpen && (session?.firstUserMessage || session?.sessionSummary) && (
          <aside className="rail">
            <div className="rail-brand">
              <div className="rail-brand-glyph">
                <svg width="28" height="28" viewBox="0 0 48 48" aria-hidden="true">
                  <g stroke="hsl(var(--accent-main-000))" strokeWidth="3" strokeLinecap="round" fill="none">
                    <line x1="18" y1="10" x2="18" y2="38" />
                    <line x1="30" y1="10" x2="30" y2="38" />
                    <line x1="10" y1="18" x2="38" y2="18" />
                    <line x1="10" y1="30" x2="38" y2="30" />
                  </g>
                </svg>
              </div>
              <div className="rail-brand-label">this thread</div>
            </div>

            {session?.firstUserMessage && (
              <section className="rail-section">
                <div className="rail-eyebrow tone-prompt">You asked</div>
                <div className="rail-prompt">{session.firstUserMessage}</div>
              </section>
            )}

            {session?.firstUserMessage && session?.sessionSummary && (
              <svg
                className="rail-divider"
                width="296"
                height="12"
                viewBox="0 0 296 12"
                preserveAspectRatio="none"
                aria-hidden="true"
              >
                <g stroke="hsl(var(--accent-main-000))" strokeWidth="1.25" strokeLinecap="round" fill="none">
                  <path d="M4,6 Q40,2 74,6 T148,6 T222,6 T292,6" />
                  <line x1="70" y1="2" x2="70" y2="10" opacity="0.55" />
                  <line x1="148" y1="2" x2="148" y2="10" opacity="0.55" />
                  <line x1="226" y1="2" x2="226" y2="10" opacity="0.55" />
                </g>
              </svg>
            )}

            {session?.sessionSummary && (
              <section className="rail-section">
                <div className="rail-eyebrow tone-recap">Recap</div>
                <div className="rail-recap">{session.sessionSummary}</div>
              </section>
            )}

            <div className="rail-footer">
              <div className="rail-stats">
                {session?.mtime && (
                  <span className="rail-stat" title={new Date(session.mtime).toLocaleString()}>
                    <strong>{new Date(session.mtime).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</strong>
                  </span>
                )}
                {session?.messageCount !== undefined && (
                  <span className="rail-stat">
                    <strong>{session.messageCount}</strong> msgs
                  </span>
                )}
                {tab.sessionId && (
                  <span className="rail-stat" title={tab.sessionId}>
                    {tab.sessionId.substring(0, 8)}
                  </span>
                )}
              </div>
              <button
                className="rail-cta"
                onClick={handleLaunchInTerminal}
                title="Resume this thread in iTerm (or Terminal)"
              >
                <Terminal size={14} />
                <span>Resume in iTerm</span>
                <span className="rail-cta-arrow">→</span>
              </button>
            </div>
          </aside>
        )}
      </div>

      {/* Timeline minimap */}
      <div 
        style={{
          position: 'fixed',
          right: 0,
          top: '50%',
          transform: 'translateY(-50%)',
          width: '140px',
          height: '450px',
          pointerEvents: 'none',
          padding: '20px'
        }}
        onMouseEnter={(e) => {
          const timeline = e.currentTarget.querySelector('.timeline-container') as HTMLElement
          if (timeline) {
            timeline.style.opacity = '1'
            timeline.style.pointerEvents = 'auto'
            timeline.style.transform = 'translateY(-50%) translateX(0)'
          }
        }}
        onMouseLeave={(e) => {
          const timeline = e.currentTarget.querySelector('.timeline-container') as HTMLElement
          if (timeline) {
            timeline.style.opacity = '0'
            timeline.style.pointerEvents = 'none'
            timeline.style.transform = 'translateY(-50%) translateX(10px)'
          }
        }}
      >
        <Timeline 
          messages={processedMessages}
          currentIndex={currentMessageIndex}
          onJump={handleTimelineJump}
        />
      </div>
    </div>
  )
}