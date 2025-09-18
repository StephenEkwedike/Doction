import { authMiddleware } from '@clerk/nextjs'

export default authMiddleware({
  publicRoutes: [
    '/',
    '/sign-in(.*)',
    '/sign-up(.*)',
    '/api/intercom/webhook',
    '/api/twilio/inbound',
    '/api/calendly/webhook',
    '/api/stripe/webhook',
    '/api/medical-search(.*)',
    '/api/chat-llm(.*)',
  ],
})

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
