import { useMemo } from 'react'
import { useFileStore } from '../../stores/file-store'
import { FileNode as FileNodeType } from '@shared/types'
import { FileNode } from './FileNode'

interface FileTreeProps {
  searchQuery?: string
}

function filterTree(nodes: FileNodeType[], query: string): FileNodeType[] {
  if (!query) {
    return nodes.map(node => ({
      ...node,
      expanded: node.isDirectory ? true : undefined
    }))
  }
  const lower = query.toLowerCase()
  return nodes.reduce<FileNodeType[]>((acc, node) => {
    if (node.isDirectory) {
      const filteredChildren = filterTree(node.children || [], query)
      if (filteredChildren.length > 0 || node.name.toLowerCase().includes(lower)) {
        acc.push({ ...node, children: filteredChildren, expanded: true })
      }
    } else {
      if (node.name.toLowerCase().includes(lower)) {
        acc.push(node)
      }
    }
    return acc
  }, [])
}

export function FileTree({ searchQuery = '' }: FileTreeProps) {
  const fileTree = useFileStore((s) => s.fileTree)

  const filteredTree = useMemo(
    () => filterTree(fileTree, searchQuery),
    [fileTree, searchQuery]
  )

  return (
    <div className="space-y-0.5">
      {filteredTree.map((node) => (
        <FileNode key={node.path} node={node} depth={0} />
      ))}
      {searchQuery && filteredTree.length === 0 && (
        <div className="px-2 py-4 text-center text-xs" style={{ color: 'var(--text-tertiary)' }}>
          No files found
        </div>
      )}
    </div>
  )
}
