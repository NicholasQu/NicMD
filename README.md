<div align="center">

# 𝕸ⁿ(𝒊𝒄)

**NicMD — 沉静写作，专注表达**

[![License: MIT](https://img.shields.io/badge/License-MIT-orange.svg)](https://opensource.org/licenses/MIT)
[![Platform: Windows](https://img.shields.io/badge/Platform-Windows-blue.svg)]()
[![Electron](https://img.shields.io/badge/Electron-28-green.svg)]()

</div>

---

NicMD 是一款受 Typora 启发的 Markdown 编辑器，基于 Electron + React + TypeScript 构建。为写作者打造干净、无干扰的写作环境，同时保留文件树、命令行、导出、AI 辅助等开发者友好的功能。

## 功能特性

### ✍️ Markdown 编辑
- **Monaco 编辑器** — 本地加载（无需 CDN），语法高亮、括号匹配、字体连字
- **实时预览** — GitHub 风格 Markdown 渲染，支持表格、任务列表、代码块
- **滚动同步** — 编辑器和预览区域联动滚动
- **富文本 AI 输入** — contentEditable 富文本输入框，支持文件引用标签（拖拽文件到 AI 对话）
- **中文排版优化** — 智能识别中文引号加粗 `**"三位一体"**`（rehype-raw）

### 📁 工作区
- **文件树** — 浏览管理任意文件夹，悬停显示操作按钮（打开所在目录、复制路径、引用到 AI）
- **最近文件** — 快速访问最近打开的文档，新打开的文件自动置顶
- **大纲导航** — 跳转到文档中的任意标题
- **自动保存** — 修改自动保存，无需手动操作
- **打开所在目录** — 右键任意文件，在资源管理器中显示

### 🎨 预览增强
- **Mermaid 图表** — 懒加载渲染，自定义橙色主题，支持缩放和拖拽
- **树形结构渲染** — 自动检测 `├──` `└──` 等树形字符，渲染为带文件夹/文件图标的 HTML
- **代码块** — 统一暖橙色主题，支持语言标签显示
- **微信预览** — 预览并复制适配微信公众号的 HTML 格式（支持 Mermaid SVG）

### 📤 导出与发布
- **PDF 导出** — 将 Markdown 转换为统一橙色主题的精美 PDF
  - 弹窗选择保存位置
  - Toast 气泡通知，点击可打开 PDF
  - 自动添加到最近文件列表
- **PDF 预览** — 纯净内容视图，无侧边栏缩略图干扰
- **DOCX 导入** — 将 Word 文档转换为 Markdown

### 🤖 AI 助手
- **OpenAI 兼容** — 支持所有 OpenAI 兼容 API（OpenAI、DeepSeek、通义千问等）
- **多网关配置** — 配置多个 API 网关，一键切换
- **自定义 Agent 人格** — 定义 Soul（角色设定）和 Skill（能力设定），适配不同写作场景
- **文件引用** — 从侧边栏拖拽文件到 AI 输入框，自动作为上下文
- **选区上下文** — 在编辑器中选中文本，一键添加到 AI 对话
- **联网搜索** 🆕 — AI 可以实时搜索互联网
  - **百度搜索** — 通用网页搜索，零成本
  - **微信文章** — 通过搜狗搜索微信公众号文章
  - **Function Calling** — LLM 根据你的问题自动决定是否搜索
  - **搜索状态** — 实时显示搜索进度（"正在搜索: ..."）
  - **一键开关** — Globe 按钮随时启用/禁用联网搜索

### 🎨 设计
- **明暗主题** — 精心设计的暖色调配色方案
- **品牌标识** — 数学公式启发的视觉语言 `𝕸ⁿ(𝒊𝒄)`
- **启动动画** — 流畅的开屏体验
- **统一色彩体系** — 橙色强调色贯穿始终（编辑器、预览、PDF、微信）

### 💻 命令行支持
```bash
NicMD.exe document.md                    # 直接打开文件
NicMD.exe --export-pdf input.md          # 导出 PDF
NicMD.exe --export-pdf input.md out.pdf  # 指定路径导出
NicMD.exe --convert-docx input.docx      # DOCX 转 Markdown
```

## 下载

前往 [Releases](https://github.com/NicholasQu/NicMD/releases) 下载最新版本。

提供两种安装包：
- **安装版** (`NicMD-x.x.x-x64.exe`) — NSIS 安装程序，支持覆盖安装
- **便携版** (`NicMD-Portable-x.x.x-x64.exe`) — 绿色免安装，双击即用

## 开发

### 环境要求

- [Node.js](https://nodejs.org/) >= 18
- npm >= 9
- Windows

### 启动开发

```bash
git clone https://github.com/NicholasQu/NicMD.git
cd NicMD/app
npm install
npm run dev
```

### 构建

```bash
npm run build
```

### 打包

```bash
npm run dist:win        # 生成安装版 + 便携版
npm run dist:dated      # 生成带时间戳的构建目录
```

## 项目结构

```
app/
├── src/
│   ├── main/                  Electron 主进程
│   │   ├── index.ts           应用入口
│   │   ├── window-manager.ts  窗口生命周期 & 启动动画
│   │   ├── pdf-builder.ts     PDF HTML 生成（橙色主题）
│   │   ├── cli.ts             命令行接口
│   │   ├── error-logger.ts    错误日志 & Issue 报告
│   │   └── ipc/               IPC 处理器
│   │       ├── file.ts        文件操作 & shell.showItemInFolder
│   │       ├── export.ts      PDF 导出 & DOCX 转换
│   │       ├── llm.ts         AI 助手（支持 Function Calling）
│   │       ├── web-search.ts  百度 & 搜狗微信搜索
│   │       ├── settings.ts    持久化设置
│   │       └── window.ts      窗口控制 & 主题
│   ├── preload/               安全桥接 API
│   ├── renderer/              React 前端
│   │   ├── components/
│   │   │   ├── layout/        Toolbar, Sidebar, AiPanel, RichInput
│   │   │   ├── editor/        Monaco Editor（本地加载）
│   │   │   ├── preview/       MarkdownPreview, MermaidBlock, TreeView
│   │   │   ├── file-tree/     FileNode（悬停操作按钮）
│   │   │   └── wechat/        微信预览（含 Mermaid SVG）
│   │   ├── hooks/             useLlmSettings, useFileOpener
│   │   ├── stores/            Zustand 状态管理
│   │   └── styles/            CSS & 主题
│   └── shared/                共享类型、工具、常量
├── public/                    静态资源 & 图标
├── scripts/                   构建 & 打包脚本
└── electron.vite.config.ts    构建配置
```

## 技术栈

| 层级 | 技术 |
|------|------|
| 桌面框架 | Electron 28 |
| 构建工具 | Electron Vite + Electron Builder (NSIS) |
| 前端框架 | React 18 + TypeScript |
| 样式方案 | Tailwind CSS + CSS Variables (darkMode: class) |
| 状态管理 | Zustand |
| 编辑器 | Monaco Editor（本地加载，离线可用） |
| 预览渲染 | react-markdown + remark-gfm + rehype-raw |
| 图表支持 | Mermaid（懒加载，自定义主题） |
| PDF 生成 | marked + Electron printToPDF |
| 文档转换 | mammoth |
| AI 能力 | OpenAI SDK（Function Calling + Tool Use） |
| 搜索引擎 | Electron net.request（百度 + 搜狗） |
| 图标库 | Lucide React |

## 错误报告

NicMD 自动记录错误日志到：

```
%APPDATA%/nicmd/logs/
```

报告 Bug：
1. 前往 [GitHub Issues](https://github.com/NicholasQu/NicMD/issues/new?template=bug_report.yml)
2. 附上上述目录中的日志内容
3. 或在 NicMD 中按 `Ctrl+Shift+I` 打开开发者工具查看控制台

## 参与贡献

欢迎贡献代码！请阅读 [CONTRIBUTING.md](./CONTRIBUTING.md) 了解详情。

## 开源许可

[MIT](./LICENSE) © NicholasQu

---

<div align="center">

*NicMD — 沉静写作，专注表达*

</div>
