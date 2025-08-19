import { connectToDatabase } from '../../database/connection'
import { Conversation, IConversation, IMessage } from '../../database/models/Conversation'
import { IConversationDao } from '../interfaces/IConversationDao'
import { CreateConversationInput, SendMessageInput, UpdateConversationInput } from '../../dto/conversation.dto'
import { FilterQuery } from 'mongoose'

export class ConversationDao implements IConversationDao {
  async create(conversationData: CreateConversationInput): Promise<IConversation> {
    await connectToDatabase()
    
    const conversation = new Conversation({
      patientId: conversationData.patientId,
      providerId: conversationData.providerId,
      offerId: conversationData.offerId,
      messages: conversationData.initialMessage ? [{
        id: crypto.randomUUID(),
        senderId: conversationData.patientId,
        senderRole: 'patient',
        content: conversationData.initialMessage,
        messageType: 'text',
        createdAt: new Date()
      }] : [],
      lastMessage: conversationData.initialMessage,
      lastMessageAt: conversationData.initialMessage ? new Date() : undefined,
      unreadCountProvider: conversationData.initialMessage ? 1 : 0,
    })
    
    return await conversation.save()
  }

  async findById(id: string): Promise<IConversation | null> {
    await connectToDatabase()
    return await Conversation.findById(id)
      .populate('patient', 'name email role patientProfile')
      .populate('provider', 'name email role providerProfile')
      .exec()
  }

  async findByPatientId(patientId: string, limit = 20, offset = 0): Promise<IConversation[]> {
    await connectToDatabase()
    return await Conversation.find({ patientId, status: { $ne: 'closed' } })
      .populate('provider', 'name email providerProfile.specialty providerProfile.city providerProfile.state')
      .skip(offset)
      .limit(limit)
      .sort({ lastMessageAt: -1, createdAt: -1 })
      .exec()
  }

  async findByProviderId(providerId: string, limit = 20, offset = 0): Promise<IConversation[]> {
    await connectToDatabase()
    return await Conversation.find({ providerId, status: { $ne: 'closed' } })
      .populate('patient', 'name email patientProfile.location')
      .skip(offset)
      .limit(limit)
      .sort({ lastMessageAt: -1, createdAt: -1 })
      .exec()
  }

  async findByParticipants(patientId: string, providerId: string): Promise<IConversation | null> {
    await connectToDatabase()
    return await Conversation.findOne({ patientId, providerId })
      .populate('patient', 'name email role patientProfile')
      .populate('provider', 'name email role providerProfile')
      .exec()
  }

  async updateById(id: string, updateData: UpdateConversationInput): Promise<IConversation | null> {
    await connectToDatabase()
    return await Conversation.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true }
    ).exec()
  }

  async addMessage(
    conversationId: string, 
    messageData: SendMessageInput & { senderId: string; senderRole: 'patient' | 'provider' }
  ): Promise<IConversation | null> {
    await connectToDatabase()
    
    const message: IMessage = {
      id: crypto.randomUUID(),
      senderId: messageData.senderId as any,
      senderRole: messageData.senderRole,
      content: messageData.content,
      messageType: messageData.messageType || 'text',
      attachments: messageData.attachments,
      createdAt: new Date()
    }

    const updateFields: any = {
      $push: { messages: message },
      $set: {
        lastMessage: messageData.content,
        lastMessageAt: new Date(),
      }
    }

    // Increment unread count for the other party
    if (messageData.senderRole === 'patient') {
      updateFields.$inc = { unreadCountProvider: 1 }
    } else {
      updateFields.$inc = { unreadCountPatient: 1 }
    }

    return await Conversation.findByIdAndUpdate(
      conversationId,
      updateFields,
      { new: true }
    ).exec()
  }

  async markReadByPatient(conversationId: string): Promise<IConversation | null> {
    await connectToDatabase()
    return await Conversation.findByIdAndUpdate(
      conversationId,
      { $set: { unreadCountPatient: 0 } },
      { new: true }
    ).exec()
  }

  async markReadByProvider(conversationId: string): Promise<IConversation | null> {
    await connectToDatabase()
    return await Conversation.findByIdAndUpdate(
      conversationId,
      { $set: { unreadCountProvider: 0 } },
      { new: true }
    ).exec()
  }

  async getMessages(conversationId: string, limit = 50, offset = 0): Promise<IMessage[]> {
    await connectToDatabase()
    const conversation = await Conversation.findById(conversationId).exec()
    if (!conversation) return []
    
    return conversation.messages
      .slice(offset, offset + limit)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
  }

  async deleteById(id: string): Promise<boolean> {
    await connectToDatabase()
    const result = await Conversation.findByIdAndDelete(id).exec()
    return result !== null
  }

  async getUnreadConversations(userId: string, userRole: 'patient' | 'provider'): Promise<IConversation[]> {
    await connectToDatabase()
    const query: FilterQuery<IConversation> = userRole === 'patient' 
      ? { patientId: userId, unreadCountPatient: { $gt: 0 } }
      : { providerId: userId, unreadCountProvider: { $gt: 0 } }

    return await Conversation.find(query)
      .populate(userRole === 'patient' ? 'provider' : 'patient', 'name email')
      .sort({ lastMessageAt: -1 })
      .exec()
  }

  async getConversationCount(userId: string, userRole: 'patient' | 'provider'): Promise<number> {
    await connectToDatabase()
    const query = userRole === 'patient' 
      ? { patientId: userId, status: { $ne: 'closed' } }
      : { providerId: userId, status: { $ne: 'closed' } }

    return await Conversation.countDocuments(query).exec()
  }

  async archiveConversation(conversationId: string): Promise<IConversation | null> {
    await connectToDatabase()
    return await Conversation.findByIdAndUpdate(
      conversationId,
      { $set: { status: 'archived' } },
      { new: true }
    ).exec()
  }

  async closeConversation(conversationId: string): Promise<IConversation | null> {
    await connectToDatabase()
    return await Conversation.findByIdAndUpdate(
      conversationId,
      { $set: { status: 'closed' } },
      { new: true }
    ).exec()
  }

  async searchByMessageContent(userId: string, userRole: 'patient' | 'provider', searchTerm: string, limit = 20): Promise<IConversation[]> {
    await connectToDatabase()
    const userField = userRole === 'patient' ? 'patientId' : 'providerId'
    
    return await Conversation.find({
      [userField]: userId,
      'messages.content': { $regex: searchTerm, $options: 'i' }
    })
      .populate(userRole === 'patient' ? 'provider' : 'patient', 'name email')
      .limit(limit)
      .sort({ lastMessageAt: -1 })
      .exec()
  }

  async getRecentConversations(userId: string, userRole: 'patient' | 'provider', limit = 10): Promise<IConversation[]> {
    await connectToDatabase()
    const query = userRole === 'patient' 
      ? { patientId: userId, status: 'active' }
      : { providerId: userId, status: 'active' }

    return await Conversation.find(query)
      .populate(userRole === 'patient' ? 'provider' : 'patient', 'name email')
      .limit(limit)
      .sort({ lastMessageAt: -1 })
      .exec()
  }
}