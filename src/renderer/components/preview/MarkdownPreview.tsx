import { useState, useCallback } from 'react'
import { Copy, Check } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import './MarkdownPreview.css'

interface MarkdownPreviewProps {
  content: string
}

export function MarkdownPreview({ content }: MarkdownPreviewProps) {
  const [copiedBlock, setCopiedBlock] = useState<string | null>(null)

  const handleCopy = useCallback((code: string, id: string) => {
    navigator.clipboard.writeText(code)
    setCopiedBlock(id)
    setTimeout(() => setCopiedBlock(null), 2000)
  }, [])

  return (
    <div className="markdown-preview">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          code({ className, children, ...props }) {
            const match = /language-(\w+)/.exec(className || '')
            const isInline = !match

            if (isInline) {
              return <code {...props}>{children}</code>
            }

            const lang = match ? match[1] : ''
            const codeString = String(children).replace(/\n$/, '')
            const blockId = `code-${codeString.length}-${codeString.slice(0, 10).replace(/\s/g, '')}`

            return (
              <div className="preview-code-block-wrapper">
                <div className="preview-code-header">
                  <span className="preview-code-lang">{lang}</span>
                  <button className="preview-code-copy" onClick={() => handleCopy(codeString, blockId)}>
                    {copiedBlock === blockId ? <Check size={13} /> : <Copy size={13} />}
                    {copiedBlock === blockId ? 'Copied!' : 'Copy'}
                  </button>
                </div>
                <pre><code className={className} {...props}>{children}</code></pre>
              </div>
            )
          },
          h1: ({ children, ...props }) => {
            const id = extractText(children)
            return <h1 id={id} {...props}>{children}</h1>
          },
          h2: ({ children, ...props }) => {
            const id = extractText(children)
            return <h2 id={id} {...props}>{children}</h2>
          },
          h3: ({ children, ...props }) => {
            const id = extractText(children)
            return <h3 id={id} {...props}>{children}</h3>
          },
          h4: ({ children, ...props }) => {
            const id = extractText(children)
            return <h4 id={id} {...props}>{children}</h4>
          },
          h5: ({ children, ...props }) => {
            const id = extractText(children)
            return <h5 id={id} {...props}>{children}</h5>
          },
          h6: ({ children, ...props }) => {
            const id = extractText(children)
            return <h6 id={id} {...props}>{children}</h6>
          },
          table({ children, ...props }) {
            return (
              <div style={{ overflowX: 'auto' }}>
                <table {...props}>{children}</table>
              </div>
            )
          },
          a({ href, children, ...props }) {
            return (
              <a href={href} target="_blank" rel="noopener noreferrer" {...props}>{children}</a>
            )
          }
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}

function extractText(children: any): string {
  if (typeof children === 'string') return children
  if (Array.isArray(children)) return children.map(extractText).join('')
  if (children?.props?.children) return extractText(children.props.children)
  return ''
}

export interface HeadingItem {
  level: number
  text: string
  id: string
  line: number
}

export function parseHeadings(content: string): HeadingItem[] {
  const lines = content.split('\n')
  const result: HeadingItem[] = []
  let inCodeBlock = false
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (line.trimStart().startsWith('```')) {
      inCodeBlock = !inCodeBlock
      continue
    }
    if (inCodeBlock) continue
    const m = line.match(/^(#{1,6})\s+(.+)$/)
    if (m) {
      const text = m[2].replace(/[*_`\[\]()#]/g, '').trim()
      result.push({
        level: m[1].length,
        text,
        id: text.toLowerCase().replace(/[^\w\u4e00-\u9fa5]+/g, '-').replace(/^-+|-+$/g, ''),
        line: i + 1
      })
    }
  }
  return result
}
