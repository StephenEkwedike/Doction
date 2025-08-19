import { z } from 'zod'
import { IsString, IsEnum, IsOptional, IsNumber, Min, IsBoolean, IsDate, ValidateNested, IsMongoId } from 'class-validator'
import { Type } from 'class-transformer'

// Zod schemas
export const PaymentOptionsSchema = z.object({
  acceptsCash: z.boolean().default(true),
  acceptsInsurance: z.boolean().default(false),
  acceptsFinancing: z.boolean().default(false),
  paymentPlanAvailable: z.boolean().default(false),
})

export const LocationSchema = z.object({
  city: z.string().min(1, 'City is required'),
  state: z.string().min(1, 'State is required'),
  address: z.string().optional(),
  zipCode: z.string().optional(),
})

export const OfferMetadataSchema = z.object({
  matchingScore: z.number().min(0).max(100).optional(),
  generatedBy: z.enum(['ai', 'manual']).default('ai'),
  sourceQuote: z.string().optional(),
})

export const CreateOfferSchema = z.object({
  providerId: z.string(),
  patientId: z.string(),
  caseProfileId: z.string().optional(),
  specialty: z.enum(['Orthodontics', 'Oral Surgery', 'Jaw Surgery', 'General Dentistry']),
  procedure: z.string().optional(),
  priceUSD: z.number().min(0, 'Price must be positive'),
  originalQuotePrice: z.number().min(0).optional(),
  validUntil: z.date().optional(),
  notes: z.string().max(1000).optional(),
  includesConsultation: z.boolean().default(true),
  estimatedDuration: z.string().optional(),
  paymentOptions: PaymentOptionsSchema,
  location: LocationSchema,
  metadata: OfferMetadataSchema.optional(),
})

export const UpdateOfferSchema = z.object({
  priceUSD: z.number().min(0).optional(),
  status: z.enum(['pending', 'accepted', 'declined', 'expired']).optional(),
  validUntil: z.date().optional(),
  notes: z.string().max(1000).optional(),
  includesConsultation: z.boolean().optional(),
  estimatedDuration: z.string().optional(),
  paymentOptions: PaymentOptionsSchema.optional(),
})

export const OfferSearchSchema = z.object({
  patientId: z.string().optional(),
  providerId: z.string().optional(),
  specialty: z.enum(['Orthodontics', 'Oral Surgery', 'Jaw Surgery', 'General Dentistry']).optional(),
  status: z.enum(['pending', 'accepted', 'declined', 'expired']).optional(),
  minPrice: z.number().min(0).optional(),
  maxPrice: z.number().min(0).optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  limit: z.number().min(1).max(100).default(20),
  offset: z.number().min(0).default(0),
})

// Class-based DTOs
export class PaymentOptionsDto {
  @IsBoolean()
  acceptsCash!: boolean

  @IsBoolean()
  acceptsInsurance!: boolean

  @IsBoolean()
  acceptsFinancing!: boolean

  @IsBoolean()
  paymentPlanAvailable!: boolean
}

export class LocationDto {
  @IsString()
  city!: string

  @IsString()
  state!: string

  @IsOptional()
  @IsString()
  address?: string

  @IsOptional()
  @IsString()
  zipCode?: string
}

export class OfferMetadataDto {
  @IsOptional()
  @IsNumber()
  @Min(0)
  matchingScore?: number

  @IsEnum(['ai', 'manual'])
  generatedBy!: 'ai' | 'manual'

  @IsOptional()
  @IsString()
  sourceQuote?: string
}

export class CreateOfferDto {
  @IsMongoId()
  providerId!: string

  @IsMongoId()
  patientId!: string

  @IsOptional()
  @IsMongoId()
  caseProfileId?: string

  @IsEnum(['Orthodontics', 'Oral Surgery', 'Jaw Surgery', 'General Dentistry'])
  specialty!: string

