import { NextRequest } from 'next/server'
import { ThreadsRepo } from '@/lib/threads'
import { intercomPostAdminReply } from '@/lib/intercom'

export const runtime = 'nodejs'

const trimBody = (body: string) => body.trim().slice(0, 2000)

const escapeXml = (input: string) =>
  input.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

const twimlResponse = (message?: string) => {
  const content = message ? `<Message>${escapeXml(message)}</Message>` : ''
  return `<Response>${content}</Response>`
}

const xml = (message?: string) =>
  new Response(twimlResponse(message), {
    headers: { 'Content-Type': 'text/xml' },
  })

export async function POST(req: NextRequest) {
  const form = await req.formData()
  const fromRaw = String(form.get('From') ?? '')
  const body = trimBody(String(form.get('Body') ?? ''))

  const from = fromRaw.trim()

  if (!from) {
    return xml()
  }

  if (!body) {
    return xml()
  }

  if (/^STOP$/i.test(body) || /^(STOP|STOPALL|UNSUBSCRIBE|CANCEL|END|QUIT)$/i.test(body)) {
    ThreadsRepo.setSubscriptionByPhone(from, false)
    return xml('You are unsubscribed. Reply START to rejoin Doction updates.')
  }

  if (/^START$/i.test(body) || /^UNSTOP$/i.test(body)) {
    ThreadsRepo.setSubscriptionByPhone(from, true)
    return xml('You are re-subscribed. Reply STOP to opt out again.')
  }

  const thread = ThreadsRepo.findByParticipantPhone(from)
  if (!thread) {
    return xml()
  }

  const participant = thread.participants.find((p) => p.phoneE164.trim() === from)

  if (!participant || !participant.subscribed) {
    return xml()
  }

  const displayName = participant.displayName || 'Practitioner'
  const reply = `**${displayName}:** ${body}`

  try {
    await intercomPostAdminReply(thread.conversationId, reply)
  } catch (error) {
    console.error('twilio.inbound', error)
    return xml('We could not deliver your message. Please try again later.')
  }

  return xml()
}
