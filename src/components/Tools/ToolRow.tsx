import React, { useState, useRef, useEffect } from 'react'
import { formatTime } from '@/utils/formatters'
import { ToolPreview } from './ToolPreview'

// Global state for managing active hover
let activeHoverId: string | null = null
const hoverCallbacks = new Set<() => void>()

// Global state management functions
const setActiveHover = (id: string | null) => {
  if (activeHoverId !== id) {
    activeHoverId = id
    // Notify all components of the change
    hoverCallbacks.forEach(callback => callback())
  }
}

const getActiveHover = () => activeHoverId

const addHoverCallback = (callback: () => void) => {
  hoverCallbacks.add(callback)
  return () => hoverCallbacks.delete(callback)
}

// Generate unique ID for each ToolRow instance
let idCounter = 0
const generateInstanceId = () => `tool-row-${++idCounter}`

interface ToolRowProps {
  toolName: string
  parameters?: any
  result?: any
  error?: string
  timestamp?: string
  costUSD?: number
  status: 'loading' | 'success' | 'error'
  hideStatusDot?: boolean
}

// Tool categories with design system colors
const TOOL_STYLES = {
  // File Operations - Blue theme
  Read: { dot: 'hsl(var(--accent-secondary-000))', category: 'file' },
  Write: { dot: 'hsl(var(--accent-secondary-000))', category: 'file' },
  Edit: { dot: 'hsl(var(--accent-secondary-000))', category: 'file' },
  MultiEdit: { dot: 'hsl(var(--accent-secondary-000))', category: 'file' },
  
  // Terminal Operations - Green theme  
  Bash: { dot: 'hsl(142 71% 45%)', category: 'terminal' },
  
  // Search Operations - Purple theme
  Grep: { dot: 'hsl(var(--accent-pro-000))', category: 'search' },
  Glob: { dot: 'hsl(var(--accent-pro-000))', category: 'search' },
  LS: { dot: 'hsl(var(--accent-pro-000))', category: 'search' },
  
  // Web Operations - Orange theme
  WebSearch: { dot: 'hsl(var(--accent-main-000))', category: 'web' },
  WebFetch: { dot: 'hsl(var(--accent-main-000))', category: 'web' },
  
  // Task Operations - Amber theme
  TodoRead: { dot: 'hsl(45 93% 51%)', category: 'task' },
  TodoWrite: { dot: 'hsl(45 93% 51%)', category: 'task' },
  
  // Default
  Default: { dot: 'hsl(var(--text-400))', category: 'other' }
}

