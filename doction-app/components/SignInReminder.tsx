'use client'

import { useEffect, useRef } from 'react'
import { SignedOut } from '@clerk/nextjs'
import { usePathname, useRouter } from 'next/navigation'

const FIVE_MINUTES = 5 * 60 * 1000
const EXCLUDED_PATHS = ['/sign-in', '/sign-up']

export default function SignInReminder() {
  const router = useRouter()
  const pathname = usePathname()
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current)
        timerRef.current = null
      }
    }
  }, [])

  return (
    <SignedOut>
      <ReminderEffect pathname={pathname} router={router} timerRef={timerRef} />
    </SignedOut>
  )
}

function ReminderEffect({
  pathname,
  router,
  timerRef,
}: {
  pathname: string
  router: ReturnType<typeof useRouter>
  timerRef: React.MutableRefObject<ReturnType<typeof setTimeout> | null>
}) {
  useEffect(() => {
    if (EXCLUDED_PATHS.some((p) => pathname.startsWith(p))) {
      if (timerRef.current) {
        clearTimeout(timerRef.current)
        timerRef.current = null
      }
      return
    }

    if (timerRef.current) {
      clearTimeout(timerRef.current)
    }

    timerRef.current = setTimeout(() => {
      const redirectParam = pathname === '/' ? '' : `?redirect=${encodeURIComponent(pathname)}`
      router.push(`/sign-in${redirectParam}`)
    }, FIVE_MINUTES)

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current)
        timerRef.current = null
      }
    }
  }, [pathname, router, timerRef])

  return null
}
