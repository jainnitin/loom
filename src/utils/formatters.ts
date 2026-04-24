export function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  })
}

/**
 * Final safety pass for rendering session titles/previews. Strips any
 * <command-*>…</command-*> and <local-command-*>…</local-command-*> blocks
 * (slash-command payloads, caveats, stdout/stderr) that may still be in
 * cached data from before the backend parser started filtering them.
 */
export function cleanTitle(text: string | null | undefined): string | undefined {
  if (!text) return undefined
  const cleaned = text
    .replace(/<(local-)?command-[\w-]+[^>]*>[\s\S]*?<\/(local-)?command-[\w-]+>/gi, ' ')
    .replace(/<\/?(local-)?command-[\w-]+[^>]*\/?>/gi, ' ')
    .replace(/\x1b\[[0-9;]*[A-Za-z]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
  return cleaned || undefined
}

export function formatClockTime(date: Date): string {
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
}

export function formatRelativeTime(date: Date): string {
  const now = Date.now()
  const diffMs = now - date.getTime()
  const sec = Math.floor(diffMs / 1000)
  if (sec < 45) return 'just now'
  const min = Math.floor(sec / 60)
  if (min < 60) return `${min}m ago`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr}h ago`
  const day = Math.floor(hr / 24)
  if (day < 7) return `${day}d ago`
  if (day < 30) return `${Math.floor(day / 7)}w ago`
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined,
  })
}