export const ToolRow: React.FC<ToolRowProps> = ({
  toolName,
  parameters,
  result,
  error,
  timestamp,
  costUSD,
  status,
  hideStatusDot = false
}) => {
  const [isExpanded, setIsExpanded] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [previewPosition, setPreviewPosition] = useState({ x: 0, y: 0, width: 0, height: 0 })
  const rowRef = useRef<HTMLDivElement>(null)
  const hoverTimeoutRef = useRef<NodeJS.Timeout>()
  const instanceIdRef = useRef<string>(generateInstanceId())

  const toolStyle = TOOL_STYLES[toolName] || TOOL_STYLES.Default

  // Listen for global hover changes
  useEffect(() => {
    const handleGlobalHoverChange = () => {
      const currentActiveId = getActiveHover()
      const isThisInstanceActive = currentActiveId === instanceIdRef.current
      
      // Only hide preview if this instance is not the active one
      if (!isThisInstanceActive && showPreview) {
        setShowPreview(false)
      }
    }

    const removeCallback = addHoverCallback(handleGlobalHoverChange)
    return removeCallback
  }, [showPreview])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Clear any active hover if this instance was active
      if (getActiveHover() === instanceIdRef.current) {
        setActiveHover(null)
      }
      // Clear any pending timeouts
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current)
      }
    }
  }, [])

  // Generate tool summary for the row
  const getToolSummary = () => {
    switch (toolName) {
      case 'Read':
        return `Read ${parameters?.file_path?.split('/').pop() || 'file'}`
      case 'Write':
        return `Write ${parameters?.file_path?.split('/').pop() || 'file'}`
      case 'Edit':
        return `Edit ${parameters?.file_path?.split('/').pop() || 'file'}`
      case 'MultiEdit':
        return `MultiEdit ${parameters?.file_path?.split('/').pop() || 'file'}`
      case 'Bash':
        const cmd = parameters?.command || ''
        return `${cmd.length > 30 ? cmd.substring(0, 30) + '...' : cmd}`
      case 'Grep':
        return `Search "${parameters?.pattern}" ${parameters?.include ? `in ${parameters.include}` : ''}`
      case 'Glob':
        return `Find ${parameters?.pattern || 'files'}`
      case 'LS':
        return `List ${parameters?.path?.split('/').pop() || 'directory'}`
      case 'WebSearch':
        return `Search "${parameters?.query}"`
      case 'WebFetch':
        return `Fetch ${parameters?.url}`
      case 'TodoRead':
        return 'Read todos'
      case 'TodoWrite':
        return 'Update todos'
      default:
        return toolName
    }
  }

  // Get status indicator
  const getStatusIndicator = () => {
    switch (status) {
      case 'loading':
        return (
          <div 
            className="status-loading"
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: toolStyle.dot,
              opacity: 0.8,
              animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
              position: 'relative'
            }}
          >
            <div style={{
              position: 'absolute',
              inset: '-4px',
              borderRadius: '50%',
              background: toolStyle.dot,
              opacity: 0.2,
              animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'
            }} />
          </div>
        )
      case 'success':
        return (
          <div 
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: toolStyle.dot,
              flexShrink: 0,
              position: 'relative',
              transition: 'transform 0.15s ease'
            }}
          >
            <div style={{
              position: 'absolute',
              inset: '-2px',
              borderRadius: '50%',
              background: toolStyle.dot,
              opacity: 0,
              transition: 'opacity 0.2s ease'
            }} className="tool-dot-glow" />
          </div>
        )
      case 'error':
        return (
          <div 
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: 'hsl(var(--danger-000))',
              flexShrink: 0
            }}
          />
        )
    }
  }

  // Handle hover for preview
  const handleMouseEnter = (event: React.MouseEvent) => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current)
    }

    // Set this instance as the active hover
    setActiveHover(instanceIdRef.current)

    const rect = event.currentTarget.getBoundingClientRect()
    setPreviewPosition({
      x: rect.left,
      y: rect.top,
      width: rect.width,
      height: rect.height
    })
    setShowPreview(true)
  }

  const handleMouseLeave = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current)
    }

    hoverTimeoutRef.current = setTimeout(() => {
      // Only hide if this is still the active hover
      if (getActiveHover() === instanceIdRef.current) {
        setActiveHover(null)
        setShowPreview(false)
      }
    }, 150)
  }

  const handlePreviewEnter = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current)
    }
    // Ensure this instance remains active when entering preview
    setActiveHover(instanceIdRef.current)
  }

  const handlePreviewClose = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current)
    }

    hoverTimeoutRef.current = setTimeout(() => {
      // Only hide if this is still the active hover
      if (getActiveHover() === instanceIdRef.current) {
        setActiveHover(null)
        setShowPreview(false)
      }
    }, 100)
  }

  // Row background based on status
  const getRowBackground = () => {
    if (status === 'error') {
      return 'hsl(var(--danger-900) / 0.5)'
    }
    return 'hsl(var(--bg-100) / 0.5)'
  }

  return (
    <>
      <div 
        ref={rowRef}
        className="tool-row"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onClick={() => setIsExpanded(!isExpanded)}
        style={{
          padding: '10px 12px',
          cursor: 'pointer',
          background: getRowBackground(),
          borderRadius: '8px',
          margin: '4px 0',
          transition: 'all 0.15s ease',
          border: 'none',
          position: 'relative'
        }}
      >
        {/* Tool row header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px'
        }}>
          {/* Status dot */}
          {!hideStatusDot && getStatusIndicator()}
          
          {/* Tool info */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <span style={{
                fontSize: '13px',
                fontWeight: 600,
                color: 'hsl(var(--text-000))',
                textTransform: 'capitalize',
                fontFamily: '-apple-system, BlinkMacSystemFont, "Inter", "Segoe UI", sans-serif',
                letterSpacing: '-0.01em',
                minWidth: '60px',
                display: 'inline-block'
              }}>
                {toolName}
              </span>
              <span style={{
                fontSize: '13px',
                color: 'hsl(var(--text-300))',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                flex: 1,
                fontFamily: '-apple-system, BlinkMacSystemFont, "Inter", "Segoe UI", sans-serif',
                letterSpacing: '-0.005em'
              }}>
                {getToolSummary()}
              </span>
            </div>
          </div>

          {/* Metadata */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '11px',
            color: 'var(--muted-foreground)',
            flexShrink: 0
          }}>
            {timestamp && (
              <span style={{
                fontFamily: '"SF Mono", Monaco, "Cascadia Code", monospace',
                fontSize: '11px',
                letterSpacing: '-0.01em',
                opacity: 0.7
              }}>
                {formatTime(new Date(timestamp))}
              </span>
            )}
            {costUSD && costUSD > 0 && (
              <span style={{
                background: 'hsl(var(--bg-200))',
                padding: '3px 8px',
                borderRadius: '4px',
                fontFamily: '"SF Mono", Monaco, "Cascadia Code", monospace',
                fontSize: '11px',
                fontWeight: 500,
                letterSpacing: '-0.01em'
              }}>
                ${costUSD.toFixed(4)}
              </span>
            )}
          </div>
        </div>

        {/* Expanded content */}
        {isExpanded && (
          <div style={{
            marginTop: '12px',
            paddingLeft: '20px',
            paddingRight: '12px',
            paddingBottom: '12px',
            background: 'hsl(var(--bg-100))',
            borderRadius: '6px',
            border: 'none',
            marginLeft: hideStatusDot ? '0' : '18px'
          }}>
            {/* Parameters */}
            {parameters && (
              <div style={{ marginBottom: '12px' }}>
                <div style={{
                  fontSize: '12px',
                  fontWeight: 600,
                  color: 'hsl(var(--text-100))',
                  marginBottom: '8px',
                  letterSpacing: '-0.01em'
                }}>
                  Parameters
                </div>
                <pre style={{
                  fontSize: '12px',
                  fontFamily: '"SF Mono", Monaco, "Cascadia Code", monospace',
                  color: 'hsl(var(--text-300))',
                  background: 'hsl(var(--bg-200))',
                  padding: '10px 12px',
                  borderRadius: '6px',
                  lineHeight: '1.5',
                  overflow: 'auto',
                  whiteSpace: 'pre-wrap',
                  margin: 0
                }}>
                  {JSON.stringify(parameters, null, 2)}
                </pre>
              </div>
            )}

            {/* Result */}
            {(result || error) && (
              <div>
                <div style={{
                  fontSize: '12px',
                  fontWeight: 600,
                  color: status === 'error' ? 'hsl(var(--danger-000))' : 'hsl(var(--text-000))',
                  marginBottom: '6px'
                }}>
                  {status === 'error' ? 'Error' : 'Result'}
                </div>
                <pre style={{
                  fontSize: '12px',
                  fontFamily: '"SF Mono", Monaco, "Cascadia Code", monospace',
                  color: status === 'error' ? 'hsl(var(--danger-000))' : 'hsl(var(--text-300))',
                  background: status === 'error' ? 'hsl(var(--danger-900) / 0.3)' : 'hsl(var(--bg-200))',
                  padding: '10px 12px',
                  borderRadius: '6px',
                  lineHeight: '1.5',
                  overflow: 'auto',
                  whiteSpace: 'pre-wrap',
                  margin: 0,
                  maxHeight: '200px'
                }}>
                  {error || (typeof result === 'string' ? result : JSON.stringify(result, null, 2))}
                </pre>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Hover preview */}
      {showPreview && !isExpanded && (
        <ToolPreview
          toolName={toolName}
          parameters={parameters}
          result={result}
          error={error}
          status={status}
          position={previewPosition}
          onMouseEnter={handlePreviewEnter}
          onMouseLeave={handlePreviewClose}
        />
      )}
    </>
  )
}