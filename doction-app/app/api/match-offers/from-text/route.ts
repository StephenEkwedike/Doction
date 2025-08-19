import { NextRequest } from 'next/server'
import { ChatProcessingService } from '@/src/services/ChatProcessingService'
import { logger } from '@/src/lib/logger/Logger'

export async function POST(req: NextRequest) {
  const { text, history } = await req.json().catch(() => ({ text: '', history: [] }))

  if (!text || typeof text !== 'string') {
    return new Response(
      JSON.stringify({ error: 'Missing text' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    )
  }

  try {
    const chatProcessor = ChatProcessingService.getInstance()
    const analysis = await chatProcessor.processMessage(text, Array.isArray(history) ? history : [])

    const matched = analysis.metadata?.matchedProviders || []

    const offers = matched.slice(0, 4).map((u, i) => {
      const pp = u.providerProfile!
      const base = pp.basePriceUSD
      const price = Math.max(base - i * 150, Math.round(base * 0.8))
      return {
        id: `${u.id}-${Date.now()}-${i}`,
        providerId: u.id,
        providerName: u.name || 'Provider',
        specialty: pp.specialty,
        city: pp.city,
        state: pp.state,
        priceUSD: price,
        notes: i === 0 ? 'Includes initial consultation' : undefined,
      }
    })

    logger.info('providers', 'from-text offers generated', {
      count: offers.length,
      specialty: analysis.metadata?.specialty,
      location: analysis.metadata?.location,
    })

    return Response.json({
      offers,
      meta: analysis.metadata,
    })
  } catch (error) {
    logger.error('providers', 'from-text matching failed', error)
    return new Response(
      JSON.stringify({ error: 'Matching failed' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}

