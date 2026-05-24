import { Clock, File, FolderOpen } from 'lucide-react'
import { useFileStore } from '../../stores/file-store'
import { useFileOpener } from '../../hooks/useFileOpener'

export function StartPage() {
  const recentFiles = useFileStore((s) => s.recentFiles)
  const { openFile } = useFileOpener()

  const handleOpenFile = async () => {
    try {
      const path = await window.api.file.openDialog()
      if (!path) return
      await openFile(path)
    } catch (e) {
      console.error('Failed to open file:', e)
    }
  }

  const handleOpenFolder = async () => {
    try {
      const path = await window.api.file.openFolderDialog()
      if (!path) return
      const store = useFileStore.getState()
      store.setRootPath(path)
      store.updateFileTree()
    } catch (e) {
      console.error('Failed to open folder:', e)
    }
  }

  return (
    <div className="h-full flex-1 overflow-y-auto custom-scrollbar" style={{ background: 'var(--bg-primary)' }}>
      <div className="min-h-full flex items-center justify-center px-8 py-10">
        <div className="w-full max-w-[720px] fade-in">
          <div className="mb-8 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4 shadow-md" style={{ background: 'linear-gradient(135deg, #fbbf24, #ea580c)' }}>
              <span style={{ color: '#ffffff', fontFamily: 'Georgia, Times New Roman, serif', fontSize: 34, fontWeight: 800 }}>𝕸</span>
            </div>
            <div className="brand-formula text-gradient mb-2" style={{ fontSize: 24 }}>𝕸ⁿ(𝒊𝒄)</div>
            {recentFiles.length === 0 && (
              <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
                A quiet Markdown editor for focused writing.
              </p>
            )}
          </div>

          <div className="rounded-2xl border shadow-sm overflow-hidden" style={{ borderColor: 'var(--border-color)', background: 'var(--bg-secondary)' }}>
            <div className="px-5 py-4 border-b flex items-center justify-between" style={{ borderColor: 'var(--border-color)' }}>
              <div className="flex items-center gap-2">
                <Clock size={16} style={{ color: 'var(--accent-color)' }} />
                <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Recent Documents</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleOpenFile}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors hover:bg-[var(--accent-light)]"
                  style={{ color: 'var(--text-secondary)', background: 'var(--bg-primary)' }}
                >
                  <File size={13} />
                  Open File
                </button>
                <button
                  onClick={handleOpenFolder}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors hover:bg-[var(--accent-light)]"
                  style={{ color: 'var(--text-secondary)', background: 'var(--bg-primary)' }}
                >
                  <FolderOpen size={13} />
                  Open Folder
                </button>
              </div>
            </div>

            {recentFiles.length > 0 ? (
              <div className="p-2">
                {recentFiles.slice(0, 10).map((path) => (
                  <button
                    key={path}
                    onClick={() => openFile(path)}
                    className="w-full text-left rounded-xl px-3 py-2.5 transition-colors hover:bg-[var(--accent-light)] block"
                    title={path}
                  >
                    <span className="block truncate text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{path.split(/[\\/]/).pop()}</span>
                    <span className="block truncate text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>{path}</span>
                  </button>
                ))}
              </div>
            ) : (
              <div className="px-5 py-10 text-center">
                <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
                  Open a Markdown file and it will appear here next time.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
