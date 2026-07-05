# NicMD HTML Picture Reference

Use this reference when creating HTML/CSS visuals that NicMD screenshots into PNG cards for WeChat preview.

## Core Mechanism

```text
Markdown nicmd-html block
  -> NicMD loads standalone HTML with headless Electron
  -> NicMD screenshots the target page or .shot region into PNG
  -> NicMD renders it as a figure card in the WeChat preview
```

## Markdown Syntax

Recommended compact form:

```markdown
::: nicmd-html src="assets/diagram.html" title="图表标题" shot=1 width=960
:::
```

Alternative block form:

```markdown
::: nicmd-html
src: assets/diagram.html
title: 图表标题
shot: 1
width: 960
:::
```

Parameters:

| Parameter | Required | Meaning |
| --- | --- | --- |
| `src` | yes | HTML file path relative to the Markdown file |
| `title` | no | Figure/card title; defaults to `HTML 配图` |
| `shot` | no | Capture the Nth `.shot` region, starting at 1 |
| `width` | no | Headless browser viewport width; default 960, max 1400 |

## Directory Convention

Keep HTML under the article folder:

```text
MMDD-title-slug/
  index.md
  assets/
    html/
      diagram.html
  .nicmd/
    weixin-assets/
```

Generated PNG cache files live under `.nicmd/weixin-assets/`. Do not edit cached PNGs manually.

## Single-Shot Template

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<style>
  * { box-sizing: border-box; }
  body {
    margin: 0;
    padding: 40px;
    background: #0d1117;
    font-family: "Microsoft YaHei", "PingFang SC", sans-serif;
  }
  .page {
    width: 960px;
    margin: 0 auto;
  }
</style>
</head>
<body>
  <div class="page">
    <!-- Draw the chart, card, flow, or diagram here. -->
  </div>
</body>
</html>
```

Reference it:

```markdown
::: nicmd-html src="assets/html/diagram.html" title="系统架构图" width=960
:::
```

## Multi-Shot Template

Use `.shot` when one HTML file should produce multiple images:

```html
<body>
  <div class="shot">
    <h2>架构总览</h2>
    <div class="desc">三层架构：网关层、服务层、数据层</div>
    <div class="content">...</div>
  </div>

  <div class="shot">
    <h2>数据流</h2>
    <div class="desc">请求、处理、存储和返回链路</div>
    <div class="content">...</div>
  </div>
</body>
```

Reference each capture:

```markdown
::: nicmd-html src="assets/diagram.html" title="架构总览" shot=1 width=960
:::

::: nicmd-html src="assets/diagram.html" title="数据流" shot=2 width=960
:::
```

Within `.shot`:

- `<h2>` is used as a marker and removed from the screenshot.
- `.desc` is extracted as the card description and removed from the screenshot.
- Other content is captured normally.

## Screenshot Reliability Rules

- Use fixed pixel widths for `.page`, `.shot`, cards, columns, and major layout blocks.
- Set `body { margin:0; }`.
- Set an explicit `body` background color.
- Avoid `vw`, `vh`, percentage widths, and responsive `max-width` for captured visuals.
- Keep `.page` or `.shot` width aligned with the Markdown `width` parameter.
- If `.page { width:1080px; }`, use `width=1080`.
- Keep the visual within practical screenshot limits: about 320x160 minimum and 1800x3000 maximum.

Correct:

```css
.page { width: 960px; }
.row { display: flex; gap: 20px; }
.card { width: 300px; }
.title { font-size: 24px; }
```

Avoid:

```css
.page { max-width: 960px; }
.card { width: 33%; }
.title { font-size: 3vw; }
```

## Drawing Rules (MANDATORY)

Two absolute rules when creating HTML visuals. Violating these will produce ugly output.

### Rule 1: Use SVG for physical/structural diagrams

**When to use SVG:** anything that depicts physical objects, hardware, chip structures, 3D shapes, cross-sections, circuit layouts, data flow paths, or spatial relationships.

Examples that MUST use SVG:

- Chip stacking (HBM layers, TSV vias, interposer)
- Hardware components (memory modules, GPU layout)
- Physical cross-sections (TSV via wall, metal fill, insulation)
- Architecture diagrams with spatial meaning (data center layout, factory map)
- Any diagram where shape, proportion, or position carries meaning

**When CSS boxes are OK:** pure text/layout cards with no physical meaning — comparison tables, stat cards, timeline lists, pros/cons boxes. If it is essentially a styled table or list, CSS divs are fine.

If unsure, default to SVG. SVG scales cleanly, looks professional, and renders identically in screenshots.

### Rule 2: Never use emoji

Emoji are forbidden in HTML visuals. No exceptions.

- No emoji icons (no 🖥️ 📱 🤖 🔥 🚀 etc.)
- No emoji as bullet points or decorations
- No emoji in titles, labels, or callouts

**Why:** emoji render inconsistently across platforms, look unprofessional in WeChat screenshots, and clash with the dark tech aesthetic.

**Replace emoji with:**

1. SVG-drawn icons (lines, circles, rects, paths)
2. Geometric shapes (squares, triangles, hexagons)
3. Color-coded badges and tags
4. Letter/digit monograms in styled circles

Example replacement:

```html
<!-- WRONG -->
<div class="icon">🖥️</div>

<!-- RIGHT -->
<svg viewBox="0 0 64 64" width="48" height="48">
  <rect x="8" y="14" width="48" height="32" rx="3" fill="none" stroke="#58a6ff" stroke-width="2"/>
  <rect x="14" y="20" width="36" height="20" rx="2" fill="#1f6feb" opacity="0.3"/>
</svg>
```

## Visual Guidance

Create visuals that explain the article:

- Use flowcharts for process explanations.
- Use architecture diagrams for system design.
- Use comparison cards for tool/model choices.
- Use timelines for release history, plans, or evolution.
- Use framework diagrams for reusable mental models.

Keep text large enough for mobile WeChat reading. Prefer concise labels, clear grouping, and high contrast. Avoid dense paragraphs inside images.

Preview after adding HTML blocks:

```bash
nicmd weixin index.md
```

If an image does not update after editing HTML, delete the relevant generated cache under `.nicmd/weixin-assets/` and preview again.
