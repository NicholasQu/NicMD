# NicMD HTML 配图（HTML to Picture）

在 Markdown 中嵌入 HTML 文件，NicMD 自动截图为 PNG 并以精美卡片样式展示。
适合用 HTML/CSS 绘制流程图、架构图、对比卡片等复杂图表，截图后粘贴到微信公众号样式完整保留。

## 核心机制

```
md 中写 ::: nicmd-html 指令
      ↓
NicMD 用 Electron 无头浏览器加载 HTML
      ↓
截图为 PNG（带 hash 缓存，改 HTML 才重新截图）
      ↓
以 figure 卡片渲染到微信预览页（标题 + 描述 + 图片）
```

## 语法

在 Markdown 中使用 `::: nicmd-html` 指令块：

### 两种写法

**写法一（推荐）：行内等号格式**

属性写在指令行后面，用 `key="value"` 或 `key=value`：

```
::: nicmd-html src="相对路径.html" title="卡片标题" shot=1 width=1080
:::
```

**写法二：冒号格式**

属性写在指令块内部，每行一个 `key: value`：

```
::: nicmd-html
src: 相对路径.html
title: 卡片标题
shot: 1
width: 1080
:::
```

两种格式都支持，推荐写法一（更紧凑）。

### 参数说明

| 参数 | 必填 | 说明 |
|------|------|------|
| `src` | 是 | HTML 文件相对路径（相对于 md 文件所在目录） |
| `title` | 否 | 卡片标题（默认 `HTML 配图`） |
| `shot` | 否 | 截取第几个 `.shot` 区域（从 1 开始）。不填则截取整个 `.page` 或 `<body>` |
| `width` | 否 | 截图最大宽度（默认 960，最大 1400） |

## HTML 文件规范

### 基本结构（单张截图）

