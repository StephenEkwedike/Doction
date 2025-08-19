import { Schema, model, models, Document, Types } from 'mongoose'

export interface ICaseProfile extends Document {
  _id: string
  patientId: Types.ObjectId
  procedure?: string
  hasQuote: boolean
  providerName?: string
  quotedPriceUSD?: number
  location?: string
  travelOk: boolean
  age?: number
  urgency: 'low' | 'medium' | 'high'
  insuranceProvider?: string
  budgetRange?: {
    min: number
    max: number
  }
  preferredTimeframe?: string
  additionalNotes?: string
  extractedData: {
    rawText?: string
    sourceType: 'upload' | 'manual' | 'chat'
    fileName?: string
    extractionMethod?: 'pdf' | 'ocr' | 'manual'
  }
  status: 'active' | 'matched' | 'completed' | 'cancelled'
  matchingCriteria: {
    specialties: string[]
    maxDistance?: number
    acceptsInsurance?: boolean
    paymentPlanRequired?: boolean
  }
  createdAt: Date
  updatedAt: Date
}

const CaseProfileSchema = new Schema<ICaseProfile>(
  {
    patientId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    procedure: {
      type: String,
      trim: true,
    },
    hasQuote: {
      type: Boolean,
      default: false,
    },
    providerName: {
      type: String,
      trim: true,
    },
    quotedPriceUSD: {
      type: Number,
      min: 0,
    },
    location: {
      type: String,
      trim: true,
    },
    travelOk: {
      type: Boolean,
      default: false,
    },
    age: {
      type: Number,
      min: 0,
      max: 150,
    },
    urgency: {
      type: String,
      enum: ['low', 'medium', 'high'],
      default: 'medium',
    },
    insuranceProvider: {
      type: String,
      trim: true,
    },
    budgetRange: {
      min: { type: Number, min: 0 },
      max: { type: Number, min: 0 },
    },
    preferredTimeframe: {
      type: String,
      trim: true,
    },
    additionalNotes: {
      type: String,
      trim: true,
      maxlength: 2000,
    },
    extractedData: {
      rawText: { type: String },
      sourceType: {
        type: String,
        enum: ['upload', 'manual', 'chat'],
        required: true,
      },
      fileName: { type: String },
      extractionMethod: {
        type: String,
        enum: ['pdf', 'ocr', 'manual'],
      },
    },
    status: {
      type: String,
      enum: ['active', 'matched', 'completed', 'cancelled'],
      default: 'active',
    },
    matchingCriteria: {
      specialties: [{
        type: String,
        enum: ['Orthodontics', 'Oral Surgery', 'Jaw Surgery', 'General Dentistry'],
      }],
      maxDistance: { type: Number, min: 0 },
      acceptsInsurance: { type: Boolean },
      paymentPlanRequired: { type: Boolean, default: false },
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
)

// Indexes for performance
CaseProfileSchema.index({ patientId: 1, status: 1 })
CaseProfileSchema.index({ status: 1, createdAt: -1 })
CaseProfileSchema.index({ 'matchingCriteria.specialties': 1 })
CaseProfileSchema.index({ quotedPriceUSD: 1 })

// Virtual for populated patient info
CaseProfileSchema.virtual('patient', {
  ref: 'User',
  localField: 'patientId',
  foreignField: '_id',
  justOne: true,
})

// Virtual for calculating savings potential
CaseProfileSchema.virtual('savingsPotential').get(function() {
  if (this.quotedPriceUSD && this.budgetRange?.max) {
    return this.quotedPriceUSD - this.budgetRange.max
  }
  return 0
})

export const CaseProfile = models.CaseProfile || model<ICaseProfile>('CaseProfile', CaseProfileSchema)