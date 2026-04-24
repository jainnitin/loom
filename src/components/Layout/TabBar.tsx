import React from 'react'
import { X, Plus, BarChart3, Folder, PanelLeft, Tag } from 'lucide-react'
import { useAppStore } from '@/store/appStore'
import { ThemeSwitcher } from './ThemeSwitcher'

export const TabBar: React.FC = () => {
  const { tabs, activeTabId, setActiveTab, removeTab, sidebarCollapsed, sidebarWidth, toggleSidebar, ensureDashboardTab, sessionsByProject } = useAppStore()
  
  const handleNewTab = () => {
    // Create or switch to dashboard tab
    ensureDashboardTab()
  }
  
  return (
    <div className="tab-bar" style={{
      position: 'fixed',
      top: 0,
      left: sidebarCollapsed ? 0 : `${sidebarWidth}px`,
      right: 0,
      transition: 'left 0.2s ease',
      zIndex: 20
    }}>
      <div style={{
        height: '40px',
        display: 'flex',
        alignItems: 'center',
        paddingLeft: '12px',
        paddingRight: '12px',
        fontSize: '13px',
        WebkitAppRegion: 'drag'
      } as React.CSSProperties}>
        {/* Spacer for traffic lights on macOS - only when sidebar is collapsed */}
        {sidebarCollapsed && (
          <div style={{ width: '68px', flexShrink: 0 }} />
        )}
        
        {sidebarCollapsed && (
          <button
            className="btn-icon"
            style={{ 
              padding: '6px', 
              marginRight: '8px',
              WebkitAppRegion: 'no-drag'
            } as React.CSSProperties}
            onClick={toggleSidebar}
            title="Show sidebar (Cmd+B)"
          >
            <PanelLeft size={16} />
          </button>
        )}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '2px',
          WebkitAppRegion: 'no-drag',
          overflow: 'hidden'
        } as React.CSSProperties}>
          {tabs.map((tab) => {
            const tabCount = tabs.length
            const maxWidth = tabCount > 6 ? 180 : tabCount > 4 ? 200 : 240
            const minWidth = 120
            
            // Look up the session live so custom labels set AFTER the tab was
            // opened still reflect in the tab label.
            const sessionForTab =
              tab.type === 'session' && tab.sessionId
                ? (sessionsByProject[tab.projectPath] || []).find((s) => s.id === tab.sessionId)
                : undefined
            const isLabeledSession = !!sessionForTab?.customTitle

            const getTabLabel = () => {
              if (tab.type === 'dashboard') return 'Dashboard'
              if (tab.type === 'project') {
                return tab.projectPath.split('/').pop() || 'Project'
              }
              if (tab.type === 'session') {
                if (isLabeledSession) return sessionForTab!.customTitle!
                return tab.sessionName || tab.sessionId?.substring(0, 8) || 'Session'
              }
              return 'Unknown'
            }

            const getTabIcon = () => {
              if (tab.type === 'dashboard') return <BarChart3 size={14} />
              if (tab.type === 'project') return <Folder size={14} />
              if (tab.type === 'session' && isLabeledSession) {
                return <Tag size={13} style={{ color: 'hsl(var(--accent-main-000))' }} />
              }
              return null
            }

            const getTabTooltip = () => {
              if (tab.type === 'dashboard') return 'Dashboard'
              if (tab.type === 'project') return tab.projectPath
              if (tab.type === 'session') {
                const proj = tab.projectPath.split('/').pop() || ''
                const name = sessionForTab?.customTitle || tab.sessionName || tab.sessionId
                return proj ? `${proj} — ${name}` : name || 'Session'
              }
              return ''
            }

            return (
              <button
                key={tab.id}
                className={`tab ${activeTabId === tab.id ? 'active' : ''}`}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  '--tab-min-width': `${minWidth}px`,
                  '--tab-max-width': `${maxWidth}px`
                } as React.CSSProperties}
                title={getTabTooltip()}
              >
                {getTabIcon()}
                <span className="tab-label">
                  {getTabLabel()}
                </span>
                {tabs.length > 1 && (
                  <X 
                    size={14} 
                    className="tab-close"
                    onClick={(e) => {
                      e.stopPropagation()
                      removeTab(tab.id)
                    }}
                  />
                )}
              </button>
            )
          })}
          {tabs.length < 10 && (
            <button
              className="btn-icon"
              style={{ padding: '6px' }}
              onClick={handleNewTab}
              title="New tab"
            >
              <Plus size={16} />
            </button>
          )}
        </div>
        
        {/* Spacer for draggable area */}
        <div style={{ flex: 1 }} />
        
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          WebkitAppRegion: 'no-drag'
        } as React.CSSProperties}>
          <ThemeSwitcher />
        </div>
      </div>
    </div>
  )
}