import { BrowserWindow } from 'electron'
import { readFile, writeFile, unlink } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'
import * as mammoth from 'mammoth'
import { buildPdfHtml } from './pdf-builder'

export async function handleCli(argv: string[]): Promise<void> {
  const args = argv.slice(1).filter(a => !a.startsWith('--allow-file') && !a.startsWith('--no-sandbox') && !a.startsWith('--enable-'))
  if (args.length === 0) return

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
