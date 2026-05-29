import { useState } from 'react'
import { useFileStore } from '../../stores/file-store'
import { FileNode as FileNodeType } from '@shared/types'
import { isMarkdownFile } from '@shared/utils'
import { useFileOpener } from '../../hooks/useFileOpener'
import {
  ChevronRight,
  Folder,
  FolderOpen,
  FileText,
  File,
  BookmarkPlus
} from 'lucide-react'

interface FileNodeProps {
  node: FileNodeType
  depth: number
}

export function FileNode({ node, depth }: FileNodeProps) {
  const [hovered, setHovered] = useState(false)
  const currentFile = useFileStore((s) => s.currentFile)
  const toggleFolder = useFileStore((s) => s.toggleFolder)
  const { openFile } = useFileOpener()
  const expanded = node.expanded ?? false
  const isActive = currentFile === node.path

  const handleClick = async () => {
    if (node.isDirectory) {
      toggleFolder(node.path)
      return
    }
    await openFile(node.path)
  }

  const handleAddToAi = async (e: React.MouseEvent) => {
    e.stopPropagation()
    const result = await window.api.file.read(node.path)
    if (!result) return
    const id = `f-${Date.now().toString(36)}`
    window.dispatchEvent(new CustomEvent('nicmd:open-ai'))
    setTimeout(() => window.dispatchEvent(new CustomEvent('nicmd:add-ai-context', {
      detail: {
        id,
        label: node.name,
        content: result
      }
    })), 150)
  }

  const getIcon = () => {
    if (node.isDirectory) {
      return expanded ? (
        <FolderOpen size={14} style={{ color: 'var(--accent-color)' }} />
      ) : (
        <Folder size={14} style={{ color: 'var(--text-tertiary)' }} />
      )
    }
    if (isMarkdownFile(node.name)) {
      return <FileText size={14} style={{ color: '#3b82f6' }} />
    }
    const ext = node.name.split('.').pop()?.toLowerCase() || ''
    if (ext === 'pdf') {
      return <FileText size={14} style={{ color: '#ef4444' }} />
    }
    return <File size={14} style={{ color: 'var(--text-tertiary)' }} />
  }

  return (
    <div>
      <div
        className={`flex items-center py-[3px] rounded-md cursor-pointer transition-all text-[13px] ${
          isActive ? 'bg-[var(--accent-light)]' : 'hover:bg-[var(--bg-tertiary)]'
        }`}
        style={{ paddingLeft: `${depth * 16 + 4}px`, paddingRight: 4 }}
        onClick={handleClick}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        <span className="flex items-center justify-center" style={{ width: 16, flexShrink: 0 }}>
          {node.isDirectory && (
            <ChevronRight
              size={12}
              style={{
                color: 'var(--text-tertiary)',
                transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)',
                transition: 'transform 0.15s ease'
              }}
            />
          )}
        </span>
        <span className="flex items-center justify-center" style={{ width: 18, flexShrink: 0 }}>
          {getIcon()}
        </span>
        <span
          className="truncate flex-1"
          style={{
            color: isActive ? 'var(--accent-color)' : 'var(--text-primary)',
            fontWeight: isActive ? 500 : 400,
            marginLeft: 4
          }}
        >
          {node.name}
        </span>
        {!node.isDirectory && hovered && (
          <div className="flex items-center gap-0.5 flex-shrink-0">
            <button
              onClick={(e) => { e.stopPropagation(); window.api.file.showInFolder(node.path) }}
              className="p-0.5 rounded hover:bg-[var(--accent-light)] transition-colors"
              title="打开所在目录"
            >
              <Folder size={12} style={{ color: 'var(--text-tertiary)' }} />
            </button>
            <button
              onClick={handleAddToAi}
              className="p-0.5 rounded hover:bg-[var(--accent-light)] transition-colors"
              title="引用到 AI 对话"
            >
              <BookmarkPlus size={13} style={{ color: 'var(--accent-color)' }} />
            </button>
          </div>
        )}
      </div>

      {node.isDirectory && expanded && node.children && (
        <div className="animate-fade-in">
          {node.children.map((child) => (
            <FileNode key={child.path} node={child} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  )
}
