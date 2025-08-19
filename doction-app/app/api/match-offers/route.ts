import { NextRequest } from 'next/server'
import { MOCK_PROVIDERS } from '@/src/lib/data/providers'

export async function POST(req: NextRequest) {
  const body = await req.json()
  const profile = body?.profile as {
    procedure?: string | null
    quotedPriceUSD?: number | null
    location?: string | null
    travelOk?: boolean
  }

  if (!profile) {
    return new Response(
      JSON.stringify({ error: 'Missing profile' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    )
  }

  const specialty = normalizeSpecialty(profile.procedure)
  let candidates = MOCK_PROVIDERS.filter((u) => {
    const pp = u.providerProfile
    if (!pp) return false
    if (specialty) {
      return pp.specialty.toLowerCase() === specialty.toLowerCase()
    }
    return true
  })

  if (!profile.travelOk && profile.location) {
    const loc = profile.location.toLowerCase()
    candidates = candidates.filter((u) => {
      const pp = u.providerProfile!
      return (
        pp.city.toLowerCase().includes(loc) || pp.state.toLowerCase().includes(loc)
      )
    })
  }

  const base = profile.quotedPriceUSD ?? undefined

  const offers = candidates.slice(0, 4).map((u, i) => {
    const p = u.providerProfile!
    const discount =
      base && base > p.basePriceUSD ? Math.round((base - p.basePriceUSD) * 0.4) : 0
    const price = base
      ? Math.max(Math.round(base - (base * 0.1 + i * 150) - discount), p.basePriceUSD)
      : p.basePriceUSD - i * 150

    return {
      id: `${u.id}-${Date.now()}-${i}`,
      providerId: u.id,
      providerName: u.name,
      specialty: p.specialty,
      city: p.city,
      state: p.state,
      priceUSD: Math.max(price, Math.round(p.basePriceUSD * 0.8)),
      notes:
        i === 0
          ? 'Includes initial consultation and imaging review.'
          : i === 1
          ? 'Telehealth consult available this week.'
          : undefined,
    }
  })

  return Response.json({ offers })
}

function normalizeSpecialty(proc?: string | null) {
  if (!proc) return undefined
  const t = proc.toLowerCase()
  if (t.includes('jaw')) return 'Jaw Surgery'
  if (t.includes('oral')) return 'Oral Surgery'
  if (t.includes('orth')) return 'Orthodontics'
  if (t.includes('braces') || t.includes('aligners')) return 'Orthodontics'
  return undefined
}
