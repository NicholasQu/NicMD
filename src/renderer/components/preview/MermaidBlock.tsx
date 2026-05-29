import { useEffect, useRef, useState, useCallback } from 'react'

interface MermaidBlockProps {
  chart: string
}

export function MermaidBlock({ chart }: MermaidBlockProps) {
  const [svg, setSvg] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const containerRef = useRef<HTMLDivElement>(null)
  const scaleRef = useRef(1)
  const posRef = useRef({ x: 0, y: 0 })
  const [transform, setTransform] = useState({ scale: 1, x: 0, y: 0 })
  const isDragging = useRef(false)
  const dragStart = useRef({ x: 0, y: 0, tx: 0, ty: 0 })

  useEffect(() => {
    let cancelled = false
    const render = async () => {
      try {
        const mermaid = await import('mermaid')
        const m = mermaid.default
        const isDark = document.documentElement.classList.contains('dark')
        m.initialize({
          startOnLoad: false,
          theme: isDark ? 'dark' : 'default',
          securityLevel: 'loose',
          fontFamily: 'Inter, system-ui, sans-serif',
          themeVariables: isDark ? {
            primaryColor: '#ea580c',
            primaryTextColor: '#fafafa',
            primaryBorderColor: '#f97316',
            lineColor: '#525252',
            secondaryColor: '#262626',
            tertiaryColor: '#1f1f1f',
            fontSize: '13px',
            nodeBorder: '#f97316',
            mainBkg: '#262626',
            nodeTextColor: '#fafafa'
          } : {
            primaryColor: '#fff7ed',
            primaryTextColor: '#111827',
            primaryBorderColor: '#ea580c',
            lineColor: '#d1d5db',
            secondaryColor: '#f3f4f6',
            tertiaryColor: '#fafafa',
            fontSize: '13px',
            nodeBorder: '#ea580c',
            mainBkg: '#fff7ed',
            nodeTextColor: '#111827'
          }
        })
        const id = `mermaid-${Math.random().toString(36).substring(2, 9)}`
        const { svg: rendered } = await m.render(id, chart)
        if (!cancelled) {
          setSvg(rendered)
          setError('')
          setLoading(false)
        }
      } catch (e: any) {
        if (!cancelled) {
          setError(e.message || 'Mermaid render error')
          setLoading(false)
        }
      }
    }
    render()
    return () => { cancelled = true }
  }, [chart])

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault()
    const delta = e.deltaY > 0 ? -0.1 : 0.1
    const newScale = Math.max(0.3, Math.min(3, scaleRef.current + delta))
    scaleRef.current = newScale
    setTransform(prev => ({ ...prev, scale: newScale }))
  }, [])

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return
    isDragging.current = true
    dragStart.current = { x: e.clientX, y: e.clientY, tx: posRef.current.x, ty: posRef.current.y }
  }, [])

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging.current) return
    const dx = e.clientX - dragStart.current.x
    const dy = e.clientY - dragStart.current.y
    const nx = dragStart.current.tx + dx
    const ny = dragStart.current.ty + dy
    posRef.current = { x: nx, y: ny }
    setTransform(prev => ({ ...prev, x: nx, y: ny }))
  }, [])

  const handleMouseUp = useCallback(() => {
    isDragging.current = false
  }, [])

  const handleReset = useCallback(() => {
    scaleRef.current = 1
    posRef.current = { x: 0, y: 0 }
    setTransform({ scale: 1, x: 0, y: 0 })
  }, [])

  if (loading) {
    return (
      <div style={{ padding: '16px', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: 13 }}>
        Loading diagram...
      </div>
    )
  }

  if (error) {
    return (
      <div style={{
        padding: '12px 16px',
        background: 'var(--bg-tertiary)',
        borderRadius: 8,
        border: '1px solid var(--border-color)',
        color: 'var(--text-tertiary)',
        fontSize: 13
      }}>
        Mermaid render error
      </div>
    )
  }

  return (
    <div style={{ position: 'relative' }}>
      <div
        ref={containerRef}
        className="mermaid-container"
        style={{
          overflow: 'hidden',
          cursor: isDragging.current ? 'grabbing' : 'grab',
          minHeight: '100px',
          maxHeight: '500px',
          userSelect: 'none'
        }}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <div
          style={{
            transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
            transformOrigin: 'center center',
            transition: isDragging.current ? 'none' : 'transform 0.15s ease',
            display: 'inline-block',
            minWidth: '100%'
          }}
          dangerouslySetInnerHTML={{ __html: svg }}
        />
      </div>
      <div style={{
        position: 'absolute',
        bottom: 8,
        right: 8,
        display: 'flex',
        gap: 4,
        zIndex: 10
      }}>
        <button
          onClick={handleReset}
          style={{
            background: 'var(--bg-tertiary)',
            border: '1px solid var(--border-color)',
            borderRadius: 4,
            padding: '2px 8px',
            fontSize: 11,
            color: 'var(--text-secondary)',
            cursor: 'pointer'
          }}
        >
          {Math.round(transform.scale * 100)}%
        </button>
      </div>
    </div>
  )
}
