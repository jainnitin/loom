import React, { useMemo } from 'react'
import { Message } from '@/types'
import { formatTime } from '@/utils/formatters'

interface TimelineProps {
  messages: Message[]
  currentIndex?: number
  onJump: (index: number) => void
}

export const Timeline: React.FC<TimelineProps> = ({ messages, currentIndex, onJump }) => {
  // Group messages by hour for timeline
  const timelineData = useMemo(() => {
    if (messages.length === 0) return []
    
    const groups: { time: string; indices: number[]; hasUser: boolean; hasAssistant: boolean }[] = []
    let currentHour = ''
    
    messages.forEach((msg, index) => {
      const hour = new Date(msg.timestamp).toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: false 
      }).substring(0, 3) + '00'
      
      if (hour !== currentHour) {
        currentHour = hour
        groups.push({ 
          time: hour, 
          indices: [index],
          hasUser: msg.type === 'user',
          hasAssistant: msg.type === 'assistant'
        })
      } else {
        const lastGroup = groups[groups.length - 1]
        lastGroup.indices.push(index)
        if (msg.type === 'user') lastGroup.hasUser = true
        if (msg.type === 'assistant') lastGroup.hasAssistant = true
      }
    })
    
    return groups
  }, [messages])
  
  const handleClick = (index: number) => {
    onJump(index)
  }
  
  if (messages.length === 0) return null
  
  const totalHeight = 400
  const itemHeight = totalHeight / Math.max(messages.length, 1)
  
  return (
    <div style={{
      position: 'absolute',
      right: '20px',
      top: '50%',
      transform: 'translateY(-50%) translateX(10px)',
      width: '80px',
      height: `${totalHeight}px`,
      backgroundColor: 'var(--secondary)',
      border: '1px solid var(--border)',
      borderRadius: '8px',
      padding: '12px',
      opacity: 0,
      transition: 'all 0.3s ease',
      pointerEvents: 'none',
      zIndex: 100,
      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
    }}
    className="timeline-container">
      <div style={{
        position: 'relative',
        height: '100%',
        width: '100%'
      }}>
        {/* Timeline track */}
        <div style={{
          position: 'absolute',
          left: '50%',
          transform: 'translateX(-50%)',
          top: 0,
          bottom: 0,
          width: '2px',
          backgroundColor: 'var(--border)',
          borderRadius: '1px'
        }} />
        
        {/* Message dots */}
        {messages.map((msg, index) => {
          const isActive = currentIndex === index
          const isToolMessage = msg.type === 'tool' || 
                               msg.toolUseResult || 
                               (msg.message?.content && Array.isArray(msg.message.content) && 
                                msg.message.content.some((item: any) => item.type === 'tool_use'))
          
          const color = msg.type === 'user' 
            ? '#3b82f6' 
            : msg.type === 'assistant' 
            ? '#8b5cf6' 
            : isToolMessage
            ? '#fbbf24'
            : 'var(--border)'
          
          const size = isActive ? 10 : isToolMessage ? 3 : 6
          
          return (
            <div
              key={index}
              onClick={() => handleClick(index)}
              style={{
                position: 'absolute',
                left: '50%',
                transform: 'translateX(-50%)',
                top: `${(index / messages.length) * 100}%`,
                width: `${size}px`,
                height: `${size}px`,
                borderRadius: '50%',
                backgroundColor: color,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                zIndex: isActive ? 3 : isToolMessage ? 1 : 2,
                border: isActive ? '2px solid var(--background)' : 'none',
                boxShadow: isActive ? `0 0 0 4px ${color}40` : 'none'
              }}
              title={`${isToolMessage ? 'Tool' : msg.type} - ${formatTime(new Date(msg.timestamp))}`}
              onMouseEnter={(e) => {
                if (!isActive && !isToolMessage) {
                  e.currentTarget.style.width = '8px'
                  e.currentTarget.style.height = '8px'
                  e.currentTarget.style.boxShadow = `0 0 0 2px ${color}40`
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive && !isToolMessage) {
                  e.currentTarget.style.width = `${size}px`
                  e.currentTarget.style.height = `${size}px`
                  e.currentTarget.style.boxShadow = 'none'
                }
              }}
            />
          )
        })}
        
        {/* Time labels */}
        {timelineData.map((group, index) => {
          const position = (group.indices[0] / messages.length) * 100
          
          return (
            <div
              key={index}
              style={{
                position: 'absolute',
                right: '100%',
                top: `${position}%`,
                transform: 'translateY(-50%)',
                marginRight: '8px',
                fontSize: '10px',
                color: 'var(--muted-foreground)',
                whiteSpace: 'nowrap',
                cursor: 'pointer'
              }}
              onClick={() => handleClick(group.indices[0])}
            >
              {group.time}
            </div>
          )
        })}
      </div>
    </div>
  )
}