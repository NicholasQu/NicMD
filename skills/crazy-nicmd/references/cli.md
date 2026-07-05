# NicMD CLI Reference

Use this reference for command-line operations, WeChat preview, preview process management, PDF export, and DOCX conversion.

## Installation Path

Default Windows install path:

```text
C:\Users\<username>\AppData\Local\Programs\NicMD\NicMD.exe
```

If `nicmd` is unavailable, check whether the NicMD executable directory is in `PATH`, or call `NicMD.exe` by absolute path.

## Command Quick Reference

| Command | Purpose |
| --- | --- |
| `nicmd <file.md>` | Open a Markdown file in the desktop editor |
| `nicmd weixin <file.md>` | Start a WeChat article preview server |
| `nicmd ps` | List running WeChat preview processes with PID, port, and file |
| `nicmd kill` | Stop all WeChat preview servers |
| `nicmd --export-pdf <input.md> [output.pdf]` | Export Markdown to PDF |
| `nicmd --convert-docx <input.docx> [output.md]` | Convert DOCX to Markdown |
| `nicmd --version` | Print version |
| `nicmd help` | Show full help |

## WeChat Preview

Start preview:

```bash
nicmd weixin article.md
```

Use a theme:

```bash
nicmd weixin article.md --theme appleGold
nicmd weixin article.md --theme appleBlue
nicmd weixin article.md --theme appleOrange
```

Use a fixed port:

```bash
nicmd weixin article.md --port 37621
```

Print the server URL without opening a browser:

```bash
nicmd weixin article.md --no-open
```

Recommended publishing flow:

1. Run `nicmd weixin <file.md>`.
2. Review the local browser preview.
3. Click the preview page copy button.
4. Paste styled rich text into the WeChat Official Account editor.
5. Run `nicmd kill` when done.

## Themes

| Theme | Use for |
| --- | --- |
| `appleGold` | Default polished public-account style |
| `appleOrange` | Energetic product, growth, announcement, or activity posts |
| `appleBlue` | Engineering notes, architecture, AI tooling, and technical analysis |

## Process Management

Every `nicmd weixin` run starts an independent preview process, usually on a random port.

List previews:

```bash
nicmd ps
```

Stop previews:

```bash
nicmd kill
```

On Windows, preview processes may appear as `NicMD.exe` in Task Manager. Prefer `nicmd ps` and `nicmd kill` because they identify WeChat preview processes by command-line arguments.

## PDF Export

Export to a same-name PDF:

```bash
nicmd --export-pdf article.md
```

Export to a chosen path:

```bash
nicmd --export-pdf article.md output.pdf
```

## DOCX Conversion

Convert to a same-name Markdown file:

```bash
nicmd --convert-docx draft.docx
```

Convert to a chosen path:

```bash
nicmd --convert-docx draft.docx draft.md
```
