import React, { useState } from 'react'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { vscDarkPlus, prism } from 'react-syntax-highlighter/dist/esm/styles/prism'
import { Copy, Check } from 'lucide-react'
import { useTheme } from 'next-themes'

interface CodeBlockProps {
  language: string
  value: string
}

export const CodeBlock: React.FC<CodeBlockProps> = ({ language, value }) => {
  const [copied, setCopied] = useState(false)
  const { theme } = useTheme()
  
  const handleCopy = async () => {
    await navigator.clipboard.writeText(value)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  
  return (
    <div className="code-block" style={{ margin: '16px 0' }}>
      <div className="code-block-header">
        <span>{language}</span>
        <button
          onClick={handleCopy}
          className="btn-icon"
          style={{
            padding: '4px',
            color: copied ? '#10b981' : 'var(--muted-foreground)'
          }}
        >
          {copied ? <Check size={14} /> : <Copy size={14} />}
        </button>
      </div>
      <div style={{ position: 'relative' }}>
        <SyntaxHighlighter
          language={language}
          style={theme === 'dark' ? vscDarkPlus : prism}
          customStyle={{
            margin: 0,
            padding: '16px',
            backgroundColor: 'transparent',
            fontSize: '13px',
            lineHeight: '1.5',
            overflow: 'auto'
          }}
          showLineNumbers={value.split('\n').length > 5}
          lineNumberStyle={{
            minWidth: '3em',
            paddingRight: '1em',
            color: 'var(--muted-foreground)',
            userSelect: 'none'
          }}
        >
          {value}
        </SyntaxHighlighter>
      </div>
    </div>
  )
}