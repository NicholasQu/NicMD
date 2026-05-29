import { ipcMain, BrowserWindow } from 'electron'
import OpenAI from 'openai'

interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool'
  content: string
  tool_call_id?: string
  tool_calls?: Array<{
    id: string
    type: 'function'
    function: { name: string; arguments: string }
  }>
}

const SEARCH_TOOLS = [
  {
    type: 'function' as const,
    function: {
      name: 'web_search',
      description: '搜索互联网获取实时信息、新闻、热门话题等。当用户询问关于时事、最新动态、热门话题、具体事实等需要联网查询的问题时使用此工具。',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: '搜索关键词，用中文描述要搜索的内容'
          },
          engine: {
            type: 'string',
            enum: ['baidu', 'wechat'],
            description: '搜索引擎：baidu（通用搜索）或 wechat（搜索微信公众号文章）'
          }
        },
        required: ['query']
      }
    }
  }
]

export function registerLlmIPC(getMainWindow: () => BrowserWindow | null): void {
  ipcMain.handle('llm:generate', async (_event, params: {
    prompt: string
    apiKey: string
    apiBase: string
    model: string
    soul?: string
    skill?: string
    history?: ChatMessage[]
    enableTools?: boolean
  }) => {
    try {
      const openai = new OpenAI({
        apiKey: params.apiKey,
        baseURL: params.apiBase || 'https://api.openai.com/v1'
      })

      const systemParts: string[] = []
      if (params.soul) systemParts.push(`## 你的角色\n${params.soul}`)
      if (params.skill) systemParts.push(`## 你的能力\n${params.skill}`)
      systemParts.push('请用Markdown格式输出。')
      if (params.enableTools) {
        systemParts.push('你可以使用 web_search 工具搜索互联网获取实时信息。当用户问及时事新闻、最新动态、热门话题、具体数据等信息时，请主动使用搜索工具。')
      }
      const systemPrompt = systemParts.join('\n\n')

      const messages: ChatMessage[] = [
        { role: 'system', content: systemPrompt }
      ]

      if (params.history && params.history.length > 0) {
        const trimmed = trimHistory(params.history, 4000)
        messages.push(...trimmed)
      }

      messages.push({ role: 'user', content: params.prompt })

      const mainWindow = getMainWindow()
      const maxToolRounds = 3
      let fullResponse = ''

      for (let round = 0; round <= maxToolRounds; round++) {
        const createParams: any = {
          model: params.model || 'gpt-4o',
          messages,
          stream: true
        }

        if (params.enableTools && round < maxToolRounds) {
          createParams.tools = SEARCH_TOOLS
          createParams.tool_choice = 'auto'
        }

        const stream = await openai.chat.completions.create(createParams)

        let currentContent = ''
        let toolCalls: Array<{ id: string; name: string; arguments: string }> = []
        let hasToolCall = false

        for await (const chunk of stream) {
          const choice = chunk.choices[0]
          if (!choice) continue

          const delta = choice.delta

          if (delta?.content) {
            currentContent += delta.content
            fullResponse += delta.content
            if (mainWindow) {
              mainWindow.webContents.send('llm:stream', { delta: delta.content, done: false })
            }
          }

          if (delta?.tool_calls) {
            hasToolCall = true
            for (const tc of delta.tool_calls) {
              const idx = tc.index ?? 0
              if (!toolCalls[idx]) {
                toolCalls[idx] = { id: tc.id || '', name: '', arguments: '' }
              }
              if (tc.id) toolCalls[idx].id = tc.id
              if (tc.function?.name) toolCalls[idx].name += tc.function.name
              if (tc.function?.arguments) toolCalls[idx].arguments += tc.function.arguments
            }
          }
        }

        if (!hasToolCall) {
          messages.push({ role: 'assistant', content: currentContent })
          break
        }

        messages.push({
          role: 'assistant',
          content: currentContent || '',
          tool_calls: toolCalls.map(tc => ({
            id: tc.id,
            type: 'function' as const,
            function: { name: tc.name, arguments: tc.arguments }
          }))
        })

        for (const tc of toolCalls) {
          if (mainWindow) {
            mainWindow.webContents.send('llm:stream', {
              delta: '',
              done: false,
              toolStatus: { name: tc.name, args: tc.arguments, status: 'searching' }
            })
          }

          let toolResult = ''
          try {
            const args = JSON.parse(tc.arguments)
            const query = args.query || ''
            const engine = args.engine || 'baidu'

            if (tc.name === 'web_search') {
              const searchResults = await executeSearch(query, engine)
              toolResult = JSON.stringify(searchResults)
            } else {
              toolResult = JSON.stringify({ error: `Unknown tool: ${tc.name}` })
            }
          } catch (e: any) {
            toolResult = JSON.stringify({ error: e.message })
          }

          if (mainWindow) {
            mainWindow.webContents.send('llm:stream', {
              delta: '',
              done: false,
              toolStatus: { name: tc.name, status: 'done' }
            })
          }

          messages.push({
            role: 'tool',
            content: toolResult,
            tool_call_id: tc.id
          } as any)
        }
      }

      if (mainWindow) {
        mainWindow.webContents.send('llm:stream', { delta: '', done: true, full: fullResponse })
      }
      return { success: true, content: fullResponse }
    } catch (e: any) {
      console.error('[llm:generate] Failed:', e.message)
      return { success: false, error: e.message }
    }
  })
}

