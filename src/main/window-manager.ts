import { BrowserWindow, shell, screen, Menu } from 'electron'
import { join } from 'path'
import { is } from '@electron-toolkit/utils'

let mainWindow: BrowserWindow | null = null
let pendingFile: string | null = null

export function getMainWindow(): BrowserWindow | null {
  return mainWindow
}

export function getPendingFile(): string | null {
  return pendingFile
}

export function setPendingFile(file: string | null): void {
  pendingFile = file
}

export function createMainWindow(openFileCallback: (filePath: string) => void): void {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore()
    mainWindow.focus()
    return
  }

  const splashSize = 240
  const { width: screenW, height: screenH } = screen.getPrimaryDisplay().workAreaSize

  mainWindow = new BrowserWindow({
    width: screenW,
    height: screenH,
    x: 0,
    y: 0,
    minWidth: 900,
    minHeight: 600,
    show: false,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    },
    backgroundColor: '#fef2f2'
  })

  mainWindow.setMenuBarVisibility(false)
  Menu.setApplicationMenu(null)

  const splashWin = new BrowserWindow({
    width: splashSize,
    height: splashSize,
    x: Math.round((screenW - splashSize) / 2),
    y: Math.round((screenH - splashSize) / 2),
    frame: false,
    transparent: true,
    resizable: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    show: false,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  splashWin.loadFile(join(__dirname, 'splash.html'))

  splashWin.once('ready-to-show', () => {
    splashWin.show()
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }

  mainWindow.once('ready-to-show', () => {
    if (is.dev) mainWindow?.webContents.openDevTools()

    const targetSize = 48
    const targetX = 16
    const targetY = 16

    const startX = Math.round((screenW - splashSize) / 2)
    const startY = Math.round((screenH - splashSize) / 2)

    const duration = 600
    const startTime = performance.now()

    const animate = (now: number) => {
      const elapsed = now - startTime
      const t = Math.min(elapsed / duration, 1)
      const ease = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2

      const cx = Math.round(startX + (targetX - startX) * ease)
      const cy = Math.round(startY + (targetY - startY) * ease)
      const cw = Math.round(splashSize + (targetSize - splashSize) * ease)
      const ch = Math.round(splashSize + (targetSize - splashSize) * ease)

      splashWin.setBounds({ x: cx, y: cy, width: cw, height: ch })
      splashWin.setOpacity(1 - t * 0.3)

      if (t < 1) {
        requestAnimationFrame(animate)
      } else {
        splashWin.close()
        mainWindow?.show()
        mainWindow?.maximize()
      }
    }

    setTimeout(() => requestAnimationFrame(animate), 200)
  })

  mainWindow.on('ready-to-show', () => {
    if (pendingFile) {
      openFileCallback(pendingFile)
      pendingFile = null
    }
  })

  mainWindow.on('closed', () => {
    mainWindow = null
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })
}
