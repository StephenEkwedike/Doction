'use client'

import { useState } from 'react'
import { loadStripe } from '@stripe/stripe-js'
import {
  Elements,
  CardElement,
  useElements,
  useStripe,
} from '@stripe/react-stripe-js'

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '')

function CardForm({ providerId }: { providerId: string }) {
  const stripe = useStripe()
  const elements = useElements()
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!stripe || !elements) return
    setLoading(true)
    setMessage(null)

    try {
      const response = await fetch('/api/billing/create-setup-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ providerId }),
      })

      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}))
        throw new Error(errorBody.error || 'Unable to create setup intent')
      }

      const { clientSecret } = (await response.json()) as { clientSecret: string }

      const result = await stripe.confirmCardSetup(clientSecret, {
        payment_method: {
          card: elements.getElement(CardElement)!,
        },
      })

      if (result.error) {
        throw result.error
      }

      setMessage('Card saved for appointment fees.')
    } catch (error: any) {
      setMessage(error?.message || 'Unable to save card.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <CardElement options={{ hidePostalCode: true }} />
      <button
        type="submit"
        disabled={!stripe || loading}
        className="px-3 py-2 rounded bg-sky-600 text-white hover:bg-sky-700 disabled:opacity-60"
      >
        {loading ? 'Saving…' : 'Save card'}
      </button>
      {message && <p className="text-sm text-gray-600">{message}</p>}
    </form>
  )
}

export default function ProviderCardSetup({ providerId }: { providerId: string }) {
  if (!process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY) {
    console.warn('NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY not set; ProviderCardSetup will not render.')
    return null
  }

  return (
    <Elements stripe={stripePromise}>
      <CardForm providerId={providerId} />
    </Elements>
  )
}
