'use client'

import { Card, CardContent } from '@/components/ui/card'
import { User, Bot, Paperclip } from 'lucide-react'
import { cn } from '@/lib/utils'

interface UploadedFile {
  id: string
  file: File
  preview?: string
  text?: string
}

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  files?: UploadedFile[]
}

interface MessageBubbleProps {
  message: Message
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === 'user'

  return (
    <Card className={cn(
      'border-gray-200 mb-4',
      isUser ? 'bg-white ml-12' : 'bg-gray-50 mr-12'
    )}>
      <CardContent className="p-4">
        {/* Header with avatar and role */}
        <div className="flex items-center gap-3 mb-3">
          <div className={cn(
            'w-8 h-8 rounded-full flex items-center justify-center',
            isUser ? 'bg-sky-600 text-white' : 'bg-gray-200 text-gray-600'
          )}>
            {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
          </div>
          <div className="text-sm font-medium text-gray-500">
            {isUser ? 'You' : 'Doction AI'}
          </div>
        </div>

        {/* File attachments - show before text for user messages */}
        {isUser && message.files && message.files.length > 0 && (
          <div className="mb-3">
            <div className="flex flex-wrap gap-2">
              {message.files.map((file) => (
                <div key={file.id} className="relative group">
                  {file.preview ? (
                    // Image preview
                    <div className="relative">
                      <img
                        src={file.preview}
                        alt={file.file.name}
                        className="w-20 h-20 object-cover rounded-lg border border-gray-200"
                      />
                      <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-white text-xs px-1 py-0.5 rounded-b-lg truncate">
                        {file.file.name}
                      </div>
                    </div>
                  ) : (
                    // File icon
                    <div className="w-20 h-20 bg-gray-100 rounded-lg border border-gray-200 flex flex-col items-center justify-center">
                      <Paperclip className="w-6 h-6 text-gray-500 mb-1" />
                      <div className="text-xs text-gray-600 text-center px-1">
                        {file.file.name.split('.').pop()?.toUpperCase()}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Message content */}
        <div className="text-gray-900 whitespace-pre-wrap leading-relaxed">
          {message.content}
        </div>

        {/* Timestamp */}
        <div className={cn(
          'text-xs text-gray-500 mt-2',
          isUser ? 'text-right' : 'text-left'
        )}>
          {new Date().toLocaleTimeString([], { 
            hour: '2-digit', 
            minute: '2-digit' 
          })}
        </div>
      </CardContent>
    </Card>
  )
}