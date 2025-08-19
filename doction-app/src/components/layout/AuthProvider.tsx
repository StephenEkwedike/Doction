'use client'

import { useEffect, ReactNode } from 'react'
import { useAuthStore } from '@/src/stores/authStore'

interface AuthProviderProps {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const { user, setUser } = useAuthStore()

  useEffect(() => {
    // Initialize a mock user for development
    if (!user) {
      const mockUser = {
        id: 'user-123',
        email: 'jason@example.com',
        name: 'Jason',
        role: 'patient' as const,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      }
      setUser(mockUser)
    }
  }, [user, setUser])

  return <>{children}</>
}