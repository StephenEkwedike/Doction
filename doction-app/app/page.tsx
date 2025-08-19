'use client'

import { useEffect, useState } from 'react'
import { ChatView } from '@/components/chat-view'
import { useCaseStore } from '@/hooks/use-case'
import { useChatStore } from '@/src/stores/chatStore'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
}

export default function Page() {
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const { setOffers, setProfile } = useCaseStore()
  const [resetKey, setResetKey] = useState(0)
  const chatStore = useChatStore()
  const activeChat = chatStore.activeChat
  
  const showHero = messages.length === 0

  const handleSend = async (text: string) => {
    if (isLoading) return
    
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: text
    }
    
    setMessages(prev => [...prev, userMessage])
    // Persist to chat store (create default chat if none)
    let chatId = chatStore.activeChatId
    if (!chatId) {
      const newChat = chatStore.createNewChat()
      chatId = newChat.id
      chatStore.setActiveChat(chatId)
    }
    chatStore.addMessage(chatId!, { role: 'user', content: text, metadata: {} as any })
    setIsLoading(true)
    
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [...messages, userMessage].map(m => ({ role: m.role, content: m.content }))
        })
      })

      if (!response.ok) {
        throw new Error('Failed to get response')
      }

      const reader = response.body?.getReader()
      if (!reader) {
        throw new Error('No reader available')
      }

      let assistantMessage = ''
      const assistantId = (Date.now() + 1).toString()
      
      // Add empty assistant message first
      setMessages(prev => [...prev, { 
        id: assistantId, 
        role: 'assistant', 
        content: '' 
      }])

      // In parallel, ask server to extract offers from the chat text
      ;(async () => {
        try {
          const matchRes = await fetch('/api/match-offers/from-text', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text })
          })
          if (matchRes.ok) {
            const data = await matchRes.json()
            if (Array.isArray(data.offers)) {
              setOffers(data.offers)
            }
          }
        } catch (e) {
          // ignore matching errors in chat flow
        }
      })()

      // Read the stream
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        
        const chunk = new TextDecoder().decode(value)
        assistantMessage += chunk
        
        // Update the assistant message
        setMessages(prev => prev.map(msg => 
          msg.id === assistantId 
            ? { ...msg, content: assistantMessage }
            : msg
        ))
      }
      // After stream finishes, persist assistant message to chat store
      if (chatId) {
        chatStore.addMessage(chatId, { role: 'assistant', content: assistantMessage, metadata: {} as any })
      }
    } catch (error) {
      console.error('Chat error:', error)
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.'
      }])
    } finally {
      setIsLoading(false)
    }
  }

  const handleExampleClick = (text: string) => {
    handleSend(text)
  }

  // Listen for global New Thread requests from TopNav
  useEffect(() => {
    const handler = () => {
      setMessages([])
      setOffers([])
      setProfile(null as any)
      setResetKey((k) => k + 1)
    }
    window.addEventListener('doction:new-thread', handler)
    return () => window.removeEventListener('doction:new-thread', handler)
  }, [setOffers, setProfile])

  // Sync local messages from active chat when threads switch
  useEffect(() => {
    if (!activeChat) return
    const mapped = activeChat.messages.map((m) => ({ id: m.id, role: (m.role === 'assistant' ? 'assistant' : 'user') as 'user' | 'assistant', content: m.content }))
    setMessages(mapped)
  }, [activeChat])

  // Open chat from threads dropdown
  useEffect(() => {
    const handler = (e: any) => {
      const id = e?.detail?.id as string
      if (!id) return
      const c = chatStore.getChatById(id)
      if (!c) return
      chatStore.setActiveChat(id)
      const mapped = c.messages.map((m) => ({ id: m.id, role: (m.role === 'assistant' ? 'assistant' : 'user') as 'user' | 'assistant', content: m.content }))
      setMessages(mapped)
    }
    window.addEventListener('doction:open-chat', handler as any)
    return () => window.removeEventListener('doction:open-chat', handler as any)
  }, [chatStore])

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-0">
      <ChatView
        greeting="Good Afternoon"
        userName="there"
        messages={messages}
        pending={isLoading}
        onSend={handleSend}
        onExampleClick={handleExampleClick}
        showHero={showHero}
        resetKey={resetKey}
      />
    </div>
  )
}
