import { ChatMessage } from '@/src/stores/chatStore'
import { getProvidersBySpecialty, getProvidersByLocation, searchProviders, MOCK_PROVIDERS } from '@/src/lib/data/providers'
import { User } from '@/src/types'
import { ProviderNotificationService } from './ProviderNotificationService'
import { logger } from '@/src/lib/logger/Logger'

export interface ProcessedChatResult {
  reply: string
  metadata?: {
    isProviderMatch: boolean
    matchedProviders?: User[]
    specialty?: string
    location?: string
    priceRange?: { min: number; max: number }
    urgency?: 'low' | 'medium' | 'high'
    intent: 'consultation' | 'information' | 'pricing' | 'scheduling' | 'general'
  }
  shouldCreateProviderMatches?: boolean
  suggestedActions?: string[]
}

export class ChatProcessingService {
  private static instance: ChatProcessingService
  private notificationService: ProviderNotificationService
  
  static getInstance(): ChatProcessingService {
    if (!ChatProcessingService.instance) {
      ChatProcessingService.instance = new ChatProcessingService()
    }
    return ChatProcessingService.instance
  }

  constructor() {
    this.notificationService = ProviderNotificationService.getInstance()
  }

  private detectSpecialty(message: string): string | null {
    const specialtyKeywords = {
      'orthodontics': ['orthodontist', 'orthodontics', 'braces', 'invisalign', 'teeth straightening', 'crooked teeth', 'overbite', 'underbite'],
      'oral surgery': ['oral surgeon', 'oral surgery', 'wisdom teeth', 'tooth extraction', 'dental implants', 'jaw pain'],
      'jaw surgery': ['jaw surgeon', 'jaw surgery', 'orthognathic', 'jaw alignment', 'tmj', 'jaw reconstruction'],
      'general dentistry': ['dentist', 'dental', 'cavity', 'cleaning', 'checkup', 'tooth pain', 'root canal']
    }

    const messageLower = message.toLowerCase()
    
    for (const [specialty, keywords] of Object.entries(specialtyKeywords)) {
      if (keywords.some(keyword => messageLower.includes(keyword))) {
        return specialty
      }
    }
    
    return null
  }

