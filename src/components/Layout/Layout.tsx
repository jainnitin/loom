import React, { useEffect, useState } from 'react'
import { TabBar } from './TabBar'
import { Sidebar } from './Sidebar'
import { SessionViewer } from '../SessionViewer/SessionViewer'
import { SessionListView } from '../SessionViewer/SessionListView'
import { Dashboard } from '../Dashboard/Dashboard'
import { CommandPalette } from '../CommandPalette/CommandPalette'
import { SettingsModal } from '../Settings/SettingsModal'
import { useAppStore } from '@/store/appStore'

export const Layout: React.FC = () => {
  const { sidebarCollapsed, sidebarWidth, toggleSidebar, activeTabId, tabs, selectedProjectPath } = useAppStore()
  const [paletteOpen, setPaletteOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  
  useEffect(() => {
    // Handle menu events from Electron
    const handleMenuAction = (action: string) => {
      switch (action) {
        case 'new-tab': {
          // Create or switch to dashboard tab
          const { ensureDashboardTab } = useAppStore.getState()
          ensureDashboardTab()
          break
        }
        case 'close-tab': {
          console.log('[Layout] close-tab event received')
          const { activeTabId, tabs, removeTab } = useAppStore.getState()
          console.log('[Layout] Current activeTabId:', activeTabId)
          console.log('[Layout] Current tabs.length:', tabs.length)
          console.log('[Layout] Current tabs:', tabs.map(t => ({ id: t.id, type: t.type })))
          
          if (activeTabId && tabs.length > 0) {
            console.log('[Layout] Calling removeTab with activeTabId:', activeTabId)
            removeTab(activeTabId)
          } else {
            console.log('[Layout] Not removing tab - activeTabId or tabs missing')
          }
          break
        }
        case 'toggle-sidebar': {
          const { toggleSidebar } = useAppStore.getState()
          toggleSidebar()
          break
        }
        case 'zoom-in': {
          const currentZoom = parseFloat(document.documentElement.style.fontSize || '16px')
          const newZoom = Math.min(currentZoom + 1, 24)
          document.documentElement.style.fontSize = `${newZoom}px`
          break
        }
        case 'zoom-out': {
          const currentZoom = parseFloat(document.documentElement.style.fontSize || '16px')
          const newZoom = Math.max(currentZoom - 1, 10)
          document.documentElement.style.fontSize = `${newZoom}px`
          break
        }
        case 'zoom-reset':
          document.documentElement.style.fontSize = '16px'
          break
      }
    }
    
    // Register the handler
    const removeListener = window.api?.onMenuAction?.(handleMenuAction)
    
    // Cleanup on unmount
    return () => {
      if (removeListener) removeListener()
    }
  }, [])
  
  useEffect(() => {
    // Handle keyboard shortcuts
    const handleKeydown = (e: KeyboardEvent) => {
      
      // Note: Cmd+T, Cmd+N, Cmd+W, Cmd+B are now handled by Electron menu
      // Only handle shortcuts that aren't in the menu
      
      // - to zoom out (decrease font size)
      if (e.key === '-' && !e.ctrlKey && !e.metaKey && !e.shiftKey && !e.altKey) {
        e.preventDefault()
        const currentZoom = parseFloat(document.documentElement.style.fontSize || '16px')
        const newZoom = Math.max(currentZoom - 1, 10)
        document.documentElement.style.fontSize = `${newZoom}px`
      }
      
      // + or = to zoom in (increase font size)
      if ((e.key === '+' || e.key === '=') && !e.ctrlKey && !e.metaKey && !e.shiftKey && !e.altKey) {
        e.preventDefault()
        const currentZoom = parseFloat(document.documentElement.style.fontSize || '16px')
        const newZoom = Math.min(currentZoom + 1, 24)
        document.documentElement.style.fontSize = `${newZoom}px`
      }
      
      // ⌘K / Ctrl+K → command palette
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k' && !e.shiftKey && !e.altKey) {
        e.preventDefault()
        setPaletteOpen((v) => !v)
      }
    }

    window.addEventListener('keydown', handleKeydown)
    return () => window.removeEventListener('keydown', handleKeydown)
  }, [])
  
  const activeTab = tabs.find(t => t.id === activeTabId)
  // View resolution:
  //   active session tab → SessionViewer
  //   active dashboard tab → Dashboard
  //   no active tab + selected project → SessionListView (project view, not a tab)
  //   no active tab + no project → Dashboard fallback
  // (Project tabs were removed — projects are sidebar-driven, not tabs.)
  let view: React.ReactNode
  if (activeTab?.type === 'session') {
    view = <SessionViewer tab={activeTab} />
  } else if (activeTab?.type === 'dashboard') {
    view = <Dashboard />
  } else if (!activeTab && selectedProjectPath) {
    view = <SessionListView projectPath={selectedProjectPath} />
  } else {
    view = <Dashboard />
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100vw', overflow: 'hidden' }}>
      <TabBar />
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <Sidebar
          onOpenPalette={() => setPaletteOpen(true)}
          onOpenSettings={() => setSettingsOpen(true)}
        />
        <main style={{
          flex: 1,
          marginLeft: sidebarCollapsed ? '0' : `${sidebarWidth}px`,
          marginTop: '40px',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          transition: 'margin-left 0.2s ease'
        }}>
          {view}
        </main>
      </div>
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
      <SettingsModal isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  )
}