export const APP_NAME = 'NicMD'
export const APP_VERSION = '1.0.0'
export const APP_ID = 'com.nicmd.editor'

export const DEFAULT_SIDEBAR_WIDTH = 260
export const MIN_SIDEBAR_WIDTH = 180
export const MAX_SIDEBAR_WIDTH = 500

export const DEFAULT_EDITOR_RATIO = 0.5
export const MIN_EDITOR_RATIO = 0.2
export const MAX_EDITOR_RATIO = 0.8

export const MD_EXTENSIONS = ['.md', '.markdown', '.mdx', '.txt']
export const SHOW_EXTENSIONS = ['.md', '.markdown', '.mdx', '.txt', '.pdf', '.json', '.yaml', '.yml', '.toml', '.xml', '.csv']
export const FILE_EXTENSIONS = MD_EXTENSIONS
export const FILE_ICONS: Record<string, string> = {
  '.md': 'file-text',
  '.markdown': 'file-text',
  '.mdx': 'file-code',
  '.txt': 'file',
  '.json': 'file-json',
  '.js': 'file-code',
  '.ts': 'file-code',
  '.tsx': 'file-code',
  '.jsx': 'file-code',
  '.css': 'file-code',
  '.html': 'file-code',
  '.py': 'file-code',
  '.go': 'file-code',
  '.rs': 'file-code'
}

export const WELCOME_CONTENT = `# Welcome to NicMD

𝕸ⁿ(𝒊𝒄) — Beautiful Markdown Editor

---

## Features

- **Real-time Preview** — See your Markdown rendered live
- **File Tree** — Browse and manage your files
- **Syntax Highlighting** — Beautiful code blocks
- **Math Support** — KaTeX formula rendering
- **Theme System** — Light & Dark modes

## Quick Start

1. Open a folder from the sidebar
2. Create or edit Markdown files
3. Enjoy the live preview

## Code Example

\`\`\`typescript
function greet(name: string): string {
  return \`Hello, \${name}!\`
}

console.log(greet('NicMD'))
\`\`\`

## Math Example

The Euler's identity: $e^{i\\pi} + 1 = 0$

## Table Example

| Feature | Status |
|---------|--------|
| Editor  | ✅     |
| Preview | ✅     |
| Themes  | ✅     |
| Export  | 🔄     |

> Made with ❤️ using Electron + React + TypeScript
`
