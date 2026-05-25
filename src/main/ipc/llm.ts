import { ipcMain, BrowserWindow } from 'electron'
import OpenAI from 'openai'

interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export function registerLlmIPC(getMainWindow: () => BrowserWindow | null): void {
  ipcMain.handle('llm:generate', async (_event, params: {
    prompt: string
    apiKey: string
    apiBase: string
    model: string
    soul?: string
    skill?: string
    history?: ChatMessage[]
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
      const systemPrompt = systemParts.join('\n\n')

      const messages: ChatMessage[] = [
        { role: 'system', content: systemPrompt }
      ]

      if (params.history && params.history.length > 0) {
        const trimmed = trimHistory(params.history, 4000)
        messages.push(...trimmed)
      }

      messages.push({ role: 'user', content: params.prompt })

      const stream = await openai.chat.completions.create({
        model: params.model || 'gpt-4o',
        messages,
        stream: true
      })

      let full = ''
      const mainWindow = getMainWindow()
      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta?.content || ''
        full += delta
        if (mainWindow) {
          mainWindow.webContents.send('llm:stream', { delta, done: false })
        }
      }
      if (mainWindow) {
        mainWindow.webContents.send('llm:stream', { delta: '', done: true, full })
      }
      return { success: true, content: full }
    } catch (e: any) {
      console.error('[llm:generate] Failed:', e.message)
      return { success: false, error: e.message }
    }
  })
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
