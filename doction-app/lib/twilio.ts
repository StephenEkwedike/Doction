import twilio, { type Twilio } from 'twilio'
import type { CreateMessageOptions } from 'twilio/lib/rest/api/v2010/account/message'

const requireEnv = (key: string): string => {
  const value = process.env[key]
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`)
  }
  return value
}

let cachedClient: Twilio | null = null

function getTwilioClient(): Twilio {
  if (cachedClient) return cachedClient
  const accountSid = requireEnv('TWILIO_ACCOUNT_SID')
  const authToken = requireEnv('TWILIO_AUTH_TOKEN')
  cachedClient = twilio(accountSid, authToken)
  return cachedClient
}

export async function sendSMS(toE164: string, body: string) {
  const client = getTwilioClient()

  const options: CreateMessageOptions = {
    to: toE164,
    body,
  }

  const messagingServiceSid = process.env.TWILIO_MESSAGING_SERVICE_SID
  if (messagingServiceSid) {
    options.messagingServiceSid = messagingServiceSid
  } else {
    options.from = requireEnv('TWILIO_FROM')
  }

  return client.messages.create(options)
}
