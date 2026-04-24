import React from 'react'
import { BaseToolComponent } from './BaseToolComponent'

interface TodoItem {
  id: string
  content: string
  status: 'pending' | 'in_progress' | 'completed'
  priority: 'high' | 'medium' | 'low'
}

interface TodoToolComponentProps {
  parameters?: any
  result?: string
  error?: string
  compact?: boolean
}

export const TodoToolComponent: React.FC<TodoToolComponentProps> = ({
  parameters,
  result,
  error,
  compact = false
}) => {
  const renderCompactView = () => {
    if (error) {
      return <span style={{ color: 'var(--destructive)' }}>Todo error</span>
    }
    
    let action = 'Todo'
    if (parameters?.todos) {
      const todoCount = parameters.todos.length
      const completedCount = parameters.todos.filter((t: TodoItem) => t.status === 'completed').length
      action = `Todo: ${completedCount}/${todoCount} completed`
    } else if (result) {
      action = 'Todo: Read list'
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
    
    // If we have todos in parameters, show the todo list
    if (parameters?.todos) {
      const todos = parameters.todos as TodoItem[]
      const groupedTodos = {
        pending: todos.filter(t => t.status === 'pending'),
        in_progress: todos.filter(t => t.status === 'in_progress'),
        completed: todos.filter(t => t.status === 'completed')
      }
      
      return (
        <div style={{ padding: '12px' }}>
          {groupedTodos.in_progress.length > 0 && (
            <div style={{ marginBottom: '12px' }}>
              <div style={{ 
                fontSize: '12px', 
                fontWeight: 600, 
                marginBottom: '4px',
                color: 'var(--warning)'
              }}>
                In Progress
              </div>
              {groupedTodos.in_progress.map((todo: TodoItem) => (
                <div key={todo.id} style={{ 
                  padding: '4px 8px',
                  fontSize: '12px',
                  color: 'var(--foreground)'
                }}>
                  • {todo.content}
                </div>
              ))}
            </div>
          )}
          
          {groupedTodos.pending.length > 0 && (
            <div style={{ marginBottom: '12px' }}>
              <div style={{ 
                fontSize: '12px', 
                fontWeight: 600, 
                marginBottom: '4px',
                color: 'var(--muted-foreground)'
              }}>
                Pending
              </div>
              {groupedTodos.pending.map((todo: TodoItem) => (
                <div key={todo.id} style={{ 
                  padding: '4px 8px',
                  fontSize: '12px',
                  color: 'var(--muted-foreground)'
                }}>
                  • {todo.content}
                </div>
              ))}
            </div>
          )}
          
          {groupedTodos.completed.length > 0 && (
            <div>
              <div style={{ 
                fontSize: '12px', 
                fontWeight: 600, 
                marginBottom: '4px',
                color: 'var(--success)'
              }}>
                Completed
              </div>
              {groupedTodos.completed.map((todo: TodoItem) => (
                <div key={todo.id} style={{ 
                  padding: '4px 8px',
                  fontSize: '12px',
                  color: 'var(--muted-foreground)',
                  textDecoration: 'line-through'
                }}>
                  • {todo.content}
                </div>
              ))}
            </div>
          )}
        </div>
      )
    }
    
    // If we have a result, show it
    if (result) {
      return (
        <div style={{ 
          padding: '12px',
          fontSize: '12px',
          color: 'var(--muted-foreground)'
        }}>
          {result}
        </div>
      )
    }
    
    return null
  }
  
  return (
    <BaseToolComponent
      toolName="Todo"
      compact={compact}
      renderCompactView={renderCompactView}
      renderDetailedView={renderDetailedView}
    />
  )
}