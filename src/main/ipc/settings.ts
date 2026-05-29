import { ipcMain, app } from 'electron'
import { join } from 'path'
import { readFile, writeFile, mkdir } from 'fs/promises'
import { existsSync } from 'fs'

const SETTINGS_FILE = 'settings.json'

function getSettingsPath(): string {
  return join(app.getPath('userData'), SETTINGS_FILE)
}

export function registerSettingsIPC(): void {
  ipcMain.handle('settings:load', async () => {
    try {
      const filePath = getSettingsPath()
      if (!existsSync(filePath)) return {}
      const raw = await readFile(filePath, 'utf-8')
      return JSON.parse(raw)
    } catch {
      return {}
    }
  })

  ipcMain.handle('settings:save', async (_event, data: Record<string, unknown>) => {
    try {
      const filePath = getSettingsPath()
      const dir = join(app.getPath('userData'))
      if (!existsSync(dir)) await mkdir(dir, { recursive: true })
      await writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8')
      return { success: true }
    } catch (e: any) {
      return { success: false, error: e.message }
    }
  })
}
