import { NextRequest } from 'next/server'
import { openai } from '@ai-sdk/openai'
import { streamText } from 'ai'
import { ChatProcessingService } from '@/src/services/ChatProcessingService'
import { logger } from '@/src/lib/logger/Logger'
import { withRequestLogging, getRequestContext } from '@/src/lib/logger/middleware'

export const maxDuration = 30

// Enhanced system prompt with conversation flow prediction for Doction
const DOCTION_SYSTEM_PROMPT = `You are an AI assistant for Doction, a healthcare marketplace that connects patients with dental and orthodontic specialists. Your primary role is to understand patient needs and guide them through finding the right providers.

CONVERSATION FLOW PREDICTION:
1. **Initial Engagement** - Welcome patients and understand their dental/orthodontic needs
2. **Information Gathering** - Ask about location, budget, urgency, insurance
3. **File Processing** - Help patients upload quotes, X-rays, or dental records
4. **Provider Matching** - Present matched providers based on their requirements
5. **Consultation Setup** - Guide them to accept offers and schedule consultations

KEY CAPABILITIES:
- Detect when patients mention: orthodontics, braces, Invisalign, oral surgery, wisdom teeth, jaw surgery, dental implants
- Identify location preferences and budget constraints
- Guide file uploads for better matching
- Present provider options with clear next steps
- Handle urgent vs non-urgent cases appropriately

DOCTION SPECIALTIES:
- Orthodontics (braces, Invisalign, teeth straightening)
- Oral Surgery (wisdom teeth, extractions, dental implants)
- Jaw Surgery (TMJ, orthognathic, jaw alignment)
- General Dentistry (cleanings, fillings, root canals)

CONVERSATION STYLE:
- Professional but approachable
- Focus on understanding patient needs
- Provide clear next steps
- Encourage file uploads for better matching
- Ask follow-up questions to refine search

IMPORTANT:
- Files (images/PDFs) are processed client-side for text extraction. Do not state that you cannot view files; assume the user can upload and the system will extract relevant text to proceed with matching.
- When users mention uploads, affirm that their information can be processed and guide toward matching and next steps.

Remember: Your goal is to efficiently guide patients to find and connect with the right dental specialists on the Doction platform.`

async function chatHandler(req: NextRequest) {
  const context = getRequestContext(req)
  const sessionId = req.headers.get('x-session-id') || 'unknown-session'
  
  try {
    const { messages } = await req.json()
    
    logger.chatMessage('system', 'Chat request received', sessionId, context?.userId)
    logger.debug('chat', 'Request payload', { messageCount: messages.length }, { 
      requestId: context?.requestId, 
      sessionId 
    })

    if (!process.env.OPENAI_API_KEY) {
      logger.warn('chat', 'OpenAI API key not configured - using demo stream mode', null, { 
        requestId: context?.requestId, 
        sessionId 
      })

      const encoder = new TextEncoder()
      const stream = new ReadableStream<Uint8Array>({
        start(controller) {
          const chunks = [
            'Demo mode: AI streaming is simulated. ',
            'Add OPENAI_API_KEY to enable real responses. ',
            'You can still upload files or describe needs to see offers.'
          ]
          let i = 0
          const interval = setInterval(() => {
            if (i >= chunks.length) {
              clearInterval(interval)
              controller.close()
              return
            }
            controller.enqueue(encoder.encode(chunks[i++]))
          }, 200)
        }
      })

      return new Response(stream, {
        headers: { 'Content-Type': 'text/plain; charset=utf-8' }
      })
    }

    // Add enhanced system prompt for better conversation flow
    const enhancedMessages = [
      { role: 'system', content: DOCTION_SYSTEM_PROMPT },
      ...messages
    ]

    // Get the latest user message for provider matching analysis
    const latestMessage = messages[messages.length - 1]?.content || ''
    
    logger.chatProcessing('user-message-received', { 
      messageLength: latestMessage.length,
      messagePreview: latestMessage.substring(0, 100) + '...'
    }, sessionId)
    
    // Run provider matching in parallel with OpenAI response
    let providerAnalysis = null
    if (latestMessage) {
      const chatProcessor = ChatProcessingService.getInstance()
      try {
        logger.chatProcessing('provider-matching-start', { message: latestMessage.substring(0, 50) + '...' }, sessionId)
        
        providerAnalysis = await chatProcessor.processMessage(latestMessage, messages)
        
        logger.providerMatch(
          latestMessage, 
          providerAnalysis.metadata?.matchedProviders?.length || 0, 
          sessionId
        )
        
        // Create notifications if providers were matched
        if (providerAnalysis.shouldCreateProviderMatches && providerAnalysis.metadata?.matchedProviders) {
          logger.chatProcessing('creating-provider-notifications', {
            providerCount: providerAnalysis.metadata.matchedProviders.length,
            specialty: providerAnalysis.metadata.specialty,
            location: providerAnalysis.metadata.location
          }, sessionId)
          
          const notificationResult = await chatProcessor.createProviderNotifications(
            'Chat Patient',
            sessionId,
            latestMessage,
            providerAnalysis.metadata.matchedProviders,
            {
              specialty: providerAnalysis.metadata.specialty,
              location: providerAnalysis.metadata.location,
              urgency: providerAnalysis.metadata.urgency,
              priceRange: providerAnalysis.metadata.priceRange
            }
          )

          if (notificationResult?.success) {
            logger.info('providers', `Successfully notified ${notificationResult.notifiedProviders.length} providers`, {
              requestId: notificationResult.requestId,
              specialty: providerAnalysis.metadata.specialty
            }, { sessionId })
          } else {
            logger.error('providers', 'Provider notification failed', notificationResult?.errors, { sessionId })
          }
        }
      } catch (error) {
        logger.error('chat', 'Provider analysis failed', error, { 
          requestId: context?.requestId, 
          sessionId 
        })
      }
    }

    // Enhanced context injection for better responses
    const contextualPrompt = providerAnalysis?.metadata?.isProviderMatch 
      ? `\n\nCONTEXT: The patient's message indicates they're looking for ${providerAnalysis.metadata.specialty} specialists${providerAnalysis.metadata.location ? ` in ${providerAnalysis.metadata.location}` : ''}. I found ${providerAnalysis.metadata.matchedProviders?.length || 0} matching providers. Guide them toward accepting offers or requesting consultations.`
      : '\n\nCONTEXT: No specific provider matches detected. Focus on understanding their needs better or encouraging file uploads for precise matching.'

    // Add context to the latest message
    if (enhancedMessages.length > 1) {
      enhancedMessages[enhancedMessages.length - 1] = {
        role: 'user',
        content: latestMessage + contextualPrompt
      }
    }

    logger.chatProcessing('openai-request-start', {
      messageCount: enhancedMessages.length,
      hasProviderContext: !!providerAnalysis?.metadata?.isProviderMatch
    }, sessionId)

    const result = await streamText({
      model: openai('gpt-4o'),
      messages: enhancedMessages,
      temperature: 0.7,
      maxTokens: 500,
    })

    logger.chatProcessing('openai-response-ready', { streaming: true }, sessionId)

    return result.toTextStreamResponse()

  } catch (error) {
    logger.error('chat', 'Chat API request failed', error, { 
      requestId: context?.requestId, 
      sessionId 
    })
    
    return new Response(
      JSON.stringify({
        id: crypto.randomUUID(),
        role: 'assistant',
        content: 'I apologize, but I encountered an error. Please try again.',
      }),
      { headers: { 'Content-Type': 'application/json' } }
    )
  }
}

export const POST = withRequestLogging(chatHandler)
