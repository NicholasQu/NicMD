import { ipcMain, nativeTheme } from 'electron'
import { BrowserWindow } from 'electron'

export function registerWindowIPC(getMainWindow: () => BrowserWindow | null): void {
  ipcMain.handle('theme:change', (_event, theme: 'light' | 'dark') => {
    nativeTheme.themeSource = theme
  })

  ipcMain.handle('window:minimize', () => {
    getMainWindow()?.minimize()
  })

  ipcMain.handle('window:maximize', () => {
    const mainWindow = getMainWindow()
    if (mainWindow?.isMaximized()) {
      mainWindow.unmaximize()
    } else {
      mainWindow?.maximize()
    }
  })

  ipcMain.handle('window:close', () => {
    getMainWindow()?.close()
  })

  ipcMain.handle('window:is-maximized', () => {
    return getMainWindow()?.isMaximized() || false
  })
}
