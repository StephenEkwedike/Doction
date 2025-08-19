'use client'

import { Card, CardContent } from '@/components/ui/card'
import { ChatComposer } from '@/components/chat_composer'
import { ExampleCards } from '@/components/example-cards'
import { PurpleOrb } from '@/components/purple-orb'
import { IntakeHints } from '@/components/intake-hints'
import { OfferNotifications } from '@/components/offer-notifications'
import { AuthGate } from '@/components/auth-modal'
import { useCaseStore } from '@/hooks/use-case'
import { cn } from '@/lib/utils'

export function ChatView({
  greeting = 'Good Afternoon',
  userName = 'Jason',
  messages,
  pending,
  onSend,
  onExampleClick,
  showHero,
  resetKey = 0,
}: {
  greeting?: string
  userName?: string
  messages: { id: string; role: 'user' | 'assistant'; content: string }[]
  pending: boolean
  onSend: (text: string) => Promise<void> | void
  onExampleClick: (text: string) => void | Promise<void>
  showHero: boolean
  resetKey?: number
}) {
  const { profile, offers, isAuthed, saveAuth } = useCaseStore()
  const requireAuth = !isAuthed && offers.length > 0

  return (
    <div className="flex flex-col items-stretch">
      {/* Hero header area */}
      {showHero && (
        <div className="mt-6 md:mt-10 text-center">
          <PurpleOrb />
          <h1 className="text-3xl md:text-4xl font-semibold tracking-tight">
            {greeting},{' '}
            <span className="text-gray-900">{userName}</span>
          </h1>
          <p className="mt-1 text-3xl md:text-4xl text-gray-500">
            {'What’s on '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-500 to-blue-600">
              {'your mind?'}
            </span>
          </p>
          <IntakeHints onPick={(p) => onExampleClick(p)} />
        </div>
      )}

      {/* Messages */}
      <div className={cn('mt-6', messages.length === 0 && 'hidden')}>
        {messages.map((m, i) => (
          <Card key={m.id} className={cn(
            'border-gray-200 mb-4',
            m.role === 'user' ? 'bg-white ml-12' : 'bg-gray-50 mr-12'
          )}>
            <CardContent className="p-4">
              <div className="text-sm font-medium text-gray-500 mb-1">
                {m.role === 'user' ? 'You' : 'Doction AI'}
              </div>
              <div className="text-gray-900 whitespace-pre-wrap">{m.content}</div>
            </CardContent>
          </Card>
        ))}
        {pending && (
          <Card className="border-gray-200 bg-gray-50 mr-12">
            <CardContent className="p-4">
              <div className="text-sm font-medium text-gray-500 mb-1">
                Doction AI
              </div>
              <div className="text-gray-900">Thinking…</div>
            </CardContent>
          </Card>
        )}
        
        {/* Show offers in message flow after they are generated */}
        {offers.length > 0 && (
          <Card className="border-gray-200 bg-sky-50 mr-12 mb-4">
            <CardContent className="p-4">
              <div className="text-sm font-medium text-sky-600 mb-3">
                Doction AI - Offers Found
              </div>
              <div className="text-gray-900 mb-3">
                Great! I found {offers.length} dental provider{offers.length > 1 ? 's' : ''} who can help with your case. Here are your options:
              </div>
              <OfferNotifications
                offers={offers}
                requireAuth={requireAuth}
                onRequireAuth={() => {
                  const el = document.getElementById('auth-gate-open')
                  el?.click()
                }}
              />
            </CardContent>
          </Card>
        )}
      </div>

      {/* Profile preview - Hidden */}
      {false && profile && (
        <div className="mt-6">
          <Card>
            <CardContent className="p-4">
              <div className="text-sm font-medium text-gray-500 mb-1">
                Your anonymized profile (preview)
              </div>
              <div className="text-sm text-gray-900">
                {profile.procedure ? `Procedure: ${profile.procedure}. ` : ''}
                {profile.hasQuote ? 'Has a quote. ' : 'No quote yet. '}
                {profile.quotedPriceUSD
                  ? `Quoted ~ $${profile.quotedPriceUSD}. `
                  : ''}
                {profile.location ? `Location: ${profile.location}. ` : ''}
                {profile.travelOk ? 'Open to travel.' : 'Prefers local offers.'}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Examples */}
      {showHero && (
        <div className="mt-10">
          <p className="text-sm font-medium text-gray-500 mb-3">
            GET STARTED WITH AN EXAMPLE BELOW
          </p>
          <ExampleCards onClick={onExampleClick} />
        </div>
      )}

      {/* Composer */}
      <div className="fixed left-0 md:left-16 right-0 bottom-0 md:static md:mt-8">
        <div className="mx-auto w-full max-w-3xl px-4 sm:px-0 pb-4 md:pb-0">
          <ChatComposer
            placeholder="Ask about dental care or describe what you need..."
            onSend={onSend}
            disabled={pending}
            resetKey={resetKey}
          />
        </div>
      </div>

      {/* Auth modal appears when offers exist but user hasn't provided contact */}
      <button id="auth-gate-open" className="hidden" />
      <AuthGate
        open={requireAuth}
        onOpenChange={() => {}}
        onConfirm={(email, phone) => {
          saveAuth(email, phone)
          // optionally notify backend
          fetch('/api/notify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, phone, type: 'signup' }),
          })
        }}
      />
    </div>
  )
}
