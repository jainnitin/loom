import React, { useState, useEffect } from 'react'
import { X, RotateCcw } from 'lucide-react'
import { DEFAULT_NEW_CHAT_PATH, DEFAULT_NEW_CHAT_TEMPLATE } from '@/utils/launchSession'

interface SettingsModalProps {
  isOpen: boolean
  onClose: () => void
}

const DEFAULT_COMMAND = 'cd {projectPath} && claude --resume {sessionId}'

const sectionHeadingStyle: React.CSSProperties = {
  fontSize: '11px',
  fontWeight: 600,
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  color: 'var(--muted-foreground)',
  marginBottom: '10px',
}

const sectionHintStyle: React.CSSProperties = {
  fontSize: '12px',
  color: 'var(--muted-foreground)',
  marginBottom: '14px',
  lineHeight: 1.5,
}

const fieldHeaderStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  marginBottom: '6px',
}

const fieldLabelStyle: React.CSSProperties = {
  fontSize: '13px',
  fontWeight: 500,
  color: 'var(--foreground)',
}

const subLabelStyle: React.CSSProperties = {
  fontSize: '11px',
  color: 'var(--muted-foreground)',
  marginBottom: '4px',
}

const resetBtnStyle: React.CSSProperties = {
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  padding: '2px 6px',
  borderRadius: '4px',
  color: 'var(--muted-foreground)',
  display: 'flex',
  alignItems: 'center',
  gap: '4px',
  fontSize: '11px',
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '8px 12px',
  border: '1px solid var(--border)',
  borderRadius: '6px',
  backgroundColor: 'var(--background)',
  color: 'var(--foreground)',
  fontSize: '13px',
  fontFamily: 'SF Mono, Monaco, Cascadia Code, monospace',
  outline: 'none',
}

