import { ipcMain, BrowserWindow } from 'electron'
import OpenAI from 'openai'

export function registerLlmIPC(getMainWindow: () => BrowserWindow | null): void {
  ipcMain.handle('llm:generate', async (_event, params: {
    prompt: string
    apiKey: string
    apiBase: string
    model: string
    soul?: string
    skill?: string
  }) => {
    try {
      const openai = new OpenAI({
        apiKey: params.apiKey,
        baseURL: params.apiBase || 'https://api.openai.com/v1'
      })
      const systemPrompt = [
        params.soul ? `## 你的角色\n${params.soul}` : '',
        params.skill ? `## 你的能力\n${params.skill}` : '',
        '请用Markdown格式输出，保持专业但亲切的语调。'
      ].filter(Boolean).join('\n\n')

      const stream = await openai.chat.completions.create({
        model: params.model || 'gpt-4o',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: params.prompt }
        ],
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
