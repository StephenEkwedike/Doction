'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { formatDistanceToNow } from 'date-fns'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Mail, MessageCircle } from 'lucide-react'
import { useMessagingStore } from '@/src/stores/messagingStore'
import { useAuthStore } from '@/src/stores/authStore'
import { cn } from '@/lib/utils'

interface ConversationListProps {
  className?: string
  onConversationSelect?: (conversationId: string) => void
}

export function ConversationList({ 
  className, 
  onConversationSelect 
}: ConversationListProps) {
  const router = useRouter()
  const { user } = useAuthStore()
  const { 
    conversations, 
    isLoadingConversations,
    setActiveConversation,
    markAsRead 
  } = useMessagingStore()

  const handleConversationClick = (conversationId: string) => {
    setActiveConversation(conversationId)
    markAsRead(conversationId)
    
    if (onConversationSelect) {
      onConversationSelect(conversationId)
    } else {
      router.push(`/room/${conversationId}`)
    }
  }

  if (isLoadingConversations) {
    return (
      <div className={cn("space-y-3", className)}>
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-4">
              <div className="flex items-center space-x-4">
                <div className="rounded-full bg-gray-200 h-10 w-10"></div>
                <div className="space-y-2 flex-1">
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (conversations.length === 0) {
    return (
      <div className={cn("flex flex-col items-center justify-center py-12 text-center", className)}>
        <div className="rounded-full bg-gray-100 p-6 mb-4">
          <MessageCircle className="h-8 w-8 text-gray-400" />
        </div>
        <h3 className="font-semibold text-gray-900 mb-2">No conversations yet</h3>
        <p className="text-gray-500 text-sm max-w-sm">
          {user?.role === 'patient' 
            ? "Upload a quote or start a consultation to connect with providers."
            : "You'll see patient conversations here once they contact you."
          }
        </p>
      </div>
    )
  }

  return (
    <div className={cn("space-y-2", className)}>
      {conversations.map((conversation) => {
        const otherParticipant = user?.role === 'patient' 
          ? conversation.provider 
          : conversation.patient
        
        const isUnread = conversation.unreadCount > 0
        
        return (
          <button
            key={conversation.id}
            onClick={() => handleConversationClick(conversation.id)}
            className="w-full text-left"
          >
            <Card className={cn(
              "hover:bg-gray-50 transition-colors cursor-pointer",
              isUnread && "ring-2 ring-sky-100 bg-sky-50/30"
            )}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start space-x-3 flex-1 min-w-0">
                    <Avatar className="h-10 w-10 flex-shrink-0">
                      <AvatarImage 
                        src={otherParticipant?.avatar} 
                        alt={otherParticipant?.name || 'User'} 
                      />
                      <AvatarFallback>
                        {otherParticipant?.name?.charAt(0).toUpperCase() || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h4 className={cn(
                          "text-sm truncate",
                          isUnread ? "font-semibold text-gray-900" : "font-medium text-gray-700"
                        )}>
                          {otherParticipant?.name || 'Unknown User'}
                        </h4>
                        
                        {conversation.lastMessageAt && (
                          <span className="text-xs text-gray-500 flex-shrink-0 ml-2">
                            {formatDistanceToNow(new Date(conversation.lastMessageAt), { 
                              addSuffix: true 
                            })}
                          </span>
                        )}
                      </div>
                      
                      {conversation.metadata.specialty && (
                        <p className="text-xs text-gray-500 mb-1">
                          {conversation.metadata.specialty}
                          {conversation.metadata.estimatedPrice && (
                            <span className="ml-2">
                              • ${conversation.metadata.estimatedPrice.toLocaleString()}
                            </span>
                          )}
                        </p>
                      )}
                      
                      {conversation.lastMessage && (
                        <p className={cn(
                          "text-sm truncate",
                          isUnread ? "text-gray-900" : "text-gray-600"
                        )}>
                          {conversation.lastMessage}
                        </p>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex flex-col items-end space-y-1 flex-shrink-0">
                    {conversation.unreadCount > 0 && (
                      <Badge className="bg-sky-600 hover:bg-sky-700 text-white text-xs px-2 py-1">
                        {conversation.unreadCount}
                      </Badge>
                    )}
                    
                    <div className={cn(
                      "w-2 h-2 rounded-full",
                      conversation.status === 'active' ? "bg-green-400" : 
                      conversation.status === 'archived' ? "bg-yellow-400" : "bg-gray-300"
                    )} />
                  </div>
                </div>
              </CardContent>
            </Card>
          </button>
        )
      })}
    </div>
  )
}