const textareaStyle: React.CSSProperties = {
  width: '100%',
  minHeight: '72px',
  padding: '10px 12px',
  border: '1px solid var(--border)',
  borderRadius: '8px',
  backgroundColor: 'var(--background)',
  color: 'var(--foreground)',
  fontSize: '13px',
  fontFamily: 'SF Mono, Monaco, Cascadia Code, monospace',
  resize: 'vertical',
  outline: 'none',
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const [customCommand, setCustomCommand] = useState('')
  const [isDefault, setIsDefault] = useState(true)
  const [newChatCommand, setNewChatCommand] = useState('')
  const [newChatPath, setNewChatPath] = useState('')
  const [isNewChatDefault, setIsNewChatDefault] = useState(true)
  const [showSessionPreview, setShowSessionPreview] = useState(true)
  const [toolPreviewCount, setToolPreviewCount] = useState(1)

  useEffect(() => {
    if (isOpen) {
      const savedCommand = localStorage.getItem('claude-viewer-custom-command')
      if (savedCommand) {
        setCustomCommand(savedCommand)
        setIsDefault(savedCommand === DEFAULT_COMMAND)
      } else {
        setCustomCommand(DEFAULT_COMMAND)
        setIsDefault(true)
      }
      
      // Load session preview setting
      const savedPreviewSetting = localStorage.getItem('claude-viewer-show-session-preview')
      setShowSessionPreview(savedPreviewSetting !== 'false') // Default to true
      
      // Load tool preview count setting
      const savedToolPreviewCount = localStorage.getItem('claude-viewer-tool-preview-count')
      setToolPreviewCount(savedToolPreviewCount ? parseInt(savedToolPreviewCount) : 1)

      // Load New Chat command + path
      const savedNewChatCmd = localStorage.getItem('claude-viewer-new-chat-command') || DEFAULT_NEW_CHAT_TEMPLATE
      const savedNewChatPath = localStorage.getItem('claude-viewer-new-chat-path') || DEFAULT_NEW_CHAT_PATH
      setNewChatCommand(savedNewChatCmd)
      setNewChatPath(savedNewChatPath)
      setIsNewChatDefault(
        savedNewChatCmd === DEFAULT_NEW_CHAT_TEMPLATE && savedNewChatPath === DEFAULT_NEW_CHAT_PATH,
      )
    }
  }, [isOpen])

  const handleSave = () => {
    localStorage.setItem('claude-viewer-custom-command', customCommand)
    localStorage.setItem('claude-viewer-show-session-preview', showSessionPreview.toString())
    localStorage.setItem('claude-viewer-tool-preview-count', toolPreviewCount.toString())
    localStorage.setItem('claude-viewer-new-chat-command', newChatCommand)
    localStorage.setItem('claude-viewer-new-chat-path', newChatPath)

    // Dispatch custom event for same-window updates
    window.dispatchEvent(new Event('sessionPreviewSettingChanged'))
    window.dispatchEvent(new Event('toolPreviewCountChanged'))

    onClose()
  }

  const handleReset = () => {
    setCustomCommand(DEFAULT_COMMAND)
    setIsDefault(true)
  }

  const handleCommandChange = (value: string) => {
    setCustomCommand(value)
    setIsDefault(value === DEFAULT_COMMAND)
  }

  const handleNewChatReset = () => {
    setNewChatCommand(DEFAULT_NEW_CHAT_TEMPLATE)
    setNewChatPath(DEFAULT_NEW_CHAT_PATH)
    setIsNewChatDefault(true)
  }

  const handleNewChatCommandChange = (value: string) => {
    setNewChatCommand(value)
    setIsNewChatDefault(value === DEFAULT_NEW_CHAT_TEMPLATE && newChatPath === DEFAULT_NEW_CHAT_PATH)
  }

  const handleNewChatPathChange = (value: string) => {
    setNewChatPath(value)
    setIsNewChatDefault(newChatCommand === DEFAULT_NEW_CHAT_TEMPLATE && value === DEFAULT_NEW_CHAT_PATH)
  }

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
        onClick={onClose}
      >
        {/* Modal */}
        <div
          style={{
            backgroundColor: 'var(--background)',
            borderRadius: '12px',
            width: '500px',
            maxWidth: '90vw',
            maxHeight: '80vh',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
            border: '1px solid var(--border)',
            overflow: 'hidden'
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '20px 24px',
            borderBottom: '1px solid var(--border)'
          }}>
            <h2 style={{
              fontSize: '18px',
              fontWeight: 600,
              margin: 0,
              color: 'var(--foreground)'
            }}>
              Settings
            </h2>
            <button
              onClick={onClose}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '6px',
                borderRadius: '6px',
                color: 'var(--muted-foreground)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.background = 'var(--secondary)'
                e.currentTarget.style.color = 'var(--foreground)'
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.background = 'none'
                e.currentTarget.style.color = 'var(--muted-foreground)'
              }}
            >
              <X size={18} />
            </button>
          </div>

          {/* Content */}
          <div style={{ padding: '24px', maxHeight: 'calc(80vh - 140px)', overflowY: 'auto' }}>
            {/* ─────── Terminal commands ─────── */}
            <div style={{ marginBottom: '28px' }}>
              <div style={sectionHeadingStyle}>Terminal commands</div>
              <div style={sectionHintStyle}>
                Templates run in iTerm. Variables: <code>{'{projectPath}'}</code>
                {' · '}
                <code>{'{sessionId}'}</code> (resume only).
              </div>

              {/* Resume Command */}
              <div style={{ marginBottom: '16px' }}>
                <div style={fieldHeaderStyle}>
                  <label style={fieldLabelStyle}>Resume command</label>
                  {!isDefault && (
                    <button onClick={handleReset} style={resetBtnStyle} title="Reset to default">
                      <RotateCcw size={12} />
                      Reset
                    </button>
                  )}
                </div>
                <textarea
                  value={customCommand}
                  onChange={(e) => handleCommandChange(e.target.value)}
                  placeholder={DEFAULT_COMMAND}
                  style={textareaStyle}
                />
              </div>

              {/* New Chat Command */}
              <div>
                <div style={fieldHeaderStyle}>
                  <label style={fieldLabelStyle}>New chat command</label>
                  {!isNewChatDefault && (
                    <button onClick={handleNewChatReset} style={resetBtnStyle} title="Reset to default">
                      <RotateCcw size={12} />
                      Reset
                    </button>
                  )}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div>
                    <div style={subLabelStyle}>Default project path (when none is picked)</div>
                    <input
                      type="text"
                      value={newChatPath}
                      onChange={(e) => handleNewChatPathChange(e.target.value)}
                      placeholder="~"
                      style={inputStyle}
                    />
                  </div>
                  <div>
                    <div style={subLabelStyle}>Template</div>
                    <textarea
                      value={newChatCommand}
                      onChange={(e) => handleNewChatCommandChange(e.target.value)}
                      placeholder={DEFAULT_NEW_CHAT_TEMPLATE}
                      style={{ ...textareaStyle, minHeight: '64px' }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* ─────── Display ─────── */}
            <div>
              <div style={sectionHeadingStyle}>Display</div>

              {/* Session Preview Toggle */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '14px 16px',
                backgroundColor: 'var(--secondary)',
                borderRadius: '8px',
                border: '1px solid var(--border)',
                marginBottom: '10px',
              }}>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--foreground)' }}>
                    Session preview on hover
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--muted-foreground)', marginTop: '2px' }}>
                    Show a small summary card when hovering a session row.
                  </div>
                </div>
                <label style={{
                  position: 'relative',
                  display: 'inline-flex',
                  alignItems: 'center',
                  cursor: 'pointer',
                  flexShrink: 0,
                }}>
                  <input
                    type="checkbox"
                    checked={showSessionPreview}
                    onChange={(e) => setShowSessionPreview(e.target.checked)}
                    style={{ display: 'none' }}
                  />
                  <div style={{
                    width: '40px',
                    height: '22px',
                    backgroundColor: showSessionPreview ? 'hsl(var(--accent-main-000))' : 'hsl(var(--text-500))',
                    borderRadius: '11px',
                    position: 'relative',
                    transition: 'background-color 0.2s',
                  }}>
                    <div style={{
                      width: '16px',
                      height: '16px',
                      backgroundColor: 'white',
                      borderRadius: '50%',
                      position: 'absolute',
                      top: '3px',
                      left: showSessionPreview ? '21px' : '3px',
                      transition: 'left 0.2s',
                      boxShadow: '0 2px 4px rgba(0, 0, 0, 0.15)',
                    }} />
                  </div>
                </label>
              </div>

              {/* Tool Preview Count */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '16px',
                padding: '14px 16px',
                backgroundColor: 'var(--secondary)',
                borderRadius: '8px',
                border: '1px solid var(--border)',
              }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--foreground)' }}>
                    Tool sequence preview count
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--muted-foreground)', marginTop: '2px' }}>
                    {toolPreviewCount === 0 ? 'All tools hidden until expanded.'
                      : toolPreviewCount === 1 ? 'Show the most recent tool.'
                      : `Show the ${toolPreviewCount} most recent tools.`}
                  </div>
                </div>
                <input
                  type="number"
                  min="0"
                  max="99"
                  value={toolPreviewCount}
                  onChange={(e) => {
                    const value = parseInt(e.target.value) || 0
                    setToolPreviewCount(Math.max(0, Math.min(99, value)))
                  }}
                  style={{
                    width: '68px',
                    padding: '6px 10px',
                    backgroundColor: 'var(--background)',
                    borderRadius: '6px',
                    border: '1px solid var(--border)',
                    fontSize: '14px',
                    fontWeight: 500,
                    textAlign: 'center',
                    color: 'var(--foreground)',
                    outline: 'none',
                    fontFamily: 'SF Mono, Monaco, Cascadia Code, monospace',
                    flexShrink: 0,
                  }}
                />
              </div>
            </div>
          </div>

          {/* Footer */}
          <div style={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '12px',
            padding: '20px 24px',
            borderTop: '1px solid var(--border)',
            backgroundColor: 'var(--bg-100)'
          }}>
            <button
              onClick={onClose}
              style={{
                padding: '8px 16px',
                border: '1px solid var(--border)',
                borderRadius: '6px',
                backgroundColor: 'var(--background)',
                color: 'var(--foreground)',
                fontSize: '13px',
                cursor: 'pointer',
                fontWeight: 500
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--secondary)'
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--background)'
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              style={{
                padding: '8px 16px',
                border: 'none',
                borderRadius: '6px',
                backgroundColor: 'hsl(var(--accent-main-000))',
                color: 'white',
                fontSize: '13px',
                cursor: 'pointer',
                fontWeight: 500
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.opacity = '0.9'
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.opacity = '1'
              }}
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </>
  )
}