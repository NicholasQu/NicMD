import { useState, useEffect, useRef, useCallback } from 'react'
import { Sparkles, Send, Loader, X, Settings, Plus, Trash2, Check, Zap, Bot, Server, RotateCcw, Search, Globe } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { useLlmSettings } from '../../hooks/useLlmSettings'
import type { LlmGateway, AgentPersona } from '../../hooks/useLlmSettings'
import { RichInput } from './RichInput'
import type { RichInputHandle, RefTag } from './RichInput'

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

  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([])
  const [output, setOutput] = useState('')
  const [loading, setLoading] = useState(false)
  const [webSearchEnabled, setWebSearchEnabled] = useState(true)
  const [searchStatus, setSearchStatus] = useState<string | null>(null)
  const [showSettings, setShowSettings] = useState(false)
  const [settingsTab, setSettingsTab] = useState<SettingsTab>('gateway')
  const [savedAt, setSavedAt] = useState<string | null>(null)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<string | null>(null)
  const [hasContent, setHasContent] = useState(false)
  const outputRef = useRef<HTMLDivElement>(null)
  const richInputRef = useRef<RichInputHandle>(null)

  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight
    }
  }, [output, chatHistory])

  useEffect(() => {
    const handleAddContext = (event: Event) => {
      const detail = (event as CustomEvent<RefTag>).detail
      if (!detail?.content) return
      richInputRef.current?.insertRef(detail)
      setHasContent(true)
    }
    window.addEventListener('nicmd:add-ai-context', handleAddContext)
    return () => window.removeEventListener('nicmd:add-ai-context', handleAddContext)
  }, [])

  useEffect(() => {
    const cleanup = window.api.onLlmStream((data: any) => {
      if (data.done) {
        setLoading(false)
        setSearchStatus(null)
        if (data.full) {
          setOutput(data.full)
          setChatHistory(prev => [...prev, { role: 'assistant', content: data.full! }])
        }
      } else {
        if (data.toolStatus) {
          if (data.toolStatus.status === 'searching') {
            try {
              const args = JSON.parse(data.toolStatus.args || '{}')
              setSearchStatus(`正在搜索: ${args.query || ''} (${args.engine === 'wechat' ? '微信公众号' : '百度'})`)
            } catch {
              setSearchStatus('正在搜索...')
            }
          } else {
            setSearchStatus('搜索完成，整理中...')
          }
        }
        if (data.delta) {
          setOutput((prev) => prev + data.delta)
        }
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

  const expandRefs = useCallback((html: string, refs: Map<string, RefTag>): string => {
    return html.replace(/<span[^>]*data-ref-id="([^"]*)"[^>]*>([^<]*)<\/span>/g, (_match, id) => {
      const ref = refs.get(id)
      if (!ref) return ''
      return `\n<ref label="${ref.label}">\n${ref.content}\n</ref>\n`
    }).replace(/&nbsp;/g, ' ').replace(/<br\s*\/?>/g, '\n').replace(/<[^>]+>/g, '')
  }, [])

  const handleSubmit = useCallback(() => {
    const input = richInputRef.current
    if (!input) return
    const plainText = input.getPlainText().trim()
    if (!plainText || !activeGateway.apiKey.trim()) return

    setLoading(true)
    setOutput('')

    const refs = input.getRefs()
    const html = input.getText()
    const expandedMsg = expandRefs(html, refs)

    setChatHistory(prev => [...prev, { role: 'user', content: plainText }])
    input.clear()
    setHasContent(false)

    const historyForApi = chatHistory.slice(-10).map(m => ({
      role: m.role as 'user' | 'assistant',
      content: m.content
    }))

    try {
      window.api.llmGenerate({
        prompt: expandedMsg,
        apiKey: activeGateway.apiKey,
        apiBase: activeGateway.apiBase,
        model: activeGateway.model,
        soul: activeAgent.soul || undefined,
        skill: activeAgent.skill || undefined,
        history: historyForApi,
        enableTools: webSearchEnabled
      })
    } catch {
      setLoading(false)
      setOutput('> 生成失败，请检查API Key和网络连接')
    }
  }, [activeGateway, activeAgent, chatHistory, expandRefs])

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
                <div key={i} className={`${msg.role === 'user' ? 'pl-3 border-l-2' : ''}`}
                  style={{
                    color: msg.role === 'user' ? 'var(--text-secondary)' : 'var(--text-primary)',
                    borderColor: msg.role === 'user' ? 'var(--accent-color)' : 'transparent',
                    background: msg.role === 'assistant' ? 'var(--bg-tertiary)' : 'transparent',
                    padding: msg.role === 'assistant' ? '10px 12px' : '4px 0 4px 12px',
                    borderRadius: msg.role === 'assistant' ? '8px' : '0'
                  }}>
                  {msg.role === 'assistant' ? (
                    <div className="ai-chat-markdown text-sm leading-relaxed">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                    </div>
                  ) : (
                    <span className="text-sm leading-relaxed">{msg.content}</span>
                  )}
                </div>
              ))}
              {loading && output && !chatHistory.some((_, idx) => idx === chatHistory.length - 1 && chatHistory[idx].role === 'assistant' && chatHistory[idx].content === output) && (
                <div className="ai-chat-markdown text-sm leading-relaxed" style={{ color: 'var(--text-primary)', background: 'var(--bg-tertiary)', padding: '10px 12px', borderRadius: '8px' }}>
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{output}</ReactMarkdown>
                </div>
              )}
              {loading && searchStatus && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium" style={{ background: 'var(--accent-light)', color: 'var(--accent-color)' }}>
                  <Search size={13} className="animate-pulse" />
                  <span>{searchStatus}</span>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <div className="p-3 border-t" style={{ borderColor: 'var(--border-color)' }}>
        <div className="flex gap-2">
          <RichInput
            ref={richInputRef}
            placeholder="输入话题或指令，Enter发送..."
            onSubmit={handleSubmit}
            className="flex-1 px-3 py-2 rounded-lg text-sm border"
            style={{ borderColor: 'var(--border-color)', background: 'var(--bg-tertiary)', color: 'var(--text-primary)' }}
          />
          <button
            onClick={() => setWebSearchEnabled(!webSearchEnabled)}
            className="p-2 rounded-lg transition-all flex-shrink-0"
            title={webSearchEnabled ? '联网搜索已开启（点击关闭）' : '联网搜索已关闭（点击开启）'}
            style={{
              background: webSearchEnabled ? 'var(--accent-light)' : 'var(--bg-tertiary)',
              color: webSearchEnabled ? '#ea580c' : 'var(--text-tertiary)'
            }}
          >
            <Globe size={16} />
          </button>
          <button onClick={handleSubmit}
            disabled={loading || !hasContent || !activeGateway.apiKey.trim()}
            className="p-2 rounded-lg transition-all flex-shrink-0"
            style={{
              background: loading ? 'var(--bg-tertiary)' : '#ea580c',
              opacity: loading || !hasContent || !activeGateway.apiKey.trim() ? 0.5 : 1,
              cursor: loading ? 'wait' : 'pointer'
            }}>
            {loading ? <Loader size={16} className="animate-spin" style={{ color: '#fff' }} /> : <Send size={16} style={{ color: '#fff' }} />}
          </button>
        </div>
      </div>
    </div>
  )
}
