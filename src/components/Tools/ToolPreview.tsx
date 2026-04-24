import React from 'react'

interface ToolPreviewProps {
  toolName: string
  parameters?: any
  result?: any
  error?: string
  status: 'loading' | 'success' | 'error'
  position: { x: number; y: number; width: number; height: number }
  onMouseEnter?: () => void
  onMouseLeave?: () => void
}

export const ToolPreview: React.FC<ToolPreviewProps> = ({
  toolName,
  parameters,
  result,
  error,
  status,
  position,
  onMouseEnter,
  onMouseLeave
}) => {
  // Calculate positioning - intelligently position based on available space
  const getSmartPosition = () => {
    const viewportWidth = window.innerWidth
    const viewportHeight = window.innerHeight
    const previewWidth = 700 // Increased width
    const previewHeight = 800 // Increased height
    const mouseBuffer = 150 // Space to keep clear for mouse movement
    
    // Check if there's enough space on the right
    const spaceOnRight = viewportWidth - (position.x + position.width)
    const hasEnoughSpaceOnRight = spaceOnRight >= previewWidth + 40
    
    let left: number
    let finalWidth = previewWidth
    
    if (hasEnoughSpaceOnRight) {
      // Normal case: position to the right of the tool row
      left = position.x + position.width
    } else {
      // Not enough space on right, check if we can fit it by overlapping partially
      // but keeping the left part of the tool row (where mouse is) clear
      const overlapStart = position.x + mouseBuffer // Keep mouse area clear
      
      if (overlapStart + previewWidth <= viewportWidth - 20) {
        // Can fit with partial overlap, keeping mouse area clear
        left = overlapStart
      } else {
        // Still doesn't fit, position as far right as possible
        left = viewportWidth - previewWidth - 20
        
        // Make sure we're not covering the mouse area
        if (left < position.x + mouseBuffer) {
          // If we would cover the mouse area, shrink the preview width
          const availableWidth = viewportWidth - position.x - mouseBuffer - 40
          finalWidth = Math.max(400, availableWidth) // Minimum 400px width
          left = position.x + mouseBuffer
        }
      }
    }
    
    // Ensure minimum left position
    if (left < 20) {
      left = 20
    }
    
    // Vertical positioning - check if we should show above or below
    let top = position.y
    const spaceBelow = viewportHeight - position.y - position.height
    const spaceAbove = position.y
    
    // If not enough space below but enough space above, show above the tool row
    if (spaceBelow < previewHeight + 20 && spaceAbove >= previewHeight + 20) {
      top = position.y - previewHeight - 2 // 2px gap between preview bottom and tool row top
    } else {
      // Default: align top with tool row
      top = position.y
      
      // Check if preview would go off bottom edge
      if (top + previewHeight > viewportHeight - 20) {
        // Try to fit it in the viewport
        const availableHeight = viewportHeight - position.y - 20
        if (availableHeight >= 400) { // Minimum height
          // Reduce height to fit
          return { left, top, width: finalWidth, height: availableHeight }
        } else {
          // Not enough space below, position above if possible
          if (spaceAbove >= 400) {
            top = Math.max(20, position.y - previewHeight - 2) // 2px gap above tool row
          } else {
            // Center vertically in viewport as last resort
            top = Math.max(20, (viewportHeight - previewHeight) / 2)
          }
        }
      }
    }
    
    // Ensure top doesn't go off screen
    if (top < 20) {
      top = 20
    }
    
    return { left, top, width: finalWidth, height: previewHeight }
  }

  // Get tool description
  const getToolDescription = () => {
    switch (toolName) {
      case 'Read':
        return 'Reads content from a file'
      case 'Write':
        return 'Writes content to a file'
      case 'Edit':
        return 'Edits file content with find/replace'
      case 'MultiEdit':
        return 'Performs multiple edits on a file'
      case 'Bash':
        return 'Executes bash commands'
      case 'Grep':
        return 'Searches for patterns in files'
      case 'Glob':
        return 'Finds files matching patterns'
      case 'LS':
        return 'Lists directory contents'
      case 'WebSearch':
        return 'Searches the web'
      case 'WebFetch':
        return 'Fetches content from URLs'
      case 'TodoRead':
        return 'Reads todo list'
      case 'TodoWrite':
        return 'Updates todo list'
      default:
        return 'Tool operation'
    }
  }

  // Format parameters for display
  const formatParameters = () => {
    if (!parameters) return null

    const keyParams = []
    
    // Extract key parameters based on tool type
    switch (toolName) {
      case 'Read':
      case 'Write':
      case 'Edit':
      case 'MultiEdit':
        if (parameters.file_path) keyParams.push(`File: ${parameters.file_path}`)
        if (parameters.content && toolName === 'Write') {
          keyParams.push(`Content: ${parameters.content.length} characters`)
        }
        if (parameters.old_string && toolName === 'Edit') {
          keyParams.push(`Replace: "${parameters.old_string.substring(0, 100)}${parameters.old_string.length > 100 ? '...' : ''}"`)
        }
        if (parameters.new_string && toolName === 'Edit') {
          keyParams.push(`With: "${parameters.new_string.substring(0, 100)}${parameters.new_string.length > 100 ? '...' : ''}"`)
        }
        break
      case 'Bash':
        if (parameters.command) keyParams.push(`Command: ${parameters.command}`)
        if (parameters.description) keyParams.push(`Description: ${parameters.description}`)
        break
      case 'Grep':
        if (parameters.pattern) keyParams.push(`Pattern: ${parameters.pattern}`)
        if (parameters.include) keyParams.push(`Files: ${parameters.include}`)
        break
      case 'Glob':
        if (parameters.pattern) keyParams.push(`Pattern: ${parameters.pattern}`)
        if (parameters.path) keyParams.push(`Path: ${parameters.path}`)
        break
      case 'LS':
        if (parameters.path) keyParams.push(`Path: ${parameters.path}`)
        break
      case 'WebSearch':
        if (parameters.query) keyParams.push(`Query: ${parameters.query}`)
        break
      case 'WebFetch':
        if (parameters.url) keyParams.push(`URL: ${parameters.url}`)
        break
    }

    return keyParams
  }

  // Format result summary
  const getResultSummary = () => {
    if (error) {
      return `Error: ${error.substring(0, 1000)}${error.length > 1000 ? '...' : ''}`
    }

    if (!result) return 'No result'

    if (typeof result === 'string') {
      return result.length > 2000 ? `${result.substring(0, 2000)}...` : result
    }

    if (result.output) {
      const output = result.output
      return output.length > 2000 ? `${output.substring(0, 2000)}...` : output
    }

    return 'Operation completed'
  }

  const smartPos = getSmartPosition()
  const keyParams = formatParameters()

  // Status colors
  const getStatusColor = () => {
    switch (status) {
      case 'loading': return '#f59e0b'
      case 'success': return '#22c55e'
      case 'error': return '#ef4444'
      default: return 'var(--muted-foreground)'
    }
  }

  const getStatusText = () => {
    switch (status) {
      case 'loading': return 'Running...'
      case 'success': return 'Completed'
      case 'error': return 'Failed'
      default: return 'Unknown'
    }
  }

  return (
    <div
      style={{
        position: 'fixed',
        left: smartPos.left,
        top: smartPos.top,
        zIndex: 2000,
        backgroundColor: 'hsl(var(--bg-100))',
        border: 'none',
        borderRadius: '8px',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.25), 0 10px 10px -5px rgba(0, 0, 0, 0.15)',
        width: `${smartPos.width}px`,
        maxWidth: `${smartPos.width}px`,
        maxHeight: `${smartPos.height}px`,
        overflow: 'hidden',
        fontSize: '12px'
      }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {/* Header */}
      <div style={{
        padding: '12px',
        borderBottom: '1px solid hsl(var(--bg-300))',
        background: 'var(--secondary)'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '4px'
        }}>
          <div style={{
            fontSize: '14px',
            fontWeight: 600,
            color: 'var(--foreground)',
            textTransform: 'capitalize'
          }}>
            {toolName}
          </div>
          <div style={{
            fontSize: '11px',
            color: getStatusColor(),
            fontWeight: 500,
            display: 'flex',
            alignItems: 'center',
            gap: '4px'
          }}>
            <div style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              background: getStatusColor()
            }} />
            {getStatusText()}
          </div>
        </div>
        <div style={{
          fontSize: '12px',
          color: 'var(--muted-foreground)',
          lineHeight: '1.4'
        }}>
          {getToolDescription()}
        </div>
      </div>

      {/* Content */}
      <div style={{
        padding: '16px',
        maxHeight: '650px',
        overflowY: 'auto'
      }}>
        {/* Key Parameters */}
        {keyParams && keyParams.length > 0 && (
          <div style={{ marginBottom: '12px' }}>
            <div style={{
              fontSize: '11px',
              fontWeight: 600,
              color: 'var(--foreground)',
              marginBottom: '6px',
              textTransform: 'uppercase',
              letterSpacing: '0.05em'
            }}>
              Parameters
            </div>
            {keyParams.map((param, index) => (
              <div key={index} style={{
                fontSize: '11px',
                color: 'var(--muted-foreground)',
                marginBottom: '2px',
                fontFamily: 'SF Mono, Monaco, Cascadia Code, monospace'
              }}>
                {param}
              </div>
            ))}
          </div>
        )}

        {/* Result Summary */}
        <div>
          <div style={{
            fontSize: '11px',
            fontWeight: 600,
            color: status === 'error' ? '#ef4444' : 'var(--foreground)',
            marginBottom: '6px',
            textTransform: 'uppercase',
            letterSpacing: '0.05em'
          }}>
            {status === 'error' ? 'Error' : 'Result'}
          </div>
          <div style={{
            fontSize: '11px',
            color: status === 'error' ? '#ef4444' : 'var(--muted-foreground)',
            lineHeight: '1.4',
            fontFamily: 'SF Mono, Monaco, Cascadia Code, monospace',
            background: status === 'error' ? 'rgba(239, 68, 68, 0.1)' : 'hsl(var(--bg-200))',
            padding: '12px',
            borderRadius: '6px',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
            minHeight: '100px',
            maxHeight: '550px',
            overflowY: 'auto'
          }}>
            {getResultSummary()}
          </div>
        </div>
      </div>
    </div>
  )
}