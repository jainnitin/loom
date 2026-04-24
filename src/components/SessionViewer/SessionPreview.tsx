import React from 'react'

interface SessionPreviewProps {
  sessionId: string
  sessionFilePath: string
  position: { x: number; y: number; width: number; height: number }
  onClose: () => void
  onMouseEnter?: () => void
  summary?: string
  firstUserMessage?: string
}

export const SessionPreview: React.FC<SessionPreviewProps> = ({
  sessionId,
  sessionFilePath,
  position,
  onClose,
  onMouseEnter,
  summary,
  firstUserMessage,
}) => {
  // Recap-only preview. "You asked" is already visible on the row's subline,
  // so this popup exists purely to surface the session's outcome at a glance.
  // If no recap is available, render nothing.
  if (!summary) return null

  // Smart positioning — prefer BELOW the hovered row. If there's not enough
  // room, anchor the popup's BOTTOM just above the row so it stays flush.
  const getSmartPosition = () => {
    const viewportWidth = window.innerWidth
    const viewportHeight = window.innerHeight
    const previewWidth = 420
    const estimatedMinHeight = 90

    let left = position.x
    if (left + previewWidth > viewportWidth - 20) {
      left = viewportWidth - previewWidth - 20
    }
    if (left < 20) left = 20

    const spaceBelow = viewportHeight - (position.y + position.height) - 20
    const placeBelow = spaceBelow >= estimatedMinHeight

    if (placeBelow) {
      return { left, top: position.y + position.height + 4, bottom: undefined as number | undefined }
    }
    const bottom = viewportHeight - position.y + 4
    return { left, top: undefined as number | undefined, bottom }
  }

  const smartPos = getSmartPosition()

  return (
    <div
      style={{
        position: 'fixed',
        left: smartPos.left,
        ...(smartPos.top !== undefined ? { top: smartPos.top } : {}),
        ...(smartPos.bottom !== undefined ? { bottom: smartPos.bottom } : {}),
        zIndex: 2000,
        backgroundColor: 'var(--background)',
        border: '1px solid hsl(var(--accent-main-000) / 0.4)',
        borderRadius: '8px',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.15), 0 10px 10px -5px rgba(0, 0, 0, 0.08)',
        width: '420px',
        maxHeight: '320px',
        overflow: 'auto',
      }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onClose}
    >
      <div
        style={{
          padding: '12px 14px',
          background:
            'linear-gradient(180deg, hsl(var(--accent-main-000) / 0.08) 0%, transparent 100%)',
        }}
      >
        <div
          style={{
            fontSize: 9,
            fontWeight: 700,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            color: 'hsl(var(--accent-main-000))',
            marginBottom: 5,
          }}
        >
          Recap
        </div>
        <div
          style={{
            fontSize: 12,
            color: 'var(--foreground)',
            lineHeight: 1.5,
            whiteSpace: 'pre-wrap',
            display: '-webkit-box',
            WebkitLineClamp: 10,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {summary}
        </div>
      </div>
    </div>
  )
}
