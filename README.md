<div align="center">

# 𝕸ⁿ(𝒊𝒄)

**NicMD — A quiet Markdown editor for focused writing**

[![License: MIT](https://img.shields.io/badge/License-MIT-orange.svg)](https://opensource.org/licenses/MIT)
[![Platform: Windows](https://img.shields.io/badge/Platform-Windows-blue.svg)]()
[![Electron](https://img.shields.io/badge/Electron-28-green.svg)]()

</div>

---

NicMD is a Typora-inspired Markdown editor built with Electron + React + TypeScript. It's designed for writers who want a clean, distraction-free environment — while keeping the developer-friendly features like file tree, CLI, export, and AI assistance.

## Features

### ✍️ Markdown Editing
- **Monaco Editor** — Local-loaded code editor (no CDN), syntax highlighting, bracket matching, font ligatures
- **Real-time Preview** — GitHub Flavored Markdown rendering with tables, task lists, and code blocks
- **Scroll Sync** — Editor and preview stay in sync as you scroll
- **Rich Text AI Input** — contentEditable rich input with file reference chips (drag files into AI conversations)
- **Chinese Typography** — Smart bold rendering for Chinese quotes `**"三位一体"**` via rehype-raw

### 📁 Workspace
- **File Tree** — Browse and manage files in any folder with hover actions (open in folder, copy path, AI reference)
- **Recent Files** — Quick access to recently opened documents with promote-to-top behavior
- **Outline** — Jump to any heading in your document
- **Auto Save** — Changes are saved automatically
- **Open in Folder** — Right-click any file to reveal it in Explorer

### 🎨 Preview Enhancements
- **Mermaid Diagrams** — Lazy-loaded rendering with custom orange theme, zoom & drag support
- **Tree Structure Rendering** — Auto-detect `├──` `└──` tree characters and render with folder/file icons
- **Code Blocks** — Unified warm orange theme for all code blocks with language labels
- **WeChat Preview** — Preview and copy HTML formatted for WeChat Official Accounts (with Mermaid SVG support)

### 📤 Export & Publish
- **PDF Export** — Convert Markdown to beautifully formatted PDF with consistent orange theme
  - Save dialog for choosing output location
  - Toast notification with clickable file path
  - Auto-add to Recent files list
- **PDF Preview** — Clean full-content view without sidebar thumbnails
- **DOCX Import** — Convert Word documents to Markdown

### 🤖 AI Assistant
- **OpenAI Compatible** — Works with any OpenAI-compatible API (OpenAI, DeepSeek, Qwen, etc.)
- **Multi-Gateway** — Configure multiple API gateways and switch between them
- **Custom Agent Personas** — Define Soul (personality) and Skill (capabilities) for different writing scenarios
- **File References** — Drag files from sidebar into AI input as context chips
- **Selection Context** — Select text in editor and add it as context to AI conversations
- **Web Search** 🆕 — AI can search the internet in real-time
  - **Baidu Search** — General web search, zero cost
  - **WeChat Articles** — Search WeChat Official Account articles via Sogou
  - **Function Calling** — LLM automatically decides when to search based on your question
  - **Search Status** — Real-time display of search progress ("正在搜索: ...")
  - **Toggle Control** — Enable/disable web search with one click (Globe button)

### 🎨 Design
- **Light & Dark Themes** — Warm, carefully crafted color schemes with CSS variables
- **Brand Identity** — Mathematical formula-inspired visual language `𝕸ⁿ(𝒊𝒄)`
- **Splash Animation** — Smooth startup experience
- **Unified Color System** — Orange accent color throughout (editor, preview, PDF, WeChat)

### 💻 CLI Support
```bash
NicMD.exe document.md                    # Open file directly
NicMD.exe --export-pdf input.md          # Export to PDF
NicMD.exe --export-pdf input.md out.pdf  # Export with custom path
NicMD.exe --convert-docx input.docx      # Convert DOCX to Markdown
```

## Screenshots

> Add your screenshots to `docs/screenshots/` and update the paths.

## Download

See [Releases](https://github.com/NicholasQu/NicMD/releases) for the latest Windows installer.

## Development

### Prerequisites

- [Node.js](https://nodejs.org/) >= 18
- npm >= 9
- Windows

### Setup

```bash
git clone https://github.com/NicholasQu/NicMD.git
cd NicMD/app
npm install
npm run dev
```

### Build

```bash
npm run build
```

### Package

```bash
npm run dist:dated
```

This generates a timestamped build directory (`dist-MMDD-NN`) to avoid file lock issues on Windows.

## Project Structure

```
app/
├── src/
│   ├── main/                  Electron main process
│   │   ├── index.ts           App entry point
│   │   ├── window-manager.ts  Window lifecycle & splash
│   │   ├── pdf-builder.ts     PDF HTML generation (orange theme)
│   │   ├── cli.ts             Command-line interface
│   │   ├── error-logger.ts    Error logging & issue reporting
│   │   └── ipc/               IPC handlers
│   │       ├── file.ts        File operations & shell.showItemInFolder
│   │       ├── export.ts      PDF export & DOCX conversion
│   │       ├── llm.ts         AI assistant with Function Calling
│   │       ├── web-search.ts  Baidu & Sogou WeChat search
│   │       ├── settings.ts    Persistent settings
│   │       └── window.ts      Window controls & theme
│   ├── preload/               Secure bridge API
│   ├── renderer/              React frontend
│   │   ├── components/
│   │   │   ├── layout/        Toolbar, Sidebar, AiPanel, RichInput
│   │   │   ├── editor/        Monaco Editor (local load)
│   │   │   ├── preview/       MarkdownPreview, MermaidBlock, TreeView
│   │   │   ├── file-tree/     FileNode with hover actions
│   │   │   └── wechat/        WeChat preview with Mermaid SVG
│   │   ├── hooks/             useLlmSettings, useFileOpener
│   │   ├── stores/            Zustand state (file-store, ui-store, editor-store)
│   │   └── styles/            CSS & theming
│   └── shared/                Shared types, utils, constants
├── public/                    Static assets & icons
├── scripts/                   Build & packaging scripts
└── electron.vite.config.ts    Build configuration
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Desktop | Electron 28 |
| Build | Electron Vite + Electron Builder (NSIS) |
| Frontend | React 18 + TypeScript |
| Styling | Tailwind CSS + CSS Variables (darkMode: class) |
| State | Zustand |
| Editor | Monaco Editor (local, offline-ready) |
| Preview | react-markdown + remark-gfm + rehype-raw |
| Diagrams | Mermaid (lazy-loaded, custom theme) |
| PDF | marked + Electron printToPDF |
| DOCX | mammoth |
| AI | OpenAI SDK (Function Calling + Tool Use) |
| Search | Electron net.request (Baidu + Sogou) |
| Icons | Lucide React |

## Error Reporting

NicMD automatically logs errors to:

```
%APPDATA%/nicmd/logs/
```

To report a bug:
1. Open [GitHub Issues](https://github.com/NicholasQu/NicMD/issues/new?template=bug_report.yml)
2. Include the log contents from the directory above
3. Or press `Ctrl+Shift+I` in NicMD to open DevTools and check the Console

## Contributing

Contributions are welcome! Please read [CONTRIBUTING.md](./CONTRIBUTING.md) for details.

## License

[MIT](./LICENSE) © NicholasQu
