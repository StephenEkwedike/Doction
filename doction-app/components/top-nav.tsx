'use client'

import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ChevronDown, Plus, Search, UserPlus2 } from 'lucide-react'
import { useChatStore } from '@/src/stores/chatStore'
import { Input } from '@/components/ui/input'
import AuthButtons from '@/components/AuthButtons'

export function TopNav() {
  const { getRecentChats, setActiveChat, createNewChat } = useChatStore()
  const recent = getRecentChats()
  const handleNewThread = () => {
    const c = createNewChat()
    setActiveChat(c.id)
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('doction:open-chat', { detail: { id: c.id } }))
      window.dispatchEvent(new Event('doction:new-thread'))
    }
  }
  return (
    <header className="sticky top-0 z-20 bg-white/80 backdrop-blur border-b border-gray-200">
      <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-3 px-4 sm:px-6 lg:px-8 h-14">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="gap-2 text-gray-900 hover:bg-gray-100"
            >
              <span className="font-medium">ChatGPT 4o</span>
              <ChevronDown className="h-4 w-4 text-gray-500" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuLabel>Models</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>ChatGPT 4o</DropdownMenuItem>
            <DropdownMenuItem>ChatGPT 4.5</DropdownMenuItem>
            <DropdownMenuItem>Lightweight</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="hidden md:flex items-center gap-3 ml-auto">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
            <Input
              className="pl-8 w-64"
              placeholder="Search thread"
              aria-label="Search thread"
            />
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="gap-2">
                <UserPlus2 className="h-4 w-4" />
                Threads
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Recent Threads</DropdownMenuLabel>
              {recent.length === 0 ? (
                <DropdownMenuItem disabled>No threads yet</DropdownMenuItem>
              ) : (
                recent.map((c) => (
                  <DropdownMenuItem
                    key={c.id}
                    onClick={() => {
                      setActiveChat(c.id)
                      if (typeof window !== 'undefined') {
                        window.dispatchEvent(new CustomEvent('doction:open-chat', { detail: { id: c.id } }))
                      }
                    }}
                  >
                    {c.title || 'Untitled'}
                  </DropdownMenuItem>
                ))
              )}
            </DropdownMenuContent>
          </DropdownMenu>
          <Button className="gap-2 bg-gray-900 text-white hover:bg-gray-800" onClick={handleNewThread}>
            <Plus className="h-4 w-4" />
            New Thread
          </Button>
          <AuthButtons />
        </div>
        <div className="md:hidden ml-auto">
          <AuthButtons />
        </div>
      </div>
    </header>
  )
}
