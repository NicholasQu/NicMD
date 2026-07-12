import { BrowserWindow, app } from 'electron'
import { readFile, writeFile, unlink } from 'fs/promises'
import { join } from 'path'
import * as mammoth from 'mammoth'
import { buildPdfHtml } from './pdf-builder'
import { startWxArticleServer, killWeixinServers, listWeixinServers } from './wxarticle-server'
import { WECHAT_THEMES } from '../shared/wechat-theme'

export function getCliArgs(argv: string[]): string[] {
  return argv.slice(1).filter(a =>
    a !== '.' &&
    !a.startsWith('--allow-file') &&
    !a.startsWith('--no-sandbox') &&
    !a.startsWith('--enable-')
  )
}

export function isCliOnlyCommand(argv: string[]): boolean {
  const args = getCliArgs(argv)
  return args.some(a => ['weixin', 'wxarticle', 'help', '--help', '-h', '--version', '-v', 'kill', '--kill', 'ps', '--ps', 'list'].includes(a))
}

export async function handleCli(argv: string[]): Promise<void> {
  const args = getCliArgs(argv)
  if (args.length === 0) return

  const helpRequested = args.includes('help') || args.includes('--help') || args.includes('-h')
  const weixinIdx = args.findIndex(a => a === 'weixin' || a === 'wxarticle')

  if (weixinIdx >= 0 && helpRequested) {
    printWeixinHelp()
    return
  }

  if (helpRequested) {
    printHelp()
    return
  }

  if (args.includes('--version') || args.includes('-v')) {
    console.log(app.getVersion())
    return
  }

  if (args.includes('kill') || args.includes('--kill')) {
    await killWeixinServers()
    return
  }

  if (args.includes('ps') || args.includes('--ps') || args.includes('list')) {
    await listWeixinServers()
    return
  }

  if (weixinIdx >= 0) {
    const inputPath = args[weixinIdx + 1]
    if (!inputPath || inputPath.startsWith('-')) { console.log('Usage: NicMD.exe weixin input.md [--theme appleGold] [--port 37621] [--no-open]'); return }
    const portIdx = args.indexOf('--port')
    const port = portIdx >= 0 ? Number(args[portIdx + 1]) : undefined
    const themeIdx = args.indexOf('--theme')
    const theme = themeIdx >= 0 ? args[themeIdx + 1] : undefined
    const watermarkIdx = args.indexOf('--watermark')
    const watermark = args.includes('--no-watermark')
      ? ''
      : watermarkIdx >= 0
        ? args[watermarkIdx + 1] || ''
        : undefined
    const watermarkColorIdx = args.indexOf('--watermark-color')
    const watermarkColor = watermarkColorIdx >= 0 ? args[watermarkColorIdx + 1] : undefined
    const watermarkOpacityIdx = args.indexOf('--watermark-opacity')
    const watermarkOpacity = watermarkOpacityIdx >= 0 ? Number(args[watermarkOpacityIdx + 1]) : undefined
    if (theme && !(theme in WECHAT_THEMES)) {
      console.log(`Unknown theme: ${theme}`)
      console.log(`Available themes: ${Object.keys(WECHAT_THEMES).join(', ')}`)
      return
    }
    await startWxArticleServer({
      inputPath,
      port: Number.isFinite(port) ? port : undefined,
      open: !args.includes('--no-open'),
      theme,
      watermark,
      watermarkColor,
      watermarkOpacity: Number.isFinite(watermarkOpacity) ? watermarkOpacity : undefined
    })
    return
  }

  const exportIdx = args.indexOf('--export-pdf')
  const convertIdx = args.indexOf('--convert-docx')
  const aiIdx = args.indexOf('--ai-write')

  if (exportIdx >= 0) {
    const inputPath = args[exportIdx + 1]
    if (!inputPath) { console.log('Usage: NicMD.exe --export-pdf input.md [output.pdf]'); return }
    try {
      const content = await readFile(inputPath, 'utf-8')
      const nextArg = args[exportIdx + 2]
      const outPath = (nextArg && !nextArg.startsWith('-'))
        ? nextArg
        : inputPath.replace(/\.(md|markdown|mdx|txt)$/i, '.pdf')
      const html = buildPdfHtml(content)
      const os = require('os')
      const tempPath = join(os.tmpdir(), `nicmd-cli-${Date.now()}.html`)
      await writeFile(tempPath, html, 'utf-8')

      const pdfWin = new BrowserWindow({
        width: 800, height: 1100, show: false,
        webPreferences: { sandbox: false, contextIsolation: true, nodeIntegration: false, preload: join(__dirname, '../preload/index.js') }
      })
      await pdfWin.loadFile(tempPath)
      await new Promise(r => setTimeout(r, 500))
      const pdfData = await pdfWin.webContents.printToPDF({
        pageSize: 'A4', printBackground: true,
        margins: { top: 48, bottom: 48, left: 48, right: 48 }, scaleFactor: 100
      })
      pdfWin.close()
      await writeFile(outPath, pdfData)
      try { await unlink(tempPath) } catch {}
      console.log(`PDF exported: ${outPath}`)
    } catch (e: any) {
      console.error('PDF export failed:', e.message)
    }
    return
  }

  if (convertIdx >= 0) {
    const inputPath = args[convertIdx + 1]
    if (!inputPath) { console.log('Usage: NicMD.exe --convert-docx input.docx [output.md]'); return }
    try {
      const buffer = await readFile(inputPath)
      const result = await mammoth.convertToMarkdown({ buffer })
      const nextArg = args[convertIdx + 2]
      const outPath = (nextArg && !nextArg.startsWith('-'))
        ? nextArg
        : inputPath.replace(/\.docx?$/i, '.md')
      await writeFile(outPath, result.value, 'utf-8')
      console.log(`Converted: ${inputPath} -> ${outPath}`)
    } catch (e: any) {
      console.error('DOCX conversion failed:', e.message)
    }
    return
  }

  if (aiIdx >= 0) {
    console.log('AI writing requires GUI mode. Please open NicMD and use the AI panel.')
    console.log('  API Key and prompts are configured in the AI panel settings.')
    return
  }
}

