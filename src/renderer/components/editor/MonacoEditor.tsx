import { useRef, useEffect, useState } from 'react'
import Editor, { OnMount } from '@monaco-editor/react'
import type { editor as MonacoEditorType } from 'monaco-editor'
import { useFileStore } from '../../stores/file-store'
import { useEditorStore } from '../../stores/editor-store'
import { useUIStore } from '../../stores/ui-store'

interface MonacoEditorProps {
  value: string
}

export const editorScrollRef = { current: false }

export function MonacoEditor({ value }: MonacoEditorProps) {
  const editorRef = useRef<MonacoEditorType.IStandaloneCodeEditor | null>(null)
  const isUpdating = useRef(false)
  const [selectionBubble, setSelectionBubble] = useState<{ top: number; left: number; text: string; startLine: number; endLine: number } | null>(null)
  const setCurrentContent = useFileStore((s) => s.setCurrentContent)
  const currentFile = useFileStore((s) => s.currentFile)
  const wordWrap = useEditorStore((s) => s.wordWrap)
  const fontSize = useEditorStore((s) => s.fontSize)
  const theme = useUIStore((s) => s.theme)

  const handleEditorDidMount: OnMount = (editor, monaco) => {
    editorRef.current = editor

    monaco.editor.defineTheme('nicmd-dark', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: 'comment', foreground: '6A9955', fontStyle: 'italic' },
        { token: 'keyword', foreground: 'C586C0' },
        { token: 'string', foreground: 'CE9178' },
        { token: 'number', foreground: 'B5CEA8' },
        { token: 'type', foreground: '4EC9B0' }
      ],
      colors: {
        'editor.background': '#0f0f0f',
        'editor.foreground': '#d4d4d4',
        'editor.lineHighlightBackground': '#1a1a1a',
        'editor.selectionBackground': '#264f78',
        'editorLineNumber.foreground': '#404040',
        'editorLineNumber.activeForeground': '#888888',
        'editorCursor.foreground': '#f97316'
      }
    })

    monaco.editor.defineTheme('nicmd-light', {
      base: 'vs',
      inherit: true,
      rules: [
        { token: 'comment', foreground: '6A9955', fontStyle: 'italic' },
        { token: 'keyword', foreground: 'AF00DB' },
        { token: 'string', foreground: 'A31515' },
        { token: 'number', foreground: '098658' }
      ],
      colors: {
        'editor.background': '#ffffff',
        'editor.foreground': '#1f1f1f',
        'editor.lineHighlightBackground': '#f5f5f5',
        'editor.selectionBackground': '#add6ff',
        'editorLineNumber.foreground': '#cccccc',
        'editorCursor.foreground': '#f97316'
      }
    })

    monaco.editor.setTheme(theme === 'dark' ? 'nicmd-dark' : 'nicmd-light')

    editor.onDidChangeModelContent(() => {
      if (!isUpdating.current) {
        setCurrentContent(editor.getValue())
      }
    })

    editor.onDidChangeCursorPosition((e: any) => {
      useEditorStore.getState().setCursorLine(e.position.lineNumber)
      useEditorStore.getState().setCursorColumn(e.position.column)
    })

    editor.onDidChangeCursorSelection((e: any) => {
      const selection = e.selection
      const model = editor.getModel()
      if (!model || selection.isEmpty()) {
        setSelectionBubble(null)
        return
      }
      const text = model.getValueInRange(selection).trim()
      if (!text) {
        setSelectionBubble(null)
        return
      }
      const position = editor.getScrolledVisiblePosition({ lineNumber: selection.startLineNumber, column: selection.startColumn })
      if (!position) return
      setSelectionBubble({
        top: Math.max(8, position.top - 36),
        left: Math.max(8, position.left),
        text,
        startLine: selection.startLineNumber,
        endLine: selection.endLineNumber
      })
    })

    editor.onDidScrollChange(() => {
      if (editorScrollRef.current) return
      const scrollTop = editor.getScrollTop()
      const maxScroll = editor.getScrollHeight() - editor.getLayoutInfo().height
      if (maxScroll > 0) {
        useEditorStore.getState().setScrollRatio(scrollTop / maxScroll, 'editor')
      }
    })
  }

  useEffect(() => {
    const unsub = useEditorStore.subscribe((state, prev) => {
      if (
        state.scrollSource === 'preview' &&
        state.scrollRatio !== prev.scrollRatio &&
        editorRef.current
      ) {
        editorScrollRef.current = true
        const editor = editorRef.current
        const maxScroll = editor.getScrollHeight() - editor.getLayoutInfo().height
        if (maxScroll > 0) {
          editor.setScrollTop(state.scrollRatio * maxScroll)
        }
        setTimeout(() => { editorScrollRef.current = false }, 50)
      }
    })
    return unsub
  }, [])

  useEffect(() => {
    const editor = editorRef.current
    if (editor && value !== editor.getValue()) {
      isUpdating.current = true
      const model = editor.getModel()
      if (model) {
        editor.pushUndoStop()
        editor.executeEdits('external', [{
          range: model.getFullModelRange(),
          text: value
        }])
        editor.pushUndoStop()
      }
      isUpdating.current = false
    }
  }, [value])

  useEffect(() => {
    const unsub = useEditorStore.subscribe((state, prev) => {
      if (state.scrollToLine > 0 && state.scrollToLine !== prev.scrollToLine && editorRef.current) {
        editorRef.current.revealLineInCenter(state.scrollToLine)
        editorRef.current.setPosition({ lineNumber: state.scrollToLine, column: 1 })
        editorRef.current.focus()
        useEditorStore.getState().setScrollToLine(0)
      }
    })
    return unsub
  }, [])

  const addSelectionToAi = () => {
    if (!selectionBubble || !currentFile) return
    const fileName = currentFile.split(/[\\/]/).pop() || 'current.md'
    const shortName = fileName.length > 18 ? `${fileName.slice(0, 8)}…${fileName.slice(-7)}` : fileName
    const lineLabel = selectionBubble.startLine === selectionBubble.endLine
      ? `L${selectionBubble.startLine}`
      : `L${selectionBubble.startLine}-${selectionBubble.endLine}`
    window.dispatchEvent(new CustomEvent('nicmd:open-ai'))
    setTimeout(() => window.dispatchEvent(new CustomEvent('nicmd:add-ai-context', {
      detail: {
        id: `${currentFile}:${selectionBubble.startLine}:${selectionBubble.endLine}:${selectionBubble.text.length}`,
        label: `${shortName} ${lineLabel}`,
        content: selectionBubble.text
      }
    })), 0)
    setSelectionBubble(null)
  }

  return (
    <div className="relative h-full">
    <Editor
      height="100%"
      language="markdown"
      value={value}
      theme={theme === 'dark' ? 'nicmd-dark' : 'nicmd-light'}
      onMount={handleEditorDidMount}
      loading={
        <div className="flex items-center justify-center h-full" style={{ color: 'var(--text-tertiary)' }}>
          Loading editor...
        </div>
      }
      options={{
        fontSize,
        fontFamily: "'JetBrains Mono', 'Fira Code', Consolas, monospace",
        fontLigatures: true,
        lineHeight: 26,
        letterSpacing: 0.3,
        wordWrap: wordWrap ? 'on' : 'off',
        minimap: { enabled: false },
        scrollbar: {
          verticalScrollbarSize: 6,
          horizontalScrollbarSize: 6
        },
        padding: { top: 16, bottom: 16 },
        smoothScrolling: true,
        cursorBlinking: 'smooth',
        cursorSmoothCaretAnimation: 'on',
        renderLineHighlight: 'all',
        bracketPairColorization: { enabled: true },
        guides: {
          bracketPairs: true,
          indentation: true
        },
        overviewRulerBorder: false,
        hideCursorInOverviewRuler: true,
        renderWhitespace: 'none',
        scrollBeyondLastLine: false,
        automaticLayout: true
      }}
    />
    {selectionBubble && (
      <button
        onMouseDown={(e) => e.preventDefault()}
        onClick={addSelectionToAi}
        className="absolute z-20 rounded-full px-3 py-1.5 text-xs font-medium shadow-md transition-all hover:scale-[1.02]"
        style={{
          top: selectionBubble.top,
          left: selectionBubble.left,
          color: '#ffffff',
          background: 'linear-gradient(135deg, #fbbf24, #ea580c)',
          boxShadow: '0 8px 22px rgba(234, 88, 12, 0.26)'
        }}
      >
        添加到对话
      </button>
    )}
    </div>
  )
}
