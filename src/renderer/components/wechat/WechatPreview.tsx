import { useMemo, useRef, useState, useEffect } from 'react'
import { Check, Clipboard, Copy, X } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import rehypeRaw from 'rehype-raw'
import remarkGfm from 'remark-gfm'
import './WechatPreview.css'
import { WECHAT_FONT_FAMILY, NICMD_BRAND_FONT_FAMILY, NICMD_BRAND, extractWechatMeta, prepareWechatMarkdown } from '../../../shared/wechat-render'
import { WECHAT_THEME } from '../../../shared/wechat-theme'

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
            primaryColor: WECHAT_THEME.surfaceSoft,
            primaryTextColor: WECHAT_THEME.text,
            primaryBorderColor: WECHAT_THEME.accent,
            lineColor: WECHAT_THEME.borderSoft,
            secondaryColor: WECHAT_THEME.surfaceSoft,
            tertiaryColor: WECHAT_THEME.surface,
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
      <div style={{ margin: '18px 0', padding: '14px 16px', borderRadius: '14px', background: WECHAT_THEME.codeBg, border: `1px solid ${WECHAT_THEME.codeBorder}`, textAlign: 'center', fontSize: 13, color: WECHAT_THEME.codeText }}>
        Loading diagram...
      </div>
    )
  }

  return (
    <div style={{ margin: '18px 0', borderRadius: '14px', border: `1px solid ${WECHAT_THEME.codeBorder}`, overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', padding: '6px 14px', background: WECHAT_THEME.codeHeaderBg, borderBottom: `1px solid ${WECHAT_THEME.codeBorder}` }}>
        <span style={{ fontSize: '11px', fontWeight: 750, color: WECHAT_THEME.accent, textTransform: 'uppercase', letterSpacing: '0.05em' }}>mermaid</span>
      </div>
      <div style={{ padding: '16px', background: WECHAT_THEME.codeBg, display: 'flex', justifyContent: 'center' }} dangerouslySetInnerHTML={{ __html: svg }} />
    </div>
  )
}

interface WechatPreviewProps {
  content: string
  fileName?: string
  onClose: () => void
}

export function WechatPreview({ content, fileName, onClose }: WechatPreviewProps) {
  const articleRef = useRef<HTMLDivElement>(null)
  const [copied, setCopied] = useState(false)
  const [copiedMeta, setCopiedMeta] = useState<'title' | 'summary' | null>(null)
  const meta = useMemo(() => extractWechatMeta(content, fileName), [content, fileName])
  const previewContent = useMemo(() => prepareWechatMarkdown(content).replace(/::: *nicmd-html\s+([\s\S]*?):::/g, (_, body) => renderNicmdHtmlPlaceholder(body)), [content])

  const copyMetaText = async (type: 'title' | 'summary', text: string) => {
    if (!text) return
    await navigator.clipboard.writeText(text)
    setCopiedMeta(type)
    setTimeout(() => setCopiedMeta(null), 1800)
  }

  const handleCopy = async () => {
    const article = articleRef.current
    if (!article) return

    try {
      copySelection(article)
      setCopied(true)
      setTimeout(() => setCopied(false), 2400)
    } catch {
      const html = article.innerHTML
      const plain = article.innerText
      if (navigator.clipboard && 'ClipboardItem' in window) {
        const item = new ClipboardItem({
          'text/html': new Blob([html], { type: 'text/html' }),
          'text/plain': new Blob([plain], { type: 'text/plain' })
        })
        await navigator.clipboard.write([item])
        setCopied(true)
        setTimeout(() => setCopied(false), 2400)
      }
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
          <div style={{ maxWidth: 720, margin: '0 auto 14px', padding: '18px 22px 17px', borderRadius: 22, background: `linear-gradient(135deg, rgba(255,255,255,.84), ${WECHAT_THEME.surface})`, border: `1px solid ${WECHAT_THEME.border}`, boxShadow: WECHAT_THEME.softShadow }}>
            <div style={{ color: WECHAT_THEME.accentText, fontSize: 10, fontWeight: 850, letterSpacing: '.16em', textTransform: 'uppercase', marginBottom: 8 }}>NicMD Weixin Article</div>
            <h1 style={{ margin: 0, color: WECHAT_THEME.heading, fontSize: 24, lineHeight: 1.34, fontWeight: 860, letterSpacing: '-.025em', wordBreak: 'normal', overflowWrap: 'break-word' }}>{meta.title}</h1>
            {meta.subtitle ? <p style={{ margin: '8px 0 0', color: WECHAT_THEME.muted, fontSize: 15, lineHeight: 1.65, fontWeight: 520, wordBreak: 'normal', overflowWrap: 'break-word' }}>{meta.subtitle}</p> : null}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, maxWidth: 720, margin: '16px auto 14px', color: WECHAT_THEME.muted2, fontSize: 11, fontWeight: 850, letterSpacing: '.18em', textTransform: 'uppercase' }}>
            <span style={{ height: 1, flex: 1, background: WECHAT_THEME.accentLine, opacity: .72 }} />
            <span>Body</span>
            <span style={{ height: 1, flex: 1, background: WECHAT_THEME.accentLine, opacity: .72 }} />
          </div>
          <div className="wechat-phone-frame">
            <div ref={articleRef} className="wechat-body" style={{ fontFamily: WECHAT_FONT_FAMILY }}>
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                rehypePlugins={[rehypeRaw]}
                components={{
                  h1: ({ children }) => <h1 style={wechatStyles.h1}>{children}</h1>,
                  h2: ({ children }) => <h2 style={wechatStyles.h2}><span style={wechatStyles.h2Label}>{children}</span></h2>,
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
                      <div style={{ margin: '18px 0', borderRadius: '14px', border: `1px solid ${WECHAT_THEME.codeBorder}`, overflow: 'hidden' }}>
                        {lang && (
                          <div style={{ display: 'flex', alignItems: 'center', padding: '6px 14px', background: WECHAT_THEME.codeHeaderBg, borderBottom: `1px solid ${WECHAT_THEME.codeBorder}` }}>
                            <span style={{ fontSize: '11px', fontWeight: 750, color: WECHAT_THEME.accent, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{lang}</span>
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
                {previewContent}
              </ReactMarkdown>
              <footer style={{ marginTop: '42px', padding: '22px 0 2px', borderTop: `1px solid ${WECHAT_THEME.borderSoft}`, textAlign: 'center', color: WECHAT_THEME.muted2 }}>
                <a href={NICMD_BRAND.url} style={{ display: 'inline-block', color: WECHAT_THEME.muted, textDecoration: 'none' }}>
                  <span style={{ display: 'inline-block', padding: '10px 18px 9px', border: `1px solid ${WECHAT_THEME.accentBorder}`, borderRadius: '999px', background: `linear-gradient(135deg, rgba(255,255,255,.72), ${WECHAT_THEME.accentSofter})`, boxShadow: WECHAT_THEME.softShadow }}>
                    <span style={{ display: 'block', fontFamily: NICMD_BRAND_FONT_FAMILY, fontSize: '19px', lineHeight: 1, fontWeight: 600, letterSpacing: '.20em', textTransform: 'uppercase', color: WECHAT_THEME.accentText, textShadow: '0 1px 0 rgba(255,255,255,.75)' }}>𝕸 NicMD</span>
                    <span style={{ display: 'block', marginTop: '7px', fontSize: '10px', lineHeight: 1.5, letterSpacing: '.20em', color: WECHAT_THEME.muted2, textTransform: 'uppercase' }}>Edited & Published</span>
                  </span>
                </a>
                <div style={{ marginTop: '10px', fontSize: '12px', lineHeight: 1.7, color: WECHAT_THEME.muted, letterSpacing: '.02em' }}>本文由 NicMD 编辑发布</div>
                <div style={{ marginTop: '3px', fontFamily: NICMD_BRAND_FONT_FAMILY, fontSize: '11px', lineHeight: 1.6, color: WECHAT_THEME.muted2, letterSpacing: '.03em', wordBreak: 'break-all' }}>{NICMD_BRAND.url}</div>
              </footer>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function renderNicmdHtmlPlaceholder(body: string): string {
  const attrs: Record<string, string> = {}
  for (const line of body.split(/\r?\n/)) {
    const match = line.match(/^\s*([\w-]+)\s*:\s*(.*?)\s*$/)
    if (match) attrs[match[1]] = match[2]
  }
  const title = attrs.title || 'HTML 配图'
  return `\n\n> ${title}\n>\n> 该图会在 nicmd weixin 命令预览中自动截图为 PNG。\n\n`
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
    borderBottom: `1px solid ${WECHAT_THEME.border}`,
    color: WECHAT_THEME.heading,
    fontSize: '24px',
    fontWeight: 850,
    lineHeight: 1.34,
    letterSpacing: '-0.025em'
  },
  h2: {
    margin: '32px 0 14px',
    padding: 0,
    color: WECHAT_THEME.heading,
    fontSize: '19px',
    fontWeight: 860,
    lineHeight: 1.45,
    wordBreak: 'normal' as const,
    overflowWrap: 'break-word' as const
  },
  h2Label: {
    display: 'inline-block',
    maxWidth: '100%',
    padding: '10px 14px 10px 16px',
    borderLeft: `4px solid ${WECHAT_THEME.accent}`,
    borderRadius: '14px',
    background: WECHAT_THEME.codeHeaderBg,
    color: WECHAT_THEME.heading,
    boxSizing: 'border-box' as const
  },
  h3: {
    margin: '26px 0 11px',
    padding: '4px 0 4px 12px',
    borderLeft: `3px solid ${WECHAT_THEME.accent}`,
    color: WECHAT_THEME.heading,
    fontSize: '16px',
    fontWeight: 800,
    lineHeight: 1.5,
    wordBreak: 'normal' as const,
    overflowWrap: 'break-word' as const
  },
  h4: {
    margin: '22px 0 10px',
    padding: '0 0 6px',
    borderBottom: `1px solid ${WECHAT_THEME.borderSoft}`,
    color: WECHAT_THEME.textSoft,
    fontSize: '15px',
    fontWeight: 760,
    lineHeight: 1.5,
    wordBreak: 'normal' as const,
    overflowWrap: 'break-word' as const
  },
  p: {
    margin: '14px 0',
    color: WECHAT_THEME.textSoft,
    fontSize: '15px',
    lineHeight: 1.95,
    letterSpacing: '0.01em'
  },
  strong: {
    display: 'inline',
    color: WECHAT_THEME.text,
    fontWeight: 850,
    whiteSpace: 'normal' as const
  },
  em: {
    color: WECHAT_THEME.muted,
    fontStyle: 'normal'
  },
  blockquote: {
    margin: '22px 0',
    padding: '14px 17px',
    borderLeft: `4px solid ${WECHAT_THEME.accent}`,
    borderRadius: '0 16px 16px 0',
    background: WECHAT_THEME.surfaceSoft,
    color: WECHAT_THEME.muted
  },
  ul: {
    margin: '15px 0',
    paddingLeft: '22px',
    color: WECHAT_THEME.textSoft,
    fontSize: '15px',
    lineHeight: 1.9,
    listStylePosition: 'outside' as const
  },
  ol: {
    margin: '15px 0',
    paddingLeft: '22px',
    color: WECHAT_THEME.textSoft,
    fontSize: '15px',
    lineHeight: 1.9,
    listStylePosition: 'outside' as const
  },
  li: {
    margin: '7px 0',
    color: WECHAT_THEME.textSoft,
    wordBreak: 'normal' as const,
    overflowWrap: 'break-word' as const
  },
  a: {
    color: WECHAT_THEME.accent,
    textDecoration: 'none',
    borderBottom: `1px solid ${WECHAT_THEME.accentBorder}`
  },
  inlineCode: {
    margin: '0 2px',
    padding: '2px 5px',
    borderRadius: '5px',
    background: WECHAT_THEME.codeBg,
    color: WECHAT_THEME.codeText,
    fontSize: '13px',
    fontFamily: "'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace"
  },
  pre: {
    padding: '14px 16px',
    background: WECHAT_THEME.codeBg,
    overflowX: 'auto'
  },
  code: {
    color: WECHAT_THEME.codeText,
    fontSize: '13px',
    lineHeight: 1.75,
    fontFamily: "'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace"
  },
  table: {
    width: '100%',
    margin: '20px 0',
    borderCollapse: 'collapse' as const,
    fontSize: '14px',
    color: WECHAT_THEME.textSoft
  },
  th: {
    padding: '11px 12px',
    border: `1px solid ${WECHAT_THEME.borderSoft}`,
    background: WECHAT_THEME.surfaceSoft,
    color: WECHAT_THEME.text,
    fontWeight: 850,
    textAlign: 'left' as const
  },
  td: {
    padding: '11px 12px',
    border: `1px solid ${WECHAT_THEME.borderSoft}`,
    background: WECHAT_THEME.surface,
    color: WECHAT_THEME.textSoft
  },
  img: {
    display: 'block',
    maxWidth: '100%',
    margin: '18px auto',
    borderRadius: '12px'
  }
}
