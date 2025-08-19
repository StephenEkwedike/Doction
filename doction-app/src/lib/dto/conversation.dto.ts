import { z } from 'zod'
import { IsString, IsEnum, IsOptional, IsNumber, Min, IsArray, ValidateNested, IsDate, IsMongoId } from 'class-validator'
import { Type } from 'class-transformer'

// Zod schemas
export const MessageSchema = z.object({
  senderId: z.string(),
  senderRole: z.enum(['patient', 'provider']),
  content: z.string().min(1, 'Message content is required'),
  messageType: z.enum(['text', 'attachment', 'system']).default('text'),
  attachments: z.array(z.object({
    filename: z.string(),
    url: z.string().url(),
    fileType: z.string(),
    size: z.number().min(0),
  })).optional(),
})

export const CreateConversationSchema = z.object({
  patientId: z.string(),
  providerId: z.string(),
  offerId: z.string().optional(),
  initialMessage: z.string().optional(),
})

export const SendMessageSchema = z.object({
  content: z.string().min(1, 'Message content is required'),
  messageType: z.enum(['text', 'attachment', 'system']).default('text'),
  attachments: z.array(z.object({
    filename: z.string(),
    url: z.string().url(),
    fileType: z.string(),
    size: z.number().min(0),
  })).optional(),
})

export const UpdateConversationSchema = z.object({
  status: z.enum(['active', 'archived', 'closed']).optional(),
  metadata: z.object({
    specialty: z.string().optional(),
    estimatedPrice: z.number().min(0).optional(),
    consultScheduled: z.date().optional(),
    consultCompleted: z.boolean().optional(),
  }).optional(),
})

// Class-based DTOs
export class AttachmentDto {
  @IsString()
  filename!: string

  @IsString()
  url!: string

  @IsString()
  fileType!: string

  @IsNumber()
  @Min(0)
  size!: number
}

export class MessageDto {
  @IsMongoId()
  senderId!: string

  @IsEnum(['patient', 'provider'])
  senderRole!: 'patient' | 'provider'

  @IsString()
  content!: string

  @IsEnum(['text', 'attachment', 'system'])
  messageType!: 'text' | 'attachment' | 'system'

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AttachmentDto)
  attachments?: AttachmentDto[]
}

export class CreateConversationDto {
  @IsMongoId()
  patientId!: string

  @IsMongoId()
  providerId!: string

  @IsOptional()
  @IsMongoId()
  offerId?: string

  @IsOptional()
  @IsString()
  initialMessage?: string
}

export class SendMessageDto {
  @IsString()
  content!: string

  @IsEnum(['text', 'attachment', 'system'])
  messageType!: 'text' | 'attachment' | 'system'

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AttachmentDto)
  attachments?: AttachmentDto[]
}

export class ConversationMetadataDto {
  @IsOptional()
  @IsString()
  specialty?: string

  @IsOptional()
  @IsNumber()
  @Min(0)
  estimatedPrice?: number

  @IsOptional()
  @IsDate()
  consultScheduled?: Date

  @IsOptional()
  consultCompleted?: boolean
}

export class UpdateConversationDto {
  @IsOptional()
  @IsEnum(['active', 'archived', 'closed'])
  status?: 'active' | 'archived' | 'closed'

  @IsOptional()
  @ValidateNested()
  @Type(() => ConversationMetadataDto)
  metadata?: ConversationMetadataDto
}

export class ConversationResponseDto {
  id!: string
  patientId!: string
  providerId!: string
  offerId?: string
  status!: 'active' | 'archived' | 'closed'
  lastMessage?: string
  lastMessageAt?: Date
  unreadCountPatient!: number
  unreadCountProvider!: number
  messages!: MessageDto[]
  metadata!: ConversationMetadataDto
  createdAt!: Date
  updatedAt!: Date
}

export class ConversationListItemDto {
  id!: string
  patientId!: string
  providerId!: string
  providerName!: string
  specialty?: string
  lastMessage?: string
  lastMessageAt?: Date
  unreadCountPatient!: number
  unreadCountProvider!: number
  status!: 'active' | 'archived' | 'closed'
  createdAt!: Date
}

// Type inference
export type CreateConversationInput = z.infer<typeof CreateConversationSchema>
export type SendMessageInput = z.infer<typeof SendMessageSchema>
export type UpdateConversationInput = z.infer<typeof UpdateConversationSchema>
export type MessageInput = z.infer<typeof MessageSchema>