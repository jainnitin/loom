import React, { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { ChevronRight, ChevronDown } from 'lucide-react'
import { CodeBlock } from './CodeBlock'
import { CollapsibleMessage } from './CollapsibleMessage'
import { ToolRenderer } from '../Tools/ToolRenderer'
import { ToolRow } from '../Tools/ToolRow'
import { BashMessage } from './BashMessage'
import { formatTime } from '@/utils/formatters'
import { Message } from '@/types'

interface MessageBlockProps {
  message: Message
}

export const MessageBlock: React.FC<MessageBlockProps> = ({ message }) => {
  const [isToolExpanded, setIsToolExpanded] = useState(false)
  
  const formatTimestamp = (timestamp: string) => {
    return formatTime(new Date(timestamp))
  }

  const formatCost = (cost: number) => {
    return `$${cost.toFixed(4)}`
  }

  const isToolMessage = () => {
    // Check if it's explicitly a tool type
    if (message.type === 'tool') return true
    
    // Check if it has tool result data
    if (message.toolUseResult) return true
    
    // Check if message content contains tool_use
    if (message.message?.content && Array.isArray(message.message.content)) {
      const hasToolUse = message.message.content.some((item: any) => item.type === 'tool_use')
      if (hasToolUse) return true
    }
    
    // Check if it's an empty user/assistant message with tool-like content in other fields
    if ((message.type === 'user' || message.type === 'assistant') && 
        (!message.message?.content || 
         (Array.isArray(message.message.content) && message.message.content.length === 0) ||
         (typeof message.message.content === 'string' && !message.message.content))) {
      // Check for tool indicators in other fields
      if (message.tool || message.toolName || message.name) return true
      if (message.content && typeof message.content === 'object') return true
    }
    
    return false
  }

  const getMessageContent = () => {
    // Handle tool messages
    if (isToolMessage()) {
      // Extract tool info from message structure
      let toolName = ''
      let parameters = null
      let result = null
      let error = null

      // First priority: Check message.content for tool_use
      if (message.message?.content && Array.isArray(message.message.content)) {
        const toolUse = message.message.content.find((item: any) => item.type === 'tool_use')
        if (toolUse) {
          toolName = toolUse.name || ''
          parameters = toolUse.input
        }
      }
      
      // Check for direct content field
      if (message.content) {
        if (typeof message.content === 'object') {
          // Handle tool invocation structure
          if (message.content.type === 'tool_use' && message.content.name) {
            toolName = message.content.name
            parameters = message.content.input
          }
          // Handle tool result structure
          else if (message.content.type === 'tool_result') {
            result = message.content
          }
          // Direct content as parameters or result
          else if (!parameters) {
            parameters = message.content
          }
        }
      }
      
      // Check for result in toolUseResult
      if (message.toolUseResult) {
        result = message.toolUseResult
      }
      
      // Try to extract tool name from other possible locations
      if (!toolName) {
        toolName = message.tool || message.toolName || message.name || ''
      }
      
      // If we have a result but no toolName, try to infer from result structure
      if (!toolName && result) {
        if (result.filePath) {
          toolName = 'Edit' // File operations are usually Edit
        } else if (result.output && typeof result.output === 'string') {
          toolName = 'Bash' // Command output is usually Bash
        } else if (result.type === 'text' && result.file) {
          toolName = 'Read' // File reading
        }
      }
      
      // According to spec FR3.2.1, if no tool name found, don't render as Tool Row
      if (!toolName || toolName === 'Tool') {
        return null
      }
      
      // Check for error
      if (message.error || result?.error) {
        error = message.error || result.error
      }
      
      // Determine status
      let status: 'loading' | 'success' | 'error' = 'success'
      if (error) {
        status = 'error'
      } else if (!result && parameters) {
        status = 'loading'
      }

      // Check if this message is inside a ToolGroup
      const isInToolGroup = message.isInToolGroup || false
      
      return (
        <ToolRow
          toolName={toolName}
          parameters={parameters}
          result={result}
          error={error}
          timestamp={message.timestamp}
          costUSD={message.costUSD}
          status={status}
          hideStatusDot={isInToolGroup}
        />
      )
    }

    // Handle user and assistant messages
    let content = ''
    if (message.message?.content) {
      if (Array.isArray(message.message.content)) {
        const textContent = message.message.content.find((item: any) => item.type === 'text')
        content = textContent?.text || ''
      } else if (typeof message.message.content === 'string') {
        content = message.message.content
      }
    }

    if (!content) {
      return <div style={{ color: 'var(--muted-foreground)', fontStyle: 'italic' }}>No content available</div>
    }

    // For user messages, check if it's a bash message first
    if (message.type === 'user') {
      // Check if it's a bash message
      if (content.includes('<bash-input>') || content.includes('<bash-stdout>') || content.includes('<bash-stderr>')) {
        return <BashMessage content={content} />
      }
      // Otherwise use collapsible component for long text (300+ characters)
      return <CollapsibleMessage content={content} maxCharacters={300} />
    }

    // For assistant messages, render markdown
    return (
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          code: ({ node, inline, className, children, ...props }) => {
            const match = /language-(\w+)/.exec(className || '')
            const language = match ? match[1] : ''
            
            if (!inline && language) {
              return (
                <CodeBlock
                  language={language}
                  value={String(children).replace(/\n$/, '')}
                />
              )
            }
            
            return (
              <code 
                className={className} 
                style={{
                  background: 'rgba(255, 255, 255, 0.1)',
                  padding: '2px 6px',
                  borderRadius: '3px',
                  fontSize: '0.875em',
                  fontFamily: 'SF Mono, Monaco, Cascadia Code, monospace'
                }}
                {...props}
              >
                {children}
              </code>
            )
          },
          p: ({ children }) => (
            <p style={{ margin: '0 0 12px 0', lineHeight: 1.6 }}>
              {children}
            </p>
          ),
          h1: ({ children }) => (
            <h1 style={{ margin: '0 0 16px 0', fontSize: '20px', fontWeight: 600 }}>
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 style={{ margin: '16px 0 12px 0', fontSize: '18px', fontWeight: 600 }}>
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 style={{ margin: '12px 0 8px 0', fontSize: '16px', fontWeight: 600 }}>
              {children}
            </h3>
          ),
          ul: ({ children }) => (
            <ul style={{ 
              margin: '0 0 12px 0', 
              paddingLeft: '24px',
              listStyleType: 'disc',
              listStylePosition: 'outside'
            }}>
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol style={{ 
              margin: '0 0 12px 0', 
              paddingLeft: '24px',
              listStyleType: 'decimal',
              listStylePosition: 'outside'
            }}>
              {children}
            </ol>
          ),
          li: ({ children }) => (
            <li style={{ 
              margin: '4px 0',
              paddingLeft: '4px',
              lineHeight: 1.6
            }}>
              {children}
            </li>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    )
  }

  const getDisplayType = () => {
    if (isToolMessage()) {
      return 'tool'
    }
    return message.type
  }

  const getDisplayLabel = () => {
    if (isToolMessage()) {
      let toolName = ''
      
      // Extract tool name for display
      if (message.message?.content && Array.isArray(message.message.content)) {
        const toolUse = message.message.content.find((item: any) => item.type === 'tool_use')
        if (toolUse) {
          toolName = toolUse.name || ''
        }
      }
      
      // Try to extract tool name from other possible locations
      if (!toolName && message.tool) {
        toolName = message.tool
      }
      if (!toolName && message.toolName) {
        toolName = message.toolName
      }
      if (!toolName && message.name) {
        toolName = message.name
      }
      
      return toolName ? `${toolName}` : 'Tool'
    }
    return message.type
  }

  // Tool messages - just render the content directly, it already has its own UI
  if (isToolMessage()) {
    const toolContent = getMessageContent()
    // Only render if we have valid tool content
    if (toolContent) {
      return toolContent
    }
    // If no valid tool content, fall through to regular message rendering
  }

  return (
    <div className="message-container">
      <div className="message-header">
        <div className={`message-dot ${getDisplayType()}`} />
        <span style={{ textTransform: 'capitalize', color: 'var(--foreground)' }}>
          {getDisplayLabel()}
        </span>
        <span className="message-timestamp">
          {formatTimestamp(message.timestamp)}
        </span>
        {message.costUSD && (
          <span className="message-cost">
            {formatCost(message.costUSD)}
          </span>
        )}
      </div>
      
      <div className={`message-content ${getDisplayType()}`}>
        {getMessageContent()}
      </div>
    </div>
  )
}