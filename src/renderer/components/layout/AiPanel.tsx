import { useState, useEffect, useRef } from 'react'
import { Sparkles, Send, Loader, X, Settings, Plus, Trash2, Check, Zap, Bot, Server, RotateCcw } from 'lucide-react'
import { useLlmSettings } from '../../hooks/useLlmSettings'
import type { LlmGateway, AgentPersona } from '../../hooks/useLlmSettings'

interface AiContextTag {
  id: string
  label: string
  content: string
}

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

type SettingsTab = 'gateway' | 'agent'

interface AiPanelProps {
  visible: boolean
  onClose: () => void
}

export function AiPanel({ visible, onClose }: AiPanelProps) {
  const {
    gateways, activeGateway, activeGatewayId,
    updateGateway, switchGateway, addGateway, removeGateway,
    agents, activeAgent, activeAgentId,
    updateAgent, switchAgent, addAgent, removeAgent
  } = useLlmSettings()

  const [prompt, setPrompt] = useState('')
  const [contexts, setContexts] = useState<AiContextTag[]>([])
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([])
  const [output, setOutput] = useState('')
  const [loading, setLoading] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [settingsTab, setSettingsTab] = useState<SettingsTab>('gateway')
  const [savedAt, setSavedAt] = useState<string | null>(null)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<string | null>(null)
  const outputRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight
    }
  }, [output, chatHistory])

  useEffect(() => {
    const handleAddContext = (event: Event) => {
      const detail = (event as CustomEvent<AiContextTag>).detail
      if (!detail?.content) return
      setContexts((prev) => [detail, ...prev.filter((item) => item.id !== detail.id)].slice(0, 6))
    }
    window.addEventListener('nicmd:add-ai-context', handleAddContext)
    return () => window.removeEventListener('nicmd:add-ai-context', handleAddContext)
  }, [])

  useEffect(() => {
    const cleanup = window.api.onLlmStream((data) => {
      if (data.done) {
        setLoading(false)
        if (data.full) {
          setOutput(data.full)
          setChatHistory(prev => [...prev, { role: 'assistant', content: data.full! }])
        }
      } else {
        setOutput((prev) => prev + data.delta)
      }
    })
    return cleanup
  }, [])

  const notifySaved = () => {
    const now = new Date()
    setSavedAt(`${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`)
    setTimeout(() => setSavedAt(null), 3000)
  }

  const handleUpdateGateway = (updates: Partial<LlmGateway>) => {
    updateGateway(updates)
    notifySaved()
  }

  const handleUpdateAgent = (updates: Partial<AgentPersona>) => {
    updateAgent(updates)
    notifySaved()
  }

  const handleGenerate = async () => {
    if (!prompt.trim() || !activeGateway.apiKey.trim()) return
    setLoading(true)
    setOutput('')

    const userMsg = prompt.trim()
    setChatHistory(prev => [...prev, { role: 'user', content: userMsg }])
    setPrompt('')

    const contextText = contexts.length > 0
      ? `\n\n相关选区上下文：\n${contexts.map((item) => `【${item.label}】\n${item.content}`).join('\n\n')}`
      : ''

    const historyForApi = chatHistory.slice(-10).map(m => ({
      role: m.role as 'user' | 'assistant',
      content: m.content
    }))

    try {
      await window.api.llmGenerate({
        prompt: `${userMsg}${contextText}`,
        apiKey: activeGateway.apiKey,
        apiBase: activeGateway.apiBase,
        model: activeGateway.model,
        soul: activeAgent.soul || undefined,
        skill: activeAgent.skill || undefined,
        history: historyForApi
      })
    } catch {
      setLoading(false)
      setOutput('> 生成失败，请检查API Key和网络连接')
    }
  }

  const handleTest = async () => {
    if (!activeGateway.apiKey.trim()) {
      setTestResult('请先填写 API Key')
      setTimeout(() => setTestResult(null), 3000)
      return
    }
    setTesting(true)
    setTestResult(null)
    try {
      const result = await window.api.llmGenerate({
        prompt: '你好，请用一句话介绍你自己',
        apiKey: activeGateway.apiKey,
        apiBase: activeGateway.apiBase,
        model: activeGateway.model,
        soul: activeAgent.soul || undefined,
        skill: activeAgent.skill || undefined
      })
      if (result.success) {
        setTestResult(`连接成功：${result.content?.slice(0, 120) || '无响应内容'}`)
      } else {
        setTestResult(`连接失败：${result.error}`)
      }
    } catch (e: any) {
      setTestResult(`请求异常：${e.message}`)
    }
    setTesting(false)
    setTimeout(() => setTestResult(null), 8000)
  }

  const handleClearChat = () => {
    setChatHistory([])
    setOutput('')
    setContexts([])
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleGenerate()
    }
  }

  const removeContext = (id: string) => {
    setContexts((prev) => prev.filter((item) => item.id !== id))
  }

  const inputStyle = {
    borderColor: 'var(--border-color)',
    background: 'var(--bg-tertiary)',
    color: 'var(--text-primary)'
  }

  if (!visible) return null

  return (
    <div className="h-full flex flex-col" style={{ background: 'var(--bg-secondary)' }}>
      <div className="flex items-center justify-between px-3 py-2 border-b" style={{ borderColor: 'var(--border-color)' }}>
        <div className="flex items-center gap-1.5">
          <Sparkles size={15} style={{ color: '#ea580c' }} />
          <span className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>AI 助手</span>
          {savedAt && (
            <span className="text-[10px] flex items-center gap-0.5" style={{ color: '#22c55e' }}>
              <Check size={10} /> 已保存 {savedAt}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {chatHistory.length > 0 && (
            <button
              onClick={handleClearChat}
              className="p-1 rounded hover:bg-[var(--accent-light)] transition-colors"
              title="清空对话"
            >
              <RotateCcw size={13} style={{ color: 'var(--text-tertiary)' }} />
            </button>
          )}
          <button
            onClick={() => { setShowSettings(!showSettings); setTestResult(null) }}
            className="p-1 rounded hover:bg-[var(--accent-light)] transition-colors"
            title="设置"
          >
            <Settings size={14} style={{ color: showSettings ? '#ea580c' : 'var(--text-tertiary)' }} />
          </button>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-[var(--accent-light)] transition-colors"
          >
            <X size={14} style={{ color: 'var(--text-tertiary)' }} />
          </button>
        </div>
      </div>

      {showSettings && (
        <div className="flex-1 overflow-y-auto custom-scrollbar" style={{ background: 'var(--bg-primary)' }}>
          <div className="p-3 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex gap-1">
                <button
                  onClick={() => setSettingsTab('gateway')}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-all"
                  style={{
                    background: settingsTab === 'gateway' ? '#ea580c' : 'var(--bg-tertiary)',
                    color: settingsTab === 'gateway' ? '#fff' : 'var(--text-secondary)'
                  }}
                >
                  <Server size={11} /> 网关
                </button>
                <button
                  onClick={() => setSettingsTab('agent')}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-all"
                  style={{
                    background: settingsTab === 'agent' ? '#ea580c' : 'var(--bg-tertiary)',
                    color: settingsTab === 'agent' ? '#fff' : 'var(--text-secondary)'
                  }}
                >
                  <Bot size={11} /> 人格
                </button>
              </div>
              <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: 'var(--accent-light)', color: 'var(--accent-color)' }}>
                自动保存
              </span>
            </div>

            {settingsTab === 'gateway' && (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>LLM 网关配置（API 连接）</span>
                  <button
                    onClick={addGateway}
                    className="flex items-center gap-1 px-2 py-0.5 rounded text-[11px] hover:bg-[var(--accent-light)] transition-colors"
                    style={{ color: 'var(--accent-color)' }}
                  >
                    <Plus size={11} /> 新增
                  </button>
                </div>
                <div className="flex gap-1.5 flex-wrap">
                  {gateways.map((g) => (
                    <button
                      key={g.id}
                      onClick={() => switchGateway(g.id)}
                      className="flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium transition-all"
                      style={{
                        background: g.id === activeGatewayId ? '#ea580c' : 'var(--bg-tertiary)',
                        color: g.id === activeGatewayId ? '#fff' : 'var(--text-secondary)'
                      }}
                    >
                      {g.name}
                      {gateways.length > 1 && (
                        <Trash2 size={9} className="ml-0.5 opacity-60 hover:opacity-100"
                          onClick={(e) => { e.stopPropagation(); removeGateway(g.id) }} />
                      )}
                    </button>
                  ))}
                </div>
                <div>
                  <label className="block mb-1 text-[11px] font-medium" style={{ color: 'var(--text-secondary)' }}>名称</label>
                  <input type="text" value={activeGateway.name} onChange={(e) => handleUpdateGateway({ name: e.target.value })}
                    className="w-full px-2 py-1 rounded-md text-xs border outline-none" style={inputStyle} />
                </div>
                <div>
                  <label className="block mb-1 text-[11px] font-medium" style={{ color: 'var(--text-secondary)' }}>API Key</label>
                  <input type="password" value={activeGateway.apiKey} onChange={(e) => handleUpdateGateway({ apiKey: e.target.value })}
                    placeholder="sk-..." className="w-full px-2 py-1 rounded-md text-xs border outline-none" style={inputStyle} />
                </div>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <label className="block mb-1 text-[11px] font-medium" style={{ color: 'var(--text-secondary)' }}>API Base</label>
                    <input type="text" value={activeGateway.apiBase} onChange={(e) => handleUpdateGateway({ apiBase: e.target.value })}
                      className="w-full px-2 py-1 rounded-md text-xs border outline-none" style={inputStyle} />
                  </div>
                  <div className="flex-1">
                    <label className="block mb-1 text-[11px] font-medium" style={{ color: 'var(--text-secondary)' }}>Model</label>
                    <input type="text" value={activeGateway.model} onChange={(e) => handleUpdateGateway({ model: e.target.value })}
                      className="w-full px-2 py-1 rounded-md text-xs border outline-none" style={inputStyle} />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={handleTest} disabled={testing || !activeGateway.apiKey.trim()}
                    className="flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition-all"
                    style={{
                      background: testing ? 'var(--bg-tertiary)' : 'var(--accent-color)',
                      color: testing ? 'var(--text-tertiary)' : '#fff',
                      opacity: testing || !activeGateway.apiKey.trim() ? 0.5 : 1
                    }}>
                    <Zap size={11} /> {testing ? '测试中...' : '测试连接'}
                  </button>
                  {testResult && (
                    <span className="text-[11px] leading-snug" style={{ color: testResult.includes('成功') ? '#22c55e' : '#ef4444' }}>
                      {testResult}
                    </span>
                  )}
                </div>
              </>
            )}

            {settingsTab === 'agent' && (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>Agent 人格（角色与能力）</span>
                  <button
                    onClick={addAgent}
                    className="flex items-center gap-1 px-2 py-0.5 rounded text-[11px] hover:bg-[var(--accent-light)] transition-colors"
                    style={{ color: 'var(--accent-color)' }}
                  >
                    <Plus size={11} /> 新增
                  </button>
                </div>
                <div className="flex gap-1.5 flex-wrap">
                  {agents.map((a) => (
                    <button
                      key={a.id}
                      onClick={() => switchAgent(a.id)}
                      className="flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium transition-all"
                      style={{
                        background: a.id === activeAgentId ? '#ea580c' : 'var(--bg-tertiary)',
                        color: a.id === activeAgentId ? '#fff' : 'var(--text-secondary)'
                      }}
                    >
                      {a.name}
                      {agents.length > 1 && (
                        <Trash2 size={9} className="ml-0.5 opacity-60 hover:opacity-100"
                          onClick={(e) => { e.stopPropagation(); removeAgent(a.id) }} />
                      )}
                    </button>
                  ))}
                </div>
                <div>
                  <label className="block mb-1 text-[11px] font-medium" style={{ color: 'var(--text-secondary)' }}>人格名称</label>
                  <input type="text" value={activeAgent.name} onChange={(e) => handleUpdateAgent({ name: e.target.value })}
                    className="w-full px-2 py-1 rounded-md text-xs border outline-none" style={inputStyle} />
                </div>
                <div>
                  <label className="block mb-1 text-[11px] font-medium" style={{ color: 'var(--text-secondary)' }}>Soul（角色设定）</label>
                  <textarea value={activeAgent.soul} onChange={(e) => handleUpdateAgent({ soul: e.target.value })}
                    rows={6} className="w-full px-2 py-1 rounded-md text-xs border outline-none font-mono resize-y" style={inputStyle} />
                </div>
                <div>
                  <label className="block mb-1 text-[11px] font-medium" style={{ color: 'var(--text-secondary)' }}>Skill（能力设定）</label>
                  <textarea value={activeAgent.skill} onChange={(e) => handleUpdateAgent({ skill: e.target.value })}
                    rows={6} className="w-full px-2 py-1 rounded-md text-xs border outline-none font-mono resize-y" style={inputStyle} />
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {!showSettings && (
        <div ref={outputRef} className="flex-1 overflow-y-auto p-3 custom-scrollbar">
          {chatHistory.length === 0 && !output ? (
            <div className="flex flex-col items-center justify-center h-full gap-2" style={{ color: 'var(--text-tertiary)' }}>
              <Sparkles size={24} style={{ color: '#ea580c' }} />
              <span className="text-xs">输入话题，AI 帮你写文章</span>
              {activeGateway.apiKey ? (
                <span className="text-[10px] mt-1">
                  {activeAgent.name} · {activeGateway.name}/{activeGateway.model}
                </span>
              ) : (
                <span className="text-[10px] mt-1" style={{ color: '#ef4444' }}>
                  请先点击 ⚙️ 配置 API Key
                </span>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {chatHistory.map((msg, i) => (
                <div key={i} className={`text-sm leading-relaxed whitespace-pre-wrap ${msg.role === 'user' ? 'pl-3 border-l-2' : ''}`}
                  style={{
                    color: msg.role === 'user' ? 'var(--text-secondary)' : 'var(--text-primary)',
                    borderColor: msg.role === 'user' ? 'var(--accent-color)' : 'transparent',
                    background: msg.role === 'assistant' ? 'var(--bg-tertiary)' : 'transparent',
                    padding: msg.role === 'assistant' ? '10px 12px' : '4px 0 4px 12px',
                    borderRadius: msg.role === 'assistant' ? '8px' : '0'
                  }}>
                  {msg.content}
                </div>
              ))}
              {loading && output && !chatHistory.some((_, idx) => idx === chatHistory.length - 1 && chatHistory[idx].role === 'assistant' && chatHistory[idx].content === output) && (
                <div className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: 'var(--text-primary)', background: 'var(--bg-tertiary)', padding: '10px 12px', borderRadius: '8px' }}>
                  {output}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <div className="p-3 border-t" style={{ borderColor: 'var(--border-color)' }}>
        {contexts.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-2">
            {contexts.map((item) => (
              <button key={item.id} onClick={() => removeContext(item.id)}
                className="inline-flex items-center gap-1 max-w-full rounded-full px-2 py-0.5 text-[11px] transition-colors hover:bg-[var(--accent-light)]"
                style={{ color: 'var(--accent-color)', background: 'var(--bg-primary)', border: '1px solid var(--border-color)' }}>
                <span className="truncate max-w-[180px]">{item.label}</span>
                <X size={10} />
              </button>
            ))}
          </div>
        )}
        <div className="flex gap-2">
          <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} onKeyDown={handleKeyDown}
            placeholder="输入话题或指令，Enter发送..."
            rows={2}
            className="flex-1 px-3 py-2 rounded-lg text-sm border outline-none resize-none"
            style={{ borderColor: 'var(--border-color)', background: 'var(--bg-tertiary)', color: 'var(--text-primary)' }} />
          <button onClick={handleGenerate}
            disabled={loading || !prompt.trim() || !activeGateway.apiKey.trim()}
            className="p-2 rounded-lg transition-all flex-shrink-0"
            style={{
              background: loading ? 'var(--bg-tertiary)' : '#ea580c',
              opacity: loading || !prompt.trim() || !activeGateway.apiKey.trim() ? 0.5 : 1,
              cursor: loading ? 'wait' : 'pointer'
            }}>
            {loading ? <Loader size={16} className="animate-spin" style={{ color: '#fff' }} /> : <Send size={16} style={{ color: '#fff' }} />}
          </button>
        </div>
      </div>
    </div>
  )
}
