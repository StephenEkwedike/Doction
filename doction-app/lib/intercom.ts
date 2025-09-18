const INTERCOM_BASE_URL = 'https://api.intercom.io'

const requireEnv = (key: string): string => {
  const value = process.env[key]
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`)
  }
  return value
}

async function intercomRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = requireEnv('INTERCOM_PAT')

  const response = await fetch(`${INTERCOM_BASE_URL}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'Intercom-Version': '2.11',
      ...(init.headers ?? {}),
    },
  })

  if (!response.ok) {
    const errorText = await response.text().catch(() => '')
    throw new Error(`Intercom request failed (${response.status}): ${errorText}`)
  }

  return response.json() as Promise<T>
}

export interface IntercomConversation {
  id: string
}

export async function intercomPostAdminReply(conversationId: string, body: string): Promise<unknown> {
  const adminId = requireEnv('INTERCOM_DEFAULT_ADMIN_ID')

  return intercomRequest(`/conversations/${conversationId}/reply`, {
    method: 'POST',
    body: JSON.stringify({
      message_type: 'comment',
      type: 'admin',
      admin_id: adminId,
      body,
    }),
  })
}

export interface CreateConversationPayload {
  from: {
    type: 'contact'
    external_id: string
  }
  body: string
  custom_attributes?: Record<string, unknown>
}

export async function intercomCreateConversation(
  externalUserId: string,
  body: string,
  customAttributes?: Record<string, unknown>,
): Promise<IntercomConversation> {
  const payload: CreateConversationPayload = {
    from: { type: 'contact', external_id: externalUserId },
    body,
    custom_attributes: customAttributes,
  }

  return intercomRequest<IntercomConversation>('/conversations', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function intercomUpdateConversation(
  conversationId: string,
  customAttributes: Record<string, unknown>,
): Promise<unknown> {
  return intercomRequest(`/conversations/${conversationId}`, {
    method: 'PUT',
    body: JSON.stringify({ custom_attributes: customAttributes }),
  })
}
