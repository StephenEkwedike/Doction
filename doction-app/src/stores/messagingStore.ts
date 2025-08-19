import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'
import { Conversation, Message, User } from '../types'

interface MessagingState {
  conversations: Conversation[]
  activeConversationId: string | null
  activeConversation: Conversation | null
  unreadTotal: number
  isConnected: boolean
  typingUsers: { [conversationId: string]: string[] }
  
  // Loading states
  isLoadingConversations: boolean
  isLoadingMessages: boolean
  isSendingMessage: boolean
  
  // Actions
  setConversations: (conversations: Conversation[]) => void
  addConversation: (conversation: Conversation) => void
  updateConversation: (id: string, updates: Partial<Conversation>) => void
  removeConversation: (id: string) => void
  
  setActiveConversation: (conversationId: string | null) => void
  addMessage: (conversationId: string, message: Message) => void
  markAsRead: (conversationId: string) => void
  
  setTyping: (conversationId: string, userId: string, isTyping: boolean) => void
  
  setConnectionStatus: (connected: boolean) => void
  setLoadingStates: (states: Partial<{
    isLoadingConversations: boolean
    isLoadingMessages: boolean
    isSendingMessage: boolean
  }>) => void
  
  // Computed
  getUnreadCount: () => number
  getConversationById: (id: string) => Conversation | undefined
}

export const useMessagingStore = create<MessagingState>()(
  subscribeWithSelector((set, get) => ({
    conversations: [],
    activeConversationId: null,
    activeConversation: null,
    unreadTotal: 0,
    isConnected: false,
    typingUsers: {},
    
    isLoadingConversations: false,
    isLoadingMessages: false,
    isSendingMessage: false,

    setConversations: (conversations: Conversation[]) => {
      const unreadTotal = conversations.reduce((sum, conv) => sum + conv.unreadCount, 0)
      set({
        conversations: conversations.sort((a, b) => 
          new Date(b.lastMessageAt || b.createdAt).getTime() - 
          new Date(a.lastMessageAt || a.createdAt).getTime()
        ),
        unreadTotal,
      })
    },

    addConversation: (conversation: Conversation) => {
      set((state) => {
        const exists = state.conversations.find(c => c.id === conversation.id)
        if (exists) return state
        
        const newConversations = [conversation, ...state.conversations]
        return {
          conversations: newConversations,
          unreadTotal: state.unreadTotal + conversation.unreadCount,
        }
      })
    },

    updateConversation: (id: string, updates: Partial<Conversation>) => {
      set((state) => {
        const conversations = state.conversations.map(conv => {
          if (conv.id === id) {
            const updated = { ...conv, ...updates }
            return updated
          }
          return conv
        })
        
        const unreadTotal = conversations.reduce((sum, conv) => sum + conv.unreadCount, 0)
        const activeConversation = state.activeConversationId === id 
          ? conversations.find(c => c.id === id) || null 
          : state.activeConversation
        
        return {
          conversations: conversations.sort((a, b) => 
            new Date(b.lastMessageAt || b.createdAt).getTime() - 
            new Date(a.lastMessageAt || a.createdAt).getTime()
          ),
          unreadTotal,
          activeConversation,
        }
      })
    },

    removeConversation: (id: string) => {
      set((state) => {
        const conversations = state.conversations.filter(c => c.id !== id)
        const unreadTotal = conversations.reduce((sum, conv) => sum + conv.unreadCount, 0)
        
        return {
          conversations,
          unreadTotal,
          activeConversationId: state.activeConversationId === id ? null : state.activeConversationId,
          activeConversation: state.activeConversationId === id ? null : state.activeConversation,
        }
      })
    },

    setActiveConversation: (conversationId: string | null) => {
      set((state) => {
        const activeConversation = conversationId 
          ? state.conversations.find(c => c.id === conversationId) || null
          : null
        
        return {
          activeConversationId: conversationId,
          activeConversation,
        }
      })
    },

    addMessage: (conversationId: string, message: Message) => {
      set((state) => {
        const conversations = state.conversations.map(conv => {
          if (conv.id === conversationId) {
            const messages = [...conv.messages, message]
            const isActiveConversation = state.activeConversationId === conversationId
            
            return {
              ...conv,
              messages,
              lastMessage: message.content,
              lastMessageAt: message.createdAt,
              unreadCount: isActiveConversation ? conv.unreadCount : conv.unreadCount + 1,
            }
          }
          return conv
        })
        
        const unreadTotal = conversations.reduce((sum, conv) => sum + conv.unreadCount, 0)
        const activeConversation = state.activeConversationId === conversationId 
          ? conversations.find(c => c.id === conversationId) || null 
          : state.activeConversation
        
        return {
          conversations: conversations.sort((a, b) => 
            new Date(b.lastMessageAt || b.createdAt).getTime() - 
            new Date(a.lastMessageAt || a.createdAt).getTime()
          ),
          unreadTotal,
          activeConversation,
        }
      })
    },

    markAsRead: (conversationId: string) => {
      set((state) => {
        const conversations = state.conversations.map(conv => {
          if (conv.id === conversationId) {
            const messages = conv.messages.map(msg => ({ ...msg, isRead: true }))
            return { ...conv, messages, unreadCount: 0 }
          }
          return conv
        })
        
        const unreadTotal = conversations.reduce((sum, conv) => sum + conv.unreadCount, 0)
        const activeConversation = state.activeConversationId === conversationId 
          ? conversations.find(c => c.id === conversationId) || null 
          : state.activeConversation
        
        return {
          conversations,
          unreadTotal,
          activeConversation,
        }
      })
    },

    setTyping: (conversationId: string, userId: string, isTyping: boolean) => {
      set((state) => {
        const typingUsers = { ...state.typingUsers }
        
        if (!typingUsers[conversationId]) {
          typingUsers[conversationId] = []
        }
        
        if (isTyping) {
          if (!typingUsers[conversationId].includes(userId)) {
            typingUsers[conversationId] = [...typingUsers[conversationId], userId]
          }
        } else {
          typingUsers[conversationId] = typingUsers[conversationId].filter(id => id !== userId)
          if (typingUsers[conversationId].length === 0) {
            delete typingUsers[conversationId]
          }
        }
        
        return { typingUsers }
      })
    },

    setConnectionStatus: (isConnected: boolean) => {
      set({ isConnected })
    },

    setLoadingStates: (states) => {
      set((state) => ({ ...state, ...states }))
    },

    getUnreadCount: () => {
      return get().unreadTotal
    },

    getConversationById: (id: string) => {
      return get().conversations.find(c => c.id === id)
    },
  }))
)