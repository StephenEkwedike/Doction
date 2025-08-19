'use client'

import { useEffect, useMemo, useState } from 'react'

export type CaseProfile = {
  age?: string
  location?: string
  procedure?: string
  hasQuote?: boolean
  providerName?: string
  quotedPriceUSD?: number | null
  travelOk?: boolean
  rawSummary?: string
}

export type Offer = {
  id: string
  providerId: string
  providerName: string
  specialty: string
  city: string
  state: string
  priceUSD: number
  notes?: string
}

const KEY = 'doction_case_profile'
const OFFERS_KEY = 'doction_offers'
const AUTH_KEY = 'doction_auth' // {email, phone}

export function useCaseStore() {
  const [profile, setProfile] = useState<CaseProfile | null>(null)
  const [offers, setOffers] = useState<Offer[]>([])
  const [auth, setAuth] = useState<{ email?: string; phone?: string } | null>(
    null
  )

  useEffect(() => {
    try {
      const p = localStorage.getItem(KEY)
      if (p) setProfile(JSON.parse(p))
      const o = localStorage.getItem(OFFERS_KEY)
      if (o) setOffers(JSON.parse(o))
      const a = localStorage.getItem(AUTH_KEY)
      if (a) setAuth(JSON.parse(a))
    } catch {}
  }, [])

  useEffect(() => {
    if (profile) localStorage.setItem(KEY, JSON.stringify(profile))
  }, [profile])

  useEffect(() => {
    localStorage.setItem(OFFERS_KEY, JSON.stringify(offers))
  }, [offers])

  const isAuthed = useMemo(() => !!(auth?.email && auth?.phone), [auth])

  const saveAuth = (email: string, phone: string) => {
    const next = { email, phone }
    setAuth(next)
    localStorage.setItem(AUTH_KEY, JSON.stringify(next))
  }

  return { profile, setProfile, offers, setOffers, isAuthed, saveAuth }
}
