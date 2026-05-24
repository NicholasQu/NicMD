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
  File
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

  const getIcon = () => {
    if (node.isDirectory) {
      return expanded ? (
        <FolderOpen size={15} style={{ color: 'var(--accent-color)' }} />
      ) : (
        <Folder size={15} style={{ color: 'var(--text-tertiary)' }} />
      )
    }
    if (isMarkdownFile(node.name)) {
      return <FileText size={15} style={{ color: '#3b82f6' }} />
    }
    const ext = node.name.split('.').pop()?.toLowerCase() || ''
    if (ext === 'pdf') {
      return <FileText size={15} style={{ color: '#ef4444' }} />
    }
    return <File size={15} style={{ color: 'var(--text-tertiary)' }} />
  }

  return (
    <div>
      <div
        className={`flex items-center gap-1 py-[3px] pr-2 rounded-md cursor-pointer transition-all text-[13px] ${
          isActive ? 'bg-[var(--accent-light)]' : 'hover:bg-[var(--bg-tertiary)]'
        }`}
        style={{ paddingLeft: `${depth * 12 + 6}px` }}
        onClick={handleClick}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
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
        {!node.isDirectory && <span style={{ width: 12 }} />}
        {getIcon()}
        <span
          className="truncate ml-1"
          style={{
            color: isActive ? 'var(--accent-color)' : 'var(--text-primary)',
            fontWeight: isActive ? 500 : 400
          }}
        >
          {node.name}
        </span>
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
