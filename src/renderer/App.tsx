import { useEffect, useRef, useCallback, useState } from 'react'
import { useUIStore } from './stores/ui-store'
import { useFileStore } from './stores/file-store'
import { useFileOpener } from './hooks/useFileOpener'
import { Toolbar } from './components/layout/Toolbar'
import { Sidebar } from './components/layout/Sidebar'
import { EditorPanel } from './components/layout/EditorPanel'
import { PreviewPanel } from './components/layout/PreviewPanel'
import { AiPanel } from './components/layout/AiPanel'
import { StartPage } from './components/layout/StartPage'

export default function App() {
  const theme = useUIStore((s) => s.theme)
  const sidebarVisible = useUIStore((s) => s.sidebarVisible)
  const activeTab = useUIStore((s) => s.activeTab)
  const sidebarWidth = useUIStore((s) => s.sidebarWidth)
  const setActiveTab = useUIStore((s) => s.setActiveTab)
  const currentFile = useFileStore((s) => s.currentFile)
  const currentContent = useFileStore((s) => s.currentContent)
  const isModified = useFileStore((s) => s.isModified)
  const setIsModified = useFileStore((s) => s.setIsModified)

  const { openFileFromEvent } = useFileOpener()

  const [editorRatio, setEditorRatio] = useUIStore((s) => [s.editorRatio, s.setEditorRatio])
  const setSidebarWidth = useUIStore((s) => s.setSidebarWidth)
  const [aiPanelVisible, setAiPanelVisible] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const isDragging = useRef(false)
  const isSidebarDragging = useRef(false)

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
    document.body.style.background = 'var(--bg-primary)'
    document.body.style.color = 'var(--text-primary)'
  }, [theme])

  useEffect(() => {
    const handleOpenAi = () => setAiPanelVisible(true)
    window.addEventListener('nicmd:open-ai', handleOpenAi)
    return () => window.removeEventListener('nicmd:open-ai', handleOpenAi)
  }, [])

  useEffect(() => {
    const cleanup = window.api.file.onOpened((data) => {
      openFileFromEvent(data)
    })
    return cleanup
  }, [openFileFromEvent])

  useEffect(() => {
    if (!isModified || !currentFile) return
    const timer = setTimeout(() => {
      window.api.file.write(currentFile, currentContent).then(() => {
        setIsModified(false)
      }).catch(() => {})
    }, 1000)
    return () => clearTimeout(timer)
  }, [currentContent, isModified, currentFile])

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    isDragging.current = true
    const startX = e.clientX
    const startRatio = editorRatio
    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!isDragging.current || !containerRef.current) return
      const rect = containerRef.current.getBoundingClientRect()
      const deltaX = moveEvent.clientX - startX
      const deltaRatio = deltaX / rect.width
      setEditorRatio(Math.max(0.2, Math.min(0.8, startRatio + deltaRatio)))
    }
    const handleMouseUp = () => {
      isDragging.current = false
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
  }, [editorRatio, setEditorRatio])

  const handleSidebarMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    isSidebarDragging.current = true
    const startX = e.clientX
    const startWidth = sidebarWidth
    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!isSidebarDragging.current) return
      const nextWidth = startWidth + moveEvent.clientX - startX
      setSidebarWidth(Math.max(200, Math.min(520, nextWidth)))
    }
    const handleMouseUp = () => {
      isSidebarDragging.current = false
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
  }, [sidebarWidth, setSidebarWidth])

  return (
    <div className="h-full flex flex-col" style={{ background: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
      <Toolbar onToggleAi={() => setAiPanelVisible(!aiPanelVisible)} />
      <div className="flex flex-1 overflow-hidden">
        {sidebarVisible && (
          <>
            <div
              style={{ width: sidebarWidth, background: 'var(--bg-secondary)' }}
              className="flex-shrink-0 overflow-hidden"
            >
              <Sidebar />
            </div>
            <div
              className="flex-shrink-0 cursor-col-resize group relative"
              style={{ width: 5, background: 'var(--border-color)' }}
              onMouseDown={handleSidebarMouseDown}
            >
              <div className="absolute inset-y-0 -left-1 -right-1" />
              <div className="absolute inset-y-0 left-1/2 -translate-x-px w-[2px] group-hover:w-[3px] group-hover:bg-[var(--accent-color)] transition-all" />
            </div>
          </>
        )}
        <div ref={containerRef} className="flex flex-1 overflow-hidden">
          {!currentFile ? (
            <StartPage />
          ) : (
            <>
              {(activeTab === 'editor' || activeTab === 'split') && (
                <div
                  className="overflow-hidden"
                  style={{
                    width: (activeTab === 'split') ? `${editorRatio * 100}%` : '100%'
                  }}
                >
                  <EditorPanel />
                </div>
              )}
              {activeTab === 'split' && (
                <div
                  className="flex-shrink-0 cursor-col-resize group relative"
                  style={{ width: 5, background: 'var(--border-color)' }}
                  onMouseDown={handleMouseDown}
                >
                  <div className="absolute inset-y-0 -left-1 -right-1" />
                  <div className="absolute inset-y-0 left-1/2 -translate-x-px w-[2px] group-hover:w-[3px] group-hover:bg-[var(--accent-color)] transition-all" />
                </div>
              )}
              {(activeTab === 'preview' || activeTab === 'split') && !aiPanelVisible && (
                <div
                  className="overflow-hidden"
                  style={{
                    width: activeTab === 'split' ? `${(1 - editorRatio) * 100}%` : '100%'
                  }}
                >
                  <PreviewPanel />
                </div>
              )}
              {aiPanelVisible && (
                <>
                  {activeTab === 'editor' && (
                    <div
                      className="flex-shrink-0 cursor-col-resize group relative"
                      style={{ width: 5, background: 'var(--border-color)' }}
                      onMouseDown={handleMouseDown}
                    >
                      <div className="absolute inset-y-0 -left-1 -right-1" />
                      <div className="absolute inset-y-0 left-1/2 -translate-x-px w-[2px] group-hover:w-[3px] group-hover:bg-[var(--accent-color)] transition-all" />
                    </div>
                  )}
                  <div
                    className="overflow-hidden"
                    style={{ width: activeTab === 'editor' ? '360px' : `${(1 - editorRatio) * 100}%` }}
                  >
                    <AiPanel visible={aiPanelVisible} onClose={() => setAiPanelVisible(false)} />
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
