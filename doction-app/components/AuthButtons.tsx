'use client'

import { SignedIn, SignedOut, UserButton } from '@clerk/nextjs'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function AuthButtons() {
  const pathname = usePathname()

  const redirect = pathname === '/' ? '' : `?redirect=${encodeURIComponent(pathname)}`

  return (
    <div className="flex items-center gap-3">
      <SignedOut>
        <Link
          href={`/sign-in${redirect}`}
          className="px-3 py-2 rounded bg-sky-600 text-white hover:bg-sky-700 transition-colors"
        >
          Sign in
        </Link>
        <Link
          href={`/sign-up${redirect}`}
          className="px-3 py-2 rounded border border-gray-300 hover:bg-gray-50 transition-colors"
        >
          Create account
        </Link>
      </SignedOut>
      <SignedIn>
        <UserButton afterSignOutUrl="/" />
      </SignedIn>
    </div>
  )
}
