/**
 * Bootstrap configuration for ChatProcessingService with LLM and medical-focused web search
 * 
 * Usage: Call this in your app initialization (e.g., in _app.tsx or layout.tsx)
 */

import { ChatProcessingService, ChatProcessingConfig } from '@/src/services/ChatProcessingService'

// Medical-focused domain whitelist for web search
const MEDICAL_DOMAINS = [
  'mayoclinic.org',
  'webmd.com',
  'healthline.com',
  'medicalnewstoday.com',
  'nih.gov',
  'cdc.gov',
  'ada.org', // American Dental Association
  'aao.org', // American Association of Orthodontists
  'aaoms.org', // American Association of Oral and Maxillofacial Surgeons
  'clevelandclinic.org',
  'hopkinsmedicine.org'
]

/**
 * Initialize ChatProcessingService with OpenAI and medical web search
 */
export function initializeChatService() {
  const config: ChatProcessingConfig = {
    // LLM implementation using OpenAI
    llm: async (messages) => {
      try {
        // Check if we have OpenAI configured
        if (!process.env.NEXT_PUBLIC_OPENAI_API_KEY && !process.env.OPENAI_API_KEY) {
          console.warn('OpenAI API key not configured, using demo response')
          return "I'm here to help you find dental and orthodontic specialists! However, my AI capabilities are limited without proper configuration. I can still help match you with providers based on your needs."
        }

        // Call OpenAI API
        const response = await fetch('/api/chat-llm', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ messages })
        })

        if (!response.ok) {
          throw new Error(`OpenAI API error: ${response.status}`)
        }

        const data = await response.json()
        return data.content || data.message || "I'm here to help you find dental specialists!"
        
      } catch (error) {
        console.error('LLM call failed:', error)
        
        // Graceful fallback
        const lastMessage = messages[messages.length - 1]?.content || ""
        
        if (lastMessage.toLowerCase().includes('orthodont') || lastMessage.toLowerCase().includes('braces')) {
          return "I can help you find orthodontists for braces, Invisalign, and teeth straightening treatments. Where are you located?"
        } else if (lastMessage.toLowerCase().includes('wisdom') || lastMessage.toLowerCase().includes('extraction')) {
          return "I can connect you with oral surgeons who specialize in wisdom teeth removal and extractions. What's your location?"
        } else {
          return "I'm here to help you find qualified dental specialists! Please tell me what type of dental care you're looking for and your location."
        }
      }
    },

    // Medical-focused web search
    webSearch: async (query, options = {}) => {
      try {
        const { k = 3 } = options
        
        // Use a medical-focused search API or restrict to medical domains
        const searchResults = await performMedicalSearch(query, k)
        return searchResults
        
      } catch (error) {
        console.error('Web search failed:', error)
        return []
      }
    },

    // Default location (optional)
    defaultLocation: async () => {
      // You could integrate with geolocation API or user preferences
      return { city: 'Austin', state: 'TX' }
    }
  }

  // Configure the service
  ChatProcessingService.getInstance(config)
  console.log('🚀 ChatProcessingService initialized with LLM and medical web search')
}

/**
 * Perform medical-focused web search restricted to reputable medical domains
 */
async function performMedicalSearch(query: string, maxResults: number = 3) {
  try {
    // Option 1: Use a search API like Serper, SerpAPI, or Google Custom Search
    // with domain restriction
    const searchQuery = `${query} site:${MEDICAL_DOMAINS.join(' OR site:')}`
    
    // Example implementation with a hypothetical search API
    const response = await fetch('/api/medical-search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        query: searchQuery, 
        maxResults,
        domains: MEDICAL_DOMAINS 
      })
    })

    if (!response.ok) {
      throw new Error(`Search API error: ${response.status}`)
    }

    const data = await response.json()
    
    return data.results?.map((result: any) => ({
      title: result.title,
      url: result.url,
      snippet: result.snippet || result.description
    })) || []

  } catch (error) {
    console.error('Medical search failed:', error)
    
    // Fallback: Return some curated medical information based on common queries
    return getMockMedicalResults(query)
  }
}

/**
 * Fallback mock medical search results for development/demo
 */
function getMockMedicalResults(query: string) {
  const queryLower = query.toLowerCase()
  
  if (queryLower.includes('orthodont') || queryLower.includes('braces')) {
    return [
      {
        title: "Orthodontic Treatment Options - American Dental Association",
        url: "https://ada.org/orthodontics",
        snippet: "Learn about different orthodontic treatments including traditional braces, Invisalign, and other teeth straightening options from dental professionals."
      },
      {
        title: "What to Expect During Orthodontic Treatment - Mayo Clinic",
        url: "https://mayoclinic.org/orthodontics-treatment",
        snippet: "Comprehensive guide to orthodontic treatment process, timeline, and what patients can expect during their teeth straightening journey."
      }
    ]
  }
  
  if (queryLower.includes('wisdom') || queryLower.includes('extraction')) {
    return [
      {
        title: "Wisdom Teeth Removal - When Is It Necessary?",
        url: "https://mayoclinic.org/wisdom-teeth-removal",
        snippet: "Learn when wisdom teeth removal is necessary, the procedure, recovery time, and potential complications from this common oral surgery."
      },
      {
        title: "Tooth Extraction Recovery and Aftercare",
        url: "https://healthline.com/tooth-extraction-recovery",
        snippet: "Complete guide to tooth extraction recovery, including pain management, eating guidelines, and signs of complications to watch for."
      }
    ]
  }
  
  // Default medical information
  return [
    {
      title: "Dental Health and Oral Care - CDC",
      url: "https://cdc.gov/oral-health",
      snippet: "Comprehensive information about maintaining good oral health, preventing dental diseases, and finding qualified dental care providers."
    }
  ]
}

// Export for use in app initialization
export default initializeChatService