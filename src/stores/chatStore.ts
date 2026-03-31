import { create } from 'zustand'

export type WubiMode = 'normal' | 'roast' | 'reganame' | 'hype'

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: number
  feedback?: 'up' | 'down'
}

export interface Conversation {
  id: string
  title: string
  mode: WubiMode
  messages: ChatMessage[]
  createdAt: number
}

interface ChatState {
  conversations: Conversation[]
  activeId: string | null
  mode: WubiMode
  setMode: (mode: WubiMode) => void
  createConversation: () => string
  setActiveConversation: (id: string) => void
  addMessage: (msg: Omit<ChatMessage, 'id' | 'timestamp'>) => void
  updateLastAssistant: (content: string) => void
  setFeedback: (messageId: string, feedback: 'up' | 'down') => void
  getActiveConversation: () => Conversation | undefined
}

let counter = 0
const uid = () => `msg-${Date.now()}-${++counter}`

export const useChatStore = create<ChatState>((set, get) => ({
  conversations: [],
  activeId: null,
  mode: 'normal',

  setMode: (mode) => set({ mode }),

  createConversation: () => {
    const id = `conv-${Date.now()}`
    const conv: Conversation = {
      id,
      title: 'Nueva conversación',
      mode: get().mode,
      messages: [],
      createdAt: Date.now(),
    }
    set((s) => ({ conversations: [conv, ...s.conversations], activeId: id }))
    return id
  },

  setActiveConversation: (id) => set({ activeId: id }),

  addMessage: (msg) => set((s) => {
    const convs = s.conversations.map((c) => {
      if (c.id !== s.activeId) return c
      const newMsg: ChatMessage = { ...msg, id: uid(), timestamp: Date.now() }
      const messages = [...c.messages, newMsg]
      // Update title from first user message
      const title = msg.role === 'user' && c.messages.length === 0
        ? msg.content.slice(0, 40) + (msg.content.length > 40 ? '...' : '')
        : c.title
      return { ...c, messages, title }
    })
    return { conversations: convs }
  }),

  updateLastAssistant: (content) => set((s) => {
    const convs = s.conversations.map((c) => {
      if (c.id !== s.activeId) return c
      const msgs = [...c.messages]
      for (let i = msgs.length - 1; i >= 0; i--) {
        if (msgs[i].role === 'assistant') {
          msgs[i] = { ...msgs[i], content }
          break
        }
      }
      return { ...c, messages: msgs }
    })
    return { conversations: convs }
  }),

  setFeedback: (messageId, feedback) => set((s) => {
    const convs = s.conversations.map((c) => {
      if (c.id !== s.activeId) return c
      const messages = c.messages.map((m) =>
        m.id === messageId ? { ...m, feedback } : m
      )
      return { ...c, messages }
    })
    return { conversations: convs }
  }),

  getActiveConversation: () => {
    const s = get()
    return s.conversations.find((c) => c.id === s.activeId)
  },
}))
