import type { Metadata } from 'next'
import { ThemeProvider } from '@/components/theme-provider'
import { AuthProvider } from '@/src/components/layout/AuthProvider'
import { Sidebar } from '@/components/sidebar'
import { TopNav } from '@/components/top-nav'
import '@/app/globals.css'

// Initialize logging system
if (typeof window === 'undefined') { // Server-side only
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
    <html lang="en">
      <body>
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
  )
}
