import { create } from 'zustand'

type TabMode = 'editor' | 'preview' | 'split'

interface UIState {
  theme: 'light' | 'dark'
  sidebarVisible: boolean
  sidebarWidth: number
  activeTab: TabMode
  toolbarVisible: boolean
  isMaximized: boolean
  editorRatio: number

  setTheme: (theme: 'light' | 'dark') => void
  toggleTheme: () => void
  setSidebarVisible: (visible: boolean) => void
  toggleSidebar: () => void
  setSidebarWidth: (width: number) => void
  setActiveTab: (tab: TabMode) => void
  setToolbarVisible: (visible: boolean) => void
  setIsMaximized: (max: boolean) => void
  setEditorRatio: (ratio: number) => void
}

export const useUIStore = create<UIState>((set, get) => ({
  theme: 'light',
  sidebarVisible: true,
  sidebarWidth: 260,
  activeTab: 'split',
  toolbarVisible: true,
  isMaximized: false,
  editorRatio: 0.5,

  setTheme: (theme) => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
    window.api.theme.change(theme)
    set({ theme })
  },
  toggleTheme: () => {
    const next = get().theme === 'dark' ? 'light' : 'dark'
    get().setTheme(next)
  },
  setSidebarVisible: (visible) => set({ sidebarVisible: visible }),
  toggleSidebar: () => set((s) => ({ sidebarVisible: !s.sidebarVisible })),
  setSidebarWidth: (width) => set({ sidebarWidth: width }),
  setActiveTab: (tab) => set({ activeTab: tab }),
  setToolbarVisible: (visible) => set({ toolbarVisible: visible }),
  setIsMaximized: (max) => set({ isMaximized: max }),
  setEditorRatio: (ratio) => set({ editorRatio: ratio })
}))
