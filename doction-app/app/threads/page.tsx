'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useChatStore } from '@/src/stores/chatStore'

export default function ThreadsPage() {
  const router = useRouter()
  const {
    getRecentChats,
    activeChatId,
    setActiveChat,
    createNewChat,
  } = useChatStore()
  const recent = getRecentChats()

  const openChat = (id: string) => {
    setActiveChat(id)
    // Notify home page and navigate there
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('doction:open-chat', { detail: { id } }))
    }
    router.push('/')
  }

  const newThread = () => {
    const c = createNewChat()
    setActiveChat(c.id)
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('doction:open-chat', { detail: { id: c.id } }))
    }
    router.push('/')
  }

  useEffect(() => {
    document.title = 'Threads • Doction'
  }, [])

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-semibold">Threads</h1>
        <Button className="bg-gray-900 text-white hover:bg-gray-800" onClick={newThread}>
          + New Thread
        </Button>
      </div>

      {recent.length === 0 ? (
        <div className="text-gray-500">No threads yet. Create one to get started.</div>
      ) : (
        <div className="space-y-2">
          {recent.map((c) => (
            <button key={c.id} onClick={() => openChat(c.id)} className="w-full text-left">
              <Card className={c.id === activeChatId ? 'ring-2 ring-sky-100' : ''}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="font-medium text-gray-900 truncate max-w-[70%]">
                      {c.title || 'Untitled'}
                    </div>
                    <div className="text-xs text-gray-500">
                      {new Date(c.updatedAt).toLocaleString()}
                    </div>
                  </div>
                  {c.messages.length > 0 && (
                    <div className="text-sm text-gray-600 mt-1 line-clamp-2">
                      {c.messages[c.messages.length - 1].content}
                    </div>
                  )}
                </CardContent>
              </Card>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

