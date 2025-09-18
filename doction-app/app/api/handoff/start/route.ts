import { NextRequest, NextResponse } from 'next/server'
import { ThreadsRepo, type PractitionerParticipant, type RelayThread } from '@/lib/threads'
import { intercomCreateConversation, intercomPostAdminReply } from '@/lib/intercom'
import { sendSMS } from '@/lib/twilio'

type SelectedProvider = {
  providerId: string
  name: string
  phoneE164: string
  specialty: string
  city: string
  state: string
}

type PatientUser = {
  id: string
  name?: string
}

type HandoffRequestBody = {
  user: PatientUser
  selectedProviders: SelectedProvider[]
  auctionId?: string
  conversationId?: string
}

const buildIntroMessage = (providers: SelectedProvider[], auctionId?: string) => {
  const header = 'We\u2019ve contacted the following practitioners:'
  const list = providers.map((provider, index) =>
    `${index + 1}. ${provider.name} \u2014 ${provider.specialty} • ${provider.city}, ${provider.state}`
  )
  const footer = [
    '',
    'Practitioners can reply by text. You\u2019ll see their replies here.',
    'If you have a quote please upload it (optional) for better comparisons.',
  ]

  if (auctionId) {
    footer.unshift(`Auction ID: ${auctionId}`)
  }

  return [header, ...list, ...footer].join('\n')
}

const buildPractitionerSMS = (provider: SelectedProvider, auctionId?: string, patientName?: string) => {
  const lines = [
    `New ${provider.specialty} inquiry via Doction.`,
    `Patient: ${patientName ?? 'Doction patient'}`,
  ]

  if (auctionId) {
    lines.push(`Auction: ${auctionId}`)
  }

  lines.push(
    'Reply to this text to chat with the patient (messages relay via Doction).',
    'Do not include sensitive PHI. Send STOP to unsubscribe.',
  )

  return lines.join('\n')
}

const toParticipant = (provider: SelectedProvider): PractitionerParticipant => ({
  providerId: provider.providerId,
  phoneE164: provider.phoneE164,
  displayName: provider.name,
  subscribed: true,
})

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as HandoffRequestBody
    const { user, selectedProviders, auctionId, conversationId } = body

    if (!user?.id) {
      return NextResponse.json({ error: 'Missing user id' }, { status: 400 })
    }

    if (!Array.isArray(selectedProviders) || selectedProviders.length === 0) {
      return NextResponse.json({ error: 'No providers selected' }, { status: 400 })
    }

    let thread: RelayThread | null = null
    if (conversationId) {
      thread = ThreadsRepo.get(conversationId)
    }

    let conversationIdentifier = ''

    if (!thread) {
      const introMessage = buildIntroMessage(selectedProviders, auctionId)
      const conversation = await intercomCreateConversation(user.id, introMessage, {
        auction_id: auctionId,
        stage: 'contacted',
      })
      thread = ThreadsRepo.upsert({
        conversationId: conversation.id,
        auctionId,
        patientUserId: user.id,
        patientDisplayName: user.name,
        participants: selectedProviders.map(toParticipant),
      })
    } else {
      selectedProviders.forEach((provider) => {
        ThreadsRepo.addParticipant(thread.conversationId, toParticipant(provider))
      })
      await intercomPostAdminReply(
        thread.conversationId,
        buildIntroMessage(selectedProviders, auctionId),
      )
    }

    const resolvedThread = thread as RelayThread
    conversationIdentifier = resolvedThread.conversationId

    const smsPromises = selectedProviders.map((provider) =>
      sendSMS(provider.phoneE164, buildPractitionerSMS(provider, auctionId, user.name))
    )

    await Promise.all(smsPromises)

    return NextResponse.json({ ok: true, conversationId: conversationIdentifier })
  } catch (error) {
    console.error('handoff.start', error)
    return NextResponse.json({ error: 'Failed to start practitioner handoff' }, { status: 500 })
  }
}
