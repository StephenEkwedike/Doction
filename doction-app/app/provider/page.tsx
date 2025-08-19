'use client'

import { useEffect, useMemo, useState } from 'react'
import { PROVIDERS } from '@/lib/providers'
import { useConversations } from '@/hooks/use-conversations'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useRouter } from 'next/navigation'

export default function ProviderDashboard() {
  const router = useRouter()
  const { list, setCurrentProvider, getCurrentProvider } = useConversations()
  const [current, setCurrent] = useState(getCurrentProvider())

  const convs = list().filter((c) => (current ? c.providerId === current : true))

  useEffect(() => {
    setCurrentProvider(current)
  }, [current, setCurrentProvider])

  const providerOptions = useMemo(
    () => PROVIDERS.map((p) => ({ value: p.id, label: `${p.name} · ${p.city}, ${p.state}` })),
    []
  )

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-semibold">Provider Dashboard</h1>
        <select
          className="border rounded-md px-3 py-2 text-sm"
          value={current}
          onChange={(e) => setCurrent(e.target.value)}
        >
          <option value="">All Providers</option>
          {providerOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {convs.length === 0 ? (
        <div className="text-gray-500">No conversations yet.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {convs.map((c) => (
            <button
              key={c.id}
              onClick={() => router.push(`/provider/room/${c.id}`)}
              className="text-left"
            >
              <Card className="hover:bg-gray-50 transition-colors">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-base font-medium text-gray-900">Patient Thread</div>
                      <div className="text-sm text-gray-500">
                        {c.specialty} · {c.city}, {c.state}
                      </div>
                    </div>
                    <div className="text-right">
                      {c.unreadProvider > 0 && (
                        <Badge className="bg-sky-600 hover:bg-sky-700">{c.unreadProvider}</Badge>
                      )}
                      <div className="text-xs text-gray-400 mt-1">
                        {new Date(c.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </div>
                  {c.lastMessage && <p className="text-sm text-gray-700 mt-2 line-clamp-2">{c.lastMessage}</p>}
                </CardContent>
              </Card>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
