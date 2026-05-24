import { useEffect, useRef, useState } from 'react'
import { useFileStore } from '../../stores/file-store'
import { useEditorStore } from '../../stores/editor-store'
import { MarkdownPreview } from '../preview/MarkdownPreview'

let previewSyncing = false

export function PreviewPanel() {
  const currentContent = useFileStore((s) => s.currentContent)
  const currentFile = useFileStore((s) => s.currentFile)
  const fileType = useFileStore((s) => s.fileType)
  const containerRef = useRef<HTMLDivElement>(null)
  const [pdfDataUrl, setPdfDataUrl] = useState<string | null>(null)

  useEffect(() => {
    if (fileType !== 'pdf' || !currentFile) {
      setPdfDataUrl(null)
      return
    }
    window.api.file.readBuffer(currentFile).then((base64) => {
      if (base64) {
        setPdfDataUrl(`data:application/pdf;base64,${base64}`)
      } else {
        setPdfDataUrl(null)
      }
    })
  }, [fileType, currentFile])

  useEffect(() => {
    const el = containerRef.current
    if (!el || fileType === 'pdf') return
    const handleScroll = () => {
      if (previewSyncing) return
      const maxScroll = el.scrollHeight - el.clientHeight
      if (maxScroll > 0) {
        useEditorStore.getState().setScrollRatio(el.scrollTop / maxScroll, 'preview')
      }
    }
    el.addEventListener('scroll', handleScroll, { passive: true })
    return () => el.removeEventListener('scroll', handleScroll)
  }, [fileType])

  useEffect(() => {
    if (fileType === 'pdf') return
    const unsub = useEditorStore.subscribe((state, prev) => {
      if (
        state.scrollSource === 'editor' &&
        state.scrollRatio !== prev.scrollRatio &&
        containerRef.current
      ) {
        previewSyncing = true
        const el = containerRef.current
        const maxScroll = el.scrollHeight - el.clientHeight
        if (maxScroll > 0) {
          el.scrollTop = state.scrollRatio * maxScroll
        }
        setTimeout(() => { previewSyncing = false }, 50)
      }
    })
    return unsub
  }, [fileType])

  if (fileType === 'pdf' && currentFile) {
    return (
      <div
        className="h-full"
        style={{ background: 'var(--bg-primary)' }}
      >
        {pdfDataUrl ? (
          <embed
            src={pdfDataUrl}
            type="application/pdf"
            width="100%"
            height="100%"
            style={{ border: 'none' }}
          />
        ) : (
          <div className="h-full flex items-center justify-center" style={{ color: 'var(--text-tertiary)' }}>
            <span className="text-sm">Loading PDF...</span>
          </div>
        )}
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      className="h-full overflow-y-auto custom-scrollbar"
      style={{ background: 'var(--bg-primary)' }}
    >
      <MarkdownPreview content={currentContent} />
    </div>
  )
}
