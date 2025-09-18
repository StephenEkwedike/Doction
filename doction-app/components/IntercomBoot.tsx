'use client'

import { useEffect, useRef } from 'react'
import { SignedIn, useUser } from '@clerk/nextjs'
import { IntercomProvider, useIntercom } from 'react-use-intercom'

function Booter() {
  const { user } = useUser()
  const { boot, shutdown, update } = useIntercom()
  const booted = useRef(false)

  useEffect(() => {
    const run = async () => {
      if (!user || booted.current) return
      try {
        const response = await fetch('/api/intercom/jwt', { method: 'POST' })
        if (!response.ok) throw new Error('Failed to fetch Intercom JWT')
        const data = (await response.json()) as { jwt?: string }
        if (!data.jwt) throw new Error('Missing Intercom JWT in response')

        boot({
          app_id: process.env.NEXT_PUBLIC_INTERCOM_APP_ID!,
          user_id: user.id,
          email: user.primaryEmailAddress?.emailAddress ?? undefined,
          name: [user.firstName, user.lastName].filter(Boolean).join(' ') || undefined,
          verification: { secret: data.jwt },
          hide_default_launcher: false,
        })

        update({
          plan: (user.publicMetadata as Record<string, unknown>)?.plan ?? 'free',
        })

        booted.current = true
      } catch (error) {
        console.warn('[Intercom] boot failed', error)
      }
    }

    run()

    return () => {
      if (booted.current) {
        shutdown()
        booted.current = false
      }
    }
  }, [user, boot, shutdown, update])

  return null
}

export default function IntercomBoot() {
  const appId = process.env.NEXT_PUBLIC_INTERCOM_APP_ID
  if (!appId) return null

  return (
    <SignedIn>
      <IntercomProvider appId={appId} autoBoot={false}>
        <Booter />
      </IntercomProvider>
    </SignedIn>
  )
}
