type DeepLinkParams = {
  sessionId?: string
  projectPath?: string
  jsonlFile?: string
}

declare global {
  interface Window {
    api: {
      getProjects: () => Promise<any[]>
      getSessions: (projectPath: string) => Promise<any[]>
      readFile: (path: string) => Promise<any[]>
      watchFile: (path: string) => void
      unwatchFile: (path: string) => void
      onFileChange: (callback: (path: string) => void) => () => void
      onDeepLinkOpen: (callback: (params: DeepLinkParams) => void) => () => void
      onMenuAction: (callback: (action: string) => void) => () => void
      getHomePath: () => Promise<string>
      launchInTerminal: (command: string) => Promise<{ ok: boolean; error?: string }>
      trashSession: (filePath: string) => Promise<{ ok: boolean; error?: string }>
    }
  }
}

export {}
