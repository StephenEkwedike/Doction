import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { ProviderBillingRepo } from '@/lib/providerBilling'

export async function POST(req: NextRequest) {
  if (!stripe) {
    return NextResponse.json({ error: 'Stripe not configured' }, { status: 500 })
  }

  const { providerId } = (await req.json()) as { providerId?: string }
  if (!providerId) {
    return NextResponse.json({ error: 'Missing providerId' }, { status: 400 })
  }

  const provider = ProviderBillingRepo.get(providerId)
  if (!provider) {
    return NextResponse.json({ error: 'Provider not found' }, { status: 404 })
  }

  let customerId = provider.stripeCustomerId
  if (!customerId) {
    const customer = await stripe.customers.create({
      name: provider.name,
      email: provider.email,
      metadata: { providerId },
    })
    customerId = customer.id
    ProviderBillingRepo.linkStripe(providerId, customerId)
  }

  const setupIntent = await stripe.setupIntents.create({
    customer: customerId,
    payment_method_types: ['card'],
    usage: 'off_session',
  })

  return NextResponse.json({ clientSecret: setupIntent.client_secret })
}
