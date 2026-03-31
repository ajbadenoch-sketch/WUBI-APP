import { create } from 'zustand'

interface ToastState {
  message: string | null
  visible: boolean
  show: (message: string) => void
  hide: () => void
}

export const useToastStore = create<ToastState>((set) => ({
  message: null,
  visible: false,
  show: (message) => {
    set({ message, visible: true })
    setTimeout(() => set({ visible: false, message: null }), 2500)
  },
  hide: () => set({ visible: false, message: null }),
}))
