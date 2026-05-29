import { useFileStore } from '../stores/file-store'
import { useUIStore } from '../stores/ui-store'

export function useFileOpener() {
  const setCurrentFile = useFileStore((s) => s.setCurrentFile)
  const setCurrentContent = useFileStore((s) => s.setCurrentContent)
  const setIsModified = useFileStore((s) => s.setIsModified)
  const addRecentFile = useFileStore((s) => s.addRecentFile)
  const activeTab = useUIStore((s) => s.activeTab)
  const setActiveTab = useUIStore((s) => s.setActiveTab)

  const openFile = async (path: string, promote = false) => {
    const store = useFileStore.getState()
    const ext = path.split('.').pop()?.toLowerCase() || ''

    if (ext === 'pdf') {
      store.setCurrentFile(path)
      store.setCurrentContent('')
      store.setIsModified(false)
      store.addRecentFile(path, promote)
      return
    }

    try {
      const content = await window.api.file.read(path)
      store.setCurrentFile(path)
      store.setCurrentContent(content)
      store.setIsModified(false)
      store.addRecentFile(path, promote)
    } catch (e) {
      console.error('[useFileOpener] Failed to open file:', e)
    }
  }

  const openFileFromEvent = (data: { path: string; content: string }) => {
    const store = useFileStore.getState()
    setCurrentFile(data.path)
    setCurrentContent(data.content)
    setIsModified(false)
    store.addRecentFile(data.path, true)
  }

  return { openFile, openFileFromEvent }
}
