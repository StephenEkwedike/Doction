'use client'

import { SignIn } from '@clerk/nextjs'
import { useSearchParams } from 'next/navigation'

export default function Page() {
  const params = useSearchParams()
  const redirect = params.get('redirect') || '/'

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <SignIn routing="path" path="/sign-in" redirectUrl={redirect} />
    </div>
  )
}
