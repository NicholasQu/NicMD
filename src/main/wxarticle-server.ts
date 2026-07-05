import { BrowserWindow, shell } from 'electron'
import { createServer, type IncomingMessage, type ServerResponse } from 'http'
import { mkdir, readFile, stat, writeFile } from 'fs/promises'
import { existsSync } from 'fs'
import { createHash } from 'crypto'
import { dirname, extname, resolve, relative, basename, join } from 'path'
import { homedir } from 'os'
import { execSync } from 'child_process'
import { Marked } from 'marked'
import {
  WECHAT_FONT_FAMILY,
  escapeHtml,
  extractWechatMeta,
  prepareWechatMarkdown,
  renderNicmdBrandFooter,
  renderWechatImagePlaceholder,
  wrapWechatHtml
} from '../shared/wechat-render'
import { ACTIVE_WECHAT_THEME, setActiveWechatTheme } from '../shared/wechat-theme'

interface WxArticleOptions {
  inputPath: string
  port?: number
  open?: boolean
  watch?: boolean
  theme?: string
}

const HOST = '127.0.0.1'
const IMAGE_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg'])

// weixin server PID 注册表，用于 kill 命令一键清理
const PID_REGISTRY = process.env.APPDATA
  ? join(process.env.APPDATA, 'nicmd', 'weixin-servers.json')
  : join(homedir(), '.nicmd', 'weixin-servers.json')

interface PidEntry { pid: number; port: number; file: string; startedAt: string }

async function readPidRegistry(): Promise<PidEntry[]> {
  try {
    const data = await readFile(PID_REGISTRY, 'utf-8')
    return JSON.parse(data)
  } catch { return [] }
}

async function writePidRegistry(entries: PidEntry[]): Promise<void> {
  await mkdir(dirname(PID_REGISTRY), { recursive: true })
  await writeFile(PID_REGISTRY, JSON.stringify(entries, null, 2), 'utf-8')
}

async function registerServer(pid: number, port: number, file: string): Promise<void> {
  const entries = await readPidRegistry()
  entries.push({ pid, port, file, startedAt: new Date().toISOString() })
  await writePidRegistry(entries)
}

async function unregisterServer(pid: number): Promise<void> {
  const entries = await readPidRegistry()
  await writePidRegistry(entries.filter(e => e.pid !== pid))
}

export async function startWxArticleServer(options: WxArticleOptions): Promise<void> {
  const inputPath = resolve(options.inputPath)
  if (!existsSync(inputPath)) {
    console.error(`Markdown file not found: ${inputPath}`)
    return
  }

  // 设置可识别的进程标题，任务管理器/进程列表中可见
  process.title = `nicmd-weixin: ${basename(inputPath)}`
  process.env.NICMD_ROLE = 'weixin'

  const rootDir = dirname(inputPath)
  const theme = setActiveWechatTheme(options.theme)
  const server = createServer(async (req, res) => {
    try {
      await handleRequest(req, res, inputPath, rootDir)
    } catch (e: any) {
      sendHtml(res, 500, renderErrorPage('NicMD weixin failed', e?.message || String(e)))
    }
  })

  const closeServer = () => new Promise<void>((resolveClose) => {
    server.close(() => resolveClose())
  })

  const shutdown = async (reason: string) => {
    console.log(`\nStopping NicMD wxarticle server (${reason})...`)
    await closeServer()
    await unregisterServer(process.pid)
    process.exit(0)
  }

  process.once('SIGINT', () => { void shutdown('SIGINT') })
  process.once('SIGTERM', () => { void shutdown('SIGTERM') })
  process.once('SIGHUP', () => { void shutdown('SIGHUP') })
  process.once('exit', () => {
    if (server.listening) server.close()
  })

  try {
    await new Promise<void>((resolveListen, rejectListen) => {
      server.once('error', rejectListen)
      server.listen(options.port || 0, HOST, () => resolveListen())
    })
  } catch (e: any) {
    const portText = options.port ? `:${options.port}` : ''
    console.error(`Failed to start NicMD weixin server on ${HOST}${portText}.`)
    if (e?.code === 'EADDRINUSE') console.error('The port is already in use. Choose another port or close the existing process.')
    else console.error(e?.message || String(e))
    return
  }

  const address = server.address()
  const port = typeof address === 'object' && address ? address.port : options.port
  const url = `http://${HOST}:${port}/`

  // 注册到 PID 表，供 kill 命令清理
  await registerServer(process.pid, port, inputPath)

  console.log('NicMD Weixin Article Preview')
  console.log(`File : ${inputPath}`)
  console.log(`Theme: ${theme.name}`)
  console.log(`URL  : ${url}`)
  console.log('Close: press Ctrl+C, or run "nicmd kill" to stop all weixin servers')

  if (options.open !== false) {
    await shell.openExternal(url)
  }

  await new Promise<void>(() => {})
}

async function handleRequest(req: IncomingMessage, res: ServerResponse, inputPath: string, rootDir: string) {
  const requestUrl = new URL(req.url || '/', `http://${HOST}`)

  if (requestUrl.pathname === '/asset') {
    await handleAsset(requestUrl, res, rootDir)
    return
  }

  if (requestUrl.pathname === '/article-html') {
    const html = await renderArticleHtml(inputPath, rootDir)
    sendHtml(res, 200, html)
    return
  }

  if (requestUrl.pathname === '/' || requestUrl.pathname === '/wxarticle') {
    const content = await readFile(inputPath, 'utf-8')
    const meta = extractWechatMeta(content, basename(inputPath))
    const articleHtml = await renderArticleHtml(inputPath, rootDir)
    sendHtml(res, 200, renderPreviewPage({ title: meta.title, subtitle: meta.subtitle, summary: meta.summary, articleHtml, inputPath }))
    return
  }

  sendHtml(res, 404, renderErrorPage('404 Not Found', requestUrl.pathname))
}

