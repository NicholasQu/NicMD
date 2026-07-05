# NicMD 微信渲染开发规范

> 本文件记录 NicMD 微信渲染层（`wechat-render.ts` + `wxarticle-server.ts`）反复踩过的坑和最终确定的规则。
> 修改渲染层代码前必须先读这个文件，避免重复犯错。

## 1. 列表项加粗（最容易出错的区域）

### 问题历史

列表项 `**标题**：说明` 的渲染反复出问题，经历了四个错误版本：

| 版本 | 做法 | Bug |
|------|------|-----|
| v1 | 正则匹配到行尾，把 `$2$3$4`（标题+冒号+说明）全包进 `<span font-weight:700>` | 整行加粗 |
| v2 | 只把标题 `$2` 包进 `<strong>`，冒号 `$3` 在外面 | 微信在 inline 边界断行，冒号掉到下一行 |
| v3 | 标题+冒号 `$2$3` 包进 `<strong>`，但用了自定义 HTML 标签 | 与 marked.js 的 `<strong>` 全局样式规则冲突，部分场景仍是整行加粗 |
| v4 | 只改 markdown 语法 `**标题：**` | marked.js GFM 规范：闭合 `**` 后紧跟字母不算闭合（right-flanking），`**` 原样输出 |
| **v5（正确）** | **预处理生成裸 `<strong>标题：</strong>`** | ✅ |

### 正确规则（v5）

**在预处理阶段生成裸 `<strong>` 标签**（冒号包进 strong 内部），**不加 inline style**，让 `wrapWechatHtml` 的全局 `<strong>` 规则统一处理样式。

```ts
// 正确：**标题**：说明  →  <strong>标题：</strong>说明
[/\*\*([^*\n]+)\*\*([：:])/g, '<strong>$1$2</strong>'],
```

渲染链路：
1. 预处理：`**不做工具调用**：` → `<strong>不做工具调用：</strong>`
2. marked.js：识别 HTML inline，原样保留 `<strong>` 标签
3. wrapWechatHtml：`/<strong\b/g` 匹配，加 `style="display:inline;color:...;font-weight:700;"`

### 为什么不能直接改 markdown 语法（v4 失败原因）

marked.js 遵循 GFM 规范，闭合 `**` 必须满足 right-flanking 规则：闭合 `**` 后面不能紧跟字母数字。`**不做工具调用：**A2A` 中 `**` 后面是 `A`，marked.js 不认这是闭合标记，`**` 原样输出为字面文本。

### 为什么不加 inline style（v3 失败原因）

预处理生成的带 style 的 `<strong>` 和 marked.js 自然生成的 `<strong>` 会产生样式冲突。正确做法是预处理只生成裸 `<strong>` 标签，样式由 `wrapWechatHtml` 的全局规则统一处理。

---

## 2. 字体一致性

### 问题历史

不同元素用不同 font-family 列表，导致英文术语在不同上下文显示不同字体。

### 正确规则

**所有正文元素必须用同一个 `WECHAT_FONT_FAMILY` 常量**：

```ts
export const WECHAT_FONT_FAMILY = "-apple-system,BlinkMacSystemFont,'PingFang SC','Noto Sans SC','Source Han Sans SC','Microsoft YaHei',sans-serif"
```

需要加 font-family 的元素：
- `<p>`（正文）
- `<li>`（列表项）
- `<ul>` / `<ol>`（列表容器）
- `<blockquote>` 内的 `<p>`

**所有代码元素必须用同一个 monospace 字体列表**：

```ts
const CODE_FONT = "'SF Mono',SFMono-Regular,Consolas,'Liberation Mono',Menlo,'PingFang SC','Microsoft YaHei',monospace"
```

- 代码块 `<code>` 和行内代码 `<code>` 必须用**完全相同**的字体列表
- 不要在代码块用 `SFMono-Regular,...` 而行内代码用 `'SF Mono',SFMono-Regular,...` —— 会渲染出两种字体

---

## 3. font-weight 规范

### 问题历史

大量元素用 `font-weight:850`（Apple 数值，非标准），视觉上过重，满屏加粗感。

### 正确规则

| 元素 | font-weight |
|------|-------------|
| `<strong>` | **700** |
| `<mark>` | **700** |
| `<th>` | **700** |
| `<h1>` | 850（标题允许更重） |
| `<h2>` | 850 |
| `<h3>` | 800 |
| `<h4>` | 760 |
| 图片占位符标题 | **700** |
| HTML 配图块标题 | **700** |

**正文内的加粗用 700，不要用 850**。850 只留给标题。

---

## 4. 微信兼容的 HTML 标签选择

### 问题历史

`<figure>` + `<figcaption>` 在微信里会产生额外换行/段落。

### 正确规则

| 标签 | 能否用 | 原因 |
|------|--------|------|
| `<section>` | ✅ 首选 | 微信保留率最高的容器 |
| `<table>`/`<tr>`/`<td>` | ✅ 多列布局首选 | 微信 100% 保留，td 天生并排 |
| `<p>`/`<strong>`/`<em>`/`<code>`/`<pre>` | ✅ | 微信保留 |
| `<span>` | ✅ inline 样式载体 | 微信保留 |
| `<img>` | ✅ | 微信会自动转存到 CDN |
| `<figure>`/`<figcaption>` | ❌ 禁用 | 微信产生额外换行 |
| `<div>` | ⚠️ 避免 | 微信保留率低于 `<section>` |

