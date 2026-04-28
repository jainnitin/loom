import { invoke } from '@tauri-apps/api/core'
import { listen, type UnlistenFn } from '@tauri-apps/api/event'
import { getCurrentWindow } from '@tauri-apps/api/window'

type DeepLinkParams = {
  sessionId?: string
  projectPath?: string
  jsonlFile?: string
}

type OpResult = { ok: boolean; error?: string }

type LoomApi = {
  getProjects: () => Promise<unknown[]>
  getSessions: (projectPath: string) => Promise<unknown[]>
  readFile: (path: string) => Promise<unknown[]>
  watchFile: (path: string) => void
  unwatchFile: (path: string) => void
  onFileChange: (callback: (path: string) => void) => () => void
  onDeepLinkOpen: (callback: (params: DeepLinkParams) => void) => () => void
  onMenuAction: (callback: (action: string) => void) => () => void
  onSuggestMoveToApplications: (callback: () => void) => () => void
  getHomePath: () => Promise<string>
  launchInTerminal: (command: string) => Promise<OpResult>
  trashSession: (filePath: string) => Promise<OpResult>
  moveToApplications: () => Promise<OpResult>
}

const fileChangeListeners = new Set<(path: string) => void>()
let fileChangeUnlisten: UnlistenFn | null = null

async function ensureFileChangeListener() {
  if (fileChangeUnlisten) return
  fileChangeUnlisten = await listen<string>('fs:fileChanged', (event) => {
    for (const cb of fileChangeListeners) cb(event.payload)
  })
}

// Wrap Tauri's async `listen(...)` — which returns a Promise<UnlistenFn> — in a
// synchronous subscribe/unsubscribe pair so callers can set up a listener in a
// render pass and tear it down in the returned cleanup without handling a
// Promise. Unsubscribe is a no-op if called before the listen() promise resolves.
function subscribe<T>(event: string, callback: (payload: T) => void): () => void {
  let unlisten: UnlistenFn | null = null
  let cancelled = false
  void listen<T>(event, (ev) => callback(ev.payload)).then((fn) => {
    if (cancelled) fn()
    else unlisten = fn
  })
  return () => {
    cancelled = true
    unlisten?.()
  }
}

const api: LoomApi = {
  getProjects: () => invoke<unknown[]>('fs_get_projects'),

  getSessions: (projectPath) => invoke<unknown[]>('fs_get_sessions', { projectPath }),

  readFile: (path) => invoke<unknown[]>('fs_read_file', { path }),

  watchFile: (path) => {
    void (async () => {
      await ensureFileChangeListener()
      try {
        await invoke('fs_watch_file', { path })
      } catch (err) {
        console.error('[tauriApi] watchFile failed:', err)
      }
    })()
  },

  unwatchFile: (path) => {
    void invoke('fs_unwatch_file', { path }).catch((err) =>
      console.error('[tauriApi] unwatchFile failed:', err),
    )
  },

  onFileChange: (callback) => {
    fileChangeListeners.add(callback)
    void ensureFileChangeListener()
    return () => {
      fileChangeListeners.delete(callback)
    }
  },

  onDeepLinkOpen: (callback) => subscribe<DeepLinkParams>('deep-link-open', callback),

  onMenuAction: (callback) => subscribe<string>('menu-action', callback),

  onSuggestMoveToApplications: (callback) =>
    subscribe<null>('suggest-move-to-applications', () => callback()),

  getHomePath: () => invoke<string>('path_get_home'),

  launchInTerminal: (command) =>
    invoke<OpResult>('system_launch_in_terminal', { command }),

  trashSession: (filePath) =>
    invoke<OpResult>('fs_trash_session', { filePath }),

  moveToApplications: () => invoke<OpResult>('system_move_to_applications'),
}

// Walk up from the click target. Honor `data-tauri-drag-region` on any
// ancestor, but bail if an interactive element sits between the click and
// that ancestor (so buttons/inputs inside the drag region keep their click).
function installDragRegionHandler() {
  document.addEventListener('mousedown', async (e) => {
    if (e.button !== 0) return
    let el = e.target as HTMLElement | null
    while (el) {
      if (el.matches('button, input, textarea, select, a, [role="button"], [contenteditable="true"]')) {
        return
      }
      if (el.hasAttribute('data-tauri-drag-region')) {
        if (el.getAttribute('data-tauri-drag-region') === 'false') return
        e.preventDefault()
        try {
          if (e.detail === 2) {
            await getCurrentWindow().toggleMaximize()
          } else {
            await getCurrentWindow().startDragging()
          }
        } catch (err) {
          console.error('[drag-region]', err)
        }
        return
      }
      el = el.parentElement
    }
  })
}

export function installTauriBridge() {
  if (typeof window === 'undefined') return
  ;(window as unknown as { api: LoomApi }).api = api
  installDragRegionHandler()
}

export type { LoomApi }
