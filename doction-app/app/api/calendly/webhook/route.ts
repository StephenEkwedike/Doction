import crypto from 'crypto'
import { NextRequest } from 'next/server'
import { ProviderBillingRepo } from '@/lib/providerBilling'
import { stripe } from '@/lib/stripe'

const feeCents = Number(process.env.APPT_FEE_CENTS || '3500')

const verifyCalendlySignature = (rawBody: string, signatureHeader?: string | null) => {
  if (!signatureHeader) return false
  const signingKey = process.env.CALENDLY_SIGNING_KEY
  if (!signingKey) return false

  const pairs = signatureHeader.split(',').map((part) => part.split('='))
  const lookup = Object.fromEntries(pairs)
  const timestamp = lookup['t']
  const signature = lookup['v1']
  if (!timestamp || !signature) return false

  const payload = `${timestamp}.${rawBody}`
  const digest = crypto.createHmac('sha256', signingKey).update(payload).digest('hex')
  return crypto.timingSafeEqual(Buffer.from(digest, 'utf8'), Buffer.from(signature, 'utf8'))
}

export async function POST(req: NextRequest) {
  const raw = await req.text()
  const signatureHeader = req.headers.get('Calendly-Webhook-Signature')
  if (!verifyCalendlySignature(raw, signatureHeader)) {
    return new Response('invalid signature', { status: 400 })
  }

  const event = JSON.parse(raw) as {
    event: string
    payload: any
  }

  if (event.event === 'invitee.created') {
    if (!stripe) {
      console.warn('[Calendly webhook] Stripe not configured')
      return new Response('ok')
    }

    const payload = event.payload
    const eventTypeUri: string | undefined = payload?.event_type
    const ownerUri: string | undefined = payload?.event?.owner
    const inviteeUuid: string | undefined = payload?.invitee?.uuid

    if (!inviteeUuid) {
      return new Response('ok')
    }

    const provider =
      (eventTypeUri && ProviderBillingRepo.findByEventTypeUri(eventTypeUri)) ||
      (ownerUri && ProviderBillingRepo.findByOwnerUri(ownerUri)) ||
      null

    if (!provider?.stripeCustomerId) {
      console.warn('[Calendly webhook] No provider or Stripe customer linked', { eventTypeUri, ownerUri })
      return new Response('ok')
    }

    const idempotencyKey = `calendly:${inviteeUuid}:appointment-fee`

    try {
      await stripe.paymentIntents.create(
        {
          amount: feeCents,
          currency: 'usd',
          customer: provider.stripeCustomerId,
          confirm: true,
          off_session: true,
          automatic_payment_methods: { enabled: true },
          description: 'Doction appointment setting fee',
          metadata: {
            providerId: provider.id,
            calendlyInviteeUuid: inviteeUuid,
            calendlyEventType: eventTypeUri || '',
          },
        },
        { idempotencyKey },
      )
    } catch (error) {
      console.error('[Calendly webhook] payment failed', error)
    }

    return new Response('ok')
  }

  if (event.event === 'invitee.canceled') {
    // Optional: implement refund or credit logic here.
    return new Response('ok')
  }

  return new Response('ignored')
}
