import { useState, useEffect, useRef } from 'react'
import { Sparkles, Send, Loader, X, Settings, ChevronDown } from 'lucide-react'
import { useLlmSettings } from '../../hooks/useLlmSettings'

interface AiContextTag {
  id: string
  label: string
  content: string
}

interface AiPanelProps {
  visible: boolean
  onClose: () => void
}

export function AiPanel({ visible, onClose }: AiPanelProps) {
  const {
    apiKey, apiBase, model, soul, skill,
    updateApiKey, updateApiBase, updateModel, updateSoul, updateSkill
  } = useLlmSettings()
  const [prompt, setPrompt] = useState('')
  const [contexts, setContexts] = useState<AiContextTag[]>([])
  const [output, setOutput] = useState('')
  const [loading, setLoading] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const outputRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight
    }
  }, [output])

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
        if (data.full) setOutput(data.full)
      } else {
        setOutput((prev) => prev + data.delta)
      }
    })
    return cleanup
  }, [])

  const handleGenerate = async () => {
    if (!prompt.trim() || !apiKey.trim()) return
    setLoading(true)
    setOutput('')
    const contextText = contexts.length > 0
      ? `\n\n相关选区上下文：\n${contexts.map((item) => `【${item.label}】\n${item.content}`).join('\n\n')}`
      : ''
    try {
      await window.api.llmGenerate({
        prompt: `${prompt}${contextText}`,
        apiKey,
        apiBase,
        model,
        soul,
        skill
      })
    } catch {
      setLoading(false)
      setOutput('> 生成失败，请检查API Key和网络连接')
    }
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

  if (!visible) return null

  return (
    <div className="h-full flex flex-col" style={{ background: 'var(--bg-secondary)' }}>
      <div className="flex items-center justify-between px-3 py-2 border-b" style={{ borderColor: 'var(--border-color)' }}>
        <div className="flex items-center gap-1.5">
          <Sparkles size={15} style={{ color: '#ea580c' }} />
          <span className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>AI 助手</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="p-1 rounded hover:bg-[var(--accent-light)] transition-colors"
            title="Settings"
          >
            <Settings size={14} style={{ color: 'var(--text-tertiary)' }} />
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
        <div className="p-3 border-b space-y-2 text-xs" style={{ borderColor: 'var(--border-color)' }}>
          <div>
            <label className="block mb-0.5" style={{ color: 'var(--text-secondary)' }}>API Key</label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => updateApiKey(e.target.value)}
              placeholder="sk-..."
              className="w-full px-2 py-1 rounded text-xs border outline-none"
              style={{ borderColor: 'var(--border-color)', background: 'var(--bg-tertiary)', color: 'var(--text-primary)' }}
            />
          </div>
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="block mb-0.5" style={{ color: 'var(--text-secondary)' }}>API Base</label>
              <input
                type="text"
                value={apiBase}
                onChange={(e) => updateApiBase(e.target.value)}
                className="w-full px-2 py-1 rounded text-xs border outline-none"
                style={{ borderColor: 'var(--border-color)', background: 'var(--bg-tertiary)', color: 'var(--text-primary)' }}
              />
            </div>
            <div className="flex-1">
              <label className="block mb-0.5" style={{ color: 'var(--text-secondary)' }}>Model</label>
              <input
                type="text"
                value={model}
                onChange={(e) => updateModel(e.target.value)}
                className="w-full px-2 py-1 rounded text-xs border outline-none"
                style={{ borderColor: 'var(--border-color)', background: 'var(--bg-tertiary)', color: 'var(--text-primary)' }}
              />
            </div>
          </div>
          <details className="mt-1">
            <summary className="cursor-pointer flex items-center gap-1" style={{ color: 'var(--text-tertiary)' }}>
              <ChevronDown size={12} /> Soul (角色设定)
            </summary>
            <textarea
              value={soul}
              onChange={(e) => updateSoul(e.target.value)}
              rows={4}
              className="w-full px-2 py-1 rounded text-xs border outline-none mt-1 font-mono"
              style={{ borderColor: 'var(--border-color)', background: 'var(--bg-tertiary)', color: 'var(--text-primary)' }}
            />
          </details>
          <details className="mt-1">
            <summary className="cursor-pointer flex items-center gap-1" style={{ color: 'var(--text-tertiary)' }}>
              <ChevronDown size={12} /> Skill (能力设定)
            </summary>
            <textarea
              value={skill}
              onChange={(e) => updateSkill(e.target.value)}
              rows={3}
              className="w-full px-2 py-1 rounded text-xs border outline-none mt-1 font-mono"
              style={{ borderColor: 'var(--border-color)', background: 'var(--bg-tertiary)', color: 'var(--text-primary)' }}
            />
          </details>
        </div>
      )}

      <div ref={outputRef} className="flex-1 overflow-y-auto p-3 custom-scrollbar">
        {output ? (
          <div className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: 'var(--text-primary)' }}>
            {output}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full gap-2" style={{ color: 'var(--text-tertiary)' }}>
            <Sparkles size={24} style={{ color: '#ea580c' }} />
            <span className="text-xs">输入话题，AI 帮你写文章</span>
          </div>
        )}
      </div>

      <div className="p-3 border-t" style={{ borderColor: 'var(--border-color)' }}>
        {contexts.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-2">
            {contexts.map((item) => (
              <button
                key={item.id}
                onClick={() => removeContext(item.id)}
                className="inline-flex items-center gap-1 max-w-full rounded-full px-2 py-1 text-[11px] transition-colors hover:bg-[var(--accent-light)]"
                style={{ color: 'var(--accent-color)', background: 'var(--bg-primary)', border: '1px solid var(--border-color)' }}
                title="点击移除上下文"
              >
                <span className="truncate max-w-[180px]">{item.label}</span>
                <X size={11} />
              </button>
            ))}
          </div>
        )}
        <div className="flex gap-2">
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="输入话题或指令，Enter发送..."
            rows={2}
            className="flex-1 px-3 py-2 rounded-lg text-sm border outline-none resize-none"
            style={{ borderColor: 'var(--border-color)', background: 'var(--bg-tertiary)', color: 'var(--text-primary)' }}
          />
          <button
            onClick={handleGenerate}
            disabled={loading || !prompt.trim() || !apiKey.trim()}
            className="p-2 rounded-lg transition-all flex-shrink-0"
            style={{
              background: loading ? 'var(--bg-tertiary)' : '#ea580c',
              opacity: loading || !prompt.trim() || !apiKey.trim() ? 0.5 : 1,
              cursor: loading ? 'wait' : 'pointer'
            }}
          >
            {loading ? (
              <Loader size={16} className="animate-spin" style={{ color: '#fff' }} />
            ) : (
              <Send size={16} style={{ color: '#fff' }} />
            )}
          </button>
        </div>
      </div>
    </div>
  )
}