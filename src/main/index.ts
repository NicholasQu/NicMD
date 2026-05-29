import { app, BrowserWindow, ipcMain } from 'electron'
import { readFile } from 'fs/promises'
import { extname } from 'path'
import { existsSync } from 'fs'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { MD_EXTENSIONS } from '../shared/constants'
import { getMainWindow, setPendingFile, createMainWindow } from './window-manager'
import { registerFileIPC } from './ipc/file'
import { registerExportIPC } from './ipc/export'
import { registerLlmIPC } from './ipc/llm'
import { registerWindowIPC } from './ipc/window'
import { registerSettingsIPC } from './ipc/settings'
import { registerWebSearchIPC } from './ipc/web-search'
import { handleCli } from './cli'
import { setupErrorHandling, collectLogsForReport, generateIssueUrl, createReport, writeErrorLog } from './error-logger'

setupErrorHandling()

function isMarkdownFile(filePath: string): boolean {
  const ext = extname(filePath).toLowerCase()
  return MD_EXTENSIONS.includes(ext)
}

function openFile(filePath: string): void {
  const mainWindow = getMainWindow()
  if (!mainWindow) return
  readFile(filePath, 'utf-8').then((content) => {
    mainWindow!.webContents.send('file:opened', { path: filePath, content })
  }).catch((e: any) => {
    console.error('[openFile] Failed to read file:', e.message)
  })
}

function registerAppIPC(): void {
  ipcMain.handle('app:get-version', () => {
    return app.getVersion()
  })

  ipcMain.handle('app:collect-logs', async () => {
    return collectLogsForReport()
  })

  ipcMain.handle('app:report-issue', async (_event, title: string) => {
    const logs = await collectLogsForReport()
    const body = `## Bug Description\n\n(Describe the bug here)\n\n## Environment\n- App Version: ${app.getVersion()}\n- Platform: ${process.platform} ${process.arch}\n\n## Logs\n\`\`\`\n${logs}\n\`\`\``
    return generateIssueUrl(title, body)
  })

  ipcMain.handle('app:write-error', async (_event, errorInfo: { message: string; stack?: string; context?: Record<string, string> }) => {
    const report = createReport('renderer-error', errorInfo, errorInfo.context)
    const path = await writeErrorLog(report)
    return path
  })
}

function findFileArg(argv: string[]): string | null {
  for (let i = 1; i < argv.length; i++) {
    const arg = argv[i]
    if (!arg.startsWith('-') && existsSync(arg) && isMarkdownFile(arg)) {
      return arg
    }
  }
  return null
}

const gotTheLock = is.dev ? true : app.requestSingleInstanceLock()

if (!gotTheLock) {
  app.quit()
} else {
  if (!is.dev) {
    app.on('second-instance', (_event, argv) => {
      const fileArg = findFileArg(argv)
      if (fileArg) {
        const mainWindow = getMainWindow()
        if (mainWindow) {
          openFile(fileArg)
        } else {
          setPendingFile(fileArg)
        }
      }
      const mainWindow = getMainWindow()
      if (mainWindow) {
        if (mainWindow.isMinimized()) mainWindow.restore()
        mainWindow.focus()
      }
    })
  }

  app.whenReady().then(() => {
    electronApp.setAppUserModelId('com.nicmd')

    app.on('browser-window-created', (_, window) => {
      optimizer.watchWindowShortcuts(window)
    })

    registerFileIPC(getMainWindow)
    registerExportIPC(getMainWindow)
    registerLlmIPC(getMainWindow)
    registerWindowIPC(getMainWindow)
    registerSettingsIPC()
    registerWebSearchIPC(getMainWindow)
    registerAppIPC()

    createMainWindow(openFile)

    const fileArg = findFileArg(process.argv)
    if (fileArg) {
      setPendingFile(fileArg)
    }

    handleCli(process.argv)

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createMainWindow(openFile)
    })
  })

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      app.quit()
    }
  })
}