async function handleAsset(requestUrl: URL, res: ServerResponse, rootDir: string) {
  const src = requestUrl.searchParams.get('src') || ''
  const filePath = safeResolveAsset(rootDir, src)
  if (!filePath) {
    sendHtml(res, 403, renderErrorPage('Asset blocked', 'Only files inside the article folder can be served.'))
    return
  }

  try {
    const fileStat = await stat(filePath)
    if (!fileStat.isFile()) throw new Error('Not a file')
    const buffer = await readFile(filePath)
    const type = getMimeType(filePath)
    res.writeHead(200, {
      'Content-Type': type,
      'Cache-Control': 'no-cache'
    })
    res.end(buffer)
  } catch (e: any) {
    sendHtml(res, 404, renderErrorPage('Asset not found', e?.message || src))
  }
}

async function renderArticleHtml(inputPath: string, rootDir: string): Promise<string> {
  const content = await readFile(inputPath, 'utf-8')

  const renderer = {
    image: ({ href, title, text }) => {
      const src = String(href || '')
      const alt = escapeHtml(String(text || ''))
      const resolved = resolveImage(rootDir, src)

      if (!resolved.ok) {
        return renderWechatImagePlaceholder({ title: alt || '图片无法显示', reason: resolved.reason, src })
      }

      const t = ACTIVE_WECHAT_THEME
      const titleHtml = title ? `<figcaption style="margin-top:8px;text-align:center;color:${t.muted};font-size:12px;line-height:1.6;">${escapeHtml(String(title))}</figcaption>` : ''
      return `<figure style="margin:22px 0;text-align:center;"><img src="/asset?src=${encodeURIComponent(resolved.relativePath)}" alt="${alt}" style="display:block;max-width:100%;margin:0 auto;border-radius:12px;box-shadow:${t.softShadow};" />${titleHtml}</figure>`
    },
    // 代码块：微信兼容方案
    // - 用 <section> 容器（微信保留率优于 <div>）
    // - 标题栏用 border 分隔，不依赖 background 色（微信复制会丢背景色）
    // - font-family 加中文字体 fallback（否则中文用宋体，很丑）
    code: ({ text, lang }) => {
      const language = String(lang || '').trim()
      const code = escapeHtml(String(text || ''))
      if (language.toLowerCase() === 'mermaid') {
        return renderWechatImagePlaceholder({ title: 'Mermaid 图暂未渲染', reason: 'weixin CLI V1 暂不渲染 Mermaid，请先导出为图片后引用。', src: 'mermaid code block' })
      }
      const t = ACTIVE_WECHAT_THEME
      const header = language
        ? `<section style="margin:18px 0 0;padding:6px 14px;border:1px solid ${t.accentBorder};border-bottom:1px solid ${t.accentBorder};border-radius:8px 8px 0 0;color:${t.accentText};font-size:11px;font-weight:700;letter-spacing:.04em;">${escapeHtml(language)}</section>`
        : ''
      const bodyMargin = language ? '0' : '18px 0'
      const bodyRadius = language ? 'border-radius:0 0 8px 8px;border-top:none;' : 'border-radius:8px;'
      return `${header}<section style="margin:${bodyMargin};padding:14px 16px;border:1px solid ${t.accentBorder};${bodyRadius}overflow-x:auto;"><pre style="margin:0;padding:0;white-space:pre-wrap;word-wrap:break-word;"><code style="color:${t.textSoft};font-size:13px;line-height:1.75;font-family:SFMono-Regular,Consolas,'Liberation Mono',Menlo,'PingFang SC','Microsoft YaHei',monospace;">${code}</code></pre></section>`
    }
  }

  const markedInstance = new Marked({ gfm: true, breaks: false, renderer })
  const normalized = prepareWechatMarkdown(content)
  const prepared = await preprocessNicmdHtmlBlocks(normalized, rootDir)
  const html = await markedInstance.parse(prepared)
  return `<section style="font-family:${WECHAT_FONT_FAMILY};">${wrapWechatHtml(String(html))}${renderNicmdBrandFooter()}</section>`
}

