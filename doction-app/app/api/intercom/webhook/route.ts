import { NextRequest, NextResponse } from 'next/server'
import { ThreadsRepo } from '@/lib/threads'
import { sendSMS } from '@/lib/twilio'

type IntercomAuthor = {
  type?: string
}

type IntercomConversationPart = {
  body?: string
  author?: IntercomAuthor
}

type IntercomConversationItem = {
  id?: string
  last_conversation_part?: IntercomConversationPart
}

type IntercomWebhookEvent = {
  topic?: string
  data?: {
    item?: IntercomConversationItem
  }
}

const stripHtml = (input: string) => input.replace(/<[^>]+>/g, '').trim()

export async function POST(req: NextRequest) {
  const event = (await req.json()) as IntercomWebhookEvent
  const topic = event.topic ?? ''

  if (!topic.startsWith('conversation.')) {
    return NextResponse.json({ ignored: true })
  }

  const conversation = event.data?.item
  const conversationId = conversation?.id
  const lastPart = conversation?.last_conversation_part

  if (!conversationId || !lastPart) {
    return NextResponse.json({ ok: true })
  }

  const isFromContact = lastPart.author?.type === 'contact'
  if (!isFromContact) {
    return NextResponse.json({ ok: true })
  }

  const bodyText = lastPart.body ? stripHtml(lastPart.body) : ''
  if (!bodyText) {
    return NextResponse.json({ ok: true })
  }

  const thread = ThreadsRepo.get(conversationId)
  if (!thread) {
    return NextResponse.json({ ok: true })
  }

  const smsBody = `Patient: ${bodyText}`

  try {
    await Promise.all(
      thread.participants
        .filter((participant) => participant.subscribed)
        .map((participant) => sendSMS(participant.phoneE164, smsBody)),
    )
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('intercom.webhook', error)
    return NextResponse.json({ error: 'Failed to relay message' }, { status: 500 })
  }
}
