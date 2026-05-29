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
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null)

  useEffect(() => {
    if (fileType !== 'pdf' || !currentFile) {
      setPdfBlobUrl(null)
      return
    }
    window.api.file.readBuffer(currentFile).then((base64) => {
      if (base64) {
        const binary = atob(base64)
        const bytes = new Uint8Array(binary.length)
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
        const blob = new Blob([bytes], { type: 'application/pdf' })
        const url = URL.createObjectURL(blob)
        setPdfBlobUrl(url)
        return () => URL.revokeObjectURL(url)
      } else {
        setPdfBlobUrl(null)
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
        {pdfBlobUrl ? (
          <embed
            src={`${pdfBlobUrl}#toolbar=0&navpanes=0&scrollbar=1`}
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
