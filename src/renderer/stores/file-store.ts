import { create } from 'zustand'
import { FileNode } from '@shared/types'

type FileType = 'markdown' | 'pdf' | 'text' | 'unknown'

function getFileType(path: string): FileType {
  const ext = path.split('.').pop()?.toLowerCase() || ''
  if (['md', 'markdown', 'mdx'].includes(ext)) return 'markdown'
  if (ext === 'pdf') return 'pdf'
  if (['txt', 'json', 'yaml', 'yml', 'toml', 'xml', 'csv'].includes(ext)) return 'text'
  return 'unknown'
}

interface FileState {
  rootPath: string | null
  fileTree: FileNode[]
  currentFile: string | null
  currentContent: string
  isModified: boolean
  fileType: FileType
  recentFiles: string[]

  setRootPath: (path: string | null) => void
  setFileTree: (tree: FileNode[]) => void
  setCurrentFile: (path: string | null) => void
  setCurrentContent: (content: string) => void
  setIsModified: (modified: boolean) => void
  toggleFolder: (path: string) => void
  updateFileTree: () => Promise<void>
  addRecentFile: (path: string, promote?: boolean) => void
}

function toggleInTree(nodes: FileNode[], targetPath: string): FileNode[] {
  return nodes.map((node) => {
    if (node.path === targetPath && node.isDirectory) {
      return { ...node, expanded: !node.expanded }
    }
    if (node.children) {
      return { ...node, children: toggleInTree(node.children, targetPath) }
    }
    return node
  })
}

const MAX_RECENT = 20

function loadRecent(): string[] {
  try {
    const data = localStorage.getItem('nicmd-recent-files')
    return data ? JSON.parse(data) : []
  } catch { return [] }
}

function saveRecent(files: string[]) {
  try { localStorage.setItem('nicmd-recent-files', JSON.stringify(files)) } catch {}
}

export const useFileStore = create<FileState>((set, get) => ({
  rootPath: null,
  fileTree: [],
  currentFile: null,
  currentContent: '',
  isModified: false,
  fileType: 'markdown',
  recentFiles: loadRecent(),

  setRootPath: (path) => set({ rootPath: path }),
  setFileTree: (tree) => set({ fileTree: tree }),
  setCurrentFile: (path) => set({
    currentFile: path,
    fileType: path ? getFileType(path) : 'markdown'
  }),
  setCurrentContent: (content) => set({ currentContent: content, isModified: true }),
  setIsModified: (modified) => set({ isModified: modified }),

  toggleFolder: (path) => {
    set((state) => ({
      fileTree: toggleInTree(state.fileTree, path)
    }))
  },

  updateFileTree: async () => {
    const { rootPath } = get()
    if (!rootPath) return
    try {
      const tree = await window.api.file.tree(rootPath)
      set({ fileTree: tree })
    } catch (e) {
      console.error('Failed to update file tree:', e)
    }
  },

  addRecentFile: (path, promote = false) => {
    const { recentFiles } = get()
    if (recentFiles.includes(path) && !promote) return
    const filtered = recentFiles.filter(f => f !== path)
    const updated = [path, ...filtered].slice(0, MAX_RECENT)
    set({ recentFiles: updated })
    saveRecent(updated)
  }
}))
