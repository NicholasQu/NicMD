import { useMemo, useRef, useState, useEffect } from 'react'
import { Check, Clipboard, Copy, X } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import './WechatPreview.css'

function MermaidSvg({ chart }: { chart: string }) {
  const [svg, setSvg] = useState('')

  useEffect(() => {
    let cancelled = false
    const render = async () => {
      try {
        const mermaid = await import('mermaid')
        const m = mermaid.default
        m.initialize({
          startOnLoad: false,
          theme: 'default',
          securityLevel: 'loose',
          fontFamily: 'Inter, system-ui, sans-serif',
          themeVariables: {
            primaryColor: '#fff7ed',
            primaryTextColor: '#111827',
            primaryBorderColor: '#ea580c',
            lineColor: '#d1d5db',
            secondaryColor: '#f3f4f6',
            tertiaryColor: '#fafafa',
            fontSize: '12px'
          }
        })
        const id = `wc-mermaid-${Math.random().toString(36).substring(2, 9)}`
        const { svg: rendered } = await m.render(id, chart)
        if (!cancelled) setSvg(rendered)
      } catch {}
    }
    render()
    return () => { cancelled = true }
  }, [chart])

  if (!svg) {
    return (
      <div style={{ margin: '18px 0', padding: '14px 16px', borderRadius: '10px', background: '#faf5f0', border: '1px solid #f1e6df', textAlign: 'center', fontSize: 13, color: '#9a3412' }}>
        Loading diagram...
      </div>
    )
  }

  return (
    <div style={{ margin: '18px 0', borderRadius: '10px', border: '1px solid #f1e6df', overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', padding: '6px 14px', background: '#fff7ed', borderBottom: '1px solid #f1e6df' }}>
        <span style={{ fontSize: '11px', fontWeight: 600, color: '#ea580c', textTransform: 'uppercase', letterSpacing: '0.05em' }}>mermaid</span>
      </div>
      <div style={{ padding: '16px', background: '#faf5f0', display: 'flex', justifyContent: 'center' }} dangerouslySetInnerHTML={{ __html: svg }} />
    </div>
  )
}

interface WechatPreviewProps {
  content: string
  fileName?: string
  onClose: () => void
}

const FONT_FAMILY = "-apple-system, BlinkMacSystemFont, 'PingFang SC', 'Noto Sans SC', 'Source Han Sans SC', 'Microsoft YaHei', sans-serif"

export function WechatPreview({ content, fileName, onClose }: WechatPreviewProps) {
  const articleRef = useRef<HTMLDivElement>(null)
  const [copied, setCopied] = useState(false)
  const [copiedMeta, setCopiedMeta] = useState<'title' | 'summary' | null>(null)
  const meta = useMemo(() => extractWechatMeta(content, fileName), [content, fileName])

  const copyMetaText = async (type: 'title' | 'summary', text: string) => {
    if (!text) return
    await navigator.clipboard.writeText(text)
    setCopiedMeta(type)
    setTimeout(() => setCopiedMeta(null), 1800)
  }

  const handleCopy = async () => {
    const article = articleRef.current
    if (!article) return

    const html = article.innerHTML
    const plain = article.innerText

    try {
      if (navigator.clipboard && 'ClipboardItem' in window) {
        const item = new ClipboardItem({
          'text/html': new Blob([html], { type: 'text/html' }),
          'text/plain': new Blob([plain], { type: 'text/plain' })
        })
        await navigator.clipboard.write([item])
      } else {
        copySelection(article)
      }
      setCopied(true)
      setTimeout(() => setCopied(false), 2400)
    } catch {
      copySelection(article)
      setCopied(true)
      setTimeout(() => setCopied(false), 2400)
    }
  }

  return (
    <div className="wechat-preview-overlay">
      <div className="wechat-preview-shell">
        <div className="wechat-preview-toolbar">
          <div className="min-w-0 flex-1">
            <button className="wechat-preview-title" onClick={() => copyMetaText('title', meta.title)} title="复制标题">
              <span className="truncate">{meta.title}</span>
              {copiedMeta === 'title' ? <Check size={13} /> : <Copy size={13} />}
            </button>
            <button className="wechat-preview-summary" onClick={() => copyMetaText('summary', meta.summary)} title="复制摘要">
              <span className="truncate">{meta.summary || '未检测到摘要，可在 Markdown 中添加 <!-- summary: 摘要内容 -->'}</span>
              {copiedMeta === 'summary' ? <Check size={13} /> : <Copy size={13} />}
            </button>
          </div>
          <div className="flex items-center gap-2">
            <button className="wechat-copy-btn" onClick={handleCopy}>
              {copied ? <Check size={15} /> : <Clipboard size={15} />}
              {copied ? '已复制，去公众号粘贴' : '一键复制'}
            </button>
            <button className="wechat-close-btn" onClick={onClose} title="关闭">
              <X size={17} />
            </button>
          </div>
        </div>

        <div className="wechat-preview-scroll custom-scrollbar">
          <div className="wechat-phone-frame">
            <div ref={articleRef} className="wechat-body" style={{ fontFamily: FONT_FAMILY }}>
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  h1: ({ children }) => <h1 style={wechatStyles.h1}>{children}</h1>,
                  h2: ({ children }) => <h2 style={wechatStyles.h2}><span style={wechatStyles.h2Mark} />{children}</h2>,
                  h3: ({ children }) => <h3 style={wechatStyles.h3}>{children}</h3>,
                  h4: ({ children }) => <h4 style={wechatStyles.h4}>{children}</h4>,
                  p: ({ children }) => <p style={wechatStyles.p}>{children}</p>,
                  strong: ({ children }) => <strong style={wechatStyles.strong}>{children}</strong>,
                  em: ({ children }) => <em style={wechatStyles.em}>{children}</em>,
                  blockquote: ({ children }) => <blockquote style={wechatStyles.blockquote}>{children}</blockquote>,
                  ul: ({ children }) => <ul style={wechatStyles.ul}>{children}</ul>,
                  ol: ({ children }) => <ol style={wechatStyles.ol}>{children}</ol>,
                  li: ({ children }) => <li style={wechatStyles.li}>{children}</li>,
                  a: ({ href, children }) => <a href={href} style={wechatStyles.a}>{children}</a>,
                  code({ className, children, node }) {
                    const match = /language-(\w+)/.exec(className || '')
                    const isBlock = !!match || (node?.position?.start.line !== node?.position?.end.line)
                    if (!isBlock) return <code style={wechatStyles.inlineCode}>{children}</code>
                    const lang = match ? match[1] : ''
                    const codeString = String(children).replace(/\n$/, '')
                    const isMermaid = lang === 'mermaid'
                    if (isMermaid) {
                      return <MermaidSvg chart={codeString} />
                    }
                    return (
                      <div style={{ margin: '18px 0', borderRadius: '10px', border: '1px solid #f1e6df', overflow: 'hidden' }}>
                        {lang && (
                          <div style={{ display: 'flex', alignItems: 'center', padding: '6px 14px', background: '#fff7ed', borderBottom: '1px solid #f1e6df' }}>
                            <span style={{ fontSize: '11px', fontWeight: 600, color: '#ea580c', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{lang}</span>
                          </div>
                        )}
                        <pre style={{ ...wechatStyles.pre, margin: 0, border: 'none', borderRadius: 0 }}><code style={wechatStyles.code}>{children}</code></pre>
                      </div>
                    )
                  },
                  table: ({ children }) => <table style={wechatStyles.table}>{children}</table>,
                  th: ({ children }) => <th style={wechatStyles.th}>{children}</th>,
                  td: ({ children }) => <td style={wechatStyles.td}>{children}</td>,
                  img: ({ src, alt }) => <img src={src || ''} alt={alt || ''} style={wechatStyles.img} />
                }}
              >
                {stripFirstH1(content)}
              </ReactMarkdown>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function extractWechatMeta(content: string, fileName?: string) {
  const title = content.match(/^#\s+(.+)$/m)?.[1]?.trim() || fileName?.replace(/\.[^.]+$/, '') || '未命名文章'
  const summary = content.match(/<!--\s*summary:\s*(.+?)\s*-->/s)?.[1]?.trim() || createSummary(content)
  return { title, summary }
}

function createSummary(content: string) {
  const text = content
    .replace(/<!--.*?-->/gs, '')
    .replace(/```[\s\S]*?```/g, '')
    .replace(/^#+\s+/gm, '')
    .replace(/[*_`\[\]()>|~#-]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
  if (!text) return ''
  return text.length > 32 ? `${text.slice(0, 32)}...` : text
}

function stripFirstH1(content: string) {
  return content.replace(/^#\s+.+\n?/, '')
}

function copySelection(element: HTMLElement) {
  const range = document.createRange()
  range.selectNodeContents(element)
  const selection = window.getSelection()
  selection?.removeAllRanges()
  selection?.addRange(range)
  document.execCommand('copy')
  selection?.removeAllRanges()
}

const wechatStyles = {
  h1: {
    margin: '0 0 22px',
    padding: '0 0 14px',
    borderBottom: '1px solid #f1e6df',
    color: '#1f2937',
    fontSize: '24px',
    fontWeight: 800,
    lineHeight: 1.35,
    letterSpacing: '-0.02em'
  },
  h2: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    margin: '34px 0 16px',
    color: '#9a3412',
    fontSize: '20px',
    fontWeight: 800,
    lineHeight: 1.45
  },
  h2Mark: {
    display: 'inline-block',
    width: '5px',
    height: '20px',
    borderRadius: '99px',
    background: 'linear-gradient(180deg, #fbbf24, #ea580c)',
    flexShrink: 0
  },
  h3: {
    margin: '26px 0 12px',
    color: '#1f2937',
    fontSize: '17px',
    fontWeight: 750,
    lineHeight: 1.45
  },
  h4: {
    margin: '22px 0 10px',
    color: '#374151',
    fontSize: '15px',
    fontWeight: 700,
    lineHeight: 1.45
  },
  p: {
    margin: '13px 0',
    color: '#374151',
    fontSize: '15px',
    lineHeight: 1.95,
    letterSpacing: '0.02em'
  },
  strong: {
    color: '#111827',
    fontWeight: 800
  },
  em: {
    color: '#9a3412',
    fontStyle: 'normal'
  },
  blockquote: {
    margin: '20px 0',
    padding: '12px 16px',
    borderLeft: '4px solid #fb923c',
    borderRadius: '0 10px 10px 0',
    background: '#fff7ed',
    color: '#6b7280'
  },
  ul: {
    margin: '14px 0',
    paddingLeft: '22px',
    color: '#374151',
    fontSize: '15px',
    lineHeight: 1.9
  },
  ol: {
    margin: '14px 0',
    paddingLeft: '22px',
    color: '#374151',
    fontSize: '15px',
    lineHeight: 1.9
  },
  li: {
    margin: '6px 0',
    color: '#374151'
  },
  a: {
    color: '#ea580c',
    textDecoration: 'none',
    borderBottom: '1px solid rgba(234, 88, 12, 0.35)'
  },
  inlineCode: {
    margin: '0 2px',
    padding: '2px 5px',
    borderRadius: '5px',
    background: '#fff7ed',
    color: '#c2410c',
    fontSize: '13px',
    fontFamily: "'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace"
  },
  pre: {
    padding: '14px 16px',
    background: '#faf5f0',
    overflowX: 'auto'
  },
  code: {
    color: '#9a3412',
    fontSize: '13px',
    lineHeight: 1.75,
    fontFamily: "'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace"
  },
  table: {
    width: '100%',
    margin: '20px 0',
    borderCollapse: 'collapse' as const,
    fontSize: '14px',
    color: '#374151'
  },
  th: {
    padding: '10px 12px',
    border: '1px solid #fed7aa',
    background: '#fff7ed',
    color: '#9a3412',
    fontWeight: 800,
    textAlign: 'left' as const
  },
  td: {
    padding: '10px 12px',
    border: '1px solid #f1e6df',
    background: '#ffffff',
    color: '#374151'
  },
  img: {
    display: 'block',
    maxWidth: '100%',
    margin: '18px auto',
    borderRadius: '12px'
  }
}
