import { ACTIVE_WECHAT_THEME } from './wechat-theme'

export const WECHAT_FONT_FAMILY = "-apple-system,BlinkMacSystemFont,'PingFang SC','Noto Sans SC','Source Han Sans SC','Microsoft YaHei',sans-serif"
export const NICMD_BRAND_FONT_FAMILY = "'Cinzel','Cormorant Garamond','Times New Roman','Noto Serif SC','Songti SC',serif"

export const NICMD_BRAND = {
  name: 'NicMD',
  url: 'https://github.com/NicholasQu/NicMD',
  tagline: '本文由 NicMD 编辑发布'
}

export interface WechatMeta {
  title: string
  subtitle: string
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
  // **标题**：说明  →  **标题：**说明
  // 把冒号包进加粗范围，让 marked.js 自然生成 <strong>标题：</strong>
  // 冒号在 strong 内部不会断行，说明文字在 strong 外部不会加粗
  // **标题**：说明  →  <strong>标题：</strong>说明
  // 预处理生成裸 <strong>（冒号包进 strong 内部防微信断行）
  // 不加 inline style，让 wrapWechatHtml 全局 <strong> 规则统一处理
  // 不能用 **标题：** markdown 方案：GFM 闭合 ** 后紧跟字母不算闭合
  [/\*\*([^*\n]+)\*\*([：:])/g, '<strong>$1$2</strong>'],
  [/__([^_\n]+)__([：:])/g, '<strong>$1$2</strong>'],
  [/\*\*([“‘\"'《（\(][^*\n]+[”’\"'》）\)])\*\*/g, '<strong>$1</strong>'],
  [/__([“‘\"'《（\(][^_\n]+[”’\"'》）\)])__/g, '<strong>$1</strong>'],
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
  // 优先识别 H1 后紧跟的 blockquote 作为副标题
  const afterH1 = content.replace(/^#\s+.+\n?/, '')
  const subtitle = afterH1.match(/^>\s+(.+)$/m)?.[1]?.trim() || ''
  const summary = content.match(/<!--\s*summary:\s*(.+?)\s*-->/s)?.[1]?.trim() || createWechatSummary(content)
  return { title, subtitle, summary }
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

export function prepareWechatMarkdown(content: string): string {
  return normalizeMarkdownTypography(normalizeBodyHeadingLevels(stripOpeningTitles(content)))
}

function stripOpeningTitles(content: string): string {
  return stripFirstH1(content)
    .replace(/^\n+/, '')
    // strip H1 后紧跟的 blockquote（已被提取为副标题）
    .replace(/^(?:>\s+.+\n?)+\n*/, '')
    // strip H1 后紧跟的 H2（防止与标题卡片重复）
    .replace(/^##\s+.+\n+/, '')
}

function normalizeBodyHeadingLevels(content: string): string {
  const parts = content.split(CODE_FENCE_SPLIT)
  const levels = parts
    .filter(part => !part.startsWith('```'))
    .flatMap(part => Array.from(part.matchAll(/^(#{1,6})\s+\S.+$/gm), match => match[1].length))
  if (!levels.length) return content

  const minLevel = Math.min(...levels)
  const shift = minLevel - 2
  return parts
    .map(part => part.startsWith('```') ? part : part.replace(/^(#{1,6})(\s+\S.+)$/gm, (_, marks: string, rest: string) => {
      const normalizedLevel = Math.min(Math.max(marks.length - shift, 2), 6)
      return `${'#'.repeat(normalizedLevel)}${rest}`
    }))
    .join('')
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
  return applyReplaceRules(html, createWechatHtmlStyleRules())
}

/**
 * 微信公众号编辑器样式兼容性备忘
 *
 * 【✅ 微信保留的 inline 样式】
 *   - color, font-size, font-weight, font-family, line-height, letter-spacing
 *   - text-align: center / left / right
 *   - margin, padding（简单数值，不要用 calc）
 *   - border / border-bottom / border-left / border-top / border-right
 *   - border-radius（≤8px 稳定，>12px 可能丢失）
 *   - background（纯色稳定，rgba/gradient 可能丢失）
 *
 * 【✅ 微信保留的 HTML 元素】
 *   - <section>（微信编辑器最稳定的容器，优于 <div>）
 *   - <span>（inline 样式载体）
 *   - <p>, <strong>, <em>, <code>, <pre>, <blockquote>
 *   - <ul>, <ol>, <li>, <table>, <img>
 *   - Unicode 字符（▪ ● ◆ ❖ 等，纯文本，100% 保留）
 *
 * 【❌ 微信会丢弃的样式】
 *   - display: flex / grid（布局塌陷）
 *   - display: inline-block 的背景色块（颜色丢失，仅保留文字）
 *   - background: linear-gradient / radial-gradient（渐变丢失）
 *   - backdrop-filter: blur（毛玻璃丢失）
 *   - box-shadow（阴影丢失，macOS 编辑器可显示但手机端丢失）
 *   - transform, animation, transition（全部丢失）
 *   - position: sticky / fixed / absolute（定位丢失）
 *   - CSS 变量 var(--xxx)（不支持）
 *   - :hover, ::before, ::after 伪元素（不支持）
 *
 * 【⚠️ 注意事项】
 *   - 所有样式必须 inline（微信编辑器会清除 <style> 标签）
 *   - <section> 优于 <div>，微信对 section 的样式保留率更高
 *   - 代码块标题栏：用 border 分隔，不要依赖 background 色
 *   - 标题装饰：用 Unicode 字符（▪❖●◆），不要用 CSS 色块
 *   - 圆角：≤8px 安全，微信手机端大圆角可能被裁切
 *   - 图片：必须用 <img> 标签，微信会自动转存到自己的 CDN
 */
function createWechatHtmlStyleRules(): ReplaceRule[] {
  const t = ACTIVE_WECHAT_THEME
  return [
    [/<h1\b/g, `<h1 style="margin:0 0 22px;padding:0 0 14px;border-bottom:1px solid ${t.border};color:${t.heading};font-size:24px;font-weight:850;line-height:1.34;letter-spacing:-.025em;word-break:normal;overflow-wrap:break-word;"`],
    [/<h2\b/g, `<h2 style="margin:36px 0 20px;padding:0;color:${t.heading};font-size:20px;font-weight:850;line-height:1.45;text-align:center;letter-spacing:-.01em;word-break:normal;overflow-wrap:break-word;"`],
    [/(<h2\b[^>]*>)([\s\S]*?)<\/h2>/g, `$1<span style="color:${t.accent};margin-right:6px;">▪</span><span style="display:inline-block;padding:0 18px 8px;border-bottom:2px solid ${t.accent};">$2</span></h2>`],
    [/<h3\b/g, `<h3 style="margin:28px 0 12px;padding:0;color:${t.heading};font-size:17px;font-weight:800;line-height:1.5;letter-spacing:-.006em;word-break:normal;overflow-wrap:break-word;"`],
    [/(<h3\b[^>]*>)([\s\S]*?)<\/h3>/g, `$1<span style="color:${t.accent};margin-right:7px;">▪</span><span style="display:inline-block;padding:0 14px 5px 0;border-bottom:1.5px solid ${t.accent};">$2</span></h3>`],
    [/<h4\b/g, `<h4 style="margin:24px 0 10px;padding:0;color:${t.heading};font-size:15px;font-weight:760;line-height:1.5;word-break:normal;overflow-wrap:break-word;"`],
    [/(<h4\b[^>]*>)([\s\S]*?)<\/h4>/g, `$1<span style="color:${t.accentBorder};margin-right:6px;">▪</span>$2</h4>`],
    [/<p\b/g, `<p style="margin:14px 0;color:${t.textSoft};font-size:15px;line-height:1.95;letter-spacing:.01em;word-break:normal;overflow-wrap:anywhere;font-family:${WECHAT_FONT_FAMILY};"`],
    [/<strong\b/g, `<strong style="display:inline;color:${t.text};font-weight:700;white-space:normal;"`],
    [/<em\b/g, `<em style="color:${t.muted};font-style:normal;"`],
    [/<mark\b/g, `<mark style="padding:1px 5px;border-radius:7px;background:${t.accentSoft};color:${t.accentText};font-weight:700;box-decoration-break:clone;-webkit-box-decoration-break:clone;"`],
    [/<blockquote\b/g, `<blockquote style="margin:6px 0;padding:0 0 0 12px;border-left:2px solid ${t.accentBorder};color:${t.muted};"`],
    [/blockquote style="([^"]*)">\s*<p style="([^"]*?)margin:14px 0([^"]*)"/g, 'blockquote style="$1"><p style="$2margin:0$3"'],
    [/<ul\b/g, `<ul style="margin:15px 0;padding-left:22px;color:${t.textSoft};font-size:15px;line-height:1.9;list-style-position:outside;font-family:${WECHAT_FONT_FAMILY};"`],
    [/<ol\b/g, `<ol style="margin:15px 0;padding-left:22px;color:${t.textSoft};font-size:15px;line-height:1.9;list-style-position:outside;font-family:${WECHAT_FONT_FAMILY};"`],
    [/<li\b/g, `<li style="margin:7px 0;color:${t.textSoft};word-break:normal;overflow-wrap:break-word;font-family:${WECHAT_FONT_FAMILY};"`],
    [/<table\b/g, `<table style="width:100%;margin:22px 0;border-collapse:separate;border-spacing:0;font-size:14px;color:${t.textSoft};border:1px solid ${t.borderSoft};border-radius:8px;overflow:hidden;"`],
    [/<th\b/g, `<th style="padding:11px 12px;border-bottom:1px solid ${t.borderSoft};background:${t.surfaceSoft};color:${t.text};font-weight:700;text-align:left;word-break:break-word;overflow-wrap:anywhere;"`],
    [/<td\b/g, `<td style="padding:11px 12px;border-bottom:1px solid ${t.borderSoft};background:${t.surface};color:${t.textSoft};vertical-align:top;word-break:break-word;overflow-wrap:anywhere;"`],
    [/<img\b([^>]*?)\sstyle="/g, '<img$1 style="max-width:100%;height:auto;'],
    [/<img\b(?![^>]*\sstyle=)/g, '<img style="max-width:100%;height:auto;"'],
    [/<a /g, `<a style="color:${t.accent};text-decoration:none;border-bottom:1px solid ${t.accentBorder};overflow-wrap:anywhere;" `]
  ]
}

/**
 * 品牌底部 — 烫金渐变条名片（G5 最终版）
 * 微信兼容关键点：
 * 1. 背景色写在 table + td 上（双保险）
 * 2. 圆章和文字用 table 两列 td 并排（最可靠，不依赖 inline-block）
 * 3. 每个 td 显式 border:0 none
 * 4. 渐变丢失时降级为纯色 #3a2f1a
 */
export function renderNicmdBrandFooter(): string {
  const t = ACTIVE_WECHAT_THEME
  const url = escapeHtml(NICMD_BRAND.url)
  const tag = escapeHtml(NICMD_BRAND.tagline)

  return `<footer style="margin:42px 0 0;padding:24px 0 0;border-top:1px solid ${t.borderSoft};text-align:center;">
    <table cellpadding="0" cellspacing="0" border="0" style="margin:0 auto;width:100%;border-collapse:separate;border-spacing:0;border:1px solid #d4a72c;border-radius:10px;background:#3a2f1a;overflow:hidden;">
      <tr>
        <td style="background:#3a2f1a;border:0 none;padding:14px 4px 14px 18px;vertical-align:middle;width:56px;">
          <span style="display:inline-block;width:48px;height:48px;line-height:48px;text-align:center;border:2px solid #fbbf24;border-radius:50%;background:#1c1917;color:#fbbf24;font-family:Georgia,serif;font-weight:900;font-size:24px;">𝕸</span>
        </td>
        <td style="background:#3a2f1a;border:0 none;padding:14px 18px 14px 8px;vertical-align:middle;text-align:left;">
          <p style="margin:0 0 4px;font-size:12px;font-weight:800;color:#fbbf24;">${tag}</p>
          <p style="margin:0;font-size:10px;font-style:italic;color:#d4a72c;border-bottom:1px solid #d4a72c;padding-bottom:1px;">${url}</p>
        </td>
      </tr>
    </table>
  </footer>`
}

export function renderWechatImagePlaceholder(data: ImagePlaceholderData): string {
  const t = ACTIVE_WECHAT_THEME
  return `<figure style="margin:22px 0;padding:18px;border:1px dashed ${t.accentBorder};border-radius:8px;background:${t.surfaceSoft};text-align:left;">
    <section style="display:inline-block;vertical-align:middle;width:42px;height:42px;border-radius:8px;background:${t.accent};color:#fff;text-align:center;line-height:42px;font-family:Georgia,serif;font-weight:900;font-size:22px;margin-right:12px;">𝕸</section>
    <section style="display:inline-block;vertical-align:middle;">
      <div style="color:${t.text};font-size:15px;font-weight:700;line-height:1.5;">${escapeHtml(data.title || '图片无法显示')}</div>
      <div style="margin-top:3px;color:${t.muted};font-size:13px;line-height:1.6;">${escapeHtml(data.reason)}</div>
    </section>
    <div style="margin-top:12px;padding:8px 10px;border-radius:4px;background:${t.surface};color:${t.muted};font-size:12px;line-height:1.6;word-break:break-all;">src: ${escapeHtml(data.src)}</div>
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
