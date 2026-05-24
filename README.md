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
- **Monaco Editor** — Full-featured code editor with syntax highlighting, bracket matching, and font ligatures
- **Real-time Preview** — GitHub Flavored Markdown rendering with tables, task lists, and code blocks
- **Scroll Sync** — Editor and preview stay in sync as you scroll

### 📁 Workspace
- **File Tree** — Browse and manage files in any folder
- **Recent Files** — Quick access to recently opened documents
- **Outline** — Jump to any heading in your document
- **Auto Save** — Changes are saved automatically

### 📤 Export & Publish
- **PDF Export** — Convert Markdown to beautifully formatted PDF
- **DOCX Import** — Convert Word documents to Markdown
- **WeChat Preview** — Preview and copy HTML formatted for WeChat Official Accounts

### 🤖 AI Assistant
- **OpenAI Compatible** — Works with any OpenAI-compatible API
- **Custom Models** — Configure your own API base, model, and prompts
- **Selection Context** — Select text in the editor and add it as context to AI conversations
- **Customizable Roles** — Define your AI assistant's personality (Soul) and capabilities (Skill)

### 🎨 Design
- **Light & Dark Themes** — Warm, carefully crafted color schemes
- **Brand Identity** — Mathematical formula-inspired visual language `𝕸ⁿ(𝒊𝒄)`
- **Splash Animation** — Smooth startup experience

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
│   │   ├── pdf-builder.ts     PDF HTML generation
│   │   ├── cli.ts             Command-line interface
│   │   ├── error-logger.ts    Error logging & issue reporting
│   │   └── ipc/               IPC handlers
│   │       ├── file.ts        File operations
│   │       ├── export.ts      PDF export & DOCX conversion
│   │       ├── llm.ts         AI assistant
│   │       └── window.ts      Window controls & theme
│   ├── preload/               Secure bridge API
│   ├── renderer/              React frontend
│   │   ├── components/        UI components
│   │   ├── hooks/             Custom React hooks
│   │   ├── stores/            Zustand state management
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
| Build | Electron Vite + Electron Builder |
| Frontend | React 18 + TypeScript |
| Styling | Tailwind CSS + CSS Variables |
| State | Zustand |
| Editor | Monaco Editor |
| Preview | react-markdown + remark-gfm |
| PDF | marked + Electron printToPDF |
| DOCX | mammoth |
| AI | OpenAI SDK (compatible) |
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
