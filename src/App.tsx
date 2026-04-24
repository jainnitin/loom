import React, { useEffect } from 'react'
import { ThemeProvider } from 'next-themes'
import { Layout } from '@/components/Layout/Layout'
import { useAppStore } from '@/store/appStore'
import { findMatchingProject } from '@/utils/projectPathUtils'
import './styles/globals.css'

function App(): JSX.Element {
  const { setProjects, setSessions, setSessionsForProject, createSessionTab, ensureDashboardTab, selectProject } = useAppStore()
  
  useEffect(() => {
    // Load projects on app start
    loadProjects()
    
    // Always ensure dashboard tab exists and is active on app start
    ensureDashboardTab()
    
    // Handle dev mode URL parameters
    handleDevModeParams()
    
    let unsubscribeDeepLink: (() => void) | undefined
    if (window.api?.onDeepLinkOpen) {
      console.log('[App] Setting up deep link listener')
      unsubscribeDeepLink = window.api.onDeepLinkOpen((params) => {
        console.log('[App] Received deep link params:', params)
        handleDeepLink(params)
      })
    }
    return () => {
      unsubscribeDeepLink?.()
    }
  }, [])
  
  const handleDeepLink = async (params: { sessionId?: string; projectPath?: string; jsonlFile?: string }) => {
    console.log('[App] handleDeepLink called with:', params)
    
    if (!params.projectPath) {
      console.error('[App] Missing projectPath param:', params)
      return
    }
    
    // Add a slight delay to ensure the app is fully loaded
    setTimeout(async () => {
      try {
        // Load projects first if not loaded
        if (window.api && window.api.getProjects) {
          const projects = await window.api.getProjects()
          console.log('[App] Loaded projects:', projects.length)
          setProjects(projects)
          
          // Find the matching project
          const project = findMatchingProject(projects, params.projectPath)
          if (!project) {
            console.error('[App] Project not found:', params.projectPath)
            console.error('[App] Available projects:', projects.map(p => p.path))
            return
          }
          
          // Get sessions for this project
          const sessions = await window.api.getSessions(project.path)
          console.log('[App] Loaded sessions:', sessions.length)
          
          // IMPORTANT: Set sessions in the store using the real path as key
          setSessionsForProject(project.name, sessions)
          
          // If sessionId is provided, open that specific session
          if (params.sessionId) {
            // Find the specific session
            const session = sessions.find(s => s.id === params.sessionId)
            if (!session) {
              console.error('[App] Session not found:', params.sessionId)
              console.error('[App] Available sessions:', sessions.map(s => s.id))
              return
            }
            
            console.log('[App] Found session:', session)
            
            // Create and activate tab using new method
            const sessionName = session.id.substring(0, 8)
            console.log('[App] Creating session tab:', { sessionId: session.id, projectPath: project.name, sessionName })
            
            createSessionTab(session.id, project.name, sessionName)
            
            console.log('[App] Session tab created and activated')
          } else {
            // If no sessionId, just show the project's session list
            console.log('[App] No sessionId provided, showing project sessions')
            // Select the project to show its sessions in the UI
            selectProject(project.name)
            // The sessions are already loaded and set in the store
            // The UI will automatically show the session list for this project
          }
        }
      } catch (error) {
        console.error('[App] Error handling deep link:', error)
      }
    }, 500) // 500ms delay
  }
  
  const handleDevModeParams = () => {
    // Check if we're in development mode and have URL parameters
    if (window.location.pathname === '/dev-open') {
      const params = new URLSearchParams(window.location.search)
      const sessionId = params.get('sessionId')
      const projectPath = params.get('projectPath')
      const jsonlFile = params.get('jsonlFile')
      
      console.log('[DEV MODE] Received params:', { sessionId, projectPath, jsonlFile })
      
      if (sessionId && projectPath) {
        // Create a tab for this session
        const projectName = projectPath.split('/').pop() || 'Project'
        const tabId = `${projectName}-${sessionId}`
        
        console.log('[DEV MODE] Opening session:', tabId)
        
        // Create session tab using new method
        const sessionName = sessionId.substring(0, 8)
        createSessionTab(sessionId, projectPath, sessionName)
        
        // Clear the URL to avoid re-triggering
        window.history.replaceState({}, '', '/')
      }
    }
  }
  
  const loadProjects = async () => {
    try {
      if (window.api?.getProjects) {
        const projects = await window.api.getProjects()
        setProjects(projects)
      } else {
        console.log('[DEV MODE] Running without window.api')
      }
    } catch (error) {
      console.error('Error loading projects:', error)
    }
  }
  
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      themes={['light', 'dark', 'honeycomb', 'honeycomb-bloom', 'honeycomb-sable']}
    >
      <Layout />
    </ThemeProvider>
  )
}

export default App