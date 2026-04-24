export interface Project {
  name: string
  path: string
  sessionCount: number
  lastActivity?: Date
}

export interface Session {
  id: string
  projectPath: string
  filePath: string
  startTime?: Date
  endTime?: Date
  mtime?: Date  // File modification time
  messageCount: number
  totalCost: number
  preview?: string
  customTitle?: string
  firstUserMessage?: string
  sessionSummary?: string
  lastPrompt?: string
}

export interface Message {
  type: 'user' | 'assistant' | 'tool'
  timestamp: string
  uuid: string
  parentUuid?: string
  content?: any
  costUSD?: number
  durationMs?: number
  message?: {
    role?: string
    content?: any
  }
  toolUseResult?: string
}

export interface Tab {
  id: string              // Use sessionId directly for session tabs
  type: 'session' | 'dashboard' | 'project'
  sessionId?: string      // Only for session tabs
  projectPath: string     // Single source of truth for project path
  sessionName?: string    // Display name for session tabs
}

export interface AppState {
  projects: Project[]
  selectedProjectPath: string | null
  sessions: Session[]
  sessionsByProject: Record<string, Session[]>  // Sessions stored by project
  selectedSessionId: string | null
  tabs: Tab[]
  activeTabId: string | null
  messages: Record<string, Message[]>
  sidebarCollapsed: boolean
  sidebarWidth: number
  theme: 'light' | 'dark'
  expandedProjects: Record<string, boolean>
  pinnedProjects: Record<string, boolean>
  pinnedOrder: string[]
  expandedBuckets: { pinned: boolean; active: boolean; all: boolean }
  hiddenSessions: Record<string, boolean>
  showHidden: boolean
}