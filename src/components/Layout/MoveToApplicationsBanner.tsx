import React, { useEffect, useState } from 'react'
import { X } from 'lucide-react'

export const MoveToApplicationsBanner: React.FC = () => {
  const [visible, setVisible] = useState(false)
  const [moving, setMoving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!window.api?.onSuggestMoveToApplications) return
    const unsub = window.api.onSuggestMoveToApplications(() => setVisible(true))
    return unsub
  }, [])

  if (!visible) return null

  const handleMove = async () => {
    setMoving(true)
    setError(null)
    const result = await window.api.moveToApplications()
    if (!result.ok) {
      setError(result.error ?? 'Move failed')
      setMoving(false)
    }
    // on success the Rust side relaunches and exits — no cleanup needed
  }

  return (
    <div style={{
      position: 'fixed',
      top: '40px',
      left: 0,
      right: 0,
      zIndex: 200,
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      padding: '9px 16px',
      background: 'var(--background)',
      borderBottom: '1px solid color-mix(in srgb, var(--foreground) 10%, transparent)',
      fontSize: '13px',
      color: 'var(--foreground)',
    }}>
      <span style={{ flex: 1, color: 'var(--muted-foreground)' }}>
        {error
          ? <span style={{ color: 'var(--foreground)' }}>Could not move: {error}</span>
          : 'Loom is running outside the Applications folder.'}
      </span>

      {!error && (
        <button
          onClick={handleMove}
          disabled={moving}
          style={{
            padding: '4px 12px',
            borderRadius: '6px',
            border: '1px solid color-mix(in srgb, var(--foreground) 18%, transparent)',
            background: 'transparent',
            color: 'var(--foreground)',
            fontSize: '12px',
            fontWeight: 500,
            cursor: moving ? 'default' : 'pointer',
            opacity: moving ? 0.5 : 1,
            whiteSpace: 'nowrap',
          }}
        >
          {moving ? 'Moving…' : 'Move to Applications'}
        </button>
      )}

      <button
        onClick={() => setVisible(false)}
        aria-label="Dismiss"
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          padding: '2px',
          color: 'var(--muted-foreground)',
          display: 'flex',
          alignItems: 'center',
        }}
      >
        <X size={14} />
      </button>
    </div>
  )
}
