import { Schema, model, models, Document } from 'mongoose'

export interface IUser extends Document {
  _id: string
  email: string
  phone?: string
  name?: string
  role: 'patient' | 'provider'
  isActive: boolean
  createdAt: Date
  updatedAt: Date
  
  // Patient-specific fields
  patientProfile?: {
    age?: number
    location?: string
    preferredLanguage?: string
    insuranceProvider?: string
  }
  
  // Provider-specific fields
  providerProfile?: {
    specialty: string
    licenseNumber: string
    yearsExperience?: number
    city: string
    state: string
    basePriceUSD: number
    acceptsInsurance: boolean
    availableForConsults: boolean
    bio?: string
  }
}

const UserSchema = new Schema<IUser>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    phone: {
      type: String,
      trim: true,
    },
    name: {
      type: String,
      trim: true,
    },
    role: {
      type: String,
      enum: ['patient', 'provider'],
      required: true,
      default: 'patient',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    patientProfile: {
      age: { type: Number, min: 0, max: 150 },
      location: { type: String, trim: true },
      preferredLanguage: { type: String, default: 'English' },
      insuranceProvider: { type: String, trim: true },
    },
    providerProfile: {
      specialty: {
        type: String,
        enum: ['Orthodontics', 'Oral Surgery', 'Jaw Surgery', 'General Dentistry'],
      },
      licenseNumber: { type: String, trim: true },
      yearsExperience: { type: Number, min: 0 },
      city: { type: String, trim: true },
      state: { type: String, trim: true },
      basePriceUSD: { type: Number, min: 0 },
      acceptsInsurance: { type: Boolean, default: false },
      availableForConsults: { type: Boolean, default: true },
      bio: { type: String, trim: true, maxlength: 1000 },
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
)

// Indexes for performance
UserSchema.index({ email: 1 })
UserSchema.index({ role: 1 })
UserSchema.index({ 'providerProfile.specialty': 1 })
UserSchema.index({ 'providerProfile.city': 1, 'providerProfile.state': 1 })

// Validation middleware
UserSchema.pre('save', function (next) {
  if (this.role === 'provider' && !this.providerProfile) {
    next(new Error('Provider profile is required for provider users'))
  }
  next()
})

export const User = models.User || model<IUser>('User', UserSchema)