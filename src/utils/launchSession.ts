const DEFAULT_TEMPLATE = 'cd {projectPath}; claude --resume {sessionId}'
// Tilde is shell-expanded by zsh/bash to the current user's $HOME, so this
// stays portable across machines without needing to round-trip through IPC.
export const DEFAULT_NEW_CHAT_PATH = '~'
export const DEFAULT_NEW_CHAT_TEMPLATE = 'cd {projectPath}; claude'

/**
 * Build the resume command from the user's template (Settings modal) and
 * launch it in iTerm2 (falling back to Terminal.app). Used by Cmd+click
 * on any session row / card, and the "Open in iTerm" button in SessionViewer.
 *
 * An optional `query` is appended as a single shell-quoted argument so the
 * resumed `claude` session opens with the prompt prefilled. The default
 * resume template doesn't include {query}, so we just append; if a custom
 * template uses {query} explicitly we honor that placement instead.
 */
export async function launchSessionInTerminal(projectPath: string, sessionId: string, query?: string) {
  const template = localStorage.getItem('claude-viewer-custom-command') || DEFAULT_TEMPLATE
  const trimmedQuery = query?.trim() || ''
  let command = template
    .replaceAll('{projectPath}', projectPath)
    .replaceAll('{sessionId}', sessionId)
  if (template.includes('{query}')) {
    command = command.replaceAll('{query}', trimmedQuery ? shellQuote(trimmedQuery) : '')
  } else if (trimmedQuery) {
    command = `${command} ${shellQuote(trimmedQuery)}`
  }

  if (!window.api || !window.api.launchInTerminal) {
    console.warn('[launchSessionInTerminal] window.api.launchInTerminal not available')
    return
  }
  try {
    const res = await window.api.launchInTerminal(command)
    if (!res?.ok) {
      console.error('[launchSessionInTerminal] failed', res)
    }
  } catch (err) {
    console.error('[launchSessionInTerminal] error', err)
  }
}

// Shell-escape a user-supplied string so it can be passed as a quoted argument
// to claude (or any shell command). Wraps in single quotes and escapes any
// single quotes inside by closing → escaping → reopening.
function shellQuote(s: string): string {
  return `'${s.replace(/'/g, `'\\''`)}'`
}

/**
 * Start a brand-new Claude chat in iTerm using a user-configurable template.
 * Template supports {projectPath} and optional {query}. If {query} is absent
 * and a query is provided, the quoted query is appended to the command.
 * Defaults overridable in Settings.
 */
export async function startNewChatInTerminal(
  arg?: string | { projectPath?: string; query?: string },
) {
  const opts = typeof arg === 'string' ? { projectPath: arg } : arg || {}
  const template =
    localStorage.getItem('claude-viewer-new-chat-command') || DEFAULT_NEW_CHAT_TEMPLATE
  const target =
    opts.projectPath ||
    localStorage.getItem('claude-viewer-new-chat-path') ||
    DEFAULT_NEW_CHAT_PATH
  const query = opts.query?.trim() || ''

  let command = template.replaceAll('{projectPath}', target)
  if (template.includes('{query}')) {
    command = command.replaceAll('{query}', query ? shellQuote(query) : '')
  } else if (query) {
    command = `${command} ${shellQuote(query)}`
  }

  if (!window.api || !window.api.launchInTerminal) {
    console.warn('[startNewChatInTerminal] window.api.launchInTerminal not available')
    return
  }
  try {
    const res = await window.api.launchInTerminal(command)
    if (!res?.ok) {
      console.error('[startNewChatInTerminal] failed', res)
    }
  } catch (err) {
    console.error('[startNewChatInTerminal] error', err)
  }
}

export function isTerminalModifier(e: { metaKey: boolean; ctrlKey: boolean }): boolean {
  return e.metaKey || e.ctrlKey
}
