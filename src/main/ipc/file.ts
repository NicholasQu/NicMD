import { ipcMain, dialog, BrowserWindow, shell } from 'electron'
import { readdir, readFile, writeFile, mkdir, rename, unlink } from 'fs/promises'
import { existsSync } from 'fs'
import { join, dirname, basename, extname } from 'path'
import { FileNode } from '../../shared/types'
import { sortFileNodes } from '../../shared/utils'
import { SHOW_EXTENSIONS } from '../../shared/constants'

async function readFileTree(dirPath: string): Promise<FileNode[]> {
  if (!existsSync(dirPath)) return []

  const entries = await readdir(dirPath, { withFileTypes: true })
  const nodes: FileNode[] = []

  for (const entry of entries) {
    if (entry.name.startsWith('.') || entry.name === 'node_modules' || entry.name === 'out' || entry.name === 'dist') continue

    const fullPath = join(dirPath, entry.name)
    if (entry.isDirectory()) {
      const children = await readFileTree(fullPath)
      if (children.length > 0) {
        nodes.push({
          name: entry.name,
          path: fullPath,
          isDirectory: true,
          children,
          expanded: false
        })
      }
    } else {
      const ext = extname(entry.name).toLowerCase()
      if (!SHOW_EXTENSIONS.includes(ext)) continue
      nodes.push({
        name: entry.name,
        path: fullPath,
        isDirectory: false
      })
    }
  }

  return sortFileNodes(nodes)
}

export function registerFileIPC(getMainWindow: () => BrowserWindow | null): void {
  ipcMain.handle('file:read', async (_event, filePath: string) => {
    try {
      const content = await readFile(filePath, 'utf-8')
      return content
    } catch (e: any) {
      console.error('[file:read] Failed:', e.message)
      return ''
    }
  })

  ipcMain.handle('file:write', async (_event, filePath: string, content: string) => {
    try {
      await writeFile(filePath, content, 'utf-8')
    } catch (e: any) {
      console.error('[file:write] Failed:', e.message)
      throw e
    }
  })

  ipcMain.handle('file:delete', async (_event, filePath: string) => {
    try {
      await unlink(filePath)
    } catch (e: any) {
      console.error('[file:delete] Failed:', e.message)
      throw e
    }
  })

  ipcMain.handle('file:rename', async (_event, oldPath: string, newName: string): Promise<string> => {
    const dir = dirname(oldPath)
    const newPath = join(dir, newName)
    await rename(oldPath, newPath)
    return newPath
  })

  ipcMain.handle('file:create', async (_event, filePath: string, isDir: boolean) => {
    if (isDir) {
      await mkdir(filePath, { recursive: true })
    } else {
      const dir = dirname(filePath)
      if (!existsSync(dir)) await mkdir(dir, { recursive: true })
      await writeFile(filePath, '', 'utf-8')
    }
  })

  ipcMain.handle('file:tree', async (_event, dirPath: string) => {
    return readFileTree(dirPath)
  })

  ipcMain.handle('file:open-dialog', async () => {
    const mainWindow = getMainWindow()
    const result = await dialog.showOpenDialog(mainWindow!, {
      properties: ['openFile'],
      filters: [
        { name: 'Markdown', extensions: ['md', 'markdown', 'mdx', 'txt'] },
        { name: 'All Files', extensions: ['*'] }
      ]
    })
    return result.filePaths.length > 0 ? result.filePaths[0] : null
  })

  ipcMain.handle('file:open-folder-dialog', async () => {
    const mainWindow = getMainWindow()
    const result = await dialog.showOpenDialog(mainWindow!, {
      properties: ['openDirectory']
    })
    return result.filePaths.length > 0 ? result.filePaths[0] : null
  })

  ipcMain.handle('file:save-dialog', async (_event, defaultName: string) => {
    const mainWindow = getMainWindow()
    const result = await dialog.showSaveDialog(mainWindow!, {
      defaultPath: defaultName,
      filters: [
        { name: 'Markdown', extensions: ['md'] },
        { name: 'All Files', extensions: ['*'] }
      ]
    })
    return result.filePath || null
  })

  ipcMain.handle('file:read-buffer', async (_event, filePath: string) => {
    try {
      const buffer = await readFile(filePath)
      return buffer.toString('base64')
    } catch (e: any) {
      console.error('[file:read-buffer] Failed:', e.message)
      return null
    }
  })

  ipcMain.handle('file:show-in-folder', async (_event, filePath: string) => {
    shell.showItemInFolder(filePath)
  })
}
