import React, { useState, useEffect } from 'react'
import { X, RotateCcw, Info, Check } from 'lucide-react'
import { useTheme } from 'next-themes'
import { DEFAULT_NEW_CHAT_PATH, DEFAULT_NEW_CHAT_TEMPLATE } from '@/utils/launchSession'

interface SettingsModalProps {
  isOpen: boolean
  onClose: () => void
}

const DEFAULT_COMMAND = 'cd {projectPath} && claude --resume {sessionId}'

const THEME_OPTIONS: { id: string; label: string; description: string; swatches: [string, string, string] }[] = [
  { id: 'light',            label: 'Claude Light',     description: 'Default light theme',               swatches: ['#ffffff', '#f4f1e8', '#c96442'] },
  { id: 'dark',             label: 'Claude Dark',      description: 'Default dark theme',                swatches: ['#262624', '#1f1e1d', '#c96442'] },
  { id: 'honeycomb',        label: 'Honeycomb',        description: 'Warm chocolate + soft peach',        swatches: ['#1a1714', '#332e28', '#f5a97f'] },
  { id: 'honeycomb-bloom',  label: 'Honeycomb Bloom',  description: 'Floral peony + wisteria',           swatches: ['#181512', '#322c26', '#e8849c'] },
  { id: 'honeycomb-sable',  label: 'Honeycomb Sable',  description: 'Editorial sable + dusty rose',      swatches: ['#171311', '#302a22', '#e8948c'] },
]

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const { theme, setTheme } = useTheme()
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
            {/* Theme Section */}
            <div style={{ marginBottom: '24px' }}>
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: 500,
                color: 'var(--foreground)',
                marginBottom: '10px',
              }}>
                Theme
              </label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {THEME_OPTIONS.map((opt) => {
                  const active = theme === opt.id
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setTheme(opt.id)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        width: '100%',
                        padding: '10px 12px',
                        border: `1px solid ${active ? 'var(--primary)' : 'var(--border)'}`,
                        borderRadius: '8px',
                        background: active ? 'var(--secondary)' : 'var(--background)',
                        color: 'var(--foreground)',
                        cursor: 'pointer',
                        textAlign: 'left',
                        transition: 'all 0.15s ease',
                      }}
                      onMouseOver={(e) => {
                        if (!active) e.currentTarget.style.background = 'var(--secondary)'
                      }}
                      onMouseOut={(e) => {
                        if (!active) e.currentTarget.style.background = 'var(--background)'
                      }}
                    >
                      <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
                        {opt.swatches.map((hex, i) => (
                          <span
                            key={i}
                            style={{
                              width: '14px',
                              height: '20px',
                              borderRadius: '3px',
                              background: hex,
                              border: '1px solid rgba(0,0,0,0.2)',
                            }}
                          />
                        ))}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '13px', fontWeight: 500 }}>{opt.label}</div>
                        <div style={{ fontSize: '11px', color: 'var(--muted-foreground)' }}>{opt.description}</div>
                      </div>
                      {active && <Check size={16} style={{ color: 'var(--primary)', flexShrink: 0 }} />}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Custom Command Section */}
            <div style={{ marginBottom: '24px' }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                marginBottom: '8px'
              }}>
                <label style={{
                  fontSize: '14px',
                  fontWeight: 500,
                  color: 'var(--foreground)'
                }}>
                  Custom Resume Command
                </label>
                {!isDefault && (
                  <button
                    onClick={handleReset}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      padding: '4px',
                      borderRadius: '4px',
                      color: 'var(--muted-foreground)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontSize: '12px'
                    }}
                    onMouseOver={(e) => {
                      e.currentTarget.style.background = 'var(--secondary)'
                      e.currentTarget.style.color = 'var(--foreground)'
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.background = 'none'
                      e.currentTarget.style.color = 'var(--muted-foreground)'
                    }}
                    title="Reset to default"
                  >
                    <RotateCcw size={12} />
                    Reset
                  </button>
                )}
              </div>
              
              <textarea
                value={customCommand}
                onChange={(e) => handleCommandChange(e.target.value)}
                placeholder="Enter custom command template..."
                style={{
                  width: '100%',
                  minHeight: '80px',
                  padding: '12px',
                  border: '1px solid var(--border)',
                  borderRadius: '8px',
                  backgroundColor: 'var(--background)',
                  color: 'var(--foreground)',
                  fontSize: '13px',
                  fontFamily: 'SF Mono, Monaco, Cascadia Code, monospace',
                  resize: 'vertical',
                  outline: 'none'
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = 'var(--accent)'
                  e.currentTarget.style.boxShadow = '0 0 0 3px rgba(var(--accent-rgb), 0.1)'
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = 'var(--border)'
                  e.currentTarget.style.boxShadow = 'none'
                }}
              />

              {/* Help text */}
              <div style={{
                marginTop: '8px',
                padding: '12px',
                backgroundColor: 'var(--secondary)',
                borderRadius: '6px',
                border: '1px solid var(--border)'
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '8px'
                }}>
                  <Info size={14} style={{ 
                    color: 'var(--muted-foreground)', 
                    marginTop: '1px',
                    flexShrink: 0 
                  }} />
                  <div>
                    <div style={{
                      fontSize: '12px',
                      fontWeight: 500,
                      color: 'var(--foreground)',
                      marginBottom: '4px'
                    }}>
                      Available variables:
                    </div>
                    <div style={{
                      fontSize: '11px',
                      color: 'var(--muted-foreground)',
                      fontFamily: 'SF Mono, Monaco, Cascadia Code, monospace',
                      lineHeight: '1.4'
                    }}>
                      <div><code>{'{projectPath}'}</code> - Full project directory path</div>
                      <div><code>{'{sessionId}'}</code> - Session ID</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* New Chat Command Section */}
            <div style={{ marginBottom: '24px' }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                marginBottom: '8px'
              }}>
                <label style={{
                  fontSize: '14px',
                  fontWeight: 500,
                  color: 'var(--foreground)'
                }}>
                  New Chat Command
                </label>
                {!isNewChatDefault && (
                  <button
                    onClick={handleNewChatReset}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      padding: '4px',
                      borderRadius: '4px',
                      color: 'var(--muted-foreground)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontSize: '12px'
                    }}
                    onMouseOver={(e) => {
                      e.currentTarget.style.background = 'var(--secondary)'
                      e.currentTarget.style.color = 'var(--foreground)'
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.background = 'none'
                      e.currentTarget.style.color = 'var(--muted-foreground)'
                    }}
                    title="Reset to default"
                  >
                    <RotateCcw size={12} />
                    Reset
                  </button>
                )}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div>
                  <div style={{
                    fontSize: '12px',
                    color: 'var(--muted-foreground)',
                    marginBottom: '4px'
                  }}>
                    Project path — where a new chat should start
                  </div>
                  <input
                    type="text"
                    value={newChatPath}
                    onChange={(e) => handleNewChatPathChange(e.target.value)}
                    placeholder="~"
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      border: '1px solid var(--border)',
                      borderRadius: '6px',
                      backgroundColor: 'var(--background)',
                      color: 'var(--foreground)',
                      fontSize: '13px',
                      fontFamily: 'SF Mono, Monaco, Cascadia Code, monospace',
                      outline: 'none'
                    }}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = 'var(--accent)'
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = 'var(--border)'
                    }}
                  />
                </div>

                <div>
                  <div style={{
                    fontSize: '12px',
                    color: 'var(--muted-foreground)',
                    marginBottom: '4px'
                  }}>
                    Command template — run in iTerm when you click “Launch new chat”
                  </div>
                  <textarea
                    value={newChatCommand}
                    onChange={(e) => handleNewChatCommandChange(e.target.value)}
                    placeholder="cd {projectPath}; agency claude --mcp workiq"
                    style={{
                      width: '100%',
                      minHeight: '64px',
                      padding: '12px',
                      border: '1px solid var(--border)',
                      borderRadius: '8px',
                      backgroundColor: 'var(--background)',
                      color: 'var(--foreground)',
                      fontSize: '13px',
                      fontFamily: 'SF Mono, Monaco, Cascadia Code, monospace',
                      resize: 'vertical',
                      outline: 'none'
                    }}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = 'var(--accent)'
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = 'var(--border)'
                    }}
                  />
                </div>
              </div>

              <div style={{
                marginTop: '8px',
                padding: '12px',
                backgroundColor: 'var(--secondary)',
                borderRadius: '6px',
                border: '1px solid var(--border)'
              }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                  <Info size={14} style={{ color: 'var(--muted-foreground)', marginTop: '1px', flexShrink: 0 }} />
                  <div>
                    <div style={{ fontSize: '12px', fontWeight: 500, color: 'var(--foreground)', marginBottom: '4px' }}>
                      Available variables:
                    </div>
                    <div style={{
                      fontSize: '11px',
                      color: 'var(--muted-foreground)',
                      fontFamily: 'SF Mono, Monaco, Cascadia Code, monospace',
                      lineHeight: '1.4'
                    }}>
                      <div><code>{'{projectPath}'}</code> - Project directory (from field above)</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Session Preview Toggle */}
            <div style={{ marginBottom: '24px' }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '16px',
                backgroundColor: 'var(--secondary)',
                borderRadius: '8px',
                border: '1px solid var(--border)'
              }}>
                <div>
                  <div style={{
                    fontSize: '14px',
                    fontWeight: 500,
                    color: 'var(--foreground)',
                    marginBottom: '4px'
                  }}>
                    Session Preview
                  </div>
                  <div style={{
                    fontSize: '12px',
                    color: 'var(--muted-foreground)'
                  }}>
                    Show session preview overlay on hover
                  </div>
                </div>
                <label style={{
                  position: 'relative',
                  display: 'inline-flex',
                  alignItems: 'center',
                  cursor: 'pointer'
                }}>
                  <input
                    type="checkbox"
                    checked={showSessionPreview}
                    onChange={(e) => setShowSessionPreview(e.target.checked)}
                    style={{ display: 'none' }}
                  />
                  <div style={{
                    width: '44px',
                    height: '24px',
                    backgroundColor: showSessionPreview ? 'hsl(var(--accent-main-000))' : 'hsl(var(--text-500))',
                    borderRadius: '12px',
                    position: 'relative',
                    transition: 'background-color 0.2s'
                  }}>
                    <div style={{
                      width: '18px',
                      height: '18px',
                      backgroundColor: 'white',
                      borderRadius: '50%',
                      position: 'absolute',
                      top: '3px',
                      left: showSessionPreview ? '23px' : '3px',
                      transition: 'left 0.2s',
                      boxShadow: '0 2px 4px rgba(0, 0, 0, 0.15)'
                    }} />
                  </div>
                </label>
              </div>
            </div>
            
            {/* Tool Preview Count */}
            <div style={{ marginBottom: '24px' }}>
              <div style={{
                padding: '16px',
                backgroundColor: 'var(--secondary)',
                borderRadius: '8px',
                border: '1px solid var(--border)'
              }}>
                <div style={{
                  fontSize: '14px',
                  fontWeight: 500,
                  color: 'var(--foreground)',
                  marginBottom: '12px'
                }}>
                  Tool Sequence Preview Count
                </div>
                <div style={{
                  fontSize: '12px',
                  color: 'var(--muted-foreground)',
                  marginBottom: '16px'
                }}>
                  Number of recent tools to show in collapsed tool sequences
                </div>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px'
                }}>
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
                      width: '80px',
                      padding: '6px 12px',
                      backgroundColor: 'var(--background)',
                      borderRadius: '6px',
                      border: '1px solid var(--border)',
                      fontSize: '14px',
                      fontWeight: 500,
                      textAlign: 'center',
                      color: 'var(--foreground)',
                      outline: 'none',
                      fontFamily: 'SF Mono, Monaco, Cascadia Code, monospace'
                    }}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = 'var(--accent)'
                      e.currentTarget.style.boxShadow = '0 0 0 3px rgba(var(--accent-rgb), 0.1)'
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = 'var(--border)'
                      e.currentTarget.style.boxShadow = 'none'
                    }}
                  />
                  <span style={{
                    fontSize: '13px',
                    color: 'var(--muted-foreground)'
                  }}>
                    tools
                  </span>
                </div>
                <div style={{
                  marginTop: '8px',
                  fontSize: '11px',
                  color: 'var(--muted-foreground)',
                  fontStyle: 'italic'
                }}>
                  {toolPreviewCount === 0 ? 'All tools will be hidden until expanded' : 
                   toolPreviewCount === 1 ? 'Show only the most recent tool' :
                   `Show the ${toolPreviewCount} most recent tools`}
                </div>
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
                backgroundColor: 'var(--accent)',
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