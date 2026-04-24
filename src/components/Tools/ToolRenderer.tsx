import React, { useState } from 'react'
import { BaseToolComponent } from './BaseToolComponent'
import { BashToolComponent } from './BashToolComponent'
import { FileToolComponent } from './FileToolComponent'
import { TodoToolComponent } from './TodoToolComponent'
import { WebToolComponent } from './WebToolComponent'

interface ToolRendererProps {
  toolName: string
  parameters?: any
  result?: any
  error?: string
  compact?: boolean
}

export const ToolRenderer: React.FC<ToolRendererProps> = ({
  toolName,
  parameters,
  result,
  error,
  compact = true
}) => {
  const [isExpanded, setIsExpanded] = useState(!compact)
  // Bash/Terminal tools
  if (toolName === 'Bash') {
    return (
      <BashToolComponent
        command={parameters?.command || ''}
        description={parameters?.description}
        output={result?.output || result}
        error={error}
        compact={compact}
      />
    )
  }

  // File operation tools
  if (['Read', 'Edit', 'Write', 'MultiEdit'].includes(toolName)) {
    return (
      <FileToolComponent
        toolName={toolName as 'Read' | 'Edit' | 'Write' | 'MultiEdit'}
        filePath={parameters?.file_path || parameters?.filePath || 'Unknown'}
        content={
          toolName === 'Read' 
            ? result?.output || result 
            : parameters?.content || parameters?.new_string || 'File modified'
        }
        error={error}
        compact={compact}
      />
    )
  }

  // Todo tools
  if (['TodoRead', 'TodoWrite'].includes(toolName)) {
    return (
      <TodoToolComponent
        parameters={parameters}
        result={result}
        error={error}
        compact={compact}
      />
    )
  }

  // Web tools
  if (['WebSearch', 'WebFetch'].includes(toolName)) {
    return (
      <WebToolComponent
        parameters={parameters}
        result={result}
        error={error}
        compact={compact}
      />
    )
  }

  // Search tools (Grep, Glob, etc.)
  if (['Grep', 'Glob', 'LS'].includes(toolName)) {
    const isSearchResult = Array.isArray(result)
    return (
      <BaseToolComponent
        toolName={toolName}
        parameters={parameters}
        result={result}
        error={error}
        compact={compact}
      >
        <div>
          {parameters && (
            <div style={{ marginBottom: '12px' }}>
              <div style={{ 
                fontSize: '11px', 
                color: 'var(--muted-foreground)',
                marginBottom: '4px',
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}>
                Search Parameters
              </div>
              <div style={{
                background: 'rgba(0, 0, 0, 0.2)',
                padding: '8px',
                borderRadius: '4px',
                fontSize: '11px',
                fontFamily: 'SF Mono, Monaco, Cascadia Code, monospace'
              }}>
                {toolName === 'Grep' && (
                  <>
                    <div>Pattern: <span style={{ color: '#60a5fa' }}>{parameters.pattern}</span></div>
                    {parameters.include && <div>Include: {parameters.include}</div>}
                    {parameters.path && <div>Path: {parameters.path}</div>}
                  </>
                )}
                {toolName === 'Glob' && (
                  <>
                    <div>Pattern: <span style={{ color: '#60a5fa' }}>{parameters.pattern}</span></div>
                    {parameters.path && <div>Path: {parameters.path}</div>}
                  </>
                )}
                {toolName === 'LS' && (
                  <div>Path: {parameters.path}</div>
                )}
              </div>
            </div>
          )}
          
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
                fontFamily: 'SF Mono, Monaco, Cascadia Code, monospace'
              }}>
                {error}
              </pre>
            </div>
          )}
          
          {isSearchResult && result && (
            <div>
              <div style={{ 
                fontSize: '11px', 
                color: 'var(--muted-foreground)',
                marginBottom: '4px',
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}>
                Results ({result.length} found)
              </div>
              <div style={{
                background: 'rgba(0, 0, 0, 0.2)',
                padding: '8px',
                borderRadius: '4px',
                fontSize: '11px',
                fontFamily: 'SF Mono, Monaco, Cascadia Code, monospace',
                maxHeight: '300px',
                overflow: 'auto'
              }}>
                {result.map((item: string, index: number) => (
                  <div key={index} style={{ 
                    padding: '2px 0',
                    borderBottom: index < result.length - 1 ? '1px solid rgba(255, 255, 255, 0.05)' : 'none'
                  }}>
                    {item}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </BaseToolComponent>
    )
  }

  // Default fallback for unknown tools
  return (
    <BaseToolComponent
      toolName={toolName}
      parameters={parameters}
      result={result}
      error={error}
      compact={compact}
    />
  )
}