function printHelp(): void {
  console.log(`NicMD - Markdown writing and publishing toolkit

Usage:
  nicmd <file.md>
      Open a Markdown file in the NicMD desktop editor.

  nicmd weixin <file.md> [options]
      Start a local WeChat article preview server for the Markdown file.
      Use this when preparing an article for WeChat Official Accounts.

  nicmd --export-pdf <input.md> [output.pdf]
      Render Markdown to PDF. If output.pdf is omitted, NicMD writes next to input.md.

  nicmd --convert-docx <input.docx> [output.md]
      Convert a DOCX draft to Markdown. If output.md is omitted, NicMD writes next to input.docx.

  nicmd --version
      Print the installed NicMD version.

  nicmd kill
      Stop all running weixin preview servers and release their ports.

  nicmd ps
      List all running weixin preview servers (PID, port, file).

Commands:
  weixin, wxarticle        WeChat Official Account publishing preview.
  kill                     Stop all weixin preview servers.
  ps, list                 List running weixin preview servers.
  help, -h, --help         Show this global help.

Common options:
  -v, --version            Show NicMD version.

WeChat options:
  --theme <name>           Article theme. Available: ${Object.keys(WECHAT_THEMES).join(', ')}.
                           Default: appleGold.
  --port <port>            Bind the preview server to a fixed local port.
  --no-open                Start the server without opening a browser.
  --watermark <text>       Set image watermark text. Default: 曲水流觞TechRill.
  --watermark-color <hex>  Set image watermark color, for example #fb923c.
  --watermark-opacity <n>  Set image watermark opacity from 0 to 1. Default: 0.72.
  --no-watermark           Disable image watermarks.

More help:
  nicmd weixin --help      Show detailed WeChat publishing help.

Examples:
  nicmd article.md
  nicmd weixin article.md
  nicmd weixin article.md --theme appleGold
  nicmd weixin article.md --theme appleOrange --port 37621 --no-open
  nicmd weixin article.md --watermark "曲水流觞TechRill" --watermark-color "#fb923c" --watermark-opacity 0.62
  nicmd --export-pdf article.md article.pdf
  nicmd --convert-docx draft.docx draft.md
`)
}

function printWeixinHelp(): void {
  console.log(`NicMD Weixin - WeChat Official Account article preview

Usage:
  nicmd weixin <file.md> [options]
  nicmd wxarticle <file.md> [options]

What it does:
  1. Reads the Markdown file.
  2. Normalizes heading levels for article body structure.
  3. Converts Markdown to WeChat-friendly HTML with inline styles.
  4. Starts a local preview server at 127.0.0.1.
  5. Provides one-click rich-text copy for WeChat Official Account editor.

Options:
  --theme <name>
      Select a WeChat article theme.

      appleGold     Default. Gilded cinnabar style: warm gold background,
                    cinnabar-orange headings, rounded chapter cards.
      appleOrange   Brighter orange style for more energetic articles.
      appleBlue     Blue technical style for cooler engineering notes.

  --port <port>
      Use a fixed local port, for example --port 37621.
      Useful when scripts or browser bookmarks depend on a stable URL.

  --no-open
      Do not open the browser automatically. The server URL is printed in terminal.

  --watermark <text>
      Set the image watermark text. Use this for your own public brand or source label.
      Default: 曲水流觞TechRill.

  --watermark-color <hex>
      Set the image watermark color as #rgb or #rrggbb.
      Quote the value in PowerShell, for example --watermark-color "#fb923c".
      Default: #fb923c.

  --watermark-opacity <n>
      Set the image watermark opacity from 0 to 1.
      Default: 0.72.

  --no-watermark
      Disable image watermarks.

  -h, --help
      Show this help.

Examples:
  nicmd weixin article.md
  nicmd weixin article.md --theme appleGold
  nicmd weixin article.md --theme appleOrange
  nicmd weixin article.md --theme appleGold --port 37621 --no-open
  nicmd weixin article.md --watermark "曲水流觞TechRill" --watermark-color "#fb923c" --watermark-opacity 0.62

Notes:
  - The preview server only binds to 127.0.0.1.
  - Press Ctrl+C to stop the server and release the port.
  - The default appleGold theme is optimized for WeChat article publishing.
`)
}
