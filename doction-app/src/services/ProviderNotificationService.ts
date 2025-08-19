import { User } from '@/src/types'
import { logger } from '@/src/lib/logger/Logger'

export interface PatientRequest {
  id: string
  patientName: string
  patientId: string
  patientAvatar?: string
  specialty: string
  urgency: 'low' | 'medium' | 'high'
  description: string
  location?: string
  budgetRange?: { min: number; max: number }
  preferredDate?: Date
  createdAt: Date
  status: 'pending' | 'accepted' | 'declined' | 'expired'
  metadata: {
    hasInsurance?: boolean
    previousTreatments?: string[]
    additionalNotes?: string
    extractedText?: string
  }
}

export interface NotificationResult {
  success: boolean
  notifiedProviders: User[]
  errors: Array<{ providerId: string; error: string }>
  requestId: string
}

export class ProviderNotificationService {
  private static instance: ProviderNotificationService
  private notificationQueue: PatientRequest[] = []
  
  static getInstance(): ProviderNotificationService {
    if (!ProviderNotificationService.instance) {
      ProviderNotificationService.instance = new ProviderNotificationService()
    }
    return ProviderNotificationService.instance
  }

  /**
   * Create a patient request and notify matching providers
   */
  async createProviderRequest(
    patientName: string,
    patientId: string, 
    message: string,
    matchedProviders: User[],
    metadata: {
      specialty?: string
      location?: string
      urgency?: 'low' | 'medium' | 'high'
      priceRange?: { min: number; max: number }
      extractedText?: string
      additionalNotes?: string
    }
  ): Promise<NotificationResult> {
    const requestId = this.generateRequestId()
    
    const patientRequest: PatientRequest = {
      id: requestId,
      patientName,
      patientId,
      specialty: metadata.specialty || 'General Dentistry',
      urgency: metadata.urgency || 'medium',
      description: message,
      location: metadata.location,
      budgetRange: metadata.priceRange,
      preferredDate: this.extractPreferredDate(message),
      createdAt: new Date(),
      status: 'pending',
      metadata: {
        hasInsurance: this.detectInsurance(message),
        additionalNotes: metadata.additionalNotes,
        extractedText: metadata.extractedText
      }
    }

    // Add to notification queue
    this.notificationQueue.push(patientRequest)

    // Notify providers
    const result = await this.notifyProviders(patientRequest, matchedProviders)
    
    return result
  }

