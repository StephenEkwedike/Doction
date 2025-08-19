'use client'

import { useEffect, useRef } from 'react'
import { formatDistanceToNow, format } from 'date-fns'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  MoreVertical, 
  FileText, 
  Download, 
  Clock, 
  CheckCircle2,
  AlertCircle,
  Phone,
  Video,
  Calendar
} from 'lucide-react'
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useMessagingStore } from '@/src/stores/messagingStore'
import { useAuthStore } from '@/src/stores/authStore'
import { Message, Conversation } from '@/src/types'
import { cn } from '@/lib/utils'

interface MessageThreadProps {
  conversationId: string
  className?: string
}

export function MessageThread({ conversationId, className }: MessageThreadProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const { user } = useAuthStore()
  const { 
    getConversationById, 
    isLoadingMessages,
    typingUsers 
  } = useMessagingStore()

  const conversation = getConversationById(conversationId)
  const messages = conversation?.messages || []
  const otherParticipant = user?.role === 'patient' 
    ? conversation?.provider 
    : conversation?.patient

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const getMessageStatus = (message: Message) => {
    if (message.senderRole !== user?.role) return null
    
    return message.isRead ? (
      <CheckCircle2 className="h-3 w-3 text-green-500" />
    ) : (
      <Clock className="h-3 w-3 text-gray-400" />
    )
  }

  const MessageBubble = ({ message }: { message: Message }) => {
    const isOwn = message.senderRole === user?.role
    const sender = isOwn ? user : otherParticipant
    
    return (
      <div className={cn(
        "flex gap-3 mb-4",
        isOwn ? "flex-row-reverse" : "flex-row"
      )}>
        {!isOwn && (
          <Avatar className="h-8 w-8 flex-shrink-0">
            <AvatarImage src={sender?.avatar} alt={sender?.name || 'User'} />
            <AvatarFallback className="text-xs">
              {sender?.name?.charAt(0).toUpperCase() || 'U'}
            </AvatarFallback>
          </Avatar>
        )}
        
        <div className={cn(
          "max-w-[70%] flex flex-col",
          isOwn ? "items-end" : "items-start"
        )}>
          <Card className={cn(
            "shadow-sm",
            isOwn ? "bg-sky-600 text-white" : "bg-white border border-gray-200"
          )}>
            <CardContent className="p-3">
              {message.messageType === 'system' ? (
                <div className="flex items-center gap-2 text-sm">
                  <AlertCircle className="h-4 w-4" />
                  <span className="italic">{message.content}</span>
                </div>
              ) : (
                <>
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">
                    {message.content}
                  </p>
                  
                  {message.attachments && message.attachments.length > 0 && (
                    <div className="mt-3 space-y-2">
                      {message.attachments.map((attachment) => (
                        <div 
                          key={attachment.id}
                          className="flex items-center gap-2 p-2 rounded bg-black/10 hover:bg-black/20 transition-colors cursor-pointer"
                        >
                          <FileText className="h-4 w-4" />
                          <span className="text-sm truncate flex-1">
                            {attachment.filename}
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 hover:bg-black/20"
                          >
                            <Download className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
          
          <div className={cn(
            "flex items-center gap-2 mt-1 px-1",
            isOwn ? "flex-row-reverse" : "flex-row"
          )}>
            <span className="text-xs text-gray-500">
              {format(new Date(message.createdAt), 'h:mm a')}
            </span>
            {getMessageStatus(message)}
          </div>
        </div>
        
        {isOwn && (
          <div className="flex items-start">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100">
                  <MoreVertical className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem>Edit message</DropdownMenuItem>
                <DropdownMenuItem className="text-red-600">Delete message</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </div>
    )
  }

  const ConversationHeader = ({ conversation }: { conversation: Conversation }) => (
    <div className="border-b border-gray-200 bg-white p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Avatar className="h-10 w-10">
            <AvatarImage src={otherParticipant?.avatar} alt={otherParticipant?.name || 'User'} />
            <AvatarFallback>
              {otherParticipant?.name?.charAt(0).toUpperCase() || 'U'}
            </AvatarFallback>
          </Avatar>
          
          <div>
            <h3 className="font-semibold text-gray-900">
              {otherParticipant?.name || 'Unknown User'}
            </h3>
            <div className="flex items-center gap-4 text-sm text-gray-500">
              {conversation.metadata.specialty && (
                <span>{conversation.metadata.specialty}</span>
              )}
              {conversation.metadata.estimatedPrice && (
                <span>${conversation.metadata.estimatedPrice.toLocaleString()}</span>
              )}
              <Badge variant="outline" className="text-xs">
                {conversation.status}
              </Badge>
            </div>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm">
            <Phone className="h-4 w-4 mr-2" />
            Call
          </Button>
          <Button variant="outline" size="sm">
            <Video className="h-4 w-4 mr-2" />
            Video
          </Button>
          <Button variant="outline" size="sm">
            <Calendar className="h-4 w-4 mr-2" />
            Schedule
          </Button>
        </div>
      </div>
    </div>
  )

  if (!conversation) {
    return (
      <div className={cn("flex items-center justify-center h-full", className)}>
        <p className="text-gray-500">Conversation not found</p>
      </div>
    )
  }

  if (isLoadingMessages) {
    return (
      <div className={cn("flex flex-col h-full", className)}>
        <ConversationHeader conversation={conversation} />
        <div className="flex-1 p-4 space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className={cn("flex gap-3 animate-pulse", i % 2 ? "flex-row-reverse" : "")}>
              <div className="h-8 w-8 bg-gray-200 rounded-full flex-shrink-0"></div>
              <div className="flex-1 max-w-[70%]">
                <div className="h-16 bg-gray-200 rounded-lg"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className={cn("flex flex-col h-full bg-gray-50", className)}>
      <ConversationHeader conversation={conversation} />
      
      <div className="flex-1 overflow-y-auto p-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="rounded-full bg-gray-100 p-6 mb-4">
              <AlertCircle className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="font-medium text-gray-900 mb-2">No messages yet</h3>
            <p className="text-gray-500 text-sm">
              Start the conversation by sending a message below.
            </p>
          </div>
        ) : (
          <>
            {messages.map((message) => (
              <div key={message.id} className="group">
                <MessageBubble message={message} />
              </div>
            ))}
            
            {typingUsers[conversationId] && typingUsers[conversationId].length > 0 && (
              <div className="flex items-center gap-3 mb-4">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={otherParticipant?.avatar} alt={otherParticipant?.name || 'User'} />
                  <AvatarFallback className="text-xs">
                    {otherParticipant?.name?.charAt(0).toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex items-center space-x-1 text-gray-500">
                  <div className="flex space-x-1">
                    <div className="h-2 w-2 bg-gray-400 rounded-full animate-bounce"></div>
                    <div className="h-2 w-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                    <div className="h-2 w-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                  </div>
                  <span className="text-sm ml-2">typing...</span>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </>
        )}
      </div>
    </div>
  )
}