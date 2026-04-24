import React from 'react'
import { BaseToolComponent } from './BaseToolComponent'

interface WebToolComponentProps {
  parameters?: any
  result?: string
  error?: string
  compact?: boolean
}

export const WebToolComponent: React.FC<WebToolComponentProps> = ({
  parameters,
  result,
  error,
  compact = false
}) => {
  const renderCompactView = () => {
    if (error) {
      return <span style={{ color: 'var(--destructive)' }}>Web error</span>
    }
    
    let action = 'Web'
    if (parameters?.url) {
      try {
        const url = new URL(parameters.url)
        action = `Web: ${url.hostname}`
      } catch {
        action = `Web: ${parameters.url}`
      }
    } else if (parameters?.query) {
      action = `WebSearch: ${parameters.query.substring(0, 30)}${parameters.query.length > 30 ? '...' : ''}`
    }
    
    return <span>{action}</span>
  }
  
  const renderDetailedView = () => {
    if (error) {
      return (
        <div style={{ 
          padding: '12px',
          background: 'rgba(239, 68, 68, 0.1)',
          borderRadius: '4px',
          color: 'var(--destructive)'
        }}>
          {error}
        </div>
      )
    }
    
    return (
      <div style={{ padding: '12px' }}>
        {parameters?.url && (
          <div style={{ marginBottom: '8px' }}>
            <div style={{ fontSize: '11px', color: 'var(--muted-foreground)', marginBottom: '2px' }}>
              URL
            </div>
            <a 
              href={parameters.url} 
              target="_blank" 
              rel="noopener noreferrer"
              style={{ 
                fontSize: '12px',
                color: 'var(--primary)',
                textDecoration: 'none'
              }}
            >
              {parameters.url}
            </a>
          </div>
        )}
        
        {parameters?.query && (
          <div style={{ marginBottom: '8px' }}>
            <div style={{ fontSize: '11px', color: 'var(--muted-foreground)', marginBottom: '2px' }}>
              Search Query
            </div>
            <div style={{ fontSize: '12px', color: 'var(--foreground)' }}>
              {parameters.query}
            </div>
          </div>
        )}
        
        {parameters?.prompt && (
          <div style={{ marginBottom: '8px' }}>
            <div style={{ fontSize: '11px', color: 'var(--muted-foreground)', marginBottom: '2px' }}>
              Prompt
            </div>
            <div style={{ 
              fontSize: '12px', 
              color: 'var(--muted-foreground)',
              whiteSpace: 'pre-wrap'
            }}>
              {parameters.prompt}
            </div>
          </div>
        )}
        
        {result && (
          <div>
            <div style={{ 
              fontSize: '11px', 
              color: 'var(--muted-foreground)', 
              marginBottom: '4px',
              marginTop: '8px'
            }}>
              Result
            </div>
            <div style={{ 
              fontSize: '12px',
              color: 'var(--muted-foreground)',
              maxHeight: '200px',
              overflow: 'auto',
              whiteSpace: 'pre-wrap'
            }}>
              {result}
            </div>
          </div>
        )}
      </div>
    )
  }
  
  return (
    <BaseToolComponent
      toolName="Web"
      compact={compact}
      renderCompactView={renderCompactView}
      renderDetailedView={renderDetailedView}
    />
  )
}