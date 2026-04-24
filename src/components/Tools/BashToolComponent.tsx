import React, { useState } from 'react'
import { BaseToolComponent } from './BaseToolComponent'

interface BashToolProps {
  command: string
  description?: string
  output?: string
  error?: string
  compact?: boolean
}

export const BashToolComponent: React.FC<BashToolProps> = ({
  command,
  description,
  output,
  error,
  compact = true
}) => {
  const [isExpanded, setIsExpanded] = useState(!compact)

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded)
  }

  return (
    <div style={{
      margin: '4px 0',
      fontSize: '12px',
      color: 'var(--muted-foreground)'
    }}>
      <div 
        onClick={toggleExpanded}
        style={{
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '2px 0',
          opacity: 0.7,
          transition: 'opacity 0.2s ease'
        }}
        onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
        onMouseLeave={(e) => e.currentTarget.style.opacity = '0.7'}
      >
        <span style={{ fontSize: '10px', opacity: 0.6 }}>
          {isExpanded ? '▼' : '▶'}
        </span>
        <span style={{ 
          fontFamily: 'SF Mono, Monaco, Cascadia Code, monospace',
          fontSize: '11px'
        }}>
          $ {command.length > 60 ? command.substring(0, 60) + '...' : command}
        </span>
      </div>
      
      {isExpanded && (
        <div style={{ 
          paddingLeft: '18px',
          paddingTop: '8px',
          paddingBottom: '8px'
        }}>
          <div style={{ marginBottom: '8px' }}>
            <div style={{ 
              fontSize: '10px', 
              color: 'var(--muted-foreground)',
              marginBottom: '4px',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              opacity: 0.7
            }}>
              Command
            </div>
            <div style={{
              background: 'rgba(0, 0, 0, 0.1)',
              border: '1px solid rgba(255, 255, 255, 0.05)',
              padding: '6px 8px',
              borderRadius: '4px',
              fontSize: '11px',
              fontFamily: 'SF Mono, Monaco, Cascadia Code, monospace',
              color: '#22c55e'
            }}>
              $ {command}
            </div>
          </div>

          {description && (
            <div style={{ marginBottom: '8px' }}>
              <div style={{ 
                fontSize: '10px', 
                color: 'var(--muted-foreground)',
                marginBottom: '4px',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                opacity: 0.7
              }}>
                Description
              </div>
              <div style={{ fontSize: '11px', color: 'var(--muted-foreground)' }}>
                {description}
              </div>
            </div>
          )}
          
          {error && (
            <div style={{ marginBottom: '8px' }}>
              <div style={{ 
                fontSize: '10px', 
                color: '#ef4444',
                marginBottom: '4px',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                opacity: 0.8
              }}>
                Error
              </div>
              <pre style={{
                background: 'rgba(239, 68, 68, 0.05)',
                border: '1px solid rgba(239, 68, 68, 0.15)',
                padding: '6px 8px',
                borderRadius: '4px',
                fontSize: '11px',
                overflow: 'auto',
                margin: 0,
                color: '#ef4444',
                fontFamily: 'SF Mono, Monaco, Cascadia Code, monospace',
                whiteSpace: 'pre-wrap',
                maxHeight: '200px'
              }}>
                {error}
              </pre>
            </div>
          )}
          
          {output && (
            <div>
              <div style={{ 
                fontSize: '10px', 
                color: 'var(--muted-foreground)',
                marginBottom: '4px',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                opacity: 0.7
              }}>
                Output
              </div>
              <pre style={{
                background: 'rgba(0, 0, 0, 0.1)',
                border: '1px solid rgba(255, 255, 255, 0.05)',
                padding: '6px 8px',
                borderRadius: '4px',
                fontSize: '11px',
                overflow: 'auto',
                margin: 0,
                fontFamily: 'SF Mono, Monaco, Cascadia Code, monospace',
                whiteSpace: 'pre-wrap',
                maxHeight: '300px'
              }}>
                {output}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  )
}