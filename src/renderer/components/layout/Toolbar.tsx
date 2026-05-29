import { useState } from 'react'
import { useUIStore } from '../../stores/ui-store'
import { useFileStore } from '../../stores/file-store'
import { WechatPreview } from '../wechat/WechatPreview'
import {
  File,
  FolderOpen,
  PanelLeft,
  Edit3,
  Eye,
  Columns,
  Moon,
  Sun,
  Download,
  Sparkles,
  MessageCircle
} from 'lucide-react'

const BRAND_FORMULA = '𝕸ⁿ(𝒊𝒄)'
const BRAND_NAME = 'NicMD'

export function Toolbar({ onToggleAi }: { onToggleAi: () => void }) {
  const theme = useUIStore((s) => s.theme)
  const toggleTheme = useUIStore((s) => s.toggleTheme)
  const activeTab = useUIStore((s) => s.activeTab)
  const setActiveTab = useUIStore((s) => s.setActiveTab)
  const toggleSidebar = useUIStore((s) => s.toggleSidebar)
  const currentFile = useFileStore((s) => s.currentFile)
  const currentContent = useFileStore((s) => s.currentContent)
  const [wechatPreviewOpen, setWechatPreviewOpen] = useState(false)
  const currentFileName = currentFile?.split(/[\\/]/).pop()

  const handleOpenFile = async () => {
    try {
      const path = await window.api.file.openDialog()
      if (path) {
        const content = await window.api.file.read(path)
        const store = useFileStore.getState()
        store.setCurrentFile(path)
        store.setCurrentContent(content)
        store.setIsModified(false)
        store.addRecentFile(path, true)
      }
    } catch (e) {
      console.error('Failed to open file:', e)
    }
  }

  const handleOpenFolder = async () => {
    try {
      const path = await window.api.file.openFolderDialog()
      if (path) {
        const store = useFileStore.getState()
        store.setRootPath(path)
        store.updateFileTree()
      }
    } catch (e) {
      console.error('Failed to open folder:', e)
    }
  }

  const [exporting, setExporting] = useState(false)
  const [toast, setToast] = useState<{ msg: string; path?: string } | null>(null)

  const showToast = (msg: string, path?: string) => {
    setToast({ msg, path })
    setTimeout(() => setToast(null), 4000)
  }

  const openFilePath = async (filePath: string) => {
    try {
      await window.api.file.read(filePath)
      const store = useFileStore.getState()
      store.setCurrentFile(filePath)
      store.setCurrentContent('')
      store.setIsModified(false)
      setToast(null)
    } catch {
      window.open(`file:///${filePath.replace(/\\/g, '/')}`)
    }
  }

  const handleExportPdf = async () => {
    const store = useFileStore.getState()
    if (!store.currentFile || !store.currentContent) return
    setExporting(true)
    try {
      const defaultName = (store.currentFile.split(/[\\/]/).pop() || 'document').replace(/\.(md|markdown|mdx|txt)$/i, '.pdf')
      const savePath = await window.api.file.saveDialog(defaultName)
      if (!savePath) { setExporting(false); return }
      const result = await window.api.exportPdf({ path: savePath, content: store.currentContent })
      if (result.success) {
        store.updateFileTree()
        if (result.path) {
          store.addRecentFile(result.path, true)
        }
        showToast('PDF exported', result.path)
      } else {
        showToast('PDF export failed: ' + (result.error || 'unknown error'))
      }
    } catch (e: any) {
      console.error('PDF export failed:', e)
      showToast('PDF export failed: ' + (e.message || 'unknown'))
    } finally {
      setExporting(false)
    }
  }

  return (
    <>
    <div className="h-[38px] flex items-center justify-between px-2 border-b"
         style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-color)' }}>
      <div className="flex items-center gap-1">
        <div className="flex items-center gap-1.5 px-1.5 py-1 rounded-lg select-none" style={{ background: 'var(--bg-primary)' }}>
          <span
            className="w-5 h-5 rounded-md flex items-center justify-center text-[13px] leading-none shadow-sm"
            style={{ background: 'linear-gradient(135deg, #fbbf24, #ea580c)', color: '#ffffff', fontFamily: 'Georgia, Times New Roman, serif', fontWeight: 800 }}
          >
            𝕸
          </span>
          <span className="brand-wordmark text-[13px] leading-none" title={BRAND_FORMULA}>
            {BRAND_NAME}
          </span>
        </div>
        <button
          onClick={toggleSidebar}
          className="p-1.5 rounded-md hover:bg-[var(--accent-light)] transition-colors"
          title="Toggle Sidebar"
        >
          <PanelLeft size={16} style={{ color: 'var(--text-secondary)' }} />
        </button>

        <div className="w-px h-4 mx-1" style={{ background: 'var(--border-color)' }} />

        <button
          onClick={handleOpenFile}
          className="p-1.5 rounded-md hover:bg-[var(--accent-light)] transition-colors"
          title="Open File"
        >
          <File size={16} style={{ color: 'var(--text-secondary)' }} />
        </button>
        <button
          onClick={handleOpenFolder}
          className="p-1.5 rounded-md hover:bg-[var(--accent-light)] transition-colors"
          title="Open Folder"
        >
          <FolderOpen size={16} style={{ color: 'var(--text-secondary)' }} />
        </button>

        <div className="w-px h-4 mx-1" style={{ background: 'var(--border-color)' }} />

        <div className="flex items-center gap-0.5 rounded-lg p-0.5" style={{ background: 'var(--bg-tertiary)' }}>
          <button
            onClick={() => setActiveTab('editor')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
              activeTab === 'editor' ? 'bg-[var(--accent-color)] text-white shadow-sm' : ''
            }`}
            style={activeTab !== 'editor' ? { color: 'var(--text-secondary)' } : {}}
          >
            <Edit3 size={12} />
            Editor
          </button>
          <button
            onClick={() => setActiveTab('split')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
              activeTab === 'split' ? 'bg-[var(--accent-color)] text-white shadow-sm' : ''
            }`}
            style={activeTab !== 'split' ? { color: 'var(--text-secondary)' } : {}}
          >
            <Columns size={12} />
            Split
          </button>
          <button
            onClick={() => setActiveTab('preview')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
              activeTab === 'preview' ? 'bg-[var(--accent-color)] text-white shadow-sm' : ''
            }`}
            style={activeTab !== 'preview' ? { color: 'var(--text-secondary)' } : {}}
          >
            <Eye size={12} />
            Preview
          </button>
        </div>
      </div>

      <div className="absolute left-1/2 -translate-x-1/2 text-xs font-medium pointer-events-none select-none flex items-center gap-2"
           style={{ color: 'var(--text-secondary)' }}>
        <span className="brand-formula text-gradient" title={BRAND_NAME}>{BRAND_FORMULA}</span>
        {currentFileName && <span className="opacity-70">— {currentFileName}</span>}
      </div>

      <div className="flex items-center gap-0.5">
        <button
          onClick={onToggleAi}
          className="p-1.5 rounded-md hover:bg-[var(--accent-light)] transition-colors"
          title="AI Assistant"
          style={{ color: '#ea580c' }}
        >
          <Sparkles size={16} />
        </button>

        {currentFile && (
          <>
            <button
              onClick={handleExportPdf}
              disabled={exporting}
              className="flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium hover:bg-[var(--accent-light)] transition-colors disabled:opacity-50"
              style={{ color: 'var(--text-secondary)' }}
              title="Export PDF"
            >
              <Download size={14} className={exporting ? 'animate-pulse' : ''} />
              {exporting ? 'Exporting...' : 'PDF'}
            </button>
            <button
              onClick={() => setWechatPreviewOpen(true)}
              className="flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium hover:bg-[var(--accent-light)] transition-colors"
              style={{ color: 'var(--text-secondary)' }}
              title="微信公众号预览"
            >
              <MessageCircle size={14} />
              微信
            </button>
          </>
        )}

        <div className="w-px h-4 mx-1" style={{ background: 'var(--border-color)' }} />

        <button
          onClick={toggleTheme}
          className="p-1.5 rounded-md hover:bg-[var(--accent-light)] transition-colors"
          title="Toggle Theme"
        >
          {theme === 'dark' ? (
            <Sun size={16} style={{ color: 'var(--text-secondary)' }} />
          ) : (
            <Moon size={16} style={{ color: 'var(--text-secondary)' }} />
          )}
        </button>
      </div>
    </div>
    {toast && (
      <div style={{
        position: 'fixed',
        top: 38,
        left: 16,
        zIndex: 9999,
        padding: '10px 16px',
        borderRadius: 8,
        background: '#ea580c',
        color: '#fff',
        fontSize: 13,
        fontWeight: 600,
        boxShadow: '0 4px 12px rgba(234,88,12,0.3)',
        maxWidth: 400,
        animation: 'toastIn 0.3s ease'
      }}>
        <div>{toast.msg}</div>
        {toast.path && (
          <div
            onClick={() => openFilePath(toast.path!)}
            style={{
              marginTop: 6,
              padding: '4px 10px',
              background: 'rgba(255,255,255,0.2)',
              borderRadius: 4,
              fontSize: 12,
              fontFamily: 'monospace',
              cursor: 'pointer',
              wordBreak: 'break-all',
              textDecoration: 'underline',
              textDecorationStyle: 'dotted'
            }}
          >
            {toast.path.split(/[\\/]/).pop()} — click to open
          </div>
        )}
      </div>
    )}
    {wechatPreviewOpen && currentFile && (
      <WechatPreview
        content={currentContent}
        fileName={currentFileName}
        onClose={() => setWechatPreviewOpen(false)}
      />
    )}
    </>
  )
}
