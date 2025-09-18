import { NextRequest } from 'next/server'
import type Stripe from 'stripe'
import { stripe } from '@/lib/stripe'
import { ProviderBillingRepo } from '@/lib/providerBilling'

export async function POST(req: NextRequest) {
  if (!stripe) {
    return new Response('stripe not configured', { status: 500 })
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
  if (!webhookSecret) {
    return new Response('missing webhook secret', { status: 500 })
  }

  const signature = req.headers.get('stripe-signature')
  const rawBody = await req.text()

  let event
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature ?? '', webhookSecret)
  } catch (error: any) {
    return new Response(`Webhook Error: ${error.message}`, { status: 400 })
  }

  if (event.type === 'setup_intent.succeeded') {
    const setupIntent = event.data.object as Stripe.SetupIntent
    const customerId = setupIntent.customer as string | undefined
    const paymentMethodId = setupIntent.payment_method as string | undefined

    if (customerId && paymentMethodId) {
      const provider = ProviderBillingRepo.list().find((p) => p.stripeCustomerId === customerId)
      if (provider) {
        try {
          await stripe.customers.update(customerId, {
            invoice_settings: { default_payment_method: paymentMethodId },
          })
          ProviderBillingRepo.linkStripe(provider.id, customerId, paymentMethodId)
        } catch (error) {
          console.error('[Stripe webhook] Unable to set default payment method', error)
        }
      }
    }
  }

  return new Response('ok')
}
