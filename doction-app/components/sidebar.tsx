'use client'

import { usePathname } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Home, MessageSquareText, LayoutGrid, Share2, Clock3, Settings, Headphones } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'
import Link from 'next/link'

interface NavigationItem {
  icon: React.ElementType
  label: string
  href: string
  matchPattern?: string
}

const navigationItems: NavigationItem[] = [
  { icon: Home, label: 'Home', href: '/', matchPattern: '^/$' },
  { icon: MessageSquareText, label: 'Messages', href: '/rooms', matchPattern: '^/(rooms|room)' },
  { icon: LayoutGrid, label: 'Threads', href: '/threads', matchPattern: '^/threads' },
  { icon: LayoutGrid, label: 'Apps', href: '/apps', matchPattern: '^/apps' },
  { icon: Share2, label: 'Share', href: '/share', matchPattern: '^/share' },
  { icon: Clock3, label: 'Recents', href: '/recents', matchPattern: '^/recents' },
]

const bottomNavigationItems: NavigationItem[] = [
  { icon: Headphones, label: 'Support', href: '/support', matchPattern: '^/support' },
  { icon: Settings, label: 'Settings', href: '/settings', matchPattern: '^/settings' },
]

export function Sidebar() {
  const pathname = usePathname()

  const isActive = (item: NavigationItem): boolean => {
    if (item.matchPattern) {
      return new RegExp(item.matchPattern).test(pathname)
    }
    return pathname === item.href
  }

  const IconButton = ({
    children,
    active = false,
    label,
    href = '#',
  }: {
    children: React.ReactNode
    active?: boolean
    label: string
    href?: string
  }) => (
    <Link href={href} aria-label={label} className="block">
      <Button
        variant="ghost"
        size="icon"
        className={cn(
          'h-10 w-10 rounded-xl transition-colors',
          active
            ? 'bg-sky-100 text-sky-700 hover:bg-sky-100'
            : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'
        )}
      >
        {children}
      </Button>
    </Link>
  )

  return (
    <aside className="hidden md:flex md:flex-col md:items-center md:justify-between border-r border-gray-200 w-16 py-4 sticky top-0 h-screen z-40 bg-white">
      <div className="flex flex-col items-center gap-3">
        <Link href="/" className="block">
          <div
            className="h-10 w-10 rounded-xl bg-gradient-to-br from-sky-500 to-blue-600 cursor-pointer hover:from-sky-600 hover:to-blue-700 transition-colors"
            aria-label="Doction logo - Home"
          />
        </Link>
        <div className="h-px w-8 bg-gray-200 my-2" />
        
        {navigationItems.map((item) => {
          const Icon = item.icon
          return (
            <IconButton
              key={item.href}
              active={isActive(item)}
              label={item.label}
              href={item.href}
            >
              <Icon className="h-5 w-5" />
            </IconButton>
          )
        })}
      </div>

      <div className="flex flex-col items-center gap-3">
        {bottomNavigationItems.map((item) => {
          const Icon = item.icon
          return (
            <IconButton
              key={item.href}
              active={isActive(item)}
              label={item.label}
              href={item.href}
            >
              <Icon className="h-5 w-5" />
            </IconButton>
          )
        })}
        
        <Avatar className="h-10 w-10 cursor-pointer hover:ring-2 hover:ring-sky-200 transition-all">
          <AvatarImage src="/diverse-user-avatars.png" alt="Your avatar" />
          <AvatarFallback>J</AvatarFallback>
        </Avatar>
      </div>
    </aside>
  )
}
