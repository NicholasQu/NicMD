# Contributing to NicMD

Thank you for your interest in contributing to NicMD!

## Development Setup

### Prerequisites

- Node.js >= 18
- npm >= 9
- Windows (currently NicMD only supports Windows)

### Getting Started

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

## Project Structure

```
src/
├── main/           Electron main process
│   ├── index.ts    App entry point
│   ├── window-manager.ts
│   ├── pdf-builder.ts
│   ├── cli.ts
│   ├── error-logger.ts
│   └── ipc/        IPC handlers
│       ├── file.ts
│       ├── export.ts
│       ├── llm.ts
│       └── window.ts
├── preload/        Secure bridge API
├── renderer/       React frontend
│   ├── components/
│   ├── hooks/
│   ├── stores/
│   └── styles/
└── shared/         Shared types, utils, constants
```

## Code Style

- TypeScript strict mode
- No comments unless necessary
- Follow existing patterns in the codebase
- Use CSS variables for theming (see `globals.css`)

## Reporting Issues

### Bug Reports

Please use the Bug Report template and include:

1. NicMD version
2. Windows version
3. Steps to reproduce
4. Error logs (from DevTools Console or `%APPDATA%/nicmd/logs/`)

### Collecting Logs

NicMD automatically saves error logs to:

```
%APPDATA%/nicmd/logs/
```

You can also open DevTools with `Ctrl+Shift+I` to see console errors.

## Pull Requests

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/my-feature`)
3. Make your changes
4. Ensure `npm run build` passes
5. Submit a Pull Request

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
