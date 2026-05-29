import { ipcMain, BrowserWindow, net } from 'electron'

interface SearchResult {
  title: string
  snippet: string
  source: string
  date?: string
  url?: string
}

function fetchUrl(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const request = net.request({
      url,
      method: 'GET'
    })
    request.setHeader('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36')
    request.setHeader('Accept', 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8')
    request.setHeader('Accept-Language', 'zh-CN,zh;q=0.9,en;q=0.8')

    let body = ''
    request.on('response', (response) => {
      if (response.statusCode >= 300 && response.statusCode < 400) {
        const location = response.headers['location']
        if (location) {
          fetchUrl(location).then(resolve).catch(reject)
          return
        }
      }
      response.on('data', (chunk) => { body += chunk.toString('utf-8') })
      response.on('end', () => resolve(body))
      response.on('error', reject)
    })
    request.on('error', reject)
    request.end()
  })
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/\s+/g, ' ').trim()
}

function parseBaidu(html: string): SearchResult[] {
  const results: SearchResult[] = []
  const blocks = html.split(/<div[^>]*class="[^"]*c-container[^"]*"[^>]*>/)
  for (const block of blocks.slice(1)) {
    try {
      const titleMatch = block.match(/<h3[^>]*class="[^"]*"[^>]*>(.*?)<\/h3>/s)
      const snippetMatch = block.match(/class="[^"]*content-right_[^"]*"[^>]*>(.*?)<\/div>/s)
        || block.match(/class="[^"]*c-abstract[^"]*"[^>]*>(.*?)<\/div>/s)
        || block.match(/<span[^>]*class="[^"]*content-right[^"]*"[^>]*>(.*?)<\/span>/s)

      if (titleMatch) {
        const title = stripHtml(titleMatch[1])
        const snippet = snippetMatch ? stripHtml(snippetMatch[1]).slice(0, 300) : ''
        if (title) {
          results.push({ title, snippet, source: '百度' })
        }
      }
    } catch {}
  }
  if (results.length === 0) {
    const h3s = html.match(/<h3[^>]*>([\s\S]*?)<\/h3>/g) || []
    for (const h3 of h3s.slice(0, 8)) {
      const title = stripHtml(h3)
      if (title) results.push({ title, snippet: '', source: '百度' })
    }
  }
  return results.slice(0, 8)
}

function parseSogouWechat(html: string): SearchResult[] {
  const results: SearchResult[] = []
  const blocks = html.split(/<div[^>]*class="[^"]*news-box[^"]*"[^>]*>/)
  if (blocks.length <= 1) {
    const altBlocks = html.split(/<div[^>]*class="[^"]*txt-box[^"]*"[^>]*>/)
    for (const block of altBlocks.slice(1)) {
      try {
        const titleMatch = block.match(/<h3[^>]*>([\s\S]*?)<\/h3>/)
          || block.match(/<a[^>]*>([\s\S]*?)<\/a>/)
        const snippetMatch = block.match(/<p[^>]*class="[^"]*txt-info[^"]*"[^>]*>([\s\S]*?)<\/p>/s)
          || block.match(/<p[^>]*>([\s\S]*?)<\/p>/s)
        const sourceMatch = block.match(/<a[^>]*class="[^"]*account[^"]*"[^>]*>([\s\S]*?)<\/a>/s)
          || block.match(/<span[^>]*class="[^"]*s-p[^"]*"[^>]*>([\s\S]*?)<\/span>/s)
        const dateMatch = block.match(/(\d{4}-\d{1,2}-\d{1,2})/)

        if (titleMatch) {
          const title = stripHtml(titleMatch[1])
          const snippet = snippetMatch ? stripHtml(snippetMatch[1]).slice(0, 300) : ''
          const source = sourceMatch ? stripHtml(sourceMatch[1]) : '微信公众号'
          const date = dateMatch ? dateMatch[1] : undefined
          if (title) results.push({ title, snippet, source, date })
        }
      } catch {}
    }
  } else {
    for (const block of blocks.slice(1)) {
      try {
        const titleMatch = block.match(/<h3[^>]*>([\s\S]*?)<\/h3>/)
        const snippetMatch = block.match(/<p[^>]*class="[^"]*txt-info[^"]*"[^>]*>([\s\S]*?)<\/p>/s)
        const sourceMatch = block.match(/<a[^>]*class="[^"]*account[^"]*"[^>]*>([\s\S]*?)<\/a>/s)
        const dateMatch = block.match(/(\d{4}-\d{1,2}-\d{1,2})/)

        if (titleMatch) {
          const title = stripHtml(titleMatch[1])
          const snippet = snippetMatch ? stripHtml(snippetMatch[1]).slice(0, 300) : ''
          const source = sourceMatch ? stripHtml(sourceMatch[1]) : '微信公众号'
          const date = dateMatch ? dateMatch[1] : undefined
          if (title) results.push({ title, snippet, source, date })
        }
      } catch {}
    }
  }
  return results.slice(0, 8)
}

export function registerWebSearchIPC(getMainWindow: () => BrowserWindow | null): void {
  ipcMain.handle('web-search:baidu', async (_event, query: string) => {
    try {
      const url = `https://www.baidu.com/s?wd=${encodeURIComponent(query)}&rn=10`
      const html = await fetchUrl(url)
      const results = parseBaidu(html)
      return { success: true, results, engine: '百度' }
    } catch (e: any) {
      console.error('[web-search:baidu] Failed:', e.message)
      return { success: false, error: e.message, results: [], engine: '百度' }
    }
  })

  ipcMain.handle('web-search:wechat', async (_event, query: string) => {
    try {
      const url = `https://weixin.sogou.com/weixin?type=2&query=${encodeURIComponent(query)}&ie=utf8`
      const html = await fetchUrl(url)
      const results = parseSogouWechat(html)
      return { success: true, results, engine: '搜狗微信' }
    } catch (e: any) {
      console.error('[web-search:wechat] Failed:', e.message)
      return { success: false, error: e.message, results: [], engine: '搜狗微信' }
    }
  })
}
