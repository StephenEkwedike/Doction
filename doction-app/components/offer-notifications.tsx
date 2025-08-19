'use client'

import { Bell, MapPin, DollarSign } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'
import type { Offer } from '@/hooks/use-case'
import { useConversations } from '@/hooks/use-conversations'

export function OfferNotifications({
  offers,
  requireAuth,
  onRequireAuth,
}: {
  offers: Offer[]
  requireAuth: boolean
  onRequireAuth: () => void
}) {
  const router = useRouter()
  const { ensureFromOffer } = useConversations()
  const count = offers.length

  if (count === 0) return null

  const open = (offer: Offer) => {
    ensureFromOffer(offer)
    router.push(`/room/${offer.id}`)
  }

  return (
    <div className="mt-6">
      <div className="flex items-center gap-2 text-sky-700 bg-sky-50 border border-sky-200 rounded-xl px-3 py-2">
        <Bell className="h-4 w-4" />
        <span className="text-sm font-medium">
          You have {count} new offers from providers
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
        {offers.map((o) => (
          <Card key={o.id} className="border-gray-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-base font-medium text-gray-900">
                    {o.providerName}
                  </div>
                  <div className="text-sm text-gray-500">{o.specialty}</div>
                </div>
                <div className="text-right">
                  <div className="flex items-center justify-end gap-1 text-gray-900">
                    <DollarSign className="h-4 w-4" />
                    <span className="text-lg font-semibold">
                      {o.priceUSD.toLocaleString('en-US', {
                        style: 'currency',
                        currency: 'USD',
                        maximumFractionDigits: 0,
                      })}
                    </span>
                  </div>
                  <div className="mt-1 flex items-center justify-end gap-1 text-gray-500 text-sm">
                    <MapPin className="h-4 w-4" />
                    {o.city}, {o.state}
                  </div>
                </div>
              </div>
              {o.notes && <p className="text-sm text-gray-700 mt-2">{o.notes}</p>}
              <div className="flex gap-2 mt-3">
                <Button
                  className="bg-gray-900 hover:bg-gray-800 text-white"
                  onClick={() => (requireAuth ? onRequireAuth() : open(o))}
                >
                  Accept offer
                </Button>
                <Button
                  variant="outline"
                  onClick={() => (requireAuth ? onRequireAuth() : open(o))}
                >
                  Request a consult
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
