# NicMD CLI 命令行

## 安装路径

安装版默认路径：
```
C:\Users\你的用户名\AppData\Local\Programs\NicMD\NicMD.exe
```

便携版：解压后即为 NicMD.exe，路径自定义。

> 建议将 NicMD.exe 所在目录加入系统 PATH 环境变量，即可全局使用 `nicmd` 命令。

## 命令速查

| 命令 | 说明 |
|------|------|
| `nicmd <file.md>` | 在桌面编辑器中打开文件 |
| `nicmd weixin <file.md>` | 启动微信文章预览服务器 |
| `nicmd ps` | 查看所有正在运行的微信预览进程（PID、端口、文件） |
| `nicmd kill` | 一键停止所有微信预览服务器，释放端口 |
| `nicmd --export-pdf <input.md> [output.pdf]` | 导出 PDF |
| `nicmd --convert-docx <input.docx> [output.md]` | DOCX 转 Markdown |
| `nicmd --version` | 查看版本号 |
| `nicmd help` | 查看完整帮助 |

## 微信文章预览

每次 `nicmd weixin` 会启动一个独立的预览进程（随机端口）。预览结束后建议清理：

```bash
# 查看所有运行中的微信预览进程（PID、端口、文件路径）
nicmd ps

# 一键停止所有微信预览服务器，释放占用的端口和内存
nicmd kill
```

也可以在启动 weixin 的终端按 `Ctrl+C` 停止单个服务器。

> **进程可见性**：weixin 预览进程在 Windows 任务管理器中显示为 NicMD.exe，
> 但其命令行参数包含 `weixin`，可通过 `nicmd ps` 精确识别和管理。
> 即使 PID 注册表丢失，`nicmd kill` 也会扫描系统进程兜底清理。

```bash
# 基本用法 — 启动预览服务器并自动打开浏览器
nicmd weixin article.md

# 指定主题
nicmd weixin article.md --theme appleGold

# 指定端口（适合脚本/书签固定 URL）
nicmd weixin article.md --port 37621

# 不自动打开浏览器（只打印服务器地址）
nicmd weixin article.md --no-open
```

### 可用主题

| 主题 | 风格 |
|------|------|
| `appleGold` | 默认。鎏金朱砂风：暖金背景、朱橙标题、圆角章节卡片 |
| `appleOrange` | 明亮橙色风，适合活力文章 |
| `appleBlue` | 蓝色技术风，适合工程笔记 |

### 微信预览工作流

1. `nicmd weixin article.md` 启动本地预览服务器（127.0.0.1）
2. 浏览器中查看排版效果
3. 点击页面上的**复制**按钮，获取带样式的富文本
4. 粘贴到微信公众号编辑器，样式自动保留

## PDF 导出

```bash
# 同目录生成同名 pdf
nicmd --export-pdf article.md

# 指定输出路径
nicmd --export-pdf article.md output.pdf
```

## DOCX 转换

```bash
# 同目录生成同名 md
nicmd --convert-docx draft.docx

# 指定输出路径
nicmd --convert-docx draft.docx draft.md
```

## 文件关联

安装后 `.md` `.markdown` `.mdx` 文件自动关联 NicMD，双击即可打开。
