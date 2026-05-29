import { useRef, useEffect, forwardRef, useImperativeHandle } from 'react'

export interface RefTag {
  id: string
  label: string
  content: string
}

export interface RichInputHandle {
  insertRef: (tag: RefTag) => void
  getText: () => string
  getPlainText: () => string
  getRefs: () => Map<string, RefTag>
  clear: () => void
  focus: () => void
}

interface RichInputProps {
  placeholder?: string
  onSubmit: () => void
  style?: React.CSSProperties
  className?: string
}

export const RichInput = forwardRef<RichInputHandle, RichInputProps>(
  ({ placeholder, onSubmit, style, className }, ref) => {
    const editorRef = useRef<HTMLDivElement>(null)
    const refMap = useRef<Map<string, RefTag>>(new Map())
    const savedRange = useRef<Range | null>(null)

    useEffect(() => {
      const editor = editorRef.current
      if (!editor) return

      const handleBlur = () => {
        const sel = window.getSelection()
        if (sel && sel.rangeCount > 0) {
          const range = sel.getRangeAt(0)
          if (editor.contains(range.commonAncestorContainer)) {
            savedRange.current = range.cloneRange()
          }
        }
      }

      const handleInput = () => {
        if (editor.textContent?.trim() === '' && !editor.querySelector('[data-ref-id]')) {
          editor.innerHTML = ''
        }
      }

      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault()
          onSubmit()
        }
        if (e.key === 'Backspace') {
          const sel = window.getSelection()
          if (!sel || !sel.isCollapsed) return
          const range = sel.getRangeAt(0)
          const node = range.startContainer
          if (node.nodeType === Node.TEXT_NODE && range.startOffset === 0) {
            const prev = node.previousSibling
            if (prev && prev.hasAttribute?.('data-ref-id')) {
              e.preventDefault()
              const refId = prev.getAttribute('data-ref-id')
              if (refId) refMap.current.delete(refId)
              prev.remove()
            }
          }
        }
      }

      editor.addEventListener('blur', handleBlur)
      editor.addEventListener('input', handleInput)
      editor.addEventListener('keydown', handleKeyDown)
      return () => {
        editor.removeEventListener('blur', handleBlur)
        editor.removeEventListener('input', handleInput)
        editor.removeEventListener('keydown', handleKeyDown)
      }
    }, [onSubmit])

    useImperativeHandle(ref, () => ({
      insertRef: (tag: RefTag) => {
        refMap.current.set(tag.id, tag)
        const editor = editorRef.current
        if (!editor) return

        editor.focus()

        const chip = document.createElement('span')
        chip.setAttribute('contenteditable', 'false')
        chip.setAttribute('data-ref-id', tag.id)
        chip.className = 'ai-ref-chip'
        chip.textContent = tag.label.length > 20 ? tag.label.slice(0, 17) + '...' : tag.label

        const sel = window.getSelection()
        let inserted = false

        if (savedRange.current && editor.contains(savedRange.current.commonAncestorContainer)) {
          try {
            sel?.removeAllRanges()
            sel?.addRange(savedRange.current)
            const range = savedRange.current
            range.deleteContents()
            range.insertNode(chip)
            inserted = true
          } catch {
            inserted = false
          }
          savedRange.current = null
        }

        if (!inserted && sel && sel.rangeCount > 0) {
          const range = sel.getRangeAt(0)
          if (editor.contains(range.commonAncestorContainer)) {
            range.deleteContents()
            range.insertNode(chip)
            inserted = true
          }
        }

        if (!inserted) {
          editor.appendChild(chip)
        }

        const after = document.createTextNode('\u00A0')
        chip.parentNode?.insertBefore(after, chip.nextSibling)

        const newRange = document.createRange()
        newRange.setStartAfter(after)
        newRange.collapse(true)
        sel?.removeAllRanges()
        sel?.addRange(newRange)
      },

      getText: () => {
        return editorRef.current?.innerHTML || ''
      },

      getPlainText: () => {
        return editorRef.current?.textContent || ''
      },

      getRefs: () => refMap.current,

      clear: () => {
        if (editorRef.current) {
          editorRef.current.innerHTML = ''
        }
        refMap.current.clear()
        savedRange.current = null
      },

      focus: () => {
        editorRef.current?.focus()
      }
    }))

    return (
      <div
        ref={editorRef}
        contentEditable
        className={className}
        style={{
          ...style,
          outline: 'none',
          wordBreak: 'break-word',
          whiteSpace: 'pre-wrap',
          lineHeight: '1.5',
          overflowY: 'auto',
          maxHeight: '120px'
        }}
        data-placeholder={placeholder}
        suppressContentEditableWarning
      />
    )
  }
)

RichInput.displayName = 'RichInput'
