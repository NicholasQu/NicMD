---
name: crazy-nicmd
description: Unified NicMD workflow for Markdown editing, WeChat Official Account preview, styled rich-text copy, preview server management, PDF export, DOCX-to-Markdown conversion, and HTML-to-picture visual cards. Use when the user asks to use NicMD, preview or publish WeChat articles, choose NicMD themes, manage NicMD preview processes, export PDF, convert DOCX, or create NicMD HTML visual cards, flowcharts, architecture diagrams, timelines, or comparison graphics.
---

# Crazy NicMD

Use this skill as the umbrella entry point for NicMD work. Keep `SKILL.md` focused on routing and core workflow; load the relevant reference only when the task needs detail.

## Choose the Reference

- For command-line usage, WeChat preview, themes, process cleanup, PDF export, or DOCX conversion, read [references/cli.md](references/cli.md).
- For HTML/CSS visual cards, `nicmd-html` blocks, screenshots, diagrams, flowcharts, timelines, comparison cards, or screenshot sizing problems, read [references/html-pic.md](references/html-pic.md).
- **For modifying NicMD source code (`wechat-render.ts`, `wxarticle-server.ts`, rendering logic, theme styles), MUST read [references/wechat-render-rules.md](references/wechat-render-rules.md) first.** It contains hard-won rules from repeated bugs: list item bold scope, font-family consistency, font-weight normalization, WeChat-compatible HTML tags, multi-column layout, background color placement, preview/wechat consistency, and the build-before-package checklist.
- For ordinary WeChat article writing, use `$crazy-techrill-social-media` together with this skill when content strategy or article polishing is also needed.

## Default WeChat Workflow

1. Create or edit the Markdown article.
2. Keep article assets under the same article folder, usually `assets/`.
3. Start preview (NicMD automatically kills previous preview processes, no manual kill needed):

```bash
nicmd weixin index.md
```

4. Review the browser preview.
5. Use the preview page copy button to copy styled rich text.
6. Paste into the WeChat Official Account editor.

> NicMD `weixin` command automatically replaces any previous preview server. You do **not** need to run `nicmd kill` before starting a new preview. Use `nicmd ps` only to inspect running ports, and `nicmd kill` only when you want to stop all servers without starting a new one.

## Common Commands

```bash
nicmd <file.md>
nicmd weixin <file.md>
nicmd weixin <file.md> --theme appleGold
nicmd weixin <file.md> --theme appleBlue
nicmd weixin <file.md> --theme appleOrange
nicmd ps
nicmd kill
nicmd --export-pdf <input.md> [output.pdf]
nicmd --convert-docx <input.docx> [output.md]
```

Theme defaults:

- `appleGold`: polished public-account default.
- `appleBlue`: engineering, AI tooling, architecture, and technical notes.
- `appleOrange`: energetic product, growth, announcement, or activity posts.

## Article Folder Convention

Prefer:

```text
MMDD-title-slug/
  index.md
  assets/
    images/
    references/
    html/
  .nicmd/
    weixin-assets/
```

Use `assets/` for source HTML, images, references, and article-local files. Treat `.nicmd/weixin-assets/` as generated cache.