整个 body 就是一张图，`shot` 留空即可：

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<style>
  body { margin:0; padding:32px; background:#07111f; font-family:'PingFang SC',sans-serif; }
  .page { max-width:960px; margin:0 auto; }
  /* 在这里画你的图 */
</style>
</head>
<body>
  <div class="page">
    <!-- 你的图表内容 -->
  </div>
</body>
</html>
```

### 多截图结构（一个 HTML 产出多张图）

用 `.shot` 划分多个截图区域，通过 `shot=1`、`shot=2` 分别引用：

```html
<body>
  <!-- 第一张图 -->
  <div class="shot">
    <h2>架构总览</h2>      <!-- h2 会被自动移除（仅用于标识） -->
    <div class="desc">这里是描述文字</div>  <!-- desc 会被提取为卡片描述 -->
    <div class="content">...图表内容...</div>
  </div>

  <!-- 第二张图 -->
  <div class="shot">
    <h2>数据流</h2>
    <div class="desc">数据流向说明</div>
    <div class="content">...图表内容...</div>
  </div>
</body>
```

md 中分别引用：

```
::: nicmd-html src="diagram.html" title="架构总览" shot=1
:::

::: nicmd-html src="diagram.html" title="数据流" shot=2
:::
```

### `.shot` 内部规则

| 元素 | 截图时行为 |
|------|-----------|
| `<h2>` | **自动移除**（不进入截图，仅作为区域标识） |
| `.desc` | **自动提取为卡片描述**，不进入截图 |
| 其余内容 | 正常截图 |

## md 中引用示例

### 基本用法

```
::: nicmd-html src="assets/flow.html" title="用户请求处理流程"
:::
```

### 指定截图区域

```
::: nicmd-html src="assets/arch.html" title="三层架构" shot=2
:::
```

### 指定宽度

```
::: nicmd-html src="assets/timeline.html" title="项目时间线" width=800
:::
```

## 目录结构约定

```
article.md                  ← 你的文章
assets/
  ├── flow.html             ← HTML 配图源文件
  └── arch.html
.nicmd/
  └── weixin-assets/        ← NicMD 自动生成的 PNG 缓存（勿手动改）
      └── a3b2c1d4...png
```

- HTML 文件放在 md 同级或子目录（如 `assets/`）
- PNG 缓存在 `.nicmd/weixin-assets/`，以文件 hash 命名
- **修改 HTML 后自动重新截图**（hash 基于文件 mtime）

## 完整示例

### 文章结构

```
20260627-我的文章/
  ├── index.md
  └── assets/
      └── architecture.html
```

### index.md

```markdown
# 我的技术方案

正文内容...

::: nicmd-html src="assets/architecture.html" title="系统架构图" shot=1
:::

更多正文...
```

### assets/architecture.html

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<style>
  * { margin:0; box-sizing:border-box; }
  body { padding:40px; background:#0d1117; font-family:'PingFang SC',sans-serif; }
  .shot { max-width:960px; margin:0 auto; }
  .row { display:flex; gap:20px; }
  .card {
    flex:1; padding:24px; border-radius:12px;
    background:#161b22; border:1px solid #30363d;
  }
  .card h3 { color:#58a6ff; font-size:16px; margin-bottom:8px; }
  .card p { color:#8b949e; font-size:13px; line-height:1.6; }
</style>
</head>
<body>
  <div class="shot">
    <h2>系统架构</h2>
    <div class="desc">三层架构：网关层、服务层、数据层</div>
    <div class="row">
      <div class="card">
        <h3>Gateway</h3>
        <p>API 网关，鉴权与路由</p>
      </div>
      <div class="card">
        <h3>Service</h3>
        <p>业务逻辑处理</p>
      </div>
      <div class="card">
        <h3>Data</h3>
        <p>持久化与缓存</p>
      </div>
    </div>
  </div>
</body>
</html>
```

## 预览与发布

```bash
# 启动微信预览（自动截图 HTML）
nicmd weixin index.md

# 浏览器中确认效果后，点击「复制」按钮
# 粘贴到微信公众号编辑器，图片和卡片样式完整保留
```

## 注意事项

1. **HTML 必须是独立文件**（不能内联在 md 中），通过 `src` 引用
2. **路径安全**：HTML 文件必须在 md 文件所在目录的子树内，不能跳出
3. **缓存机制**：截图基于文件 hash 缓存，改 HTML 才重新截图；删缓存目录会强制全部重截
4. **截图尺寸**：自动适配内容宽高，最小 320x160，最大 1800x3000
5. **背景色**：建议 HTML 中显式设置 `body` 背景色，避免透明导致截图异常

## HTML 尺寸规范（避免截图截断/放大）

NicMD 截图时，会创建一个**无头浏览器窗口**加载 HTML，然后截取 `.page`（或 `.shot`）元素的实际渲染区域。以下是确保截图正确的关键规则：

### 必须遵守

| 规则 | 说明 | 错误示例 | 正确示例 |
|------|------|---------|---------|
| **`.page` 用固定宽度** | 不要用 `max-width`，否则窗口缩放时内容会重排 | `.page { max-width:560px }` | `.page { width:960px }` |
| **不用视口单位** | `vw`/`vh` 依赖窗口大小，但无头窗口尺寸不固定 | `font-size:5vw` | `font-size:22px` |
| **不用百分比布局** | `width:50%` 依赖父容器，无头窗口可能不匹配 | `.card { width:50% }` | `.card { width:460px }` |
| **body 设 `margin:0`** | 避免 body 默认 margin 导致截图偏移 | `body { }` | `body { margin:0 }` |
| **显式设背景色** | 避免透明背景导致截图异常 | `body { }` | `body { background:#0d1117 }` |

### 固定宽度模板

所有布局元素都用固定 px 值，不用百分比/视口单位：

```css
/* ✅ 正确：固定宽度 */
.page { width:960px; }
.card { width:280px; margin-right:20px; }
.title { font-size:24px; }

/* ❌ 错误：百分比/视口单位 */
.page { max-width:960px; }        /* 窗口小时会缩小 */
.card { width:33%; }              /* 依赖父容器宽度 */
.title { font-size:3vw; }         /* 依赖窗口宽度 */
```

### width 参数与 .page 宽度的关系

md 指令中的 `width` 参数决定**无头浏览器窗口**的大小（范围 720~1400），不直接影响截图区域。截图区域由 `.page` 元素的实际渲染尺寸决定。

- `.page { width:960px }` + `width=960` → 窗口 960px，截图 960px ✅
- `.page { width:960px }` + 不指定 width → 窗口默认 960px，截图 960px ✅
- `.page { width:1080px }` + 不指定 width → 窗口 960px，`.page` 被截断 ❌
- `.page { width:1080px }` + `width=1080` → 窗口 1080px，截图 1080px ✅

**建议**：`.page` 的固定宽度与 md 指令的 `width` 参数保持一致。

### 多卡片/网格布局

用固定宽度的 flex/grid，不用百分比：

```css
/* ✅ 正确 */
.row { display:flex; gap:20px; }
.card { width:280px; }  /* 3列：280*3 + 20*2 = 920px */

/* ❌ 错误 */
.row { display:flex; }
.card { flex:1; }  /* 宽度不固定，可能溢出 */
```
