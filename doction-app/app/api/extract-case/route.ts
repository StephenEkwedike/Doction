import { NextRequest } from 'next/server'
import { openai } from '@ai-sdk/openai'
import { generateText } from 'ai'

export async function POST(req: NextRequest) {
  const { text } = await req.json()

  if (!text || typeof text !== 'string') {
    return new Response(
      JSON.stringify({ error: 'Missing text' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    )
  }

  if (!process.env.OPENAI_API_KEY) {
    // Fallback naive parse if no key configured
    const naive = naiveExtract(text)
    return Response.json({ profile: naive, raw: text })
  }

  const prompt = `
You are an intake assistant. Extract a concise JSON object from the provided text about a patient's dental/surgical case.

Return ONLY valid JSON with keys:
- procedure: string | null
- hasQuote: boolean
- providerName: string | null
- quotedPriceUSD: number | null
- location: string | null
- travelOk: boolean
- age: string | null
- summary: string

Text:
${text}
`

  const { text: out } = await generateText({
    model: openai('gpt-4o'),
    system:
      'Return strictly JSON. No markdown, no explanations. Unknown fields should be null or false.',
    prompt,
  }) // [^6]

  let data: any = {}
  try {
    data = JSON.parse(out)
  } catch {
    data = naiveExtract(text)
  }

  return Response.json({ profile: data, raw: text })
}

function naiveExtract(t: string) {
  const priceMatch = t.match(/\$?\s?([0-9]{3,6}(?:,[0-9]{3})?)/)
  const price = priceMatch ? Number(priceMatch[1].replace(/,/g, '')) : null
  const hasQuote = /\bquote|estimate|invoice\b/i.test(t)
  const travelOk = /\btravel|fly|open to travel\b/i.test(t)
  const locationMatch = t.match(
    /\b(Austin|Los Angeles|San Jose|San Francisco|TX|CA)\b/i
  )
  const providerMatch = t.match(/\b(Orthodontics|Oral|Surgery|Dental|Clinic)\b.*?\b([A-Z][a-z]+)\b/)
  return {
    procedure: /jaw|orthodontic|braces|aligners/i.test(t)
      ? 'Orthodontics/Jaw'
      : null,
    hasQuote,
    providerName: providerMatch ? providerMatch[0] : null,
    quotedPriceUSD: price,
    location: locationMatch ? locationMatch[0] : null,
    travelOk,
    age: null,
    summary:
      'Auto-extracted from uploaded text. Consider reviewing before matching.',
  }
}
