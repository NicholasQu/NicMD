import { ipcMain, BrowserWindow } from 'electron'
import { readFile, writeFile, unlink } from 'fs/promises'
import { dirname, basename, join } from 'path'
import { existsSync } from 'fs'
import * as mammoth from 'mammoth'
import { buildPdfHtml } from '../pdf-builder'

export function registerExportIPC(getMainWindow: () => BrowserWindow | null): void {
  ipcMain.handle('export:pdf', async (_event, data: { path: string; content: string }) => {
    const { path: pdfPath, content } = data
    try {
      const html = buildPdfHtml(content)
      const os = require('os')
      const tempPath = join(os.tmpdir(), `nicmd-export-${Date.now()}.html`)
      await writeFile(tempPath, html, 'utf-8')

      const mainWindow = getMainWindow()
      const pdfWin = new BrowserWindow({
        width: 800,
        height: 1100,
        show: false,
        webPreferences: {
          sandbox: false,
          contextIsolation: true,
          nodeIntegration: false,
          preload: join(__dirname, '../../preload/index.js')
        }
      })

      await pdfWin.loadFile(tempPath)
      await new Promise(r => setTimeout(r, 500))

      const pdfData = await pdfWin.webContents.printToPDF({
        pageSize: 'A4',
        printBackground: true,
        margins: { top: 0.5, bottom: 0.5, left: 0.5, right: 0.5 },
        scaleFactor: 100
      })

      pdfWin.close()
      await writeFile(pdfPath, pdfData)
      try { await unlink(tempPath) } catch {}
      return { success: true, path: pdfPath }
    } catch (e: any) {
      console.error('[export:pdf] Failed:', e.message)
      return { success: false, error: e.message }
    }
  })

  ipcMain.handle('convert:docx', async (_event, docxPath: string) => {
    try {
      const buffer = await readFile(docxPath)
      const result = await mammoth.convertToMarkdown({ buffer })
      const mdPath = docxPath.replace(/\.docx?$/i, '.md')
      await writeFile(mdPath, result.value, 'utf-8')
      return { success: true, path: mdPath, content: result.value }
    } catch (e: any) {
      console.error('[convert:docx] Failed:', e.message)
      return { success: false, error: e.message }
    }
  })

  ipcMain.handle('docx:to-markdown', async (_event, docxPath: string) => {
    try {
      const buffer = await readFile(docxPath)
      const result = await mammoth.convertToMarkdown({ buffer })
      const mdPath = docxPath.replace(/\.docx?$/i, '.md')
      await writeFile(mdPath, result.value, 'utf-8')
      return { success: true, path: mdPath, content: result.value }
    } catch (e: any) {
      console.error('[docx:to-markdown] Failed:', e.message)
      return { success: false, error: e.message }
    }
  })
}
