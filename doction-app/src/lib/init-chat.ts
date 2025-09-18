/**
 * Initialize the ChatProcessingService with LLM and medical web search
 * Import this in your app's root layout or _app.tsx
 */

import initializeChatService from './chat-bootstrap'

// Initialize the chat service on module load
initializeChatService()

console.log('📋 Doction Chat Service initialized')

export { initializeChatService }