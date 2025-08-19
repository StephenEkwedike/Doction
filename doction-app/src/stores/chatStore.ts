import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: Date
  metadata?: {
    isProviderMatch?: boolean
    matchedProviders?: string[]
    specialty?: string
    location?: string
    priceRange?: { min: number; max: number }
    urgency?: 'low' | 'medium' | 'high'
  }
}

export interface Chat {
  id: string
  title: string
  messages: ChatMessage[]
  createdAt: Date
  updatedAt: Date
  status: 'active' | 'matched' | 'completed'
  metadata?: {
    specialty?: string
    location?: string
    estimatedPrice?: number
    urgency?: string
  }
}

interface ChatState {
  chats: Chat[]
  activeChat: Chat | null
  activeChatId: string | null
  isLoading: boolean
  isProcessing: boolean
  
  // Actions
  createNewChat: () => Chat
  setActiveChat: (chatId: string | null) => void
  addMessage: (chatId: string, message: Omit<ChatMessage, 'id' | 'timestamp'>) => void
  updateChatTitle: (chatId: string, title: string) => void
  updateChatMetadata: (chatId: string, metadata: Chat['metadata']) => void
  deleteChat: (chatId: string) => void
  setLoading: (loading: boolean) => void
  setProcessing: (processing: boolean) => void
  
  // Computed
  getRecentChats: () => Chat[]
  getChatById: (id: string) => Chat | undefined
}

export const useChatStore = create<ChatState>()(
  persist(
    (set, get) => ({
      chats: [],
      activeChat: null,
      activeChatId: null,
      isLoading: false,
      isProcessing: false,

      createNewChat: () => {
        const newChat: Chat = {
          id: `chat-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          title: 'New Chat',
          messages: [],
          createdAt: new Date(),
          updatedAt: new Date(),
          status: 'active',
        }

        set((state) => ({
          chats: [newChat, ...state.chats],
          activeChat: newChat,
          activeChatId: newChat.id,
        }))

        return newChat
      },

      setActiveChat: (chatId: string | null) => {
        const chat = chatId ? get().getChatById(chatId) : null
        set({
          activeChat: chat,
          activeChatId: chatId,
        })
      },

      addMessage: (chatId: string, messageData: Omit<ChatMessage, 'id' | 'timestamp'>) => {
        const message: ChatMessage = {
          ...messageData,
          id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          timestamp: new Date(),
        }

        set((state) => {
          const updatedChats = state.chats.map(chat => {
            if (chat.id === chatId) {
              const updatedChat = {
                ...chat,
                messages: [...chat.messages, message],
                updatedAt: new Date(),
                // Auto-generate title from first user message
                title: chat.messages.length === 0 && messageData.role === 'user' 
                  ? messageData.content.slice(0, 50) + (messageData.content.length > 50 ? '...' : '')
                  : chat.title
              }
              
              return updatedChat
            }
            return chat
          })

          const activeChat = state.activeChatId === chatId 
            ? updatedChats.find(c => c.id === chatId) || null
            : state.activeChat

          return {
            chats: updatedChats,
            activeChat,
          }
        })
      },

      updateChatTitle: (chatId: string, title: string) => {
        set((state) => {
          const updatedChats = state.chats.map(chat =>
            chat.id === chatId ? { ...chat, title, updatedAt: new Date() } : chat
          )

          const activeChat = state.activeChatId === chatId 
            ? updatedChats.find(c => c.id === chatId) || null
            : state.activeChat

          return {
            chats: updatedChats,
            activeChat,
          }
        })
      },

      updateChatMetadata: (chatId: string, metadata: Chat['metadata']) => {
        set((state) => {
          const updatedChats = state.chats.map(chat =>
            chat.id === chatId 
              ? { ...chat, metadata: { ...chat.metadata, ...metadata }, updatedAt: new Date() }
              : chat
          )

          const activeChat = state.activeChatId === chatId 
            ? updatedChats.find(c => c.id === chatId) || null
            : state.activeChat

          return {
            chats: updatedChats,
            activeChat,
          }
        })
      },

      deleteChat: (chatId: string) => {
        set((state) => {
          const updatedChats = state.chats.filter(chat => chat.id !== chatId)
          const activeChat = state.activeChatId === chatId ? null : state.activeChat
          const activeChatId = state.activeChatId === chatId ? null : state.activeChatId

          return {
            chats: updatedChats,
            activeChat,
            activeChatId,
          }
        })
      },

      setLoading: (isLoading: boolean) => {
        set({ isLoading })
      },

      setProcessing: (isProcessing: boolean) => {
        set({ isProcessing })
      },

      getRecentChats: () => {
        return get().chats
          .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
          .slice(0, 20)
      },

      getChatById: (id: string) => {
        return get().chats.find(chat => chat.id === id)
      },
    }),
    {
      name: 'doction-chats',
      partialize: (state) => ({
        chats: state.chats,
        activeChatId: state.activeChatId,
      }),
    }
  )
)