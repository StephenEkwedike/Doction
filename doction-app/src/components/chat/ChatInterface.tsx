'use client'

import { useState, useEffect, useRef } from 'react'
import { Send, Plus, Loader2, Paperclip, User, Bot } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useChatStore, ChatMessage } from '@/src/stores/chatStore'
import { ChatProcessingService } from '@/src/services/ChatProcessingService'
import { cn } from '@/lib/utils'

interface ChatInterfaceProps {
  className?: string
}

export function ChatInterface({ className }: ChatInterfaceProps) {
  const {
    activeChat,
    activeChatId,
    createNewChat,
    addMessage,
    isProcessing,
    setProcessing,
  } = useChatStore()

  const [input, setInput] = useState('')
  const [isUploading, setIsUploading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const chatProcessor = ChatProcessingService.getInstance()

  useEffect(() => {
    scrollToBottom()
  }, [activeChat?.messages])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isProcessing) return

    let currentChatId = activeChatId
    
    // Create new chat if none exists
    if (!currentChatId) {
      const newChat = createNewChat()
      currentChatId = newChat.id
    }

    // Add user message
    addMessage(currentChatId, {
      role: 'user',
      content: input.trim(),
    })

    const userInput = input.trim()
    setInput('')
    setProcessing(true)

    try {
      // Process the message for provider matching
      const result = await chatProcessor.processMessage(userInput, activeChat?.messages || [])
      
      // Add assistant response
      addMessage(currentChatId, {
        role: 'assistant',
        content: result.reply,
        metadata: result.metadata,
      })

      // If we found provider matches, create notifications for them
      if (result.shouldCreateProviderMatches && result.metadata?.matchedProviders) {
        const notificationResult = await chatProcessor.createProviderNotifications(
          'Anonymous Patient', // TODO: Get actual patient name from auth store
          'patient-demo-123', // TODO: Get actual patient ID from auth store
          userInput,
          result.metadata.matchedProviders,
          {
            specialty: result.metadata.specialty,
            location: result.metadata.location,
            urgency: result.metadata.urgency,
            priceRange: result.metadata.priceRange
          }
        )

        if (notificationResult?.success) {
          console.log(`✅ Successfully notified ${notificationResult.notifiedProviders.length} providers`)
        } else {
          console.log(`⚠️ Notification errors:`, notificationResult?.errors)
        }
      }

    } catch (error) {
      console.error('Chat processing error:', error)
      addMessage(currentChatId, {
        role: 'assistant',
        content: 'I apologize, but I encountered an error processing your request. Please try again.',
      })
    } finally {
      setProcessing(false)
    }
  }

  const handleNewChat = () => {
    createNewChat()
    setInput('')
  }

  // Optimized image resizing for faster OCR
  const resizeImageForOCR = async (file: File, maxWidth = 1200, maxHeight = 1200): Promise<File> => {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')!
      const img = new Image()
      
      img.onload = () => {
        let { width, height } = img
        
        if (width > maxWidth) {
          height = (height * maxWidth) / width
          width = maxWidth
        }
        
        if (height > maxHeight) {
          width = (width * maxHeight) / height
          height = maxHeight
        }
        
        canvas.width = width
        canvas.height = height
        ctx.drawImage(img, 0, 0, width, height)
        
        canvas.toBlob(
          (blob) => {
            if (blob) {
              const resizedFile = new File([blob], file.name, {
                type: 'image/jpeg',
                lastModified: Date.now()
              })
              resolve(resizedFile)
            } else {
              resolve(file)
            }
          },
          'image/jpeg',
          0.8
        )
      }
      
      img.src = URL.createObjectURL(file)
    })
  }

  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return
    
    setIsUploading(true)
    
    try {
      // Process files in parallel for faster performance
      const processFile = async (file: File): Promise<string> => {
        try {
          if (file.type === 'text/plain') {
            return await file.text()
          } 
          else if (file.type.startsWith('image/')) {
            // Optimize image and perform OCR
            const optimizedFile = await resizeImageForOCR(file)
            const Tesseract = (await import('tesseract.js')).default
            
            const { data } = await Tesseract.recognize(optimizedFile, 'eng', {
              logger: () => {}, // Disable logging for performance
              tessedit_pageseg_mode: Tesseract.PSM.SINGLE_BLOCK,
              tessedit_ocr_engine_mode: Tesseract.OEM.LSTM_ONLY,
            })
            
            return data?.text || `[Uploaded image: ${file.name}]`
          } 
          else if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
            const { getDocument } = await import('pdfjs-dist')
            // @ts-ignore: pdfjs-dist worker in Next.js
            const pdf = await getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise
            const max = Math.min(pdf.numPages, 5)
            
            const pagePromises = []
            for (let i = 1; i <= max; i++) {
              pagePromises.push(
                pdf.getPage(i).then(async (page) => {
                  const content = await page.getTextContent()
                  return content.items.map((it: any) => it.str).join(' ')
                })
              )
            }
            
            const pageTexts = await Promise.all(pagePromises)
            return pageTexts.join(' ')
          } 
          else {
            return `[Uploaded file: ${file.name}]`
          }
        } catch (error) {
          console.error(`Error processing file ${file.name}:`, error)
          return `[Error processing ${file.name}]`
        }
      }

      // Process all files in parallel
      const results = await Promise.all(Array.from(files).map(processFile))
      const extractedText = results.filter(text => text.trim()).join('\n')

      if (extractedText.trim()) {
        setInput(prev => (prev + '\n' + extractedText.trim()).trim())
      }

    } catch (error) {
      console.error('File upload error:', error)
    } finally {
      setIsUploading(false)
    }
  }

  const MessageBubble = ({ message }: { message: ChatMessage }) => {
    const isUser = message.role === 'user'
    const isSystem = message.role === 'system'
    
    return (
      <div className={cn(
        "flex gap-3 mb-6",
        isUser ? "flex-row-reverse" : "flex-row"
      )}>
        {/* Avatar */}
        <div className={cn(
          "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0",
          isUser ? "bg-sky-600 text-white" : isSystem ? "bg-yellow-500 text-white" : "bg-gray-200 text-gray-600"
        )}>
          {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
        </div>

        {/* Message Content */}
        <div className={cn(
          "flex-1 max-w-[80%]",
          isUser ? "text-right" : "text-left"
        )}>
          <div className={cn(
            "inline-block px-4 py-3 rounded-2xl",
            isUser 
              ? "bg-sky-600 text-white" 
              : isSystem 
                ? "bg-yellow-100 text-yellow-800 border border-yellow-200"
                : "bg-gray-100 text-gray-900"
          )}>
            <div className="whitespace-pre-wrap text-sm leading-relaxed">
              {message.content}
            </div>
            
            {/* Provider matches */}
            {message.metadata?.isProviderMatch && message.metadata.matchedProviders && (
              <div className="mt-3 pt-3 border-t border-white/20">
                <div className="text-xs opacity-75 mb-2">Found {message.metadata.matchedProviders.length} specialists:</div>
                {message.metadata.matchedProviders.slice(0, 2).map((provider, index) => (
                  <div key={provider.id} className="text-xs bg-white/10 rounded p-2 mb-1">
                    <div className="font-medium">{provider.name}</div>
                    <div className="opacity-75">
                      {provider.providerProfile?.specialty} • {provider.providerProfile?.city}, {provider.providerProfile?.state}
                    </div>
                  </div>
                ))}
                {message.metadata.matchedProviders.length > 2 && (
                  <div className="text-xs opacity-75">
                    +{message.metadata.matchedProviders.length - 2} more...
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Metadata badges */}
          {message.metadata && (
            <div className="flex gap-1 mt-2 flex-wrap">
              {message.metadata.specialty && (
                <Badge variant="outline" className="text-xs">
                  {message.metadata.specialty}
                </Badge>
              )}
              {message.metadata.urgency === 'high' && (
                <Badge variant="destructive" className="text-xs">
                  Urgent
                </Badge>
              )}
              {message.metadata.location && (
                <Badge variant="secondary" className="text-xs">
                  {message.metadata.location}
                </Badge>
              )}
            </div>
          )}

          {/* Timestamp */}
          <div className={cn(
            "text-xs text-gray-500 mt-1",
            isUser ? "text-right" : "text-left"
          )}>
            {message.timestamp.toLocaleTimeString([], { 
              hour: '2-digit', 
              minute: '2-digit' 
            })}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={cn("flex flex-col h-full bg-white", className)}>
      {/* Header */}
      <div className="border-b border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-sky-500 to-blue-600 flex items-center justify-center">
              <Bot className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="font-semibold text-gray-900">Doction AI</h2>
              <p className="text-sm text-gray-600">Find healthcare providers instantly</p>
            </div>
          </div>
          
          <Button onClick={handleNewChat} size="sm" variant="outline">
            <Plus className="w-4 h-4 mr-2" />
            New Chat
          </Button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4">
        {!activeChat || activeChat.messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-sky-500 to-blue-600 flex items-center justify-center mb-4">
              <Bot className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Welcome to Doction AI
            </h3>
            <p className="text-gray-600 max-w-md mb-6">
              Tell me what type of dental care you're looking for, and I'll connect you with qualified specialists in your area.
            </p>
            <div className="flex flex-wrap gap-2 justify-center">
              {[
                "I'm looking for an orthodontist",
                "Need wisdom teeth removal",
                "Find jaw surgery specialists",
                "Dental implant consultation"
              ].map((example) => (
                <button
                  key={example}
                  onClick={() => setInput(example)}
                  className="px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  {example}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            {activeChat.messages.map((message) => (
              <MessageBubble key={message.id} message={message} />
            ))}
            
            {isProcessing && (
              <div className="flex gap-3 mb-6">
                <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                  <Bot className="w-4 h-4 text-gray-600" />
                </div>
                <div className="flex-1">
                  <div className="inline-block px-4 py-3 rounded-2xl bg-gray-100">
                    <div className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span className="text-sm text-gray-600">Processing your request...</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-gray-200 p-4">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <div className="flex-1 relative">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about dental care or describe what you need..."
              disabled={isProcessing}
              className="pr-12"
            />
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*,application/pdf,.txt"
              onChange={(e) => handleFileUpload(e.target.files)}
              className="hidden"
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 p-0"
              onClick={() => fileInputRef.current?.click()}
              disabled={isProcessing || isUploading}
            >
              {isUploading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Paperclip className="w-4 h-4" />
              )}
            </Button>
          </div>
          <Button 
            type="submit" 
            disabled={!input.trim() || isProcessing}
            className="bg-sky-600 hover:bg-sky-700"
          >
            <Send className="w-4 h-4" />
          </Button>
        </form>
      </div>
    </div>
  )
}