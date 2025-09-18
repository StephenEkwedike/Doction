export type PractitionerParticipant = {
  providerId: string
  phoneE164: string
  displayName: string
  subscribed: boolean
}

export type RelayThread = {
  conversationId: string
  auctionId?: string
  patientUserId: string
  patientDisplayName?: string
  participants: PractitionerParticipant[]
}

const threads = new Map<string, RelayThread>()

const normalisePhone = (phone: string) => phone.trim()

export const ThreadsRepo = {
  get(conversationId: string): RelayThread | null {
    return threads.get(conversationId) ?? null
  },

  upsert(thread: RelayThread): RelayThread {
    const normalizedParticipants = thread.participants.map((participant) => ({
      ...participant,
      phoneE164: normalisePhone(participant.phoneE164),
    }))

    const existing = threads.get(thread.conversationId)
    if (existing) {
      const merged: RelayThread = {
        ...existing,
        ...thread,
        participants: normalizedParticipants,
      }
      threads.set(thread.conversationId, merged)
      return merged
    }

    const initial: RelayThread = {
      ...thread,
      participants: normalizedParticipants,
    }
    threads.set(thread.conversationId, initial)
    return initial
  },

  addParticipant(conversationId: string, participant: PractitionerParticipant): RelayThread | null {
    const thread = threads.get(conversationId)
    if (!thread) return null

    const normalizedPhone = normalisePhone(participant.phoneE164)
    const nextParticipant: PractitionerParticipant = {
      ...participant,
      phoneE164: normalizedPhone,
    }

    const index = thread.participants.findIndex((p) => p.providerId === participant.providerId)
    if (index >= 0) {
      thread.participants[index] = nextParticipant
    } else {
      thread.participants.push(nextParticipant)
    }

    threads.set(conversationId, thread)
    return thread
  },

  list(): RelayThread[] {
    return Array.from(threads.values())
  },

  findByParticipantPhone(phoneE164: string): RelayThread | null {
    const normalized = normalisePhone(phoneE164)
    for (const thread of threads.values()) {
      const match = thread.participants.find((participant) => normalisePhone(participant.phoneE164) === normalized)
      if (match) return thread
    }
    return null
  },

  setSubscriptionByPhone(phoneE164: string, subscribed: boolean): void {
    const normalized = normalisePhone(phoneE164)
    for (const thread of threads.values()) {
      thread.participants = thread.participants.map((participant) =>
        normalisePhone(participant.phoneE164) === normalized
          ? { ...participant, subscribed }
          : participant
      )
    }
  },
}

export type ThreadsRepository = typeof ThreadsRepo
