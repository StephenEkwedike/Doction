import { IConversation, IMessage } from '../../database/models/Conversation'
import { CreateConversationInput, SendMessageInput, UpdateConversationInput } from '../../dto/conversation.dto'

export interface IConversationDao {
  /**
   * Create a new conversation
   */
  create(conversationData: CreateConversationInput): Promise<IConversation>

  /**
   * Find conversation by ID with populated user data
   */
  findById(id: string): Promise<IConversation | null>

  /**
   * Find conversations for a patient
   */
  findByPatientId(patientId: string, limit?: number, offset?: number): Promise<IConversation[]>

  /**
   * Find conversations for a provider
   */
  findByProviderId(providerId: string, limit?: number, offset?: number): Promise<IConversation[]>

  /**
   * Find conversation between specific patient and provider
   */
  findByParticipants(patientId: string, providerId: string): Promise<IConversation | null>

  /**
   * Update conversation
   */
  updateById(id: string, updateData: UpdateConversationInput): Promise<IConversation | null>

  /**
   * Add a message to conversation
   */
  addMessage(conversationId: string, messageData: SendMessageInput & { senderId: string; senderRole: 'patient' | 'provider' }): Promise<IConversation | null>

  /**
   * Mark messages as read for patient
   */
  markReadByPatient(conversationId: string): Promise<IConversation | null>

  /**
   * Mark messages as read for provider
   */
  markReadByProvider(conversationId: string): Promise<IConversation | null>

  /**
   * Get conversation messages with pagination
   */
  getMessages(conversationId: string, limit?: number, offset?: number): Promise<IMessage[]>

  /**
   * Delete conversation
   */
  deleteById(id: string): Promise<boolean>

  /**
   * Get conversations with unread messages for a user
   */
  getUnreadConversations(userId: string, userRole: 'patient' | 'provider'): Promise<IConversation[]>

  /**
   * Get conversation count for user
   */
  getConversationCount(userId: string, userRole: 'patient' | 'provider'): Promise<number>

  /**
   * Archive conversation
   */
  archiveConversation(conversationId: string): Promise<IConversation | null>

  /**
   * Close conversation
   */
  closeConversation(conversationId: string): Promise<IConversation | null>

  /**
   * Search conversations by message content
   */
  searchByMessageContent(userId: string, userRole: 'patient' | 'provider', searchTerm: string, limit?: number): Promise<IConversation[]>

  /**
   * Get recent conversations for user
   */
  getRecentConversations(userId: string, userRole: 'patient' | 'provider', limit?: number): Promise<IConversation[]>
}