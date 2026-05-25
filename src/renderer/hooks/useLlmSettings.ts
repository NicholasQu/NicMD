import { useState, useCallback } from 'react'

const STORAGE_KEYS = {
  gateways: 'nicmd-llm-gateways',
  activeGateway: 'nicmd-llm-active-gateway',
  agents: 'nicmd-llm-agents',
  activeAgent: 'nicmd-llm-active-agent'
} as const

export interface LlmGateway {
  id: string
  name: string
  apiKey: string
  apiBase: string
  model: string
}

export interface AgentPersona {
  id: string
  name: string
  soul: string
  skill: string
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 7)
}

function loadJson<T>(key: string, fallback: () => T[]): T[] {
  try {
    const raw = localStorage.getItem(key)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed) && parsed.length > 0) return parsed
    }
  } catch {}
  return fallback()
}

function saveJson<T>(key: string, data: T[]): void {
  try { localStorage.setItem(key, JSON.stringify(data)) } catch {}
}

function loadId(key: string): string | null {
  try { return localStorage.getItem(key) } catch { return null }
}

function saveId(key: string, id: string): void {
  try { localStorage.setItem(key, id) } catch {}
}

function createDefaultGateway(): LlmGateway {
  return {
    id: generateId(),
    name: 'OpenAI',
    apiKey: '',
    apiBase: 'https://api.openai.com/v1',
    model: 'gpt-4o'
  }
}

function createDefaultAgent(): AgentPersona {
  return {
    id: generateId(),
    name: '写作助手',
    soul: '你是一个专业的写作助手。\n\n风格特点：\n- 温暖亲切但不失专业\n- 段落短小精悍\n- 善用加粗、列表突出重点\n- 开头有吸引力，结尾有总结',
    skill: '你能做的：\n1. 根据话题撰写文章\n2. 优化已有的Markdown内容\n3. 润色和改写文章\n4. 生成文章大纲\n5. 翻译内容（中英互译）\n6. 总结长文章\n7. 解释技术概念'
  }
}

export function useLlmSettings() {
  const [gateways, setGateways] = useState<LlmGateway[]>(() => loadJson(STORAGE_KEYS.gateways, createDefaultGateway))
  const [activeGatewayId, setActiveGatewayId] = useState<string>(() => {
    const saved = loadId(STORAGE_KEYS.activeGateway)
    const list = loadJson(STORAGE_KEYS.gateways, createDefaultGateway)
    return (saved && list.find(g => g.id === saved)) ? saved : list[0].id
  })

  const [agents, setAgents] = useState<AgentPersona[]>(() => loadJson(STORAGE_KEYS.agents, createDefaultAgent))
  const [activeAgentId, setActiveAgentId] = useState<string>(() => {
    const saved = loadId(STORAGE_KEYS.activeAgent)
    const list = loadJson(STORAGE_KEYS.agents, createDefaultAgent)
    return (saved && list.find(a => a.id === saved)) ? saved : list[0].id
  })

  const activeGateway = gateways.find(g => g.id === activeGatewayId) || gateways[0]
  const activeAgent = agents.find(a => a.id === activeAgentId) || agents[0]

  const updateGateway = useCallback((updates: Partial<LlmGateway>) => {
    setGateways(prev => {
      const next = prev.map(g => g.id === activeGatewayId ? { ...g, ...updates } : g)
      saveJson(STORAGE_KEYS.gateways, next)
      return next
    })
  }, [activeGatewayId])

  const switchGateway = useCallback((id: string) => {
    setActiveGatewayId(id)
    saveId(STORAGE_KEYS.activeGateway, id)
  }, [])

  const addGateway = useCallback(() => {
    const gw: LlmGateway = {
      id: generateId(),
      name: `Gateway ${gateways.length + 1}`,
      apiKey: '',
      apiBase: 'https://api.openai.com/v1',
      model: 'gpt-4o'
    }
    setGateways(prev => { const next = [...prev, gw]; saveJson(STORAGE_KEYS.gateways, next); return next })
    setActiveGatewayId(gw.id)
    saveId(STORAGE_KEYS.activeGateway, gw.id)
  }, [gateways.length])

  const removeGateway = useCallback((id: string) => {
    setGateways(prev => {
      if (prev.length <= 1) return prev
      const next = prev.filter(g => g.id !== id)
      saveJson(STORAGE_KEYS.gateways, next)
      return next
    })
    if (activeGatewayId === id) {
      const rem = gateways.filter(g => g.id !== id)
      if (rem.length > 0) { setActiveGatewayId(rem[0].id); saveId(STORAGE_KEYS.activeGateway, rem[0].id) }
    }
  }, [activeGatewayId, gateways])

  const updateAgent = useCallback((updates: Partial<AgentPersona>) => {
    setAgents(prev => {
      const next = prev.map(a => a.id === activeAgentId ? { ...a, ...updates } : a)
      saveJson(STORAGE_KEYS.agents, next)
      return next
    })
  }, [activeAgentId])

  const switchAgent = useCallback((id: string) => {
    setActiveAgentId(id)
    saveId(STORAGE_KEYS.activeAgent, id)
  }, [])

  const addAgent = useCallback(() => {
    const ag: AgentPersona = {
      id: generateId(),
      name: `Agent ${agents.length + 1}`,
      soul: '',
      skill: ''
    }
    setAgents(prev => { const next = [...prev, ag]; saveJson(STORAGE_KEYS.agents, next); return next })
    setActiveAgentId(ag.id)
    saveId(STORAGE_KEYS.activeAgent, ag.id)
  }, [agents.length])

  const removeAgent = useCallback((id: string) => {
    setAgents(prev => {
      if (prev.length <= 1) return prev
      const next = prev.filter(a => a.id !== id)
      saveJson(STORAGE_KEYS.agents, next)
      return next
    })
    if (activeAgentId === id) {
      const rem = agents.filter(a => a.id !== id)
      if (rem.length > 0) { setActiveAgentId(rem[0].id); saveId(STORAGE_KEYS.activeAgent, rem[0].id) }
    }
  }, [activeAgentId, agents])

  return {
    gateways, activeGateway, activeGatewayId,
    updateGateway, switchGateway, addGateway, removeGateway,
    agents, activeAgent, activeAgentId,
    updateAgent, switchAgent, addAgent, removeAgent
  }
}
