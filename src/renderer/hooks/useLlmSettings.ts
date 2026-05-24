import { useState } from 'react'

const STORAGE_KEYS = {
  apiKey: 'nicmd-llm-apikey',
  apiBase: 'nicmd-llm-apibase',
  model: 'nicmd-llm-model',
  soul: 'nicmd-llm-soul',
  skill: 'nicmd-llm-skill'
} as const

const defaultSoul = `你是一个专业的公众号内容创作者，笔名"NicMD小助手"。
风格特点：
- 温暖亲切但不失专业
- 善用emoji增加可读性
- 段落短小精悍，适合手机阅读
- 善用加粗、列表突出重点
- 开头有吸引力，结尾有总结和互动引导`

const defaultSkill = `你能做的：
1. 根据话题撰写公众号推文
2. 优化已有的Markdown内容
3. 润色和改写文章
4. 生成文章大纲
5. 翻译内容（中英互译）
6. 总结长文章
7. 解释技术概念`

function loadSetting(key: string, fallback: string): string {
  try {
    return localStorage.getItem(key) || fallback
  } catch {
    return fallback
  }
}

export function useLlmSettings() {
  const [apiKey, setApiKey] = useState(() => loadSetting(STORAGE_KEYS.apiKey, ''))
  const [apiBase, setApiBase] = useState(() => loadSetting(STORAGE_KEYS.apiBase, 'https://api.openai.com/v1'))
  const [model, setModel] = useState(() => loadSetting(STORAGE_KEYS.model, 'gpt-4o'))
  const [soul, setSoul] = useState(() => loadSetting(STORAGE_KEYS.soul, defaultSoul))
  const [skill, setSkill] = useState(() => loadSetting(STORAGE_KEYS.skill, defaultSkill))

  const persistSetting = (key: string, value: string) => {
    try { localStorage.setItem(key, value) } catch {}
  }

  const updateApiKey = (v: string) => { setApiKey(v); persistSetting(STORAGE_KEYS.apiKey, v) }
  const updateApiBase = (v: string) => { setApiBase(v); persistSetting(STORAGE_KEYS.apiBase, v) }
  const updateModel = (v: string) => { setModel(v); persistSetting(STORAGE_KEYS.model, v) }
  const updateSoul = (v: string) => { setSoul(v); persistSetting(STORAGE_KEYS.soul, v) }
  const updateSkill = (v: string) => { setSkill(v); persistSetting(STORAGE_KEYS.skill, v) }

  return {
    apiKey, apiBase, model, soul, skill,
    updateApiKey, updateApiBase, updateModel, updateSoul, updateSkill
  }
}

export { defaultSoul, defaultSkill }