  private detectLocation(message: string): { city?: string; state?: string } {
    const locationPatterns = [
      /(?:in|near|around|at)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*),?\s*([A-Z]{2})/gi,
      /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*),\s*([A-Z]{2})/g,
      /(Austin|Dallas|Houston|San Antonio|Los Angeles|San Francisco|San Jose|Sacramento)/gi
    ]

    let city: string | undefined
    let state: string | undefined

    for (const pattern of locationPatterns) {
      const matches = [...message.matchAll(pattern)]
      if (matches.length > 0) {
        const match = matches[0]
        if (match.length >= 3) {
          city = match[1]?.trim()
          state = match[2]?.trim()
        } else if (match.length >= 2) {
          city = match[1]?.trim()
        }
        break
      }
    }

    return { city, state }
  }

  private detectPriceRange(message: string): { min: number; max: number } | null {
    const pricePatterns = [
      /\$?(\d{1,2},?\d{3})\s*(?:to|-)\s*\$?(\d{1,2},?\d{3})/gi,
      /budget\s*(?:is|of)?\s*\$?(\d{1,2},?\d{3})/gi,
      /under\s*\$?(\d{1,2},?\d{3})/gi,
      /less\s*than\s*\$?(\d{1,2},?\d{3})/gi,
      /around\s*\$?(\d{1,2},?\d{3})/gi
    ]

    for (const pattern of pricePatterns) {
      const matches = [...message.matchAll(pattern)]
      if (matches.length > 0) {
        const match = matches[0]
        if (match.length >= 3) {
          const min = parseInt(match[1].replace(/,/g, ''))
          const max = parseInt(match[2].replace(/,/g, ''))
          return { min, max }
        } else if (match.length >= 2) {
          const price = parseInt(match[1].replace(/,/g, ''))
          if (message.toLowerCase().includes('under') || message.toLowerCase().includes('less than')) {
            return { min: 0, max: price }
          } else if (message.toLowerCase().includes('around')) {
            return { min: price * 0.8, max: price * 1.2 }
          } else {
            return { min: 0, max: price }
          }
        }
      }
    }

    return null
  }

  private detectUrgency(message: string): 'low' | 'medium' | 'high' {
    const urgentKeywords = ['urgent', 'emergency', 'asap', 'immediately', 'right away', 'today']
    const moderateKeywords = ['soon', 'this week', 'next week', 'within a month']
    
    const messageLower = message.toLowerCase()
    
    if (urgentKeywords.some(keyword => messageLower.includes(keyword))) {
      return 'high'
    } else if (moderateKeywords.some(keyword => messageLower.includes(keyword))) {
      return 'medium'
    }
    
    return 'low'
  }

  private detectIntent(message: string): 'consultation' | 'information' | 'pricing' | 'scheduling' | 'general' {
    const intentKeywords = {
      consultation: ['looking for', 'need', 'want', 'find', 'help me find', 'consultation', 'treatment'],
      pricing: ['cost', 'price', 'expensive', 'affordable', 'budget', 'payment', 'insurance'],
      scheduling: ['appointment', 'schedule', 'book', 'available', 'when can'],
      information: ['what is', 'how does', 'tell me about', 'information', 'explain']
    }

    const messageLower = message.toLowerCase()
    
    for (const [intent, keywords] of Object.entries(intentKeywords)) {
      if (keywords.some(keyword => messageLower.includes(keyword))) {
        return intent as any
      }
    }
    
    return 'general'
  }

  async processMessage(message: string, conversationHistory: ChatMessage[]): Promise<ProcessedChatResult> {
    logger.debug('chat', 'Processing message for provider matching', {
      messageLength: message.length,
      historyLength: conversationHistory.length
    })

    const specialty = this.detectSpecialty(message)
    const location = this.detectLocation(message)
    const priceRange = this.detectPriceRange(message)
    const urgency = this.detectUrgency(message)
    const intent = this.detectIntent(message)

    logger.info('chat', 'Message analysis completed', {
      specialty,
      location,
      priceRange,
      urgency,
      intent
    })

    let matchedProviders: User[] = []
    let reply = ''
    let shouldCreateProviderMatches = false

    // If we detected a specialty, find matching providers
    if (specialty) {
      logger.debug('chat', `Searching providers for specialty: ${specialty}`)
      matchedProviders = getProvidersBySpecialty(specialty)
      
      logger.info('providers', `Found ${matchedProviders.length} providers for ${specialty}`)
      
      // Filter by location if specified
      if (location.city || location.state) {
        const beforeLocationFilter = matchedProviders.length
        matchedProviders = matchedProviders.filter(provider => {
          const profile = provider.providerProfile!
          const cityMatch = !location.city || profile.city.toLowerCase().includes(location.city.toLowerCase())
          const stateMatch = !location.state || profile.state.toLowerCase().includes(location.state.toLowerCase())
          return cityMatch && stateMatch
        })
        logger.info('providers', `Location filter: ${beforeLocationFilter} -> ${matchedProviders.length} providers`, {
          city: location.city,
          state: location.state
        })
      }
      
      // Filter by price range if specified
      if (priceRange) {
        const beforePriceFilter = matchedProviders.length
        matchedProviders = matchedProviders.filter(provider => {
          const price = provider.providerProfile!.basePriceUSD
          return price >= priceRange.min && price <= priceRange.max
        })
        logger.info('providers', `Price filter: ${beforePriceFilter} -> ${matchedProviders.length} providers`, {
          minPrice: priceRange.min,
          maxPrice: priceRange.max
        })
      }

      // Generate appropriate reply based on matches
      if (matchedProviders.length > 0) {
        shouldCreateProviderMatches = true
        reply = this.generateProviderMatchReply(specialty, matchedProviders, location, priceRange, urgency)
        logger.info('chat', `Generated provider match reply for ${matchedProviders.length} providers`)
      } else {
        reply = this.generateNoMatchReply(specialty, location, priceRange)
        logger.warn('chat', 'No providers matched the criteria', {
          specialty,
          location,
          priceRange
        })
      }
    } else {
      // General conversation - use AI or provide helpful guidance
      logger.debug('chat', 'No specialty detected, generating general reply', { intent })
      reply = await this.generateGeneralReply(message, intent)
    }

    const result = {
      reply,
      metadata: {
        isProviderMatch: matchedProviders.length > 0,
        matchedProviders,
        specialty: specialty || undefined,
        location: location.city || location.state ? `${location.city || ''}, ${location.state || ''}`.trim() : undefined,
        priceRange,
        urgency,
        intent
      },
      shouldCreateProviderMatches,
      suggestedActions: this.generateSuggestedActions(intent, specialty, matchedProviders.length > 0)
    }

    logger.info('chat', 'Message processing completed', {
      hasMatches: matchedProviders.length > 0,
      matchCount: matchedProviders.length,
      shouldNotify: shouldCreateProviderMatches
    })

    return result
  }

  private generateProviderMatchReply(
    specialty: string, 
    providers: User[], 
    location: { city?: string; state?: string },
    priceRange: { min: number; max: number } | null,
    urgency: string
  ): string {
    const count = providers.length
    const locationText = location.city || location.state ? ` in ${location.city || ''} ${location.state || ''}`.trim() : ''
    const priceText = priceRange ? ` within your budget of $${priceRange.min.toLocaleString()}-$${priceRange.max.toLocaleString()}` : ''
    
    let reply = `Great! I found ${count} qualified ${specialty} specialist${count > 1 ? 's' : ''}${locationText}${priceText}.\n\n`
    
    // Show top 3 providers with details
    providers.slice(0, 3).forEach((provider, index) => {
      const profile = provider.providerProfile!
      reply += `**${index + 1}. ${provider.name}**\n`
      reply += `• ${profile.specialty} in ${profile.city}, ${profile.state}\n`
      reply += `• Starting at $${profile.basePriceUSD.toLocaleString()}\n`
      reply += `• ${profile.yearsExperience} years experience\n`
      reply += `• Rating: ${profile.rating}/5.0\n`
      reply += `• Response time: ${profile.responseTime}\n`
      if (profile.acceptsInsurance) reply += `• Accepts insurance\n`
      reply += `\n`
    })

    if (count > 3) {
      reply += `*And ${count - 3} more specialists available...*\n\n`
    }

    reply += `I can connect you directly with any of these providers for a consultation. They'll receive your request and respond within their typical timeframes.\n\n`
    
    if (urgency === 'high') {
      reply += `Since this is urgent, I recommend contacting multiple providers to ensure quick availability.`
    } else {
      reply += `Would you like me to send your consultation request to any of these providers?`
    }

    return reply
  }

  private generateNoMatchReply(specialty: string, location: { city?: string; state?: string }, priceRange: any): string {
    const locationText = location.city || location.state ? ` in ${location.city || ''} ${location.state || ''}`.trim() : ''
    
    let reply = `I understand you're looking for ${specialty} specialists${locationText}. `
    
    if (priceRange) {
      reply += `Unfortunately, I don't have any providers in your specified price range of $${priceRange.min.toLocaleString()}-$${priceRange.max.toLocaleString()} at the moment. `
    } else if (location.city || location.state) {
      reply += `I don't have any ${specialty} specialists in that specific area right now. `
    }
    
    reply += `\n\nHere are some options:\n\n`
    reply += `1. **Expand your search area** - I can show you specialists in nearby cities\n`
    reply += `2. **Adjust your budget** - Many providers offer payment plans\n`
    reply += `3. **Join our waitlist** - I'll notify you when new providers join in your area\n\n`
    reply += `Would you like me to help with any of these options?`
    
    return reply
  }

  private async generateGeneralReply(message: string, intent: string): Promise<string> {
    // For now, provide helpful responses based on intent
    // In production, this would call OpenAI or another LLM
    
    const responses: Record<string, string> = {
      information: "I'd be happy to help you learn more about dental and orthodontic procedures. What specific information are you looking for? I can provide details about treatments, recovery times, and help you find qualified specialists.",
      
      pricing: "Dental procedure costs can vary significantly based on your location, the complexity of treatment, and the provider's experience. I can help you find providers in your budget range and those who offer payment plans or accept insurance. What type of procedure are you considering?",
      
      scheduling: "I can help you connect with providers who have availability for consultations. Most of our specialists offer flexible scheduling options. What type of appointment are you looking to schedule?",
      
      general: "Hello! I'm here to help you find qualified dental and orthodontic specialists. You can tell me about what you're looking for - like 'I need an orthodontist in Austin' or 'Looking for affordable wisdom tooth removal' - and I'll match you with the right providers. How can I help you today?"
    }
    
    return responses[intent] || responses.general
  }

  private generateSuggestedActions(intent: string, specialty: string | null, hasMatches: boolean): string[] {
    const actions: string[] = []
    
    if (hasMatches) {
      actions.push("Send consultation request to selected providers")
      actions.push("Compare provider profiles and pricing")
      actions.push("Schedule a consultation call")
    } else if (specialty) {
      actions.push("Expand search to nearby areas")
      actions.push("Adjust budget or requirements")
      actions.push("Join waitlist for this specialty")
    } else {
      actions.push("Tell me what type of dental care you need")
      actions.push("Specify your location for local providers")
      actions.push("Upload existing quotes for comparison")
    }
    
    return actions
  }

  /**
   * Create provider notifications for matched providers
   */
  async createProviderNotifications(
    patientName: string,
    patientId: string,
    originalMessage: string,
    matchedProviders: User[],
    metadata: {
      specialty?: string
      location?: string
      urgency?: 'low' | 'medium' | 'high'
      priceRange?: { min: number; max: number }
    }
  ) {
    if (matchedProviders.length === 0) return null

    try {
      const result = await this.notificationService.createProviderRequest(
        patientName,
        patientId,
        originalMessage,
        matchedProviders,
        {
          specialty: metadata.specialty,
          location: metadata.location,
          urgency: metadata.urgency,
          priceRange: metadata.priceRange,
          additionalNotes: `Auto-generated from chat: "${originalMessage.substring(0, 200)}..."`
        }
      )

      console.log(`🚀 Created provider notifications:`, {
        requestId: result.requestId,
        notifiedProviders: result.notifiedProviders.length,
        errors: result.errors.length
      })

      return result
    } catch (error) {
      console.error('Failed to create provider notifications:', error)
      return null
    }
  }
}