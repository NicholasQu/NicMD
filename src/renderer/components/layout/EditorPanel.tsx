import { useFileStore } from '../../stores/file-store'
import { MonacoEditor } from '../editor/MonacoEditor'
import { useUIStore } from '../../stores/ui-store'

export function EditorPanel() {
  const currentContent = useFileStore((s) => s.currentContent)
  const fileType = useFileStore((s) => s.fileType)
  const currentFile = useFileStore((s) => s.currentFile)

  if (fileType === 'pdf') {
    return (
      <div
        className="h-full flex flex-col items-center justify-center gap-3"
        style={{ background: 'var(--bg-primary)', color: 'var(--text-tertiary)' }}
      >
        <span className="text-sm">PDF Preview Only</span>
        <span className="text-xs opacity-60">
          {currentFile?.split(/[\\/]/).pop()}
        </span>
      </div>
    )
  }

  return (
    <div
      className="h-full flex flex-col"
      style={{ background: 'var(--bg-primary)' }}
    >
      <MonacoEditor value={currentContent} />
    </div>
  )
}