**图片容器用 `<section>` 而不是 `<figure>`**：

```ts
// 错误
return `<figure style="..."><img ... /><figcaption>标题</figcaption></figure>`

// 正确
return `<section style="..."><img ... /><section style="...">标题</section></section>`
```

**重要副作用**：预览页的"复制圆角图"按钮通过 JS 查找图片容器注入。改 `<figure>` 为 `<section>` 后，必须同步更新选择器：

```js
// 错误：只匹配 figure
document.querySelectorAll('#article figure').forEach(...)

// 正确：同时匹配 figure 和 section
document.querySelectorAll('#article figure, #article section').forEach(...)
```

---

## 5. 多列布局（如品牌签名）

### 问题历史

用 `<span display:inline-block>` 做多列并排，微信复制后变成单列换行。

### 正确规则

**多列布局必须用 `<table>` 两列 `<td>`**，不要用 inline-block / flex / grid。

```html
<table cellpadding="0" cellspacing="0" border="0">
  <tr>
    <td style="...">左列内容</td>
    <td style="...">右列内容</td>
  </tr>
</table>
```

---

## 6. 背景色

### 问题历史

CSS `background:#1c1917` 写在 `<section>` 上，微信复制后背景色丢失。

### 正确规则

- 背景色必须写在 **`<td>`** 或 **`<table>`** 上，不要写在 `<section>`/`<div>` 上
- 暗色背景内**禁止嵌套 table**（会产生白线），用 `<p>`/`<span>` 代替
- 每个 `<td>` 必须显式写 `border:0 none;`（否则微信加默认边框）
- `linear-gradient` 会丢失，必须提供纯色 fallback

---

## 7. 预览页 vs 微信一致性

### 问题历史

预览页显示小卡片，微信里变成全宽卡片，样式不一致。

### 正确规则

- table 宽度统一用 `width:100%`（不要用 `width:auto`，微信会强制撑满）
- 圆角必须配合 `border-collapse:separate` + `overflow:hidden` 才能在 table 上生效
- 修改后**必须同时检查预览页和微信**，不能只看一边

---

## 8. 编译与打包流程

### 问题历史

直接跑 `electron-builder` 而漏了 `electron-vite build`，导致打包进去的是旧编译产物。

### 正确流程

```bash
# 1. 先编译（src → out）
npm run build

# 2. 再打包（out → exe）
npx electron-builder --win portable --x64

# 3. 覆盖安装目录
robocopy "dist-build\win-unpacked" "D:\Softwares\NicMD" /MIR
```

**绝对不要跳过步骤 1**。`electron-builder` 不会自动编译 TypeScript。

### asar 文件锁问题

如果 `electron-builder` 报 `app.asar: The process cannot access the file`，说明旧进程还在占用。解决：

```bash
# 杀掉所有 electron 进程
Get-Process -Name electron,NicMD -ErrorAction SilentlyContinue | Stop-Process -Force

# 换新的输出目录
npx electron-builder --win portable --x64 --config.directories.output=dist-new
```

---

## 9. 预览调试技巧

### 验证渲染输出的正确方法

不要只看预览页面效果，**用 Chrome DevTools 检查实际生成的 HTML**：

```js
// 检查列表项渲染
() => {
  const els = document.querySelectorAll('ol li, ul li');
  return Array.from(els).slice(0, 5).map(el => ({
    text: el.textContent.trim().substring(0, 80),
    html: el.innerHTML.substring(0, 300)
  }));
}
```

### 确认运行的是最新代码

预览页面跑的可能是旧的 NicMD.exe（打包版本），不是最新编译版本。验证方法：

```bash
# 检查 app.asar 时间戳是否晚于源码修改时间
Get-Item "D:\Softwares\NicMD\resources\app.asar" | Select LastWriteTime
Get-Item "src\shared\wechat-render.ts" | Select LastWriteTime
```

如果 asar 时间早于源码，说明打包时漏了编译步骤。

---

## 10. 修改渲染层的检查清单

改 `wechat-render.ts` 或 `wxarticle-server.ts` 前，过一遍这个清单：

- [ ] 列表项加粗：是否用了 v4 方案（只改 markdown 语法，不生成 HTML）？
- [ ] 字体：是否所有正文元素用 `WECHAT_FONT_FAMILY`？代码元素用统一的 monospace 列表？
- [ ] font-weight：正文加粗是否用 700（不是 850）？
- [ ] HTML 标签：是否避免了 `<figure>`/`<div>`，改用 `<section>`？
- [ ] 多列布局：是否用了 `<table>` 两列 `<td>`（不是 inline-block）？
- [ ] 背景色：是否写在 `<td>` 上（不是 `<section>` 上）？
- [ ] 预览一致性：table 是否 `width:100%` + `border-collapse:separate`？
- [ ] 打包：是否先 `npm run build` 再 `electron-builder`？
