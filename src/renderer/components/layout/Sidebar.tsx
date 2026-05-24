import { useState, useMemo } from 'react'
import { FileTree } from '../file-tree/FileTree'
import {
  FolderOpen,
  ChevronRight,
  ChevronDown,
  List,
  Plus,
  FolderPlus,
  Search,
  Clock,
  X
} from 'lucide-react'
import { useFileStore } from '../../stores/file-store'
import { useEditorStore } from '../../stores/editor-store'
import { useFileOpener } from '../../hooks/useFileOpener'
import { parseHeadings } from '../preview/MarkdownPreview'

export function Sidebar() {
  const rootPath = useFileStore((s) => s.rootPath)
  const setRootPath = useFileStore((s) => s.setRootPath)
  const updateFileTree = useFileStore((s) => s.updateFileTree)
  const currentContent = useFileStore((s) => s.currentContent)
  const [recentOpen, setRecentOpen] = useState(true)
  const [workspaceOpen, setWorkspaceOpen] = useState(true)
  const [outlineOpen, setOutlineOpen] = useState(false)
  const [searchActive, setSearchActive] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  const { openFile } = useFileOpener()
  const recentFiles = useFileStore((s) => s.recentFiles)
  const headings = useMemo(() => parseHeadings(currentContent), [currentContent])

  const handleOpenFolder = async () => {
    const path = await window.api.file.openFolderDialog()
    if (path) {
      setRootPath(path)
      updateFileTree()
    }
  }

  const handleNewFile = async () => {
    if (!rootPath) return
    let path = `${rootPath}/untitled.md`
    let counter = 1
    while (await window.api.file.read(path).catch(() => null) !== null) {
      path = `${rootPath}/untitled-${counter}.md`
      counter++
    }
    await window.api.file.create(path, false)
    const content = '# New File\n\nStart writing...\n'
    await window.api.file.write(path, content)
    const store = useFileStore.getState()
    store.setCurrentFile(path)
    store.setCurrentContent(content)
    store.setIsModified(false)
    store.addRecentFile(path)
    updateFileTree()
  }

  const handleNewFolder = async () => {
    if (!rootPath) return
    let path = `${rootPath}/new-folder`
    let counter = 1
    while (await window.api.file.read(path).catch(() => null) !== null) {
      path = `${rootPath}/new-folder-${counter}`
      counter++
    }
    await window.api.file.create(path, true)
    updateFileTree()
  }

  const handleHeadingClick = (line: number) => {
    useEditorStore.getState().setScrollToLine(line)
    setTimeout(() => {
      const heading = headings.find(h => h.line === line)
      if (!heading) return
      const el = document.getElementById(heading.id)
      if (el) {
        const container = el.closest('.overflow-y-auto')
        if (container) {
          const containerRect = container.getBoundingClientRect()
          const elRect = el.getBoundingClientRect()
          container.scrollTop += elRect.top - containerRect.top - 20
        }
      }
    }, 100)
  }

  return (
    <div className="h-full flex flex-col" style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}>
      <div className="flex items-center justify-between px-3 py-2 border-b" style={{ borderColor: 'var(--border-color)' }}>
        <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>
          Explorer
        </span>
        <div className="flex items-center gap-0.5">
          <button onClick={() => setSearchActive(!searchActive)} className="p-1 rounded hover:bg-[var(--accent-light)] transition-colors" title="Search Files">
            <Search size={14} style={{ color: 'var(--text-secondary)' }} />
          </button>
          <button onClick={handleNewFile} className="p-1 rounded hover:bg-[var(--accent-light)] transition-colors disabled:opacity-40" title="New File" disabled={!rootPath}>
            <Plus size={14} style={{ color: 'var(--text-secondary)' }} />
          </button>
          <button onClick={handleNewFolder} className="p-1 rounded hover:bg-[var(--accent-light)] transition-colors disabled:opacity-40" title="New Folder" disabled={!rootPath}>
            <FolderPlus size={14} style={{ color: 'var(--text-secondary)' }} />
          </button>
        </div>
      </div>

      {searchActive && (
        <div className="px-2 py-1.5 border-b" style={{ borderColor: 'var(--border-color)' }}>
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-md" style={{ background: 'var(--bg-tertiary)' }}>
            <Search size={12} style={{ color: 'var(--text-tertiary)' }} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search files..."
              className="flex-1 bg-transparent outline-none text-xs"
              style={{ color: 'var(--text-primary)' }}
              autoFocus
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')}>
                <X size={12} style={{ color: 'var(--text-tertiary)' }} />
              </button>
            )}
          </div>
        </div>
      )}

      <div className="flex-1 flex flex-col overflow-hidden min-h-0">
        <section className="border-b flex-shrink-0" style={{ borderColor: 'var(--border-color)' }}>
          <button onClick={() => setRecentOpen(!recentOpen)} className="w-full flex items-center justify-between px-3 py-2 hover:bg-[var(--accent-light)] transition-colors">
            <div className="flex items-center gap-1.5">
              <Clock size={13} style={{ color: 'var(--accent-color)' }} />
              <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>Recent</span>
            </div>
            {recentOpen ? <ChevronDown size={14} style={{ color: 'var(--text-tertiary)' }} /> : <ChevronRight size={14} style={{ color: 'var(--text-tertiary)' }} />}
          </button>
          {recentOpen && (
            <div className="px-1 pb-2 max-h-[220px] overflow-y-auto custom-scrollbar">
              {recentFiles.length > 0 ? recentFiles.slice(0, 10).map((path) => (
                <button
                  key={path}
                  className="w-full text-left rounded-lg px-2 py-1.5 transition-colors hover:bg-[var(--accent-light)] block"
                  style={{ color: 'var(--text-secondary)' }}
                  onClick={() => openFile(path)}
                  title={path}
                >
                  <span className="block truncate text-[13px]">{path.split(/[\\/]/).pop()}</span>
                  <span className="block truncate text-[10px] opacity-60">{path}</span>
                </button>
              )) : (
                <div className="px-2 py-2 text-xs leading-relaxed" style={{ color: 'var(--text-tertiary)' }}>
                  Recent documents will appear here.
                </div>
              )}
            </div>
          )}
        </section>

        <section className="border-b flex flex-col min-h-0" style={{ borderColor: 'var(--border-color)', flex: workspaceOpen ? '1 1 0%' : '0 0 auto' }}>
          <button onClick={() => setWorkspaceOpen(!workspaceOpen)} className="w-full flex items-center justify-between px-3 py-2 hover:bg-[var(--accent-light)] transition-colors flex-shrink-0">
            <div className="flex items-center gap-1.5 min-w-0">
              <FolderOpen size={13} style={{ color: 'var(--accent-color)' }} />
              <span className="text-xs font-semibold uppercase tracking-wider truncate" style={{ color: 'var(--text-tertiary)' }}>
                {rootPath ? rootPath.split(/[\\/]/).pop() : 'Workspace'}
              </span>
            </div>
            {workspaceOpen ? <ChevronDown size={14} style={{ color: 'var(--text-tertiary)' }} /> : <ChevronRight size={14} style={{ color: 'var(--text-tertiary)' }} />}
          </button>
          {workspaceOpen && (
            <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar p-1">
              {rootPath ? (
                <FileTree searchQuery={searchQuery} />
              ) : (
                <div className="p-2">
                  <button
                    onClick={handleOpenFolder}
                    className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg border text-xs font-medium transition-colors hover:bg-[var(--accent-light)]"
                    style={{ borderColor: 'var(--border-color)', color: 'var(--text-secondary)', background: 'var(--bg-primary)' }}
                  >
                    <FolderOpen size={14} />
                    Open Folder
                  </button>
                </div>
              )}
            </div>
          )}
        </section>

        <section className="flex flex-col min-h-0" style={{ flex: outlineOpen ? '1 1 0%' : '0 0 auto' }}>
          <button onClick={() => setOutlineOpen(!outlineOpen)} className="w-full flex items-center justify-between px-3 py-2 hover:bg-[var(--accent-light)] transition-colors flex-shrink-0">
            <div className="flex items-center gap-1.5">
              <List size={13} style={{ color: 'var(--accent-color)' }} />
              <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>Outline</span>
            </div>
            {outlineOpen ? <ChevronDown size={14} style={{ color: 'var(--text-tertiary)' }} /> : <ChevronRight size={14} style={{ color: 'var(--text-tertiary)' }} />}
          </button>
          {outlineOpen && (
            <div className="overflow-y-auto custom-scrollbar border-t flex-1 min-h-0" style={{ borderColor: 'var(--border-color)', background: 'var(--bg-secondary)' }}>
              {currentContent && headings.length > 0 ? (
                <nav className="py-1 px-1">
                  {headings.map((h, i) => (
                    <button
                      key={`${h.id}-${i}`}
                      className="w-full text-left text-xs rounded px-2 py-1 transition-colors hover:bg-[var(--accent-light)] block"
                      style={{ paddingLeft: `${(h.level - 1) * 12 + 8}px`, color: h.level === 1 ? 'var(--text-primary)' : 'var(--text-secondary)', fontWeight: h.level <= 2 ? 600 : 400 }}
                      onClick={() => handleHeadingClick(h.line)}
                    >
                      {h.text}
                    </button>
                  ))}
                </nav>
              ) : (
                <div className="px-3 py-2 text-xs" style={{ color: 'var(--text-tertiary)' }}>
                  No outline for current document.
                </div>
              )}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
