import { Schema, model, models, Document, Types } from 'mongoose'

export interface IMessage {
  id: string
  senderId: Types.ObjectId
  senderRole: 'patient' | 'provider'
  content: string
  messageType: 'text' | 'attachment' | 'system'
  attachments?: {
    filename: string
    url: string
    fileType: string
    size: number
  }[]
  createdAt: Date
}

export interface IConversation extends Document {
  _id: string
  patientId: Types.ObjectId
  providerId: Types.ObjectId
  offerId?: Types.ObjectId
  status: 'active' | 'archived' | 'closed'
  lastMessage?: string
  lastMessageAt?: Date
  unreadCountPatient: number
  unreadCountProvider: number
  messages: IMessage[]
  metadata: {
    specialty?: string
    estimatedPrice?: number
    consultScheduled?: Date
    consultCompleted?: boolean
  }
  createdAt: Date
  updatedAt: Date
}

const MessageSchema = new Schema<IMessage>({
  id: {
    type: String,
    required: true,
  },
  senderId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  senderRole: {
    type: String,
    enum: ['patient', 'provider'],
    required: true,
  },
  content: {
    type: String,
    required: true,
    trim: true,
  },
  messageType: {
    type: String,
    enum: ['text', 'attachment', 'system'],
    default: 'text',
  },
  attachments: [{
    filename: { type: String, required: true },
    url: { type: String, required: true },
    fileType: { type: String, required: true },
    size: { type: Number, required: true },
  }],
}, {
  timestamps: true,
})

const ConversationSchema = new Schema<IConversation>(
  {
    patientId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    providerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    offerId: {
      type: Schema.Types.ObjectId,
      ref: 'Offer',
    },
    status: {
      type: String,
      enum: ['active', 'archived', 'closed'],
      default: 'active',
    },
    lastMessage: {
      type: String,
      trim: true,
    },
    lastMessageAt: {
      type: Date,
    },
    unreadCountPatient: {
      type: Number,
      default: 0,
      min: 0,
    },
    unreadCountProvider: {
      type: Number,
      default: 0,
      min: 0,
    },
    messages: [MessageSchema],
    metadata: {
      specialty: { type: String },
      estimatedPrice: { type: Number, min: 0 },
      consultScheduled: { type: Date },
      consultCompleted: { type: Boolean, default: false },
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
)

// Indexes for performance
ConversationSchema.index({ patientId: 1, status: 1 })
ConversationSchema.index({ providerId: 1, status: 1 })
ConversationSchema.index({ lastMessageAt: -1 })
ConversationSchema.index({ patientId: 1, providerId: 1 }, { unique: true })

// Virtual for getting the other participant
ConversationSchema.virtual('patient', {
  ref: 'User',
  localField: 'patientId',
  foreignField: '_id',
  justOne: true,
})

ConversationSchema.virtual('provider', {
  ref: 'User',
  localField: 'providerId',
  foreignField: '_id',
  justOne: true,
})

export const Conversation = models.Conversation || model<IConversation>('Conversation', ConversationSchema)