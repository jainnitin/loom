import React from 'react'
import { ChevronRight } from 'lucide-react'

interface BashMessageProps {
  content: string
}

export const BashMessage: React.FC<BashMessageProps> = ({ content }) => {
  // Check if content contains any bash tags
  if (!content.includes('<bash-') && !content.includes('</bash-')) {
    return <div>{content}</div>
  }

  // Parse all bash components in order
  const parts: React.ReactNode[] = []
  let remaining = content
  let keyIndex = 0

  while (remaining.length > 0) {
    // Find the next bash tag
    const inputMatch = remaining.match(/<bash-input>([\s\S]*?)<\/bash-input>/)
    const stdoutMatch = remaining.match(/<bash-stdout>([\s\S]*?)<\/bash-stdout>/)
    const stderrMatch = remaining.match(/<bash-stderr>([\s\S]*?)<\/bash-stderr>/)

    // Find which comes first
    const inputIndex = inputMatch ? remaining.indexOf(inputMatch[0]) : Infinity
    const stdoutIndex = stdoutMatch ? remaining.indexOf(stdoutMatch[0]) : Infinity
    const stderrIndex = stderrMatch ? remaining.indexOf(stderrMatch[0]) : Infinity

    const minIndex = Math.min(inputIndex, stdoutIndex, stderrIndex)

    // If no more bash tags, add remaining content and break
    if (minIndex === Infinity) {
      if (remaining.trim()) {
        parts.push(<div key={keyIndex++}>{remaining}</div>)
      }
      break
    }

    // Add any content before the bash tag
    if (minIndex > 0) {
      const beforeContent = remaining.substring(0, minIndex).trim()
      if (beforeContent) {
        parts.push(<div key={keyIndex++}>{beforeContent}</div>)
      }
    }

    // Handle the bash tag
    if (minIndex === inputIndex && inputMatch) {
      const command = inputMatch[1].trim()
      parts.push(
        <div key={keyIndex++} style={{
          background: 'hsl(var(--bg-200) / 0.3)',
          borderRadius: '6px',
          padding: '10px 14px',
          border: '1px solid hsl(var(--border-100) / 0.2)',
          fontFamily: '"SF Mono", Monaco, "Cascadia Code", monospace',
          fontSize: '13px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          marginBottom: '8px'
        }}>
          <ChevronRight 
            size={14} 
            style={{ 
              color: 'hsl(var(--text-400))', 
              flexShrink: 0 
            }} 
          />
          <code style={{ 
            color: 'hsl(var(--text-100))',
            wordBreak: 'break-all'
          }}>
            {command}
          </code>
        </div>
      )
      remaining = remaining.substring(inputIndex + inputMatch[0].length)
    } else if (minIndex === stdoutIndex && stdoutMatch) {
      const output = stdoutMatch[1].trim()
      if (output) { // Only render if there's actual output
        parts.push(
          <div 
            key={keyIndex++}
            className="bash-output"
            style={{
              background: 'hsl(var(--bg-200) / 0.6)',
              borderRadius: '6px',
              padding: '10px 14px',
              border: '1px solid hsl(var(--border-100) / 0.3)',
              maxHeight: '400px',
              overflow: 'auto',
              marginBottom: '8px'
            }}
          >
            <pre style={{
              margin: 0,
              fontFamily: '"SF Mono", Monaco, "Cascadia Code", monospace',
              fontSize: '12px',
              color: 'hsl(var(--text-200))',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              lineHeight: '1.5'
            }}>
              {output}
            </pre>
          </div>
        )
      }
      remaining = remaining.substring(stdoutIndex + stdoutMatch[0].length)
    } else if (minIndex === stderrIndex && stderrMatch) {
      const error = stderrMatch[1].trim()
      if (error) { // Only render if there's actual error content
        parts.push(
          <div 
            key={keyIndex++}
            className="bash-output"
            style={{
              background: 'hsl(var(--danger-900) / 0.2)',
              borderRadius: '6px',
              padding: '10px 14px',
              border: '1px solid hsl(var(--danger-000) / 0.2)',
              maxHeight: '400px',
              overflow: 'auto',
              marginBottom: '8px'
            }}
          >
            <pre style={{
              margin: 0,
              fontFamily: '"SF Mono", Monaco, "Cascadia Code", monospace',
              fontSize: '12px',
              color: 'hsl(var(--danger-000))',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              lineHeight: '1.5'
            }}>
              {error}
            </pre>
          </div>
        )
      }
      remaining = remaining.substring(stderrIndex + stderrMatch[0].length)
    }
  }

  // If we found bash content, return the parts, otherwise return original
  return parts.length > 0 ? <>{parts}</> : <div>{content}</div>
}