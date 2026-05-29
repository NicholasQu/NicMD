import { useMemo } from 'react'
import { File, Folder, FolderOpen } from 'lucide-react'

interface TreeLine {
  indent: number
  name: string
  isDir: boolean
  comment?: string
}

function parseTree(code: string): TreeLine[] | null {
  const lines = code.split('\n').filter(l => l.trim())
  if (lines.length < 2) return null

  const hasTreeChars = lines.some(l => /[├└│┬─]/.test(l))
  if (!hasTreeChars) return null

  const result: TreeLine[] = []

  for (const line of lines) {
    const treeMatch = line.match(/^([│├└┬─\s　 ]*)(.+)/)
    if (!treeMatch) continue

    const prefix = treeMatch[1]
    let rest = treeMatch[2].trim()

    let comment: string | undefined
    const commentIdx = rest.indexOf('  ')
    if (commentIdx > 0) {
      comment = rest.substring(commentIdx).trim()
      rest = rest.substring(0, commentIdx).trim()
    }

    const indent = prefix.replace(/[│├└┬]/g, '  ').length / 2
    const isDir = rest.endsWith('/') || rest.endsWith('\\') || rest.includes('/') || /^[├└]─\s/.test(prefix) === false && rest.includes('.')

    const cleanName = rest.replace(/^[├└┬─]+\s*/, '').replace(/\/$/, '').replace(/\\$/, '')

    if (!cleanName) continue

    result.push({
      indent,
      name: cleanName,
      isDir: !cleanName.includes('.') || cleanName.endsWith('/') || cleanName === cleanName,
      comment
    })
  }

  return result.length > 0 ? result : null
}

function getFileIcon(name: string) {
  const ext = name.split('.').pop()?.toLowerCase() || ''
  const colors: Record<string, string> = {
    ts: '#3178c6', tsx: '#3178c6', js: '#f7df1e', jsx: '#f7df1e',
    json: '#cb8622', css: '#563d7c', html: '#e34c26',
    md: '#083fa1', py: '#3572A5', rs: '#dea584',
    go: '#00ADD8', java: '#b07219', yml: '#cb171e',
    yaml: '#cb171e', toml: '#9c4221', sh: '#89e051',
    bat: '#89e051', png: '#a873e8', jpg: '#a873e8',
    svg: '#ff9900', gif: '#a873e8', pdf: '#ec2025'
  }
  return colors[ext] || 'var(--text-tertiary)'
}

interface TreeViewProps {
  code: string
}

export function isTreeBlock(code: string): boolean {
  return parseTree(code) !== null
}

export function TreeView({ code }: TreeViewProps) {
  const tree = useMemo(() => parseTree(code), [code])

  if (!tree) return <pre><code>{code}</code></pre>

  return (
    <div className="tree-view" style={{
      padding: '12px 16px',
      fontFamily: "'JetBrains Mono', 'Fira Code', Consolas, monospace",
      fontSize: '13px',
      lineHeight: '1.8',
      overflowX: 'auto'
    }}>
      {tree.map((item, i) => {
        const iconColor = item.isDir ? 'var(--accent-color)' : getFileIcon(item.name)
        const Icon = item.isDir ? Folder : File
        return (
          <div
            key={i}
            className="tree-line"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              paddingLeft: `${item.indent * 16}px`
            }}
          >
            <Icon size={14} style={{ color: iconColor, flexShrink: 0 }} />
            <span style={{ color: 'var(--text-primary)', fontWeight: item.isDir ? 600 : 400 }}>
              {item.name}
            </span>
            {item.comment && (
              <span style={{ color: 'var(--text-tertiary)', fontSize: '12px', marginLeft: '8px' }}>
                {item.comment}
              </span>
            )}
          </div>
        )
      })}
    </div>
  )
}
