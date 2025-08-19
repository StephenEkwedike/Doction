'use client'

import { useEffect } from 'react'
import { ConversationList } from '@/src/components/messaging/ConversationList'
import { useMessagingStore } from '@/src/stores/messagingStore'
import { useAuthStore } from '@/src/stores/authStore'

export default function RoomsPage() {
  const { user } = useAuthStore()
  const { setLoadingStates, setConversations } = useMessagingStore()

  useEffect(() => {
    // Load conversations - this would typically come from an API
    const loadConversations = async () => {
      setLoadingStates({ isLoadingConversations: true })
      
      try {
        // TODO: Replace with actual API call
        // const response = await fetch(`/api/conversations?userId=${user?.id}&role=${user?.role}`)
        // const conversations = await response.json()
        
        // For now, use the legacy hook data
        const legacyConversations = JSON.parse(localStorage.getItem('doction_conversations_v1') || '[]')
        
        // Transform legacy data to new format
        const transformedConversations = legacyConversations.map((conv: any) => ({
          id: conv.id,
          patientId: user?.role === 'patient' ? user.id : conv.id,
          providerId: user?.role === 'provider' ? user.id : conv.providerId,
          provider: user?.role === 'patient' ? {
            id: conv.providerId,
            name: conv.providerName,
            role: 'provider'
          } : undefined,
          patient: user?.role === 'provider' ? {
            id: conv.id,
            name: 'Patient',
            role: 'patient'
          } : undefined,
          status: 'active',
          lastMessage: conv.lastMessage,
          lastMessageAt: new Date(conv.updatedAt),
          unreadCount: user?.role === 'patient' ? conv.unreadPatient : conv.unreadProvider,
          messages: [],
          metadata: {
            specialty: conv.specialty,
            estimatedPrice: conv.priceUSD,
          },
          createdAt: new Date(conv.updatedAt),
          updatedAt: new Date(conv.updatedAt),
        }))
        
        setConversations(transformedConversations)
      } catch (error) {
        console.error('Failed to load conversations:', error)
      } finally {
        setLoadingStates({ isLoadingConversations: false })
      }
    }

    if (user) {
      loadConversations()
    }
  }, [user, setLoadingStates, setConversations])

  return (
    <div className="h-full">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Messages</h1>
        <p className="text-gray-600 mt-1">
          {user?.role === 'patient' 
            ? 'Communicate with healthcare providers about your consultations'
            : 'Manage patient conversations and consultations'
          }
        </p>
      </div>
      
      <ConversationList className="max-w-4xl" />
    </div>
  )
}
