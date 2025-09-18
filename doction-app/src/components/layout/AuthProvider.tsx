'use client'

import { useEffect, ReactNode } from 'react'
import { useUser } from '@clerk/nextjs'
import { useAuthStore } from '@/src/stores/authStore'

interface AuthProviderProps {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const { isLoaded, isSignedIn, user: clerkUser } = useUser()
  const { setUser, logout } = useAuthStore()

  useEffect(() => {
    if (!isLoaded) return

    if (isSignedIn && clerkUser) {
      const email = clerkUser.primaryEmailAddress?.emailAddress ?? ''
      const name = [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(' ') || clerkUser.username || email || clerkUser.id

      setUser({
        id: clerkUser.id,
        email,
        name,
        role: ((clerkUser.publicMetadata as Record<string, unknown>)?.role as 'patient' | 'provider') ?? 'patient',
        isActive: true,
        createdAt: clerkUser.createdAt ? new Date(clerkUser.createdAt) : new Date(),
        updatedAt: new Date(),
      })
    } else {
      logout()
    }
  }, [isLoaded, isSignedIn, clerkUser, setUser, logout])

  return <>{children}</>
}
