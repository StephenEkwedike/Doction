import { NextRequest } from 'next/server'

// Placeholder notification endpoint.
// If you later add TWILIO_* or SMTP env vars, send real SMS/email here.
export async function POST(req: NextRequest) {
  const body = await req.json()
  console.log('Notification request:', body)
  return Response.json({ ok: true })
}
