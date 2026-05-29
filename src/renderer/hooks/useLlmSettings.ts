import { useState, useCallback, useEffect, useRef } from 'react'

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

interface SettingsData {
  gateways?: LlmGateway[]
  activeGatewayId?: string
  agents?: AgentPersona[]
  activeAgentId?: string
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 7)
}

const DEFAULT_GATEWAYS: LlmGateway[] = [{
  id: 'default-gw',
  name: 'OpenAI',
  apiKey: '',
  apiBase: 'https://api.openai.com/v1',
  model: 'gpt-4o'
}]

const DEFAULT_AGENTS: AgentPersona[] = [{
  id: 'default-agent',
  name: '写作助手',
  soul: '你是一个专业的写作助手。\n\n风格特点：\n- 温暖亲切但不失专业\n- 段落短小精悍\n- 善用加粗、列表突出重点\n- 开头有吸引力，结尾有总结',
  skill: '你能做的：\n1. 根据话题撰写文章\n2. 优化已有的Markdown内容\n3. 润色和改写文章\n4. 生成文章大纲\n5. 翻译内容（中英互译）\n6. 总结长文章\n7. 解释技术概念'
}]

export function useLlmSettings() {
  const [loaded, setLoaded] = useState(false)
  const [gateways, setGateways] = useState<LlmGateway[]>(DEFAULT_GATEWAYS)
  const [activeGatewayId, setActiveGatewayId] = useState(DEFAULT_GATEWAYS[0].id)
  const [agents, setAgents] = useState<AgentPersona[]>(DEFAULT_AGENTS)
  const [activeAgentId, setActiveAgentId] = useState(DEFAULT_AGENTS[0].id)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    window.api.settings.load().then((data) => {
      const d = data as SettingsData
      if (d.gateways && d.gateways.length > 0) setGateways(d.gateways)
      if (d.agents && d.agents.length > 0) setAgents(d.agents)
      if (d.activeGatewayId) setActiveGatewayId(d.activeGatewayId)
      if (d.activeAgentId) setActiveAgentId(d.activeAgentId)
      setLoaded(true)
    }).catch(() => setLoaded(true))
  }, [])

  const persist = useCallback((data: SettingsData) => {
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => {
      window.api.settings.load().then((existing) => {
        window.api.settings.save({ ...(existing as SettingsData), ...data })
      })
    }, 500)
  }, [])

  const activeGateway = gateways.find(g => g.id === activeGatewayId) || gateways[0]
  const activeAgent = agents.find(a => a.id === activeAgentId) || agents[0]

  const updateGateway = useCallback((updates: Partial<LlmGateway>) => {
    setGateways(prev => {
      const next = prev.map(g => g.id === activeGatewayId ? { ...g, ...updates } : g)
      persist({ gateways: next })
      return next
    })
  }, [activeGatewayId, persist])

  const switchGateway = useCallback((id: string) => {
    setActiveGatewayId(id)
    persist({ activeGatewayId: id })
  }, [persist])

  const addGateway = useCallback(() => {
    const gw: LlmGateway = {
      id: generateId(),
      name: `Gateway ${gateways.length + 1}`,
      apiKey: '',
      apiBase: 'https://api.openai.com/v1',
      model: 'gpt-4o'
    }
    setGateways(prev => {
      const next = [...prev, gw]
      persist({ gateways: next, activeGatewayId: gw.id })
      return next
    })
    setActiveGatewayId(gw.id)
  }, [gateways.length, persist])

  const removeGateway = useCallback((id: string) => {
    setGateways(prev => {
      if (prev.length <= 1) return prev
      const next = prev.filter(g => g.id !== id)
      persist({ gateways: next })
      return next
    })
    if (activeGatewayId === id) {
      const rem = gateways.filter(g => g.id !== id)
      if (rem.length > 0) {
        setActiveGatewayId(rem[0].id)
        persist({ activeGatewayId: rem[0].id })
      }
    }
  }, [activeGatewayId, gateways, persist])

  const updateAgent = useCallback((updates: Partial<AgentPersona>) => {
    setAgents(prev => {
      const next = prev.map(a => a.id === activeAgentId ? { ...a, ...updates } : a)
      persist({ agents: next })
      return next
    })
  }, [activeAgentId, persist])

  const switchAgent = useCallback((id: string) => {
    setActiveAgentId(id)
    persist({ activeAgentId: id })
  }, [persist])

  const addAgent = useCallback(() => {
    const ag: AgentPersona = {
      id: generateId(),
      name: `Agent ${agents.length + 1}`,
      soul: '',
      skill: ''
    }
    setAgents(prev => {
      const next = [...prev, ag]
      persist({ agents: next, activeAgentId: ag.id })
      return next
    })
    setActiveAgentId(ag.id)
  }, [agents.length, persist])

  const removeAgent = useCallback((id: string) => {
    setAgents(prev => {
      if (prev.length <= 1) return prev
      const next = prev.filter(a => a.id !== id)
      persist({ agents: next })
      return next
    })
    if (activeAgentId === id) {
      const rem = agents.filter(a => a.id !== id)
      if (rem.length > 0) {
        setActiveAgentId(rem[0].id)
        persist({ activeAgentId: rem[0].id })
      }
    }
  }, [activeAgentId, agents, persist])

  return {
    loaded,
    gateways, activeGateway, activeGatewayId,
    updateGateway, switchGateway, addGateway, removeGateway,
    agents, activeAgent, activeAgentId,
    updateAgent, switchAgent, addAgent, removeAgent
  }
}