async function executeSearch(query: string, engine: string): Promise<{ results: Array<{ title: string; snippet: string; source: string; date?: string }>; engine: string }> {
  const { net } = require('electron')

  const fetchWithUA = (url: string): Promise<string> => {
    return new Promise((resolve, reject) => {
      const request = net.request({ url, method: 'GET' })
      request.setHeader('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36')
      request.setHeader('Accept', 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8')
      request.setHeader('Accept-Language', 'zh-CN,zh;q=0.9,en;q=0.8')
      let body = ''
      request.on('response', (response: any) => {
        response.on('data', (chunk: Buffer) => { body += chunk.toString('utf-8') })
        response.on('end', () => resolve(body))
        response.on('error', reject)
      })
      request.on('error', reject)
      request.end()
    })
  }

  const stripHtml = (html: string): string => {
    return html.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/\s+/g, ' ').trim()
  }

  const parseBaidu = (html: string) => {
    const results: Array<{ title: string; snippet: string; source: string; date?: string }> = []
    const h3s = html.match(/<h3[^>]*>([\s\S]*?)<\/h3>/g) || []
    const abstracts = html.match(/class="[^"]*c-abstract[^"]*"[^>]*>([\s\S]*?)<\/(?:span|div)>/g) || []

    for (let i = 0; i < Math.min(h3s.length, 8); i++) {
      const title = stripHtml(h3s[i])
      const snippet = abstracts[i] ? stripHtml(abstracts[i]).slice(0, 300) : ''
      if (title) results.push({ title, snippet, source: '百度' })
    }
    return results
  }

  const parseWechat = (html: string) => {
    const results: Array<{ title: string; snippet: string; source: string; date?: string }> = []
    const titleRegex = /<h3[^>]*>([\s\S]*?)<\/h3>/g
    const snippetRegex = /<p[^>]*class="[^"]*txt-info[^"]*"[^>]*>([\s\S]*?)<\/p>/g
    const dateRegex = /(\d{4}-\d{1,2}-\d{1,2})/g

    const titles = [...html.matchAll(titleRegex)].map(m => stripHtml(m[1]))
    const snippets = [...html.matchAll(snippetRegex)].map(m => stripHtml(m[1]).slice(0, 300))
    const dates = [...html.matchAll(dateRegex)].map(m => m[1])

    for (let i = 0; i < Math.min(titles.length, 8); i++) {
      if (titles[i]) {
        results.push({
          title: titles[i],
          snippet: snippets[i] || '',
          source: '微信公众号',
          date: dates[i] || undefined
        })
      }
    }
    return results
  }

  try {
    if (engine === 'wechat') {
      const url = `https://weixin.sogou.com/weixin?type=2&query=${encodeURIComponent(query)}&ie=utf8`
      const html = await fetchWithUA(url)
      return { results: parseWechat(html), engine: '搜狗微信' }
    } else {
      const url = `https://www.baidu.com/s?wd=${encodeURIComponent(query)}&rn=10`
      const html = await fetchWithUA(url)
      return { results: parseBaidu(html), engine: '百度' }
    }
  } catch (e: any) {
    return { results: [{ title: '搜索失败', snippet: e.message, source: engine }], engine }
  }
}

function trimHistory(history: ChatMessage[], maxChars: number): ChatMessage[] {
  let totalChars = 0
  const result: ChatMessage[] = []
  for (let i = history.length - 1; i >= 0; i--) {
    const msg = history[i]
    totalChars += msg.content.length
    if (totalChars > maxChars) break
    result.unshift(msg)
  }
  return result
}
