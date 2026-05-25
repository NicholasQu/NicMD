import { useState, useCallback } from 'react'

const STORAGE_KEYS = {
  profiles: 'nicmd-llm-profiles',
  activeProfile: 'nicmd-llm-active-profile'
} as const

export interface LlmProfile {
  id: string
  name: string
  apiKey: string
  apiBase: string
  model: string
  soul: string
  skill: string
}

const defaultSoul = `你是一个专业的写作助手。

风格特点：
- 温暖亲切但不失专业
- 段落短小精悍
- 善用加粗、列表突出重点
- 开头有吸引力，结尾有总结`

const defaultSkill = `你能做的：
1. 根据话题撰写文章
2. 优化已有的Markdown内容
3. 润色和改写文章
4. 生成文章大纲
5. 翻译内容（中英互译）
6. 总结长文章
7. 解释技术概念`

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 7)
}

function createDefaultProfile(): LlmProfile {
  return {
    id: generateId(),
    name: '默认配置',
    apiKey: '',
    apiBase: 'https://api.openai.com/v1',
    model: 'gpt-4o',
    soul: defaultSoul,
    skill: defaultSkill
  }
}

function loadProfiles(): LlmProfile[] {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.profiles)
    if (data) {
      const parsed = JSON.parse(data)
      if (Array.isArray(parsed) && parsed.length > 0) return parsed
    }
  } catch {}
  return [createDefaultProfile()]
}

function saveProfiles(profiles: LlmProfile[]): void {
  try { localStorage.setItem(STORAGE_KEYS.profiles, JSON.stringify(profiles)) } catch {}
}

function loadActiveProfileId(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEYS.activeProfile)
  } catch {
    return null
  }
}

function saveActiveProfileId(id: string): void {
  try { localStorage.setItem(STORAGE_KEYS.activeProfileId, id) } catch {}
}

export function useLlmSettings() {
  const [profiles, setProfiles] = useState<LlmProfile[]>(() => loadProfiles())
  const [activeProfileId, setActiveProfileId] = useState<string>(() => {
    const saved = loadActiveProfileId()
    const loaded = loadProfiles()
    if (saved && loaded.find(p => p.id === saved)) return saved
    return loaded[0]?.id || ''
  })

  const activeProfile = profiles.find(p => p.id === activeProfileId) || profiles[0]

  const updateActiveProfile = useCallback((updates: Partial<LlmProfile>) => {
    setProfiles(prev => {
      const next = prev.map(p => p.id === activeProfileId ? { ...p, ...updates } : p)
      saveProfiles(next)
      return next
    })
  }, [activeProfileId])

  const switchProfile = useCallback((id: string) => {
    setActiveProfileId(id)
    saveActiveProfileId(id)
  }, [])

  const addProfile = useCallback(() => {
    const newProfile: LlmProfile = {
      id: generateId(),
      name: `配置 ${profiles.length + 1}`,
      apiKey: '',
      apiBase: 'https://api.openai.com/v1',
      model: 'gpt-4o',
      soul: defaultSoul,
      skill: defaultSkill
    }
    setProfiles(prev => {
      const next = [...prev, newProfile]
      saveProfiles(next)
      return next
    })
    setActiveProfileId(newProfile.id)
    saveActiveProfileId(newProfile.id)
  }, [profiles.length])

  const removeProfile = useCallback((id: string) => {
    setProfiles(prev => {
      if (prev.length <= 1) return prev
      const next = prev.filter(p => p.id !== id)
      saveProfiles(next)
      return next
    })
    if (activeProfileId === id) {
      const remaining = profiles.filter(p => p.id !== id)
      if (remaining.length > 0) {
        setActiveProfileId(remaining[0].id)
        saveActiveProfileId(remaining[0].id)
      }
    }
  }, [activeProfileId, profiles])

  return {
    profiles,
    activeProfile,
    activeProfileId,
    updateActiveProfile,
    switchProfile,
    addProfile,
    removeProfile
  }
}

export { defaultSoul, defaultSkill }
