# Enhanced Chat Implementation with LLM and Medical Search

This implementation provides a ChatGPT-like conversational experience while keeping users focused on medical and dental topics, with intelligent provider matching and notifications.

## 🚀 Quick Start

### 1. Initialize the Service

Add this to your app's root layout (`app/layout.tsx`) or `_app.tsx`:

```typescript
import '@/src/lib/init-chat'
```

### 2. Environment Variables

Add to your `.env.local`:

```bash
# Required for AI responses
OPENAI_API_KEY=your_openai_api_key_here

# Optional: For production search API
SERPER_API_KEY=your_search_api_key
GOOGLE_SEARCH_API_KEY=your_google_api_key
```

### 3. Manual Configuration (Alternative)

For custom configurations, bootstrap manually:

```typescript
import { ChatProcessingService } from '@/src/services/ChatProcessingService'

const service = ChatProcessingService.getInstance({
  llm: async (messages) => {
    // Your LLM implementation (OpenAI, Anthropic, etc.)
    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages,
      temperature: 0.7,
      max_tokens: 500
    })
    return response.choices[0].message.content
  },
  
  webSearch: async (query, { k = 3 } = {}) => {
    // Medical-focused search restricted to reputable domains
    const results = await searchAPI(query, {
      domains: ['mayoclinic.org', 'webmd.com', 'ada.org', 'nih.gov']
    })
    return results.slice(0, k)
  },
  
  defaultLocation: async () => ({ city: 'Austin', state: 'TX' })
})
```

## 🧠 How It Works

### Conversational AI with Medical Focus

- **ChatGPT-like Experience**: Natural, helpful conversations
- **Medical Scope Enforcement**: Politely redirects off-topic queries
- **Provider Integration**: Seamlessly connects patients with specialists
- **Web Search Enhancement**: Provides accurate medical information from reputable sources

### Smart Provider Matching

1. **Specialty Detection**: Identifies dental specialties from natural language
2. **Location Parsing**: Extracts cities/states from user messages
3. **Price Range Analysis**: Detects budget constraints
4. **Urgency Assessment**: Identifies urgent vs routine cases
5. **Provider Filtering**: Matches based on specialty, location, and price

### Enhanced Notifications

- **Rich Context**: Includes conversation history and medical research
- **Detailed Metadata**: Urgency flags, budget info, extracted text from files
- **Provider Dashboard**: Shows enriched patient requests with full context

## 📋 Usage Examples

### Basic Chat Processing

```typescript
const result = await chatProcessor.processMessage(
  "I need an orthodontist in Austin for Invisalign treatment",
  conversationHistory
)

// result includes:
// - AI-generated response
// - Matched providers
// - Medical search results
// - Suggested actions
```

### Enhanced Processing with Notifications

```typescript
const result = await chatProcessor.processMessageAndNotify(
  "I need urgent wisdom teeth removal in Dallas", 
  conversationHistory,
  {
    name: "John Doe",
    id: "patient-123",
    avatar: "avatar-url"
  }
)

// Automatically:
// - Processes message with AI
// - Finds matching oral surgeons
// - Creates provider notifications
// - Returns comprehensive results
```

## 🔍 Medical Web Search

The system performs intelligent medical searches when users ask informational questions:

- **Restricted Domains**: Only searches reputable medical sites
- **Context-Aware**: Adds specialty context to search queries
- **Fallback Results**: Provides curated information when search fails
- **Integration**: Search results enhance AI responses with factual medical information

### Supported Medical Domains

- Mayo Clinic (`mayoclinic.org`)
- WebMD (`webmd.com`)
- Healthline (`healthline.com`)
- NIH (`nih.gov`)
- CDC (`cdc.gov`)
- American Dental Association (`ada.org`)
- American Association of Orthodontists (`aao.org`)
- Cleveland Clinic (`clevelandclinic.org`)

## 🎯 Features

### AI-Powered Conversations

- **Natural Language**: Understands complex patient queries
- **Context Awareness**: Maintains conversation context
- **Medical Expertise**: Provides accurate dental/orthodontic information
- **Scope Management**: Gracefully handles off-topic requests

### Provider Matching Intelligence

- **Specialty Recognition**: Orthodontics, oral surgery, jaw surgery, general dentistry
- **Geographic Filtering**: City, state, and proximity-based matching
- **Price Analysis**: Budget range detection and filtering
- **Urgency Detection**: Emergency vs routine case identification

### Rich Notifications

- **Conversation Context**: Last 3 messages for provider understanding
- **Medical Research**: Relevant search results included
- **File Information**: Notes about uploaded images/documents
- **Detailed Metadata**: Complete patient requirements and preferences

## 📈 Monitoring and Logging

The system includes comprehensive logging:

```typescript
// Chat processing events
logger.info('chat', 'Message analysis completed', {
  specialty, location, urgency, needsWebSearch
})

// Provider matching events  
logger.info('providers', `Found ${count} providers for ${specialty}`)

// Notification events
logger.info('notifications', `Successfully notified ${count} providers`, {
  requestId, specialty, urgency
})

// LLM events
logger.info('chat-llm', 'LLM response generated successfully')
```

## 🔧 Configuration Options

### LLM Configuration

```typescript
llm: async (messages) => {
  // OpenAI GPT-4
  // Anthropic Claude
  // Google Gemini
  // Azure OpenAI
  // Local models (Ollama, etc.)
}
```

### Search Configuration

```typescript
webSearch: async (query, options) => {
  // Google Custom Search
  // Serper API
  // SerpAPI
  // Bing Search API
  // Custom medical databases
}
```

### Location Defaults

```typescript
defaultLocation: async () => {
  // Geolocation API
  // User preferences
  // IP-based location
  // Static defaults
}
```

## 🚦 Error Handling

The system includes robust error handling:

- **LLM Fallbacks**: Graceful degradation when AI fails
- **Search Fallbacks**: Mock results when search API is down  
- **Provider Matching**: Basic matching when enhanced features fail
- **Notification Resilience**: Individual provider notification failures don't break the flow

## 🔒 Security & Privacy

- **Domain Restrictions**: Web search limited to medical authorities
- **Content Filtering**: AI responses stay within medical scope
- **No Personal Data**: Patient information handled securely
- **API Key Protection**: Secure credential management

## 📊 Next Steps

1. **Production Search API**: Replace mock search with real medical search API
2. **User Authentication**: Integrate with actual patient/provider accounts
3. **Real-time Notifications**: WebSocket-based live updates
4. **Analytics Dashboard**: Track conversation effectiveness and provider matching success
5. **Mobile Optimization**: Ensure great experience on all devices

This implementation provides the foundation for a sophisticated medical chat system that feels like ChatGPT but stays focused on connecting patients with qualified healthcare providers.