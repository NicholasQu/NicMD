import { ElectronAPI } from '../preload/index'

declare global {
  interface Window {
    api: ElectronAPI
  }
}
