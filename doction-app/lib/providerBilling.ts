export type BillingProvider = {
  id: string
  name: string
  email?: string
  stripeCustomerId?: string
  defaultPaymentMethodId?: string
  calendlyOwnerUri?: string
  eventTypeUris?: string[]
}

const providers = new Map<string, BillingProvider>()

export const ProviderBillingRepo = {
  get(providerId: string): BillingProvider | null {
    return providers.get(providerId) ?? null
  },

  upsert(provider: BillingProvider): BillingProvider {
    providers.set(provider.id, provider)
    return provider
  },

  linkStripe(providerId: string, customerId: string, defaultPaymentMethodId?: string): BillingProvider | null {
    const record = providers.get(providerId)
    if (!record) return null
    record.stripeCustomerId = customerId
    if (defaultPaymentMethodId) {
      record.defaultPaymentMethodId = defaultPaymentMethodId
    }
    providers.set(providerId, record)
    return record
  },

  findByEventTypeUri(uri: string): BillingProvider | null {
    for (const provider of providers.values()) {
      if (provider.eventTypeUris?.includes(uri)) return provider
    }
    return null
  },

  findByOwnerUri(ownerUri: string): BillingProvider | null {
    for (const provider of providers.values()) {
      if (provider.calendlyOwnerUri === ownerUri) return provider
    }
    return null
  },

  list(): BillingProvider[] {
    return Array.from(providers.values())
  },
}

// Seed example for development/testing only
if (process.env.NODE_ENV !== 'production') {
  ProviderBillingRepo.upsert({
    id: 'prov_demo_123',
    name: 'Demo Provider',
    email: 'provider@example.com',
    calendlyOwnerUri: 'https://api.calendly.com/users/DEMO_USER',
    eventTypeUris: ['https://api.calendly.com/event_types/DEMO_TYPE'],
  })
}
