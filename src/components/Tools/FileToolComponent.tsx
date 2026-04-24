import React, { useState } from 'react'

interface FileToolProps {
  toolName: 'Read' | 'Edit' | 'Write' | 'MultiEdit'
  filePath: string
  content?: string
  changes?: string
  error?: string
  compact?: boolean
}

export const FileToolComponent: React.FC<FileToolProps> = ({
  toolName,
  filePath,
  content,
  changes,
  error,
  compact = true
}) => {
  const [isExpanded, setIsExpanded] = useState(!compact)

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded)
  }


  const getFileName = (path: string) => {
    return path.split('/').pop() || path
  }

  const getFileDir = (path: string) => {
    const parts = path.split('/')
    return parts.slice(0, -1).join('/')
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
          {toolName} {getFileName(filePath)}
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
              File Path
            </div>
            <div style={{
              fontFamily: 'SF Mono, Monaco, Cascadia Code, monospace',
              fontSize: '11px',
              color: 'var(--foreground)',
              opacity: 0.9,
              background: 'rgba(0, 0, 0, 0.2)',
              padding: '4px 8px',
              borderRadius: '3px'
            }}>
              <span style={{ color: 'var(--muted-foreground)' }}>{getFileDir(filePath)}/</span>
              <span>{getFileName(filePath)}</span>
            </div>
          </div>
          
          {error && (
            <div style={{ marginBottom: '12px' }}>
              <div style={{ 
                fontSize: '11px', 
                color: '#ef4444',
                marginBottom: '4px',
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}>
                Error
              </div>
              <pre style={{
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.2)',
                padding: '8px',
                borderRadius: '4px',
                fontSize: '11px',
                overflow: 'auto',
                margin: 0,
                color: '#ef4444',
                fontFamily: 'SF Mono, Monaco, Cascadia Code, monospace',
                whiteSpace: 'pre-wrap'
              }}>
                {error}
              </pre>
            </div>
          )}
          
          {content && (
            <div>
              <div style={{ 
                fontSize: '11px', 
                color: 'var(--muted-foreground)',
                marginBottom: '4px',
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}>
                {toolName === 'Read' ? 'Content' : 'Changes'}
              </div>
              <pre style={{
                background: 'rgba(0, 0, 0, 0.2)',
                padding: '8px',
                borderRadius: '4px',
                fontSize: '11px',
                overflow: 'auto',
                margin: 0,
                fontFamily: 'SF Mono, Monaco, Cascadia Code, monospace',
                whiteSpace: 'pre-wrap',
                maxHeight: '400px',
                lineHeight: 1.4
              }}>
                {content}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  )
}