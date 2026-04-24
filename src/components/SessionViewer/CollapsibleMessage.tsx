import React, { useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'

interface CollapsibleMessageProps {
  content: string
  maxLines?: number
  maxCharacters?: number
}

export const CollapsibleMessage: React.FC<CollapsibleMessageProps> = ({
  content,
  maxLines = 5,
  maxCharacters = 300
}) => {
  const [isExpanded, setIsExpanded] = useState(false)
  
  const lines = content.split('\n')
  const shouldCollapseByLines = lines.length > maxLines
  const shouldCollapseByLength = content.length > maxCharacters
  const shouldCollapse = shouldCollapseByLines || shouldCollapseByLength
  
  let displayContent = content
  if (shouldCollapse && !isExpanded) {
    if (shouldCollapseByLength && !shouldCollapseByLines) {
      // Collapse by character count
      displayContent = content.substring(0, maxCharacters) + '...'
    } else {
      // Collapse by line count
      displayContent = lines.slice(0, maxLines).join('\n')
    }
  }

  if (!shouldCollapse) {
    return (
      <div style={{ 
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word'
      }}>
        {content}
      </div>
    )
  }

  return (
    <div>
      <div style={{ 
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word'
      }}>
        {displayContent}
      </div>
      
      {shouldCollapse && (
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            marginTop: '8px',
            padding: '4px 8px',
            background: 'hsl(var(--bg-200))',
            border: 'none',
            borderRadius: '4px',
            color: 'var(--muted-foreground)',
            fontSize: '11px',
            cursor: 'pointer',
            transition: 'all 0.2s ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'hsl(var(--bg-300))'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'hsl(var(--bg-200))'
          }}
        >
          {isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
          {isExpanded 
            ? 'Show less' 
            : 'Show more'
          }
        </button>
      )}
    </div>
  )
}