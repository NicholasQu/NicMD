export interface FileNode {
  name: string
  path: string
  isDirectory: boolean
  children?: FileNode[]
  expanded?: boolean
}

export interface EditorState {
  content: string
  filePath: string | null
  fileName: string | null
  isModified: boolean
  cursorPosition: { line: number; column: number }
}

export interface AppState {
  theme: 'light' | 'dark'
  sidebarWidth: number
  editorRatio: number
  sidebarVisible: boolean
  previewVisible: boolean
  activeTab: 'editor' | 'preview' | 'split'
}

export interface HeadingItem {
  id: string
  level: number
  text: string
  line: number
}

export interface SearchResult {
  filePath: string
  fileName: string
  line: number
  column: number
  text: string
  match: string
}

export interface IPCChannel {
  'file:read': (path: string) => Promise<string>
  'file:write': (path: string, content: string) => Promise<void>
  'file:delete': (path: string) => Promise<void>
  'file:rename': (oldPath: string, newName: string) => Promise<string>
  'file:create': (path: string, isDirectory: boolean) => Promise<void>
  'file:tree': (dirPath: string) => Promise<FileNode[]>
  'file:open-dialog': () => Promise<string | null>
  'file:save-dialog': (defaultName: string) => Promise<string | null>
  'app:get-version': () => Promise<string>
  'theme:change': (theme: 'light' | 'dark') => Promise<void>
}
