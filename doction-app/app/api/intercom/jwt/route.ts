import { auth, currentUser } from '@clerk/nextjs/server'
import jwt from 'jsonwebtoken'

export async function POST() {
  const { userId } = auth()
  if (!userId) {
    return new Response(JSON.stringify({ error: 'unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const user = await currentUser()
  const email = user?.emailAddresses?.[0]?.emailAddress
  const name = [user?.firstName, user?.lastName].filter(Boolean).join(' ') || undefined

  const secret = process.env.INTERCOM_MESSENGER_SECRET
  if (!secret) {
    return new Response(JSON.stringify({ error: 'Intercom secret not configured' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const token = jwt.sign(
    { sub: userId, email, name },
    secret,
    { algorithm: 'HS256', expiresIn: '10m' }
  )

  return Response.json({ jwt: token })
}
