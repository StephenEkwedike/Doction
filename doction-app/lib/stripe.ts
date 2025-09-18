import Stripe from 'stripe'

const secretKey = process.env.STRIPE_SECRET_KEY

if (!secretKey) {
  console.warn('[Stripe] STRIPE_SECRET_KEY not set. Stripe helpers will throw if used without configuration.')
}

export const stripe = secretKey
  ? new Stripe(secretKey, { apiVersion: '2024-06-20' })
  : (null as unknown as Stripe)