  @IsOptional()
  @IsString()
  procedure?: string

  @IsNumber()
  @Min(0)
  priceUSD!: number

  @IsOptional()
  @IsNumber()
  @Min(0)
  originalQuotePrice?: number

  @IsOptional()
  @IsDate()
  validUntil?: Date

  @IsOptional()
  @IsString()
  notes?: string

  @IsBoolean()
  includesConsultation!: boolean

  @IsOptional()
  @IsString()
  estimatedDuration?: string

  @ValidateNested()
  @Type(() => PaymentOptionsDto)
  paymentOptions!: PaymentOptionsDto

  @ValidateNested()
  @Type(() => LocationDto)
  location!: LocationDto

  @IsOptional()
  @ValidateNested()
  @Type(() => OfferMetadataDto)
  metadata?: OfferMetadataDto
}

export class UpdateOfferDto {
  @IsOptional()
  @IsNumber()
  @Min(0)
  priceUSD?: number

  @IsOptional()
  @IsEnum(['pending', 'accepted', 'declined', 'expired'])
  status?: 'pending' | 'accepted' | 'declined' | 'expired'

  @IsOptional()
  @IsDate()
  validUntil?: Date

  @IsOptional()
  @IsString()
  notes?: string

  @IsOptional()
  @IsBoolean()
  includesConsultation?: boolean

  @IsOptional()
  @IsString()
  estimatedDuration?: string

  @IsOptional()
  @ValidateNested()
  @Type(() => PaymentOptionsDto)
  paymentOptions?: PaymentOptionsDto
}

export class OfferSearchDto {
  @IsOptional()
  @IsMongoId()
  patientId?: string

  @IsOptional()
  @IsMongoId()
  providerId?: string

  @IsOptional()
  @IsEnum(['Orthodontics', 'Oral Surgery', 'Jaw Surgery', 'General Dentistry'])
  specialty?: string

  @IsOptional()
  @IsEnum(['pending', 'accepted', 'declined', 'expired'])
  status?: string

  @IsOptional()
  @IsNumber()
  @Min(0)
  minPrice?: number

  @IsOptional()
  @IsNumber()
  @Min(0)
  maxPrice?: number

  @IsOptional()
  @IsString()
  city?: string

  @IsOptional()
  @IsString()
  state?: string

  @IsOptional()
  @IsNumber()
  @Min(1)
  limit?: number

  @IsOptional()
  @IsNumber()
  @Min(0)
  offset?: number
}

export class OfferResponseDto {
  id!: string
  providerId!: string
  patientId!: string
  caseProfileId?: string
  specialty!: string
  procedure?: string
  priceUSD!: number
  originalQuotePrice?: number
  discountAmount!: number
  status!: 'pending' | 'accepted' | 'declined' | 'expired'
  validUntil!: Date
  notes?: string
  includesConsultation!: boolean
  estimatedDuration?: string
  paymentOptions!: PaymentOptionsDto
  location!: LocationDto
  metadata!: OfferMetadataDto
  isExpired!: boolean
  createdAt!: Date
  updatedAt!: Date
}

export class OfferListItemDto {
  id!: string
  providerName!: string
  specialty!: string
  priceUSD!: number
  discountAmount!: number
  city!: string
  state!: string
  status!: 'pending' | 'accepted' | 'declined' | 'expired'
  validUntil!: Date
  notes?: string
  isExpired!: boolean
  createdAt!: Date
}

// Type inference
export type CreateOfferInput = z.infer<typeof CreateOfferSchema>
export type UpdateOfferInput = z.infer<typeof UpdateOfferSchema>
export type OfferSearchInput = z.infer<typeof OfferSearchSchema>
export type PaymentOptionsInput = z.infer<typeof PaymentOptionsSchema>
export type LocationInput = z.infer<typeof LocationSchema>
export type OfferMetadataInput = z.infer<typeof OfferMetadataSchema>