function resolveImage(rootDir: string, src: string): { ok: true; relativePath: string } | { ok: false; reason: string } {
  if (!src.trim()) return { ok: false, reason: '图片地址为空。' }
  if (/^https?:\/\//i.test(src) || src.startsWith('data:')) {
    return { ok: false, reason: '公众号复制场景不建议直接使用远程或 data 图片，建议下载到本地后引用。' }
  }
  if (/\.html?($|[?#])/i.test(src)) {
    return { ok: false, reason: '这是 HTML 文件，不是图片。请先截图导出为 PNG/JPG 后再插入。' }
  }

  const cleanSrc = src.split('#')[0].split('?')[0]
  const ext = extname(cleanSrc).toLowerCase()
  if (!IMAGE_EXTENSIONS.has(ext)) {
    return { ok: false, reason: `不支持的图片类型：${ext || '无扩展名'}。支持 png/jpg/jpeg/gif/webp/svg。` }
  }

  const filePath = safeResolveAsset(rootDir, cleanSrc)
  if (!filePath) return { ok: false, reason: '图片路径越界，出于安全考虑已拦截。' }
  if (!existsSync(filePath)) return { ok: false, reason: '图片文件不存在。' }

  return { ok: true, relativePath: relative(rootDir, filePath).replace(/\\/g, '/') }
}

async function preprocessNicmdHtmlBlocks(content: string, rootDir: string): Promise<string> {
  const pattern = /::: *nicmd-html\s+([\s\S]*?):::/g
  const parts: string[] = []
  let lastIndex = 0
  let match: RegExpExecArray | null

  while ((match = pattern.exec(content))) {
    parts.push(content.slice(lastIndex, match.index))
    parts.push(await renderNicmdHtmlBlock(match[1], rootDir))
    lastIndex = pattern.lastIndex
  }

  parts.push(content.slice(lastIndex))
  return parts.join('')
}

async function renderNicmdHtmlBlock(body: string, rootDir: string): Promise<string> {
  const attrs = parseDirectiveAttrs(body)
  const src = attrs.src || ''
  const title = attrs.title || 'HTML 配图'
  const width = Number(attrs.width || 960)
  const shot = attrs.shot ? Number(attrs.shot) : 0
  const resolved = resolveHtmlAsset(rootDir, src)
  if (!resolved.ok) return renderWechatImagePlaceholder({ title, reason: resolved.reason, src })

  try {
    const description = await extractHtmlShotDescription(rootDir, resolved.relativePath, shot)
    const t = ACTIVE_WECHAT_THEME
    const descriptionHtml = description
      ? `<div style="margin-top:6px;color:${t.muted};font-size:13px;font-weight:500;line-height:1.7;">${escapeHtml(description)}</div>`
      : ''
    const imageRelativePath = await captureHtmlToPng(rootDir, resolved.relativePath, shot, width)
    return `<figure style="margin:30px 0;text-align:center;"><figcaption style="margin:0 0 12px;text-align:left;"><div style="margin-bottom:4px;line-height:22px;"><span style="display:inline-block;vertical-align:middle;padding:0 9px;height:22px;line-height:22px;border-radius:999px;background:${t.accentSoft};color:${t.accentText};font-size:11px;font-weight:800;letter-spacing:.02em;">Visual</span><span style="display:inline-block;vertical-align:middle;margin-left:8px;color:${t.text};font-size:15px;font-weight:850;line-height:1.45;">${escapeHtml(title)}</span></div>${descriptionHtml}</figcaption><img src="/asset?src=${encodeURIComponent(imageRelativePath)}" alt="${escapeHtml(title)}" style="display:block;width:100%;max-width:${Math.min(width, 960)}px;height:auto;margin:0 auto;" /></figure>`
  } catch (e: any) {
    return renderWechatImagePlaceholder({ title, reason: e?.message || 'HTML 截图失败。', src })
  }
}

async function extractHtmlShotDescription(rootDir: string, relativeHtmlPath: string, shot: number): Promise<string> {
  if (!shot) return ''
  const sourcePath = safeResolveAsset(rootDir, relativeHtmlPath)
  if (!sourcePath) return ''

  const win = new BrowserWindow({
    width: 900,
    height: 700,
    show: false,
    webPreferences: {
      offscreen: true,
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  try {
    const fileUrl = `file:///${sourcePath.replace(/\\/g, '/')}`
    await win.loadURL(fileUrl)
    await win.webContents.executeJavaScript(`new Promise(resolve => {
      if (document.readyState === 'complete') resolve(true)
      else window.addEventListener('load', () => resolve(true), { once: true })
    })`)
    return await win.webContents.executeJavaScript(`(() => {
      const target = document.querySelectorAll('.shot')[${shot - 1}]
      const desc = target?.querySelector('.desc')
      return desc ? desc.textContent.trim() : ''
    })()`)
  } finally {
    win.destroy()
  }
}

async function captureHtmlToPng(rootDir: string, relativeHtmlPath: string, shot: number, width: number): Promise<string> {
  const sourcePath = safeResolveAsset(rootDir, relativeHtmlPath)
  if (!sourcePath) throw new Error('HTML 路径越界，无法截图。')

  const sourceStat = await stat(sourcePath)
  const cacheDir = join(rootDir, '.nicmd', 'weixin-assets')
  await mkdir(cacheDir, { recursive: true })

  const hash = createHash('sha1')
    .update(`png-v7|${relativeHtmlPath}|${shot}|${width}|${sourceStat.mtimeMs}`)
    .digest('hex')
    .slice(0, 16)
  const outputPath = join(cacheDir, `${hash}.png`)
  const outputRelative = relative(rootDir, outputPath).replace(/\\/g, '/')
  if (existsSync(outputPath)) return outputRelative

  const win = new BrowserWindow({
    width: Math.max(720, Math.min(width, 1400)),
    height: 1200,
    show: false,
    webPreferences: {
      offscreen: true,
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  try {
    const fileUrl = `file:///${sourcePath.replace(/\\/g, '/')}`
    await win.loadURL(fileUrl)

    await win.webContents.executeJavaScript(`new Promise(resolve => {
      if (document.readyState === 'complete') resolve(true)
      else window.addEventListener('load', () => resolve(true), { once: true })
    })`)

    const clip = await win.webContents.executeJavaScript(`(() => {
      const shotIndex = ${shot || 0}
      let target = shotIndex ? document.querySelectorAll('.shot')[shotIndex - 1] : (document.querySelector('.page') || document.querySelector('main') || document.body)
      if (!target) return null
      if (shotIndex) {
        const h2 = target.querySelector('h2')
        const desc = target.querySelector('.desc')
        if (h2) h2.remove()
        if (desc) desc.remove()
        target.style.padding = '0'
        document.body.innerHTML = ''
        document.body.style.margin = '0'
        document.body.style.padding = '24px'
        document.body.style.background = '#07111f'
        target.style.margin = '0 auto'
        target.style.maxWidth = '1120px'
        document.body.appendChild(target)
        target = document.querySelector('.shot') || document.querySelector('.page') || document.body
      }
      const rect = target.getBoundingClientRect()
      return { x: Math.max(0, Math.floor(rect.left)), y: Math.max(0, Math.floor(rect.top)), width: Math.ceil(rect.width), height: Math.ceil(rect.height) }
    })()`)

    if (!clip || !clip.width || !clip.height) throw new Error('无法定位 HTML 配图区域。')
    const captureWidth = Math.min(Math.max(Math.ceil(clip.width), 320), 1800)
    const captureHeight = Math.min(Math.max(Math.ceil(clip.height), 160), 3000)
    win.setSize(captureWidth + 80, captureHeight + 80)
    await new Promise(resolve => setTimeout(resolve, 300))

    // 重新测量：窗口 resize 后布局可能重排，旧坐标失效
    const finalClip = await win.webContents.executeJavaScript(`(() => {
      const target = document.querySelector('.shot') || document.querySelector('.page') || document.body
      if (!target) return null
      // 展开所有溢出内容：确保 .page 不会被 overflow:hidden 截断
      target.style.overflow = 'visible'
      const scrollH = Math.max(target.scrollHeight, target.offsetHeight)
      const rect = target.getBoundingClientRect()
      return { x: Math.max(0, Math.floor(rect.left)), y: Math.max(0, Math.floor(rect.top)), width: Math.ceil(rect.width), height: Math.ceil(Math.max(rect.height, scrollH)) }
    })()`)

    const finalWidth = finalClip ? Math.min(Math.max(finalClip.width, 320), 1800) : captureWidth
    const finalHeight = finalClip ? Math.min(Math.max(finalClip.height, 160), 3000) : captureHeight
    // 如果重新测量的高度更大，需要再次调整窗口
    if (finalHeight > captureHeight) {
      win.setSize(finalWidth + 80, finalHeight + 80)
      await new Promise(resolve => setTimeout(resolve, 300))
    }

    const image = await win.webContents.capturePage({
      x: finalClip ? finalClip.x : clip.x,
      y: finalClip ? finalClip.y : clip.y,
      width: finalWidth,
      height: finalHeight
    })
    // 截图后在 renderer 页面内用 canvas 做圆角遮罩，四角变透明
    const dataUrl = image.toDataURL()
    const roundedDataUrl = await win.webContents.executeJavaScript(`(async () => {
      const img = new Image()
      img.src = ${JSON.stringify(dataUrl)}
      await new Promise((res, rej) => { img.onload = res; img.onerror = rej })
      const w = img.naturalWidth, h = img.naturalHeight
      const canvas = document.createElement('canvas')
      canvas.width = w; canvas.height = h
      const ctx = canvas.getContext('2d')
      const r = 18
      ctx.beginPath()
      ctx.moveTo(r, 0)
      ctx.lineTo(w - r, 0)
      ctx.quadraticCurveTo(w, 0, w, r)
      ctx.lineTo(w, h - r)
      ctx.quadraticCurveTo(w, h, w - r, h)
      ctx.lineTo(r, h)
      ctx.quadraticCurveTo(0, h, 0, h - r)
      ctx.lineTo(0, r)
      ctx.quadraticCurveTo(0, 0, r, 0)
      ctx.closePath()
      ctx.clip()
      ctx.drawImage(img, 0, 0)
      return canvas.toDataURL('image/png')
    })()`)
    const base64 = roundedDataUrl.replace(/^data:image\/png;base64,/, '')
    await writeFile(outputPath, Buffer.from(base64, 'base64'))
    return outputRelative
  } finally {
    win.destroy()
  }
}

function parseDirectiveAttrs(body: string): Record<string, string> {
  const attrs: Record<string, string> = {}
  for (const line of body.split(/\r?\n/)) {
    // 格式1：每行一个 key: value（冒号格式）
    const colonMatch = line.match(/^\s*([\w-]+)\s*:\s*(.*?)\s*$/)
    if (colonMatch) { attrs[colonMatch[1]] = colonMatch[2]; continue }
    // 格式2：行内 key="value" 或 key=value（等号格式，支持一行多个属性）
    const inlineMatches = line.matchAll(/([\w-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|(\S+))/g)
    for (const m of inlineMatches) {
      attrs[m[1]] = m[2] ?? m[3] ?? m[4] ?? ''
    }
  }
  return attrs
}

function resolveHtmlAsset(rootDir: string, src: string): { ok: true; relativePath: string } | { ok: false; reason: string } {
  if (!src.trim()) return { ok: false, reason: 'HTML 配图地址为空。' }
  if (/^https?:\/\//i.test(src) || src.startsWith('data:')) return { ok: false, reason: '只支持本地 HTML 配图。' }

  const cleanSrc = src.split('#')[0].split('?')[0]
  const ext = extname(cleanSrc).toLowerCase()
  if (ext !== '.html' && ext !== '.htm') return { ok: false, reason: `这不是 HTML 文件：${ext || '无扩展名'}。` }

  const filePath = safeResolveAsset(rootDir, cleanSrc)
  if (!filePath) return { ok: false, reason: 'HTML 路径越界，出于安全考虑已拦截。' }
  if (!existsSync(filePath)) return { ok: false, reason: 'HTML 文件不存在。' }

  return { ok: true, relativePath: relative(rootDir, filePath).replace(/\\/g, '/') }
}

function safeResolveAsset(rootDir: string, src: string): string | null {
  const decoded = decodeURIComponent(src)
  const filePath = resolve(rootDir, decoded)
  const rel = relative(rootDir, filePath)
  if (rel.startsWith('..') || rel === '..') return null
  return filePath
}

function renderPreviewPage(data: { title: string; subtitle: string; summary: string; articleHtml: string; inputPath: string }) {
  const safeTitle = escapeHtml(data.title)
  const safeSubtitle = escapeHtml(data.subtitle)
  const safeSummary = escapeHtml(data.summary)
  const safePath = escapeHtml(data.inputPath)
  const t = ACTIVE_WECHAT_THEME
  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Crect width='64' height='64' rx='14' fill='%231c1917'/%3E%3Ctext x='32' y='55' font-family='Georgia,serif' font-size='60' fill='%23fbbf24' text-anchor='middle'%3E𝕸%3C/text%3E%3C/svg%3E" />
  <title>${safeTitle} - NicMD weixin</title>
  <style>
    :root { color-scheme: light; --text:${t.text}; --text-soft:${t.textSoft}; --muted:${t.muted}; --muted-2:${t.muted2}; --heading:${t.heading}; --surface:${t.surface}; --surface-soft:${t.surfaceSoft}; --border:${t.border}; --border-soft:${t.borderSoft}; --accent:${t.accent}; --accent-2:${t.accent2}; --accent-text:${t.accentText}; --accent-soft:${t.accentSoft}; --accent-softer:${t.accentSofter}; --accent-border:${t.accentBorder}; --accent-line:${t.accentLine}; --shadow:${t.shadow}; --soft-shadow:${t.softShadow}; }
    * { box-sizing: border-box; }
    body { margin:0; min-height:100vh; background:radial-gradient(circle at 20% 0%,var(--accent-softer),transparent 30%),linear-gradient(180deg,var(--surface-soft) 0%,var(--surface) 46%,var(--surface-soft) 100%); color:var(--text); font-family:${WECHAT_FONT_FAMILY}; }
    .toolbar { position:sticky; top:0; z-index:10; display:flex; align-items:center; justify-content:space-between; gap:16px; min-height:64px; padding:10px 20px; background:rgba(255,255,255,.78); backdrop-filter:saturate(180%) blur(22px); border-bottom:1px solid var(--border); box-shadow:0 8px 26px rgba(0,0,0,.045); }
    .brand { display:flex; align-items:center; gap:12px; min-width:0; }
    .logo { width:36px; height:36px; border-radius:13px; display:flex; align-items:center; justify-content:center; color:#fff; font-weight:900; font-family:Georgia,serif; background:linear-gradient(135deg,var(--accent),var(--accent-2)); box-shadow:0 10px 22px var(--accent-softer); }
    .meta { min-width:0; }
    .meta-title { font-size:15px; font-weight:850; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:620px; }
    .actions { display:flex; align-items:center; gap:8px; flex-shrink:0; }
    button { border:none; border-radius:10px; padding:9px 12px; font-size:12px; font-weight:750; cursor:pointer; transition:.18s ease; }
    .primary { color:#fff; background:linear-gradient(135deg,var(--accent),var(--accent-2)); box-shadow:0 10px 22px var(--accent-softer); }
    .secondary { color:var(--text); background:rgba(255,255,255,.72); border:1px solid var(--border); }
    button:hover { transform:translateY(-1px); box-shadow:0 8px 18px rgba(0,0,0,.08); }
    .layout { width:min(1180px, calc(100vw - 36px)); margin:22px auto 54px; display:grid; grid-template-columns:minmax(0,720px) 260px; gap:22px; align-items:start; justify-content:center; }
    .main-col { min-width:0; }
    .title-card { width:min(720px,100%); margin:0 auto 14px; padding:18px 22px 17px; border-radius:22px; background:linear-gradient(135deg,rgba(255,255,255,.84),var(--surface)); border:1px solid var(--border); box-shadow:var(--soft-shadow); }
    .title-eyebrow { color:var(--accent-text); font-size:10px; font-weight:850; letter-spacing:.16em; text-transform:uppercase; margin-bottom:8px; }
    .article-title { margin:0; color:var(--heading); font-size:24px; line-height:1.34; font-weight:860; letter-spacing:-.025em; word-break:normal; overflow-wrap:break-word; }
    .article-subtitle { margin:8px 0 0; color:var(--muted); font-size:15px; line-height:1.65; font-weight:520; word-break:normal; overflow-wrap:break-word; }
    .body-divider { display:flex; align-items:center; gap:12px; width:min(720px,100%); margin:16px auto 14px; color:var(--muted-2); font-size:11px; font-weight:850; letter-spacing:.18em; text-transform:uppercase; }
    .body-divider::before, .body-divider::after { content:''; height:1px; flex:1; background:var(--accent-line); opacity:.72; }
    .summary-card { width:min(720px,100%); margin:0 auto 14px; padding:15px 17px; border-radius:20px; background:rgba(255,255,255,.74); backdrop-filter:saturate(180%) blur(18px); border:1px solid var(--border); box-shadow:0 18px 44px rgba(0,0,0,.06); }
    .summary-label { color:var(--muted-2); font-size:12px; font-weight:800; margin-bottom:6px; letter-spacing:.02em; }
    .summary-text { color:var(--text-soft); font-size:13px; line-height:1.75; }
    .toc { position:sticky; top:86px; max-height:calc(100vh - 110px); overflow:auto; padding:14px; border-radius:20px; background:rgba(255,255,255,.74); backdrop-filter:saturate(180%) blur(18px); border:1px solid var(--border); box-shadow:0 18px 44px rgba(0,0,0,.07); }
    .toc-title { color:var(--text); font-size:13px; font-weight:900; margin-bottom:10px; }
    .toc a { display:block; color:var(--muted); text-decoration:none; font-size:12px; line-height:1.45; padding:7px 8px; border-radius:10px; border-left:2px solid transparent; }
    .toc a:hover { color:var(--text); background:var(--surface-soft); }
    .toc a.active { color:var(--accent); background:var(--accent-softer); border-left-color:var(--accent); font-weight:800; }
    .toc a.h3 { padding-left:18px; font-size:11px; color:var(--muted-2); }
    .phone { width:min(720px,100%); margin:0 auto; background:var(--surface); border-radius:24px; box-shadow:0 24px 70px rgba(0,0,0,.12); overflow:hidden; border:1px solid var(--border); }
    .article { padding:36px 32px 46px; -webkit-font-smoothing:antialiased; text-rendering:optimizeLegibility; }
    .article h1, .article h2, .article h3, .article h4, .article p, .article li, .article td, .article th { hyphens:none; }
    .article h3.reference-heading { margin-top:34px !important; padding-top:18px !important; border-top:1px solid var(--border-soft) !important; color:var(--muted-2) !important; font-size:14px !important; font-weight:760 !important; }
    .article img { cursor:zoom-in; transition:transform .2s ease, box-shadow .2s ease; }
    .article img:hover { transform:translateY(-2px); box-shadow:0 18px 46px rgba(0,0,0,.18) !important; }
    .image-copy-btn { display:inline-flex; align-items:center; justify-content:center; margin:10px auto 0; padding:5px 10px; border-radius:999px; border:1px solid var(--accent-border); background:#fff; color:var(--accent-text); font-size:11px; font-weight:800; cursor:pointer; }
    .lightbox { position:fixed; inset:0; z-index:100; display:none; align-items:center; justify-content:center; padding:32px; background:rgba(0,0,0,.78); backdrop-filter:blur(18px); }
    .lightbox.show { display:flex; }
    .lightbox img { max-width:min(1180px,96vw); max-height:92vh; border-radius:20px; box-shadow:0 28px 90px rgba(0,0,0,.45); }
    .lightbox-close { position:fixed; top:18px; right:22px; color:#fff; background:rgba(255,255,255,.16); border:1px solid rgba(255,255,255,.22); border-radius:999px; padding:8px 12px; font-size:13px; }
    .path { width:min(680px,100%); margin:12px auto 0; color:#9ca3af; font-size:11px; text-align:center; word-break:break-all; }
    .toast { position:fixed; right:20px; bottom:20px; padding:12px 16px; border-radius:12px; color:#fff; background:#16a34a; box-shadow:0 18px 36px rgba(22,163,74,.28); opacity:0; transform:translateY(10px); transition:.2s ease; font-size:13px; font-weight:750; }
    .toast.show { opacity:1; transform:translateY(0); }
    @media (max-width: 980px) { .layout { display:block; width:min(760px, calc(100vw - 24px)); } .toc { display:none; } .toolbar { align-items:flex-start; flex-direction:column; } .actions { flex-wrap:wrap; } }
  </style>
</head>
<body>
  <header class="toolbar">
    <div class="brand">
      <div class="logo">𝕸</div>
      <div class="meta">
        <div class="meta-title">${safeTitle}</div>
      </div>
    </div>
    <div class="actions">
      <button class="secondary" onclick="copyText(${JSON.stringify(data.title)})">复制标题</button>
      <button class="secondary" onclick="copyText(${JSON.stringify(data.summary)})">复制摘要</button>
      <button class="primary" onclick="copyArticle()">一键复制公众号富文本</button>
    </div>
  </header>
  <main class="layout">
    <div class="main-col">
      <section class="title-card">
        <div class="title-eyebrow">NicMD Weixin Article</div>
        <h1 class="article-title">${safeTitle}</h1>
        ${safeSubtitle ? `<p class="article-subtitle">${safeSubtitle}</p>` : ''}
      </section>
      <section class="summary-card">
        <div class="summary-label">摘要</div>
        <div class="summary-text" id="summaryText">${safeSummary}</div>
      </section>
      <div class="body-divider">Body</div>
      <div class="phone"><article id="article" class="article">${data.articleHtml}</article></div>
      <div class="path">${safePath}</div>
    </div>
    <aside class="toc" id="toc"><div class="toc-title">目录</div></aside>
  </main>
  <div id="lightbox" class="lightbox" onclick="closeLightbox()"><button class="lightbox-close">关闭</button><img id="lightboxImg" alt="preview" /></div>
  <div id="toast" class="toast">已复制，去公众号粘贴</div>
  <script>
    buildToc()
    styleReferenceSection()
    setupImageLightbox()
    setupImageCopyButtons()
    setupActiveToc()

    function copyText(text) {
      const value = text || ''
      fallbackCopyText(value)
      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(value).catch(() => {})
      }
      showToast('已复制')
    }
    async function copyArticle() {
      const article = document.getElementById('article')
      const copyRoot = createCopyRoot(article)
      try {
        await hydrateCopyImages(copyRoot)
        fallbackCopy(copyRoot)
        showToast('已复制白底正文，若图片仍失败请用“复制此图”逐张补入')
      } catch (e) {
        try {
          fallbackCopy(copyRoot)
          showToast('已复制白底正文，图片请逐张检查')
        } catch (_) {
          showToast('复制失败，请手动选择正文区域复制')
        }
      } finally {
        copyRoot.remove()
      }
    }
    function createCopyRoot(article) {
      const copyRoot = article.cloneNode(true)
      copyRoot.id = 'nicmd-copy-root'
      copyRoot.style.position = 'fixed'
      copyRoot.style.left = '-99999px'
      copyRoot.style.top = '0'
      copyRoot.style.width = '680px'
      copyRoot.style.padding = '0'
      copyRoot.style.margin = '0'
      copyRoot.style.background = '#fff'
      copyRoot.querySelectorAll('h1,h2,h3,h4,section,div,blockquote').forEach(node => {
        node.style.background = 'transparent'
        node.style.boxShadow = 'none'
      })
      copyRoot.querySelectorAll('.image-copy-btn').forEach(button => button.remove())
      document.body.appendChild(copyRoot)
      return copyRoot
    }
    async function hydrateCopyImages(root) {
      const images = Array.from(root.querySelectorAll('img'))
      await Promise.all(images.map(async img => {
        img.src = new URL(img.getAttribute('src') || img.src, window.location.href).href
        img.crossOrigin = 'anonymous'
        if (img.decode) await img.decode().catch(() => {})
      }))
    }
    function fallbackCopy(element) {
      const range = document.createRange()
      range.selectNodeContents(element)
      const selection = window.getSelection()
      selection.removeAllRanges()
      selection.addRange(range)
      document.execCommand('copy')
      selection.removeAllRanges()
    }
    function fallbackCopyText(text) {
      const textarea = document.createElement('textarea')
      textarea.value = text
      textarea.style.position = 'fixed'
      textarea.style.left = '-9999px'
      document.body.appendChild(textarea)
      textarea.focus()
      textarea.select()
      document.execCommand('copy')
      textarea.remove()
    }
    function buildToc() {
      const toc = document.getElementById('toc')
      const article = document.getElementById('article')
      if (!toc || !article) return
      const headings = Array.from(article.querySelectorAll('h2,h3')).filter(heading => !heading.innerText.includes('参考资料'))
      headings.forEach((heading, index) => {
        const id = 'toc-' + index
        heading.id = id
        heading.style.scrollMarginTop = '92px'
        const link = document.createElement('a')
        link.href = '#' + id
        link.dataset.target = id
        link.textContent = heading.innerText.replace(/^#+\\s*/, '')
        link.className = heading.tagName.toLowerCase()
        link.addEventListener('click', event => {
          event.preventDefault()
          const y = heading.getBoundingClientRect().top + window.scrollY - 86
          window.scrollTo({ top: Math.max(0, y), behavior: 'smooth' })
        })
        toc.appendChild(link)
      })
      if (headings.length === 0) toc.style.display = 'none'
    }
    function setupImageLightbox() {
      const box = document.getElementById('lightbox')
      const boxImg = document.getElementById('lightboxImg')
      document.querySelectorAll('#article img').forEach(img => {
        img.addEventListener('click', () => {
          boxImg.src = img.src
          box.classList.add('show')
        })
      })
      document.addEventListener('keydown', event => {
        if (event.key === 'Escape') closeLightbox()
      })
    }
    function closeLightbox() {
      const box = document.getElementById('lightbox')
      const boxImg = document.getElementById('lightboxImg')
      box.classList.remove('show')
      boxImg.src = ''
    }
    function setupImageCopyButtons() {
      document.querySelectorAll('#article figure').forEach(figure => {
        const img = figure.querySelector('img')
        if (!img) return
        const button = document.createElement('button')
        button.type = 'button'
        button.className = 'image-copy-btn'
        button.textContent = '复制圆角图'
        button.addEventListener('click', async event => {
          event.preventDefault()
          event.stopPropagation()
          await copySingleImage(img)
        })
        figure.appendChild(button)
      })
    }
    async function copySingleImage(img) {
      try {
        const url = new URL(img.getAttribute('src') || img.src, window.location.href).href
        const response = await fetch(url)
        const blob = await response.blob()
        const output = await imageBlobToRoundedPng(blob, img)
        await navigator.clipboard.write([new ClipboardItem({ 'image/png': output })])
        showToast('圆角图片已复制，可到公众号正文里粘贴')
      } catch (e) {
        showToast('单图复制失败，请右键图片复制')
      }
    }
    function imageBlobToRoundedPng(blob, sourceImg) {
      return new Promise((resolve, reject) => {
        const img = new Image()
        img.onload = () => {
          const radius = Number.parseFloat(sourceImg.style.borderRadius || '18') || 18
          const border = 1
          const shadow = 28
          const canvas = document.createElement('canvas')
          canvas.width = img.naturalWidth + shadow * 2
          canvas.height = img.naturalHeight + shadow * 2
          const ctx = canvas.getContext('2d')
          if (!ctx) return reject(new Error('Canvas 不可用'))
          ctx.clearRect(0, 0, canvas.width, canvas.height)
          ctx.save()
          ctx.shadowColor = 'rgba(100,70,22,.18)'
          ctx.shadowBlur = 22
          ctx.shadowOffsetY = 10
          roundedRect(ctx, shadow, shadow, img.naturalWidth, img.naturalHeight, radius)
          ctx.fillStyle = '#ffffff'
          ctx.fill()
          ctx.restore()
          ctx.save()
          roundedRect(ctx, shadow, shadow, img.naturalWidth, img.naturalHeight, radius)
          ctx.clip()
          ctx.drawImage(img, shadow, shadow)
          ctx.restore()
          ctx.save()
          roundedRect(ctx, shadow + border / 2, shadow + border / 2, img.naturalWidth - border, img.naturalHeight - border, radius)
          ctx.strokeStyle = 'rgba(121,85,35,.14)'
          ctx.lineWidth = border
          ctx.stroke()
          ctx.restore()
          canvas.toBlob(result => result ? resolve(result) : reject(new Error('图片转换失败')), 'image/png')
        }
        img.onerror = reject
        img.src = URL.createObjectURL(blob)
      })
    }
    function roundedRect(ctx, x, y, width, height, radius) {
      const r = Math.min(radius, width / 2, height / 2)
      ctx.beginPath()
      ctx.moveTo(x + r, y)
      ctx.arcTo(x + width, y, x + width, y + height, r)
      ctx.arcTo(x + width, y + height, x, y + height, r)
      ctx.arcTo(x, y + height, x, y, r)
      ctx.arcTo(x, y, x + width, y, r)
      ctx.closePath()
    }
    function setupActiveToc() {
      const headings = Array.from(document.querySelectorAll('#article h2,#article h3')).filter(heading => !heading.innerText.includes('参考资料'))
      const links = Array.from(document.querySelectorAll('#toc a'))
      if (!headings.length || !links.length) return
      const activate = () => {
        let current = headings[0]
        for (const heading of headings) {
          if (heading.getBoundingClientRect().top <= 120) current = heading
          else break
        }
        links.forEach(link => {
          const active = link.dataset.target === current.id
          link.classList.toggle('active', active)
          if (active) link.scrollIntoView({ block: 'nearest' })
        })
      }
      activate()
      window.addEventListener('scroll', activate, { passive: true })
    }
    window.closeLightbox = closeLightbox
    function styleReferenceSection() {
      const article = document.getElementById('article')
      if (!article) return
      const headings = Array.from(article.querySelectorAll('h2,h3,h4'))
      const ref = headings.find(h => h.innerText.includes('参考资料'))
      if (!ref) return
      ref.classList.add('reference-heading')
      ref.style.boxShadow = 'none'
      ref.style.background = 'transparent'
      ref.style.borderLeft = 'none'
      ref.style.borderRadius = '0'
      let node = ref.nextElementSibling
      while (node) {
        node.style.color = '#86868b'
        node.style.fontSize = '12px'
        node.style.lineHeight = '1.75'
        node.querySelectorAll?.('a').forEach(a => {
          a.style.color = '#6e6e73'
          a.style.borderBottomColor = 'rgba(110,110,115,.24)'
        })
        node = node.nextElementSibling
      }
    }
    function showToast(text) {
      const toast = document.getElementById('toast')
      toast.textContent = text
      toast.classList.add('show')
      setTimeout(() => toast.classList.remove('show'), 1800)
    }
  </script>
</body>
</html>`
}

function sendHtml(res: ServerResponse, status: number, html: string) {
  res.writeHead(status, {
    'Content-Type': 'text/html; charset=utf-8',
    'Cache-Control': 'no-cache'
  })
  res.end(html)
}

function renderErrorPage(title: string, message: string) {
  const t = ACTIVE_WECHAT_THEME
  return `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><title>${escapeHtml(title)}</title></head><body style="font-family:${WECHAT_FONT_FAMILY};padding:32px;background:${t.surfaceSoft};color:${t.text};"><h1>${escapeHtml(title)}</h1><pre style="white-space:pre-wrap;line-height:1.8;color:${t.textSoft};">${escapeHtml(message)}</pre></body></html>`
}

function getMimeType(filePath: string) {
  const ext = extname(filePath).toLowerCase()
  if (ext === '.png') return 'image/png'
  if (ext === '.jpg' || ext === '.jpeg') return 'image/jpeg'
  if (ext === '.gif') return 'image/gif'
  if (ext === '.webp') return 'image/webp'
  if (ext === '.svg') return 'image/svg+xml'
  if (ext === '.html' || ext === '.htm') return 'text/html; charset=utf-8'
  return 'application/octet-stream'
}

export async function killWeixinServers(): Promise<void> {
  // 双重机制：PID 注册表 + 系统进程扫描兜底
  const registryPids = (await readPidRegistry()).map(e => e.pid)
  const systemPids = findWeixinProcessPids()
  const allPids = [...new Set([...registryPids, ...systemPids])]

  if (allPids.length === 0) {
    console.log('No NicMD weixin servers running.')
    return
  }

  let killed = 0
  for (const pid of allPids) {
    try {
      process.kill(pid)
      killed++
    } catch {
      // 进程已不存在或无权限，忽略
    }
  }

  // Windows 下 taskkill 兜底（process.kill 有时不够）
  if (process.platform === 'win32') {
    for (const pid of allPids) {
      try {
        execSync(`taskkill /PID ${pid} /F`, { stdio: 'ignore' })
      } catch {
        // 已杀掉或不存在
      }
    }
  }

  await writePidRegistry([])
  console.log(`Stopped ${killed} NicMD weixin server(s).`)
  console.log(`Scanned PIDs: ${allPids.join(', ')}`)
}

export async function listWeixinServers(): Promise<void> {
  const entries = await readPidRegistry()
  const systemPids = findWeixinProcessPids()

  // 合并：注册表中的 + 系统扫描发现的
  const registryPids = new Set(entries.map(e => e.pid))
  const orphanPids = systemPids.filter(pid => !registryPids.has(pid))

  if (entries.length === 0 && orphanPids.length === 0) {
    console.log('No NicMD weixin servers running.')
    return
  }

  console.log('NicMD weixin servers:')
  console.log('')
  for (const entry of entries) {
    const alive = isProcessAlive(entry.pid)
    const status = alive ? 'running' : 'dead'
    console.log(`  PID ${entry.pid}  port ${entry.port}  [${status}]`)
    console.log(`    file: ${entry.file}`)
    console.log(`    started: ${entry.startedAt}`)
    console.log('')
  }

  if (orphanPids.length > 0) {
    console.log('Orphaned weixin processes (found in system, not in registry):')
    for (const pid of orphanPids) {
      console.log(`  PID ${pid}  [running]`)
    }
    console.log('')
  }

  console.log(`Total: ${entries.length + orphanPids.length} process(es)`)
  console.log('Run "nicmd kill" to stop all of them.')
}

function findWeixinProcessPids(): number[] {
  if (process.platform !== 'win32') return []
  try {
    // wmic 查找所有 NicMD.exe 进程，命令行以 weixin/wxarticle 作为独立参数的
    // 只匹配命令行参数（紧跟在 exe 路径后的第一个 token），避免误杀打开 weixin-xxx.md 文件的桌面端
    const output = execSync(
      'wmic process where "name=\'NicMD.exe\'" get processid,commandline /format:csv',
      { encoding: 'utf-8', timeout: 5000 }
    )
    const pids: number[] = []
    for (const line of output.split('\n')) {
      const trimmed = line.trim()
      if (!trimmed) continue
      // CSV 格式: Node,CommandLine,ProcessId
      const parts = trimmed.split(',')
      const pidStr = parts[parts.length - 1]
      const cmdline = parts.slice(1, -1).join(',')
      const pid = parseInt(pidStr, 10)
      if (isNaN(pid)) continue

      // 解析命令行参数：exe 路径后的第一个参数是否是 weixin 或 wxarticle
      // 命令行格式: "C:\...\NicMD.exe" weixin "D:\article.md"
      const argMatch = cmdline.match(/NicMD\.exe"?\s+(weixin|wxarticle)\b/i)
      if (argMatch) {
        pids.push(pid)
      }
    }
    return pids
  } catch {
    return []
  }
}

function isProcessAlive(pid: number): boolean {
  try {
    process.kill(pid, 0)
    return true
  } catch {
    return false
  }
}

