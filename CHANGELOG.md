# Changelog

All notable changes to NicMD will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-05-24

### Added

- Markdown editing with Monaco Editor
- Real-time Markdown preview with GitHub Flavored Markdown support
- File tree workspace browser
- Recent files start page
- PDF export
- DOCX to Markdown conversion
- WeChat Official Account preview and HTML copy
- AI assistant panel with OpenAI-compatible API
- Selection context tags for AI conversations
- Light and dark theme system
- CLI support (`--export-pdf`, `--convert-docx`)
- Auto-save on edit
- Editor and preview scroll sync
- Sidebar outline navigation
- Splash screen animation
- Error logging system for issue reporting

### Technical

- Electron + React + TypeScript + Zustand
- Electron Vite for build toolchain
- Monaco Editor for editing
- react-markdown + remark-gfm for preview
- marked for PDF generation
- mammoth for DOCX conversion