  /**
   * Notify matched providers about a new patient request
   */
  private async notifyProviders(request: PatientRequest, providers: User[]): Promise<NotificationResult> {
    const notifiedProviders: User[] = []
    const errors: Array<{ providerId: string; error: string }> = []

    for (const provider of providers) {
      try {
        await this.sendProviderNotification(provider, request)
        notifiedProviders.push(provider)
      } catch (error) {
        console.error(`Failed to notify provider ${provider.id}:`, error)
        errors.push({
          providerId: provider.id,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }

    // Store the request in the provider's request queue
    await this.storeProviderRequest(request)

    return {
      success: errors.length === 0,
      notifiedProviders,
      errors,
      requestId: request.id
    }
  }

  /**
   * Send notification to individual provider
   */
  private async sendProviderNotification(provider: User, request: PatientRequest): Promise<void> {
    logger.info('providers', `Sending notification to provider ${provider.name}`, {
      providerId: provider.id,
      specialty: provider.providerProfile?.specialty,
      patientRequest: {
        id: request.id,
        urgency: request.urgency,
        specialty: request.specialty,
        location: request.location
      }
    }, { requestId: request.id })

    // In production, this would send real notifications via:
    // - Email notifications
    // - SMS notifications  
    // - Push notifications
    // - WebSocket real-time notifications

    console.log(`🔔 Notifying ${provider.name} (${provider.providerProfile?.specialty}) about request:`)
    console.log(`   Patient: ${request.patientName}`)
    console.log(`   Urgency: ${request.urgency}`)
    console.log(`   Location: ${request.location || 'Not specified'}`)
    console.log(`   Description: ${request.description.substring(0, 100)}...`)
    
    // Simulate notification delay
    await new Promise(resolve => setTimeout(resolve, 100))

    logger.debug('providers', `Notification sent to ${provider.name}`, {
      providerId: provider.id,
      notificationMethod: 'console-demo'
    }, { requestId: request.id })

    // TODO: Replace with real notification service
    // await this.emailService.sendProviderNotification(provider.email, request)
    // await this.pushNotificationService.notify(provider.deviceTokens, request)
    // await this.websocketService.notifyProvider(provider.id, request)
  }

  /**
   * Store request in provider's queue for dashboard display
   */
  private async storeProviderRequest(request: PatientRequest): Promise<void> {
    // In production, store in database
    // For now, we'll use the existing MOCK_REQUESTS structure in ProviderRequests.tsx
    
    console.log(`📋 Storing request ${request.id} in provider queues`)
    
    // TODO: Store in database
    // await this.db.providerRequests.create(request)
  }

  /**
   * Handle provider response to a request
   */
  async handleProviderResponse(
    requestId: string, 
    providerId: string, 
    action: 'accept' | 'decline',
    message?: string
  ): Promise<void> {
    console.log(`Provider ${providerId} ${action}ed request ${requestId}`)
    
    if (action === 'accept') {
      // Create conversation between patient and provider
      await this.createConversation(requestId, providerId)
      
      // Notify patient of acceptance
      await this.notifyPatientOfAcceptance(requestId, providerId)
      
      // Notify other providers that request is no longer available
      await this.notifyOtherProvidersRequestTaken(requestId, providerId)
    } else {
      // Just log the decline
      console.log(`Request ${requestId} declined by provider ${providerId}`)
    }
  }

  /**
   * Create conversation when provider accepts
   */
  private async createConversation(requestId: string, providerId: string): Promise<void> {
    console.log(`💬 Creating conversation for request ${requestId} with provider ${providerId}`)
    
    // TODO: Create conversation in database and messaging system
    // await this.conversationService.create(requestId, providerId)
  }

  /**
   * Notify patient when provider accepts their request
   */
  private async notifyPatientOfAcceptance(requestId: string, providerId: string): Promise<void> {
    console.log(`✅ Notifying patient about acceptance from provider ${providerId}`)
    
    // TODO: Send patient notification
    // await this.notificationService.notifyPatient(requestId, 'provider_accepted', providerId)
  }

  /**
   * Notify other providers that request is no longer available
   */
  private async notifyOtherProvidersRequestTaken(requestId: string, acceptedProviderId: string): Promise<void> {
    console.log(`📢 Notifying other providers that request ${requestId} was accepted`)
    
    // TODO: Notify other providers
    // await this.notificationService.notifyProvidersRequestTaken(requestId, acceptedProviderId)
  }

  /**
   * Get pending requests for a provider
   */
  async getProviderRequests(providerId: string, specialty: string): Promise<PatientRequest[]> {
    // Filter requests by provider specialty
    return this.notificationQueue.filter(request => 
      request.specialty.toLowerCase() === specialty.toLowerCase() && 
      request.status === 'pending'
    )
  }

  /**
   * Utility functions
   */
  private generateRequestId(): string {
    return `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }

  private extractPreferredDate(message: string): Date | undefined {
    // Simple date extraction - in production would use more sophisticated NLP
    const datePatterns = [
      /next week/i,
      /this week/i,
      /tomorrow/i,
      /today/i,
      /(\d{1,2}\/\d{1,2}\/\d{2,4})/,
      /(january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d{1,2})/i
    ]

    for (const pattern of datePatterns) {
      if (pattern.test(message)) {
        // For demo, return date in near future
        const futureDate = new Date()
        futureDate.setDate(futureDate.getDate() + 7) // Add 1 week
        return futureDate
      }
    }

    return undefined
  }

  private detectInsurance(message: string): boolean {
    const insuranceKeywords = ['insurance', 'covered', 'copay', 'deductible', 'ppo', 'hmo', 'delta dental', 'aetna', 'cigna']
    const messageLower = message.toLowerCase()
    return insuranceKeywords.some(keyword => messageLower.includes(keyword))
  }

  /**
   * Get notification statistics
   */
  getStats() {
    return {
      totalRequests: this.notificationQueue.length,
      pendingRequests: this.notificationQueue.filter(r => r.status === 'pending').length,
      acceptedRequests: this.notificationQueue.filter(r => r.status === 'accepted').length,
      declinedRequests: this.notificationQueue.filter(r => r.status === 'declined').length,
    }
  }

  /**
   * Clear old expired requests
   */
  cleanupExpiredRequests(): void {
    const expiredCutoff = new Date()
    expiredCutoff.setDate(expiredCutoff.getDate() - 7) // 7 days ago

    this.notificationQueue = this.notificationQueue.filter(request => {
      if (request.createdAt < expiredCutoff && request.status === 'pending') {
        request.status = 'expired'
        return false
      }
      return true
    })
  }
}