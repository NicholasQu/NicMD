import { contextBridge, ipcRenderer } from 'electron'

const api = {
  file: {
    read: (path: string): Promise<string> => ipcRenderer.invoke('file:read', path),
    write: (path: string, content: string): Promise<void> => ipcRenderer.invoke('file:write', path, content),
    delete: (path: string): Promise<void> => ipcRenderer.invoke('file:delete', path),
    rename: (oldPath: string, newName: string): Promise<string> => ipcRenderer.invoke('file:rename', oldPath, newName),
    create: (path: string, isDirectory: boolean): Promise<void> => ipcRenderer.invoke('file:create', path, isDirectory),
    tree: (dirPath: string) => ipcRenderer.invoke('file:tree', dirPath),
    openDialog: (): Promise<string | null> => ipcRenderer.invoke('file:open-dialog'),
    openFolderDialog: (): Promise<string | null> => ipcRenderer.invoke('file:open-folder-dialog'),
    saveDialog: (defaultName: string): Promise<string | null> => ipcRenderer.invoke('file:save-dialog', defaultName),
    readBuffer: (path: string): Promise<string | null> => ipcRenderer.invoke('file:read-buffer', path),
    showInFolder: (path: string): Promise<void> => ipcRenderer.invoke('file:show-in-folder', path),
    onOpened: (callback: (data: { path: string; content: string }) => void) => {
      const handler = (_event: any, data: { path: string; content: string }) => callback(data)
      ipcRenderer.on('file:opened', handler)
      return () => ipcRenderer.removeListener('file:opened', handler)
    }
  },
  app: {
    getVersion: (): Promise<string> => ipcRenderer.invoke('app:get-version'),
    collectLogs: (): Promise<string> => ipcRenderer.invoke('app:collect-logs'),
    reportIssue: (title: string): Promise<string> => ipcRenderer.invoke('app:report-issue', title),
    writeError: (errorInfo: { message: string; stack?: string; context?: Record<string, string> }): Promise<string> =>
      ipcRenderer.invoke('app:write-error', errorInfo)
  },
  theme: {
    change: (theme: 'light' | 'dark'): Promise<void> => ipcRenderer.invoke('theme:change', theme)
  },
  window: {
    minimize: (): Promise<void> => ipcRenderer.invoke('window:minimize'),
    maximize: (): Promise<void> => ipcRenderer.invoke('window:maximize'),
    close: (): Promise<void> => ipcRenderer.invoke('window:close'),
    isMaximized: (): Promise<boolean> => ipcRenderer.invoke('window:is-maximized')
  },
  exportPdf: (data: { path: string; content: string }): Promise<{ success: boolean; path?: string; error?: string }> =>
    ipcRenderer.invoke('export:pdf', data),
  convertDocx: (docxPath: string): Promise<{ success: boolean; path?: string; content?: string; error?: string }> =>
    ipcRenderer.invoke('convert:docx', docxPath),
  llmGenerate: (params: {
    prompt: string
    apiKey: string
    apiBase: string
    model: string
    soul?: string
    skill?: string
    history?: { role: 'system' | 'user' | 'assistant'; content: string }[]
    enableTools?: boolean
  }): Promise<{ success: boolean; content?: string; error?: string }> =>
    ipcRenderer.invoke('llm:generate', params),
  onLlmStream: (callback: (data: { delta: string; done: boolean; full?: string; toolStatus?: { name: string; args?: string; status: string } }) => void) => {
    const handler = (_event: any, data: { delta: string; done: boolean; full?: string }) => callback(data)
    ipcRenderer.on('llm:stream', handler)
    return () => ipcRenderer.removeListener('llm:stream', handler)
  },
  settings: {
    load: (): Promise<Record<string, unknown>> => ipcRenderer.invoke('settings:load'),
    save: (data: Record<string, unknown>): Promise<{ success: boolean; error?: string }> => ipcRenderer.invoke('settings:save', data)
  },
  webSearch: {
    baidu: (query: string): Promise<{ success: boolean; results?: any[]; error?: string; engine: string }> =>
      ipcRenderer.invoke('web-search:baidu', query),
    wechat: (query: string): Promise<{ success: boolean; results?: any[]; error?: string; engine: string }> =>
      ipcRenderer.invoke('web-search:wechat', query)
  }
}

export type ElectronAPI = typeof api

contextBridge.exposeInMainWorld('api', api)