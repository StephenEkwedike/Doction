'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import type { Offer } from '@/hooks/use-case'
import { useConversations } from '@/hooks/use-conversations'

type Msg = { id: string; role: 'user' | 'provider'; content: string }
const THREAD_KEY = (id: string) => `doction_room_${id}`

function useThread(id: string) {
  const [messages, setMessages] = useState<Msg[]>([])
  useEffect(() => {
    try {
      const t = localStorage.getItem(THREAD_KEY(id))
      if (t) setMessages(JSON.parse(t))
    } catch {}
  }, [id])
  useEffect(() => {
    localStorage.setItem(THREAD_KEY(id), JSON.stringify(messages))
  }, [id, messages])
  const send = (role: Msg['role'], content: string) => {
    setMessages((m) => [...m, { id: crypto.randomUUID(), role, content }])
  }
  return { messages, send }
}

export default function ProviderRoomPage() {
  const params = useParams()
  const id = String(params?.id || '')
  const [offers, setOffers] = useState<Offer[]>([])
  const [value, setValue] = useState('')
  const { markReadProvider, appendMessage } = useConversations()

  useEffect(() => {
    try {
      const o = localStorage.getItem('doction_offers')
      if (o) setOffers(JSON.parse(o))
    } catch {}
  }, [])
  const offer = useMemo(() => offers.find((o) => o.id === id), [offers, id])

  useEffect(() => {
    if (offer) markReadProvider(offer.id)
  }, [offer, markReadProvider])

  const { messages, send } = useThread(id)

  const submit = () => {
    if (!value.trim()) return
    send('provider', value.trim())
    appendMessage(id, 'provider', value.trim())
    setValue('')
  }

  return (
    <div>
      {offer && (
        <Card className="mb-4">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-lg font-semibold">{offer.providerName}</div>
                <div className="text-sm text-gray-500">{offer.specialty}</div>
              </div>
              <div className="text-right">
                <div className="text-xl font-bold">
                  {offer.priceUSD.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })}
                </div>
                <div className="text-sm text-gray-500">
                  {offer.city}, {offer.state}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="space-y-3 mb-24">
        {messages.map((m) => (
          <Card key={m.id} className={m.role === 'provider' ? 'bg-white' : 'bg-gray-50'}>
            <CardContent className="p-4">
              <div className="text-xs text-gray-500 mb-1">{m.role === 'provider' ? 'You' : 'Patient'}</div>
              <div className="whitespace-pre-wrap">{m.content}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="fixed left-0 right-0 bottom-0 border-t border-gray-200 bg-white">
        <div className="mx-auto max-w-3xl px-4 py-3">
          <div className="flex gap-2">
            <Input
              className="flex-1"
              placeholder="Write a message to the patient..."
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && submit()}
            />
            <Button className="bg-sky-600 hover:bg-sky-700 text-white" onClick={submit}>
              Send
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
