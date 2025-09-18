import { NextRequest, NextResponse } from 'next/server'
import { openai } from '@ai-sdk/openai'
import { generateText } from 'ai'
import { logger } from '@/src/lib/logger/Logger'

export const maxDuration = 30

export async function POST(req: NextRequest) {
  try {
    const { messages } = await req.json()

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({
        content: "I'm here to help you find dental and orthodontic specialists! However, my AI capabilities are limited without proper OpenAI configuration. I can still help match you with providers based on your needs."
      })
    }

    logger.info('chat-llm', 'Processing LLM request', { messageCount: messages.length })

    const result = await generateText({
      model: openai('gpt-4o'),
      messages,
      temperature: 0.7,
      maxTokens: 500,
    })

    logger.info('chat-llm', 'LLM response generated successfully')

    return NextResponse.json({
      content: result.text
    })

  } catch (error) {
    logger.error('chat-llm', 'LLM request failed', error)
    
    return NextResponse.json({
      content: "I apologize, but I'm having trouble processing your request right now. Let me help you find dental specialists based on what you're looking for!"
    })
  }
}