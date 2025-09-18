import type { Metadata } from 'next'
import { ClerkProvider } from '@clerk/nextjs'
import { ThemeProvider } from '@/components/theme-provider'
import { AuthProvider } from '@/src/components/layout/AuthProvider'
import { Sidebar } from '@/components/sidebar'
import { TopNav } from '@/components/top-nav'
import IntercomBoot from '@/components/IntercomBoot'
import SignInReminder from '@/components/SignInReminder'
import '@/app/globals.css'

// Initialize logging system
if (typeof window === 'undefined') {
  import('@/src/lib/logger/init').then(({ initializeLogging }) => {
    initializeLogging()
  })
}

export const metadata: Metadata = {
  title: 'Doction',
  description: 'Reverse marketplace for surgeries and dental procedures',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body>
          <IntercomBoot />
          <SignInReminder />
          <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
            <AuthProvider>
              <div className="flex min-h-screen bg-white text-gray-900">
                <Sidebar />
                <div className="flex-1 min-w-0 flex flex-col">
                  <TopNav />
                  <main className="mx-auto w-full max-w-5xl px-4 sm:px-6 lg:px-8 py-6 pb-24">
                    {children}
                  </main>
                </div>
              </div>
            </AuthProvider>
          </ThemeProvider>
        </body>
      </html>
    </ClerkProvider>
  )
}
