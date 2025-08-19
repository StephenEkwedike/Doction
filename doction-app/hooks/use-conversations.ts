'use client'

import { useEffect, useState } from 'react'
import type { Offer } from '@/hooks/use-case'

export type Conversation = {
  id: string // room id (derived from offer.id)
  providerId: string
  providerName: string
  specialty: string
  city: string
  state: string
  priceUSD: number
  lastMessage?: string
  updatedAt: number
  unreadPatient: number
  unreadProvider: number
}

const KEY = 'doction_conversations_v1'
const CURRENT_PROVIDER_KEY = 'doction_provider_current'

function load(): Conversation[] {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return []
    return JSON.parse(raw) as Conversation[]
  } catch {
    return []
  }
}
function save(convs: Conversation[]) {
  localStorage.setItem(KEY, JSON.stringify(convs))
}

export function useConversations() {
  const [conversations, setConversations] = useState<Conversation[]>([])

  useEffect(() => {
    setConversations(load())
  }, [])

  const list = () =>
    [...conversations].sort((a, b) => b.updatedAt - a.updatedAt)

  const ensureFromOffer = (offer: Offer) => {
    setConversations((prev) => {
      const exists = prev.find((c) => c.id === offer.id)
      if (exists) return prev
      const next: Conversation = {
        id: offer.id,
        providerId: offer.providerId,
        providerName: offer.providerName,
        specialty: offer.specialty,
        city: offer.city,
        state: offer.state,
        priceUSD: offer.priceUSD,
        updatedAt: Date.now(),
        unreadPatient: 0,
        unreadProvider: 0,
      }
      const all = [next, ...prev]
      save(all)
      return all
    })
  }

  const appendMessage = (
    id: string,
    role: 'user' | 'provider',
    content: string
  ) => {
    setConversations((prev) => {
      const all = prev.map((c) => {
        if (c.id !== id) return c
        return {
          ...c,
          lastMessage: content,
          updatedAt: Date.now(),
          unreadPatient: role === 'provider' ? c.unreadPatient + 1 : c.unreadPatient,
          unreadProvider: role === 'user' ? c.unreadProvider + 1 : c.unreadProvider,
        }
      })
      save(all)
      return all
    })
  }

  const markReadPatient = (id: string) => {
    setConversations((prev) => {
      const all = prev.map((c) => (c.id === id ? { ...c, unreadPatient: 0 } : c))
      save(all)
      return all
    })
  }
  const markReadProvider = (id: string) => {
    setConversations((prev) => {
      const all = prev.map((c) => (c.id === id ? { ...c, unreadProvider: 0 } : c))
      save(all)
      return all
    })
  }

  const setCurrentProvider = (providerId: string) => {
    localStorage.setItem(CURRENT_PROVIDER_KEY, providerId)
  }
  const getCurrentProvider = () => {
    try {
      return localStorage.getItem(CURRENT_PROVIDER_KEY) || ''
    } catch {
      return ''
    }
  }

  return {
    conversations,
    list,
    ensureFromOffer,
    appendMessage,
    markReadPatient,
    markReadProvider,
    setCurrentProvider,
    getCurrentProvider,
  }
}
