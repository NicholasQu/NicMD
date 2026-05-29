import { marked } from 'marked'

export function buildPdfHtml(mdContent: string): string {
  const bodyHtml = marked.parse(mdContent) as string
  return `<!DOCTYPE html><html lang="zh-CN"><head><meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>NicMD Export</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{max-width:780px;margin:0 auto;padding:40px 48px;font-family:'Segoe UI',system-ui,-apple-system,sans-serif;font-size:15px;line-height:1.8;color:#1a1a1a;background:#fff}
h1{font-size:28px;font-weight:800;color:#ea580c;margin:32px 0 16px;padding-bottom:8px;border-bottom:2px solid #f97316}
h2{font-size:22px;font-weight:700;color:#ea580c;margin:28px 0 12px;padding-bottom:4px;border-bottom:1px solid #fed7aa}
h2::before{content:'';display:inline-block;width:4px;height:0.9em;margin-right:10px;border-radius:999px;background:#ea580c;vertical-align:-0.08em}
h3{font-size:18px;font-weight:600;color:#374151;margin:20px 0 8px}
h4,h5,h6{font-size:16px;font-weight:600;color:#4b5563;margin:16px 0 8px}
p{margin:8px 0}
a{color:#ea580c;text-decoration:underline}
code{padding:2px 6px;background:#fff7ed;border:1px solid #fed7aa;border-radius:4px;font-family:'Consolas','Monaco',monospace;font-size:13px;color:#9a3412}
pre{padding:0;background:#faf5f0;border:1px solid #f1e6df;border-radius:10px;overflow-x:auto;margin:16px 0}
pre code{display:block;padding:16px 20px;background:none;color:#1a1a1a;border:none;font-size:13.5px;line-height:1.7}
blockquote{border-left:3px solid #ea580c;padding-left:16px;margin:12px 0;color:#6b7280;background:#fff7ed;border-radius:0 8px 8px 0;padding:12px 16px}
table{border-collapse:collapse;width:100%;margin:12px 0;border-radius:8px;overflow:hidden}
th,td{border:1px solid #e5e7eb;padding:8px 12px;text-align:left}
th{background:#f97316;color:#fff;font-weight:600}
tr:nth-child(even){background:#fff7ed}
ul,ol{padding-left:24px;margin:8px 0}
li{margin:4px 0}
img{max-width:100%;border-radius:8px;margin:8px 0}
hr{border:none;border-top:1px solid #e5e7eb;margin:24px 0}
strong{font-weight:700;color:#1a1a1a}
em{font-style:italic}
del{text-decoration:line-through;opacity:0.5}
</style></head><body><div class="markdown-body">${bodyHtml}</div></body></html>`
}
