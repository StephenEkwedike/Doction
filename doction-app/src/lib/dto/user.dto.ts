import { z } from 'zod'
import { IsEmail, IsPhoneNumber, IsEnum, IsOptional, IsString, IsNumber, IsBoolean, Min, Max } from 'class-validator'
import { Transform } from 'class-transformer'

// Zod schemas for validation
export const CreateUserSchema = z.object({
  email: z.string().email('Invalid email format'),
  phone: z.string().optional(),
  name: z.string().optional(),
  role: z.enum(['patient', 'provider']).default('patient'),
})

export const UpdateUserSchema = z.object({
  phone: z.string().optional(),
  name: z.string().optional(),
  isActive: z.boolean().optional(),
})

export const PatientProfileSchema = z.object({
  age: z.number().min(0).max(150).optional(),
  location: z.string().optional(),
  preferredLanguage: z.string().default('English'),
  insuranceProvider: z.string().optional(),
})

export const ProviderProfileSchema = z.object({
  specialty: z.enum(['Orthodontics', 'Oral Surgery', 'Jaw Surgery', 'General Dentistry']),
  licenseNumber: z.string().min(1, 'License number is required'),
  yearsExperience: z.number().min(0).optional(),
  city: z.string().min(1, 'City is required'),
  state: z.string().min(1, 'State is required'),
  basePriceUSD: z.number().min(0, 'Base price must be positive'),
  acceptsInsurance: z.boolean().default(false),
  availableForConsults: z.boolean().default(true),
  bio: z.string().max(1000, 'Bio must be under 1000 characters').optional(),
})

// Class-based DTOs for request/response
export class CreateUserDto {
  @IsEmail()
  email!: string

  @IsOptional()
  @IsString()
  phone?: string

  @IsOptional()
  @IsString()
  name?: string

  @IsEnum(['patient', 'provider'])
  role!: 'patient' | 'provider'
}

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  phone?: string

  @IsOptional()
  @IsString()
  name?: string

  @IsOptional()
  @IsBoolean()
  isActive?: boolean
}

export class PatientProfileDto {
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(150)
  age?: number

  @IsOptional()
  @IsString()
  location?: string

  @IsOptional()
  @IsString()
  preferredLanguage?: string

  @IsOptional()
  @IsString()
  insuranceProvider?: string
}

export class ProviderProfileDto {
  @IsEnum(['Orthodontics', 'Oral Surgery', 'Jaw Surgery', 'General Dentistry'])
  specialty!: string

  @IsString()
  licenseNumber!: string

  @IsOptional()
  @IsNumber()
  @Min(0)
  yearsExperience?: number

  @IsString()
  city!: string

  @IsString()
  state!: string

  @IsNumber()
  @Min(0)
  basePriceUSD!: number

  @IsOptional()
  @IsBoolean()
  acceptsInsurance?: boolean

  @IsOptional()
  @IsBoolean()
  availableForConsults?: boolean

  @IsOptional()
  @IsString()
  bio?: string
}

export class UserResponseDto {
  id!: string
  email!: string
  phone?: string
  name?: string
  role!: 'patient' | 'provider'
  isActive!: boolean
  patientProfile?: PatientProfileDto
  providerProfile?: ProviderProfileDto
  createdAt!: Date
  updatedAt!: Date
}

// Type inference from Zod schemas
export type CreateUserInput = z.infer<typeof CreateUserSchema>
export type UpdateUserInput = z.infer<typeof UpdateUserSchema>
export type PatientProfileInput = z.infer<typeof PatientProfileSchema>
export type ProviderProfileInput = z.infer<typeof ProviderProfileSchema>