import React, { useState, useRef, useEffect } from 'react'
import { PanelLeftClose, Plus, Search, Settings } from 'lucide-react'
import { ProjectList } from '../ProjectList/ProjectList'
import { useAppStore } from '@/store/appStore'
import { startNewChatInTerminal } from '@/utils/launchSession'

interface SidebarProps {
  onOpenPalette: () => void
  onOpenSettings: () => void
}

export const Sidebar: React.FC<SidebarProps> = ({ onOpenPalette, onOpenSettings }) => {
  const { sidebarCollapsed, toggleSidebar, sidebarWidth, setSidebarWidth } = useAppStore()
  const [isResizing, setIsResizing] = useState(false)
  const [userName, setUserName] = useState<string>('')
  const sidebarRef = useRef<HTMLDivElement>(null)

  // Derive the user's name from $HOME's basename (best available without a
  // profile service). Capitalize first letter so "nitin" → "Nitin".
  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const home = await window.api?.getHomePath?.()
        if (cancelled || !home) return
        const base = String(home).split('/').filter(Boolean).pop() || ''
        setUserName(base ? base.charAt(0).toUpperCase() + base.slice(1) : '')
      } catch {}
    }
    load()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return
      const newWidth = e.clientX
      if (newWidth > 200 && newWidth < 500) {
        setSidebarWidth(newWidth)
      }
    }
    const handleMouseUp = () => {
      setIsResizing(false)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
    if (isResizing) {
      document.body.style.cursor = 'col-resize'
      document.body.style.userSelect = 'none'
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
    }
    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isResizing, setSidebarWidth])

  if (sidebarCollapsed) {
    return (
      <button
        onClick={toggleSidebar}
        style={{
          position: 'fixed',
          left: '80px',
          top: '8px',
          zIndex: 10,
          width: '24px',
          height: '24px',
          borderRadius: '6px',
          background: 'var(--secondary)',
          border: '1px solid var(--border)',
          color: 'var(--muted-foreground)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'all 0.2s ease',
        }}
        className="btn-icon"
        title="Open sidebar (⌘B)"
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>
    )
  }

  const initial = userName ? userName.charAt(0).toUpperCase() : '?'

  return (
    <>
      <aside
        ref={sidebarRef}
        className="sidebar"
        style={{
          position: 'fixed',
          left: 0,
          top: 0,
          bottom: 0,
          width: `${sidebarWidth}px`,
          display: 'flex',
          flexDirection: 'column',
          zIndex: 10,
        }}
      >
        {/* Top strip — left 80px reserved for macOS traffic lights, icons on the right.
            Whole strip is a window-drag region; the action buttons inside are
            interactive elements which Tauri auto-excludes from dragging. */}
        <div data-tauri-drag-region className="sidebar-top-strip">
          <div className="sidebar-top-strip-traffic" />
          <div className="sidebar-top-strip-actions">
            <button
              onClick={toggleSidebar}
              className="sidebar-icon-btn"
              title="Close sidebar (⌘B)"
              aria-label="Close sidebar"
            >
              <PanelLeftClose size={15} />
            </button>
            <button
              onClick={onOpenPalette}
              className="sidebar-icon-btn"
              title="Search (⌘K)"
              aria-label="Open command palette"
            >
              <Search size={15} />
            </button>
          </div>
        </div>

        {/* Primary action — launch a fresh Claude session in iTerm */}
        <div style={{ padding: '6px 10px 2px' }}>
          <button
            className="sidebar-new-chat"
            onClick={() => startNewChatInTerminal()}
            title="Launch a new chat in iTerm (configurable in Settings)"
          >
            <Plus size={14} strokeWidth={2.2} />
            <span>Launch new chat</span>
          </button>
        </div>

        {/* Project list */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '4px 8px 8px' }}>
          <ProjectList />
        </div>

        {/* Footer — user identity on the left, settings gear on the right */}
        <div className="sidebar-footer">
          <div className="sidebar-user">
            <div className="sidebar-user-avatar">{initial}</div>
            <span className="sidebar-user-name">{userName || 'User'}</span>
          </div>
          <button
            onClick={onOpenSettings}
            className="sidebar-icon-btn"
            title="Settings"
            aria-label="Open settings"
          >
            <Settings size={15} />
          </button>
        </div>
      </aside>

      {/* Resize handle */}
      <div
        onMouseDown={() => setIsResizing(true)}
        style={{
          position: 'fixed',
          left: `${sidebarWidth - 2}px`,
          top: 0,
          bottom: 0,
          width: '4px',
          cursor: 'col-resize',
          zIndex: 11,
          background: isResizing ? 'hsl(var(--accent-main-000))' : 'transparent',
          transition: 'background 0.2s',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'hsl(var(--accent-main-000))'
        }}
        onMouseLeave={(e) => {
          if (!isResizing) {
            e.currentTarget.style.background = 'transparent'
          }
        }}
      />
    </>
  )
}
