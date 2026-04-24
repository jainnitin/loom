import React, { useEffect, useRef, useState } from 'react'
import { Palette, Check } from 'lucide-react'
import { useTheme } from 'next-themes'

const THEMES: { id: string; label: string; swatches: [string, string, string] }[] = [
  { id: 'light',     label: 'Claude Light', swatches: ['#ffffff', '#f4f1e8', '#c96442'] },
  { id: 'dark',      label: 'Claude Dark',  swatches: ['#262624', '#1f1e1d', '#c96442'] },
  { id: 'honeycomb', label: 'Honeycomb',    swatches: ['#1a1714', '#332e28', '#f5a97f'] },
]

export const ThemeSwitcher: React.FC = () => {
  const { theme, setTheme } = useTheme()
  const [open, setOpen] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDocClick = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDocClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDocClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const activeSwatch = THEMES.find((t) => t.id === theme)?.swatches[2] || 'var(--primary)'

  return (
    <div ref={wrapRef} style={{ position: 'relative', display: 'inline-flex' }}>
      <button
        className="btn-icon"
        title="Theme"
        onClick={() => setOpen((v) => !v)}
        style={{
          position: 'relative',
        }}
      >
        <Palette size={16} />
        <span
          style={{
            position: 'absolute',
            right: 4,
            bottom: 4,
            width: 7,
            height: 7,
            borderRadius: '50%',
            background: activeSwatch,
            border: '1.5px solid var(--background)',
          }}
        />
      </button>

      {open && (
        <div className="theme-popover">
          <div className="theme-popover-header">Theme</div>
          {THEMES.map((t) => {
            const active = t.id === theme
            return (
              <button
                key={t.id}
                className={`theme-popover-item${active ? ' is-active' : ''}`}
                onClick={() => {
                  setTheme(t.id)
                  setOpen(false)
                }}
              >
                <div className="theme-popover-swatches">
                  {t.swatches.map((hex, i) => (
                    <span key={i} style={{ background: hex }} />
                  ))}
                </div>
                <span className="theme-popover-label">{t.label}</span>
                {active && <Check size={13} style={{ color: 'hsl(var(--accent-main-000))', flexShrink: 0 }} />}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
