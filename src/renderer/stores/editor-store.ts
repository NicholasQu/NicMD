import { create } from 'zustand'

interface EditorState {
  cursorLine: number
  cursorColumn: number
  scrollTop: number
  scrollHeight: number
  wordWrap: boolean
  fontSize: number
  tabSize: number
  scrollToLine: number
  scrollRatio: number
  scrollSource: 'editor' | 'preview' | null

  setCursorLine: (line: number) => void
  setCursorColumn: (col: number) => void
  setScrollTop: (top: number) => void
  setScrollHeight: (height: number) => void
  toggleWordWrap: () => void
  setFontSize: (size: number) => void
  setScrollToLine: (line: number) => void
  setScrollRatio: (ratio: number, source: 'editor' | 'preview') => void
}

let scrollVersion = 0

export const useEditorStore = create<EditorState>((set) => ({
  cursorLine: 1,
  cursorColumn: 1,
  scrollTop: 0,
  scrollHeight: 0,
  wordWrap: true,
  fontSize: 14,
  tabSize: 2,
  scrollToLine: 0,
  scrollRatio: 0,
  scrollSource: null,

  setCursorLine: (line) => set({ cursorLine: line }),
  setCursorColumn: (col) => set({ cursorColumn: col }),
  setScrollTop: (top) => set({ scrollTop: top }),
  setScrollHeight: (height) => set({ scrollHeight: height }),
  toggleWordWrap: () => set((s) => ({ wordWrap: !s.wordWrap })),
  setFontSize: (size) => set({ fontSize: size }),
  setScrollToLine: (line) => set({ scrollToLine: line }),
  setScrollRatio: (ratio, source) => {
    scrollVersion++
    set({ scrollRatio: ratio, scrollSource: source })
  }
}))

export function getScrollVersion() { return scrollVersion }
