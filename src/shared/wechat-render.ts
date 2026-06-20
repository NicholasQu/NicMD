import { WECHAT_THEME } from './wechat-theme'

export const WECHAT_FONT_FAMILY = "-apple-system,BlinkMacSystemFont,'PingFang SC','Noto Sans SC','Source Han Sans SC','Microsoft YaHei',sans-serif"
export const NICMD_BRAND_FONT_FAMILY = "'Cinzel','Cormorant Garamond','Times New Roman','Noto Serif SC','Songti SC',serif"

export const NICMD_BRAND = {
  name: 'NicMD',
  url: 'https://github.com/NicholasQu/NicMD',
  tagline: '本文由 NicMD 编辑发布'
}

export interface WechatMeta {
  title: string
  summary: string
}

export interface ImagePlaceholderData {
  title: string
  reason: string
  src: string
}

type ReplaceRule = readonly [RegExp, string]

const CODE_FENCE_SPLIT = /(```[\s\S]*?```)/g

const TYPOGRAPHY_RULES: ReplaceRule[] = [
  [/\*\*\s+([“‘\"'《（\(])/g, '**$1'],
  [/([”’\"'》）\)])\s+\*\*/g, '$1**'],
  [/__\s+([“‘\"'《（\(])/g, '__$1'],
  [/([”’\"'》）\)])\s+__/g, '$1__'],
  [/\*\*([“‘\"'《（\(][”’\"'》）\)])\*\*/g, '<strong>$1</strong>'],
  [/__([“‘\"'《（\(][”’\"'》）\)])__/g, '<strong>$1</strong>']
]

const HIGHLIGHT_RULES: ReplaceRule[] = [
  [/\[highlight\]([\s\S]*?)\[\/highlight\]/gi, '<mark>$1</mark>'],
  [/\[金句\]([\s\S]*?)\[\/金句\]/g, '<mark>$1</mark>'],
  [/==([^=\n][^\n]*?[^=\n])==/g, '<mark>$1</mark>']
]

export function extractWechatMeta(content: string, fileName?: string): WechatMeta {
  const title = content.match(/^#\s+(.+)$/m)?.[1]?.trim() || fileName?.replace(/\.[^.]+$/, '') || '未命名文章'
  const summary = content.match(/<!--\s*summary:\s*(.+?)\s*-->/s)?.[1]?.trim() || createWechatSummary(content)
  return { title, summary }
}

export function createWechatSummary(content: string): string {
  const text = content
    .replace(/<!--.*?-->/gs, '')
    .replace(/```[\s\S]*?```/g, '')
    .replace(/^#+\s+/gm, '')
    .replace(/[*_`\[\]()>|~#=-]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
  if (!text) return ''
  return text.length > 140 ? `${text.slice(0, 140)}...` : text
}

export function stripFirstH1(content: string): string {
  return content.replace(/^#\s+.+\n?/, '')
}

export function normalizeMarkdownTypography(content: string): string {
  return content
    .split(CODE_FENCE_SPLIT)
    .map(part => part.startsWith('```') ? part : applyReplaceRules(part, [...TYPOGRAPHY_RULES, ...HIGHLIGHT_RULES]))
    .join('')
}

function applyReplaceRules(content: string, rules: ReplaceRule[]): string {
  return rules.reduce((current, [pattern, replacement]) => current.replace(pattern, replacement), content)
}

export function wrapWechatHtml(html: string): string {
  const t = WECHAT_THEME
  return html
    .replace(/<h1\b/g, `<h1 style="margin:0 0 26px;padding:0 0 16px;border-bottom:1px solid ${t.border};color:${t.text};font-size:28px;font-weight:850;line-height:1.28;letter-spacing:-.035em;text-wrap:balance;word-break:normal;overflow-wrap:anywhere;"`)
    .replace(/<h2\b/g, `<h2 style="position:relative;margin:34px 0 15px;padding:12px 15px 11px;border-radius:17px;background:linear-gradient(135deg,${t.surfaceSoft},${t.surface});border:1px solid ${t.border};box-shadow:${t.softShadow};color:${t.text};font-size:21px;font-weight:850;line-height:1.42;letter-spacing:-.02em;text-wrap:balance;word-break:normal;overflow-wrap:anywhere;"`)
    .replace(/<h3\b/g, `<h3 style="margin:28px 0 12px;color:${t.textSoft};font-size:16px;font-weight:800;line-height:1.5;letter-spacing:-.01em;text-wrap:balance;word-break:normal;overflow-wrap:anywhere;"`)
    .replace(/<h4\b/g, `<h4 style="margin:22px 0 10px;color:${t.textSoft};font-size:15px;font-weight:760;line-height:1.5;word-break:normal;overflow-wrap:anywhere;"`)
    .replace(/<p\b/g, `<p style="margin:14px 0;color:${t.textSoft};font-size:15px;line-height:1.95;letter-spacing:.01em;word-break:normal;overflow-wrap:anywhere;"`)
    .replace(/<strong\b/g, `<strong style="color:${t.text};font-weight:850;"`)
    .replace(/<em\b/g, `<em style="color:${t.muted};font-style:normal;"`)
    .replace(/<mark\b/g, `<mark style="padding:1px 5px;border-radius:7px;background:${t.accentSoft};color:${t.accentText};font-weight:850;box-decoration-break:clone;-webkit-box-decoration-break:clone;"`)
    .replace(/<blockquote\b/g, `<blockquote style="margin:22px 0;padding:14px 17px;border-left:4px solid ${t.accent};border-radius:0 16px 16px 0;background:${t.surfaceSoft};color:${t.muted};"`)
    .replace(/<ul\b/g, `<ul style="margin:15px 0;padding-left:22px;color:${t.textSoft};font-size:15px;line-height:1.9;"`)
    .replace(/<ol\b/g, `<ol style="margin:15px 0;padding-left:22px;color:${t.textSoft};font-size:15px;line-height:1.9;"`)
    .replace(/<li\b/g, `<li style="margin:7px 0;color:${t.textSoft};word-break:normal;overflow-wrap:anywhere;"`)
    .replace(/<table\b/g, `<table style="width:100%;margin:22px 0;border-collapse:separate;border-spacing:0;font-size:14px;color:${t.textSoft};border:1px solid ${t.borderSoft};border-radius:14px;overflow:hidden;"`)
    .replace(/<th\b/g, `<th style="padding:11px 12px;border-bottom:1px solid ${t.borderSoft};background:${t.surfaceSoft};color:${t.text};font-weight:850;text-align:left;"`)
    .replace(/<td\b/g, `<td style="padding:11px 12px;border-bottom:1px solid ${t.borderSoft};background:${t.surface};color:${t.textSoft};vertical-align:top;word-break:normal;overflow-wrap:anywhere;"`)
    .replace(/<a /g, `<a style="color:${t.accent};text-decoration:none;border-bottom:1px solid ${t.accentBorder};overflow-wrap:anywhere;" `)
}

export function renderNicmdBrandFooter(): string {
  const t = WECHAT_THEME
  return `<footer style="margin:42px 0 0;padding:22px 0 2px;border-top:1px solid ${t.borderSoft};text-align:center;color:${t.muted2};font-family:${WECHAT_FONT_FAMILY};">
    <a href="${NICMD_BRAND.url}" style="display:inline-block;text-decoration:none;border-bottom:none;color:${t.muted};">
      <span style="display:inline-block;padding:10px 18px 9px;border:1px solid ${t.accentBorder};border-radius:999px;background:linear-gradient(135deg,rgba(255,255,255,.72),${t.accentSofter});box-shadow:${t.softShadow};">
        <span style="display:block;font-family:${NICMD_BRAND_FONT_FAMILY};font-size:19px;line-height:1;font-weight:600;letter-spacing:.20em;text-transform:uppercase;color:${t.accentText};text-shadow:0 1px 0 rgba(255,255,255,.75);">𝕸 NicMD</span>
        <span style="display:block;margin-top:7px;font-family:${WECHAT_FONT_FAMILY};font-size:10px;line-height:1.5;letter-spacing:.20em;color:${t.muted2};text-transform:uppercase;">Edited & Published</span>
      </span>
    </a>
    <div style="margin-top:10px;font-size:12px;line-height:1.7;color:${t.muted};letter-spacing:.02em;">${escapeHtml(NICMD_BRAND.tagline)}</div>
    <div style="margin-top:3px;font-family:${NICMD_BRAND_FONT_FAMILY};font-size:11px;line-height:1.6;color:${t.muted2};letter-spacing:.03em;word-break:break-all;">${escapeHtml(NICMD_BRAND.url)}</div>
  </footer>`
}

export function renderWechatImagePlaceholder(data: ImagePlaceholderData): string {
  const t = WECHAT_THEME
  return `<figure style="margin:22px 0;padding:18px;border:1px dashed ${t.accentBorder};border-radius:16px;background:linear-gradient(135deg,${t.surfaceSoft},${t.surface});text-align:left;">
    <div style="display:flex;align-items:center;gap:12px;">
      <div style="width:42px;height:42px;border-radius:14px;background:linear-gradient(135deg,${t.accent},${t.accent2});color:#fff;display:flex;align-items:center;justify-content:center;font-family:Georgia,serif;font-weight:900;font-size:22px;flex-shrink:0;">𝕸</div>
      <div style="min-width:0;">
        <div style="color:${t.text};font-size:15px;font-weight:850;line-height:1.5;">${escapeHtml(data.title || '图片无法显示')}</div>
        <div style="margin-top:3px;color:${t.muted};font-size:13px;line-height:1.6;">${escapeHtml(data.reason)}</div>
      </div>
    </div>
    <div style="margin-top:12px;padding:8px 10px;border-radius:10px;background:${t.surfaceSoft};color:${t.muted};font-size:12px;line-height:1.6;word-break:break-all;">src: ${escapeHtml(data.src)}</div>
  </figure>`
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}
