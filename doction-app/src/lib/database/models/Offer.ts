import { Schema, model, models, Document, Types } from 'mongoose'

export interface IOffer extends Document {
  _id: string
  providerId: Types.ObjectId
  patientId: Types.ObjectId
  caseProfileId?: Types.ObjectId
  specialty: string
  procedure?: string
  priceUSD: number
  originalQuotePrice?: number
  discountAmount?: number
  status: 'pending' | 'accepted' | 'declined' | 'expired'
  validUntil: Date
  notes?: string
  includesConsultation: boolean
  estimatedDuration?: string
  paymentOptions: {
    acceptsCash: boolean
    acceptsInsurance: boolean
    acceptsFinancing: boolean
    paymentPlanAvailable: boolean
  }
  location: {
    city: string
    state: string
    address?: string
    zipCode?: string
  }
  metadata: {
    matchingScore?: number
    generatedBy: 'ai' | 'manual'
    sourceQuote?: string
  }
  createdAt: Date
  updatedAt: Date
}

const OfferSchema = new Schema<IOffer>(
  {
    providerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    patientId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    caseProfileId: {
      type: Schema.Types.ObjectId,
      ref: 'CaseProfile',
    },
    specialty: {
      type: String,
      required: true,
      enum: ['Orthodontics', 'Oral Surgery', 'Jaw Surgery', 'General Dentistry'],
    },
    procedure: {
      type: String,
      trim: true,
    },
    priceUSD: {
      type: Number,
      required: true,
      min: 0,
    },
    originalQuotePrice: {
      type: Number,
      min: 0,
    },
    discountAmount: {
      type: Number,
      min: 0,
      default: 0,
    },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'declined', 'expired'],
      default: 'pending',
    },
    validUntil: {
      type: Date,
      required: true,
      default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
    },
    notes: {
      type: String,
      trim: true,
      maxlength: 1000,
    },
    includesConsultation: {
      type: Boolean,
      default: true,
    },
    estimatedDuration: {
      type: String,
      trim: true,
    },
    paymentOptions: {
      acceptsCash: { type: Boolean, default: true },
      acceptsInsurance: { type: Boolean, default: false },
      acceptsFinancing: { type: Boolean, default: false },
      paymentPlanAvailable: { type: Boolean, default: false },
    },
    location: {
      city: { type: String, required: true, trim: true },
      state: { type: String, required: true, trim: true },
      address: { type: String, trim: true },
      zipCode: { type: String, trim: true },
    },
    metadata: {
      matchingScore: { type: Number, min: 0, max: 100 },
      generatedBy: {
        type: String,
        enum: ['ai', 'manual'],
        default: 'ai',
      },
      sourceQuote: { type: String, trim: true },
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
)

// Indexes for performance
OfferSchema.index({ patientId: 1, status: 1 })
OfferSchema.index({ providerId: 1, status: 1 })
OfferSchema.index({ specialty: 1, status: 1 })
OfferSchema.index({ validUntil: 1 })
OfferSchema.index({ createdAt: -1 })

// Virtual for populated provider info
OfferSchema.virtual('provider', {
  ref: 'User',
  localField: 'providerId',
  foreignField: '_id',
  justOne: true,
})

// Virtual for populated patient info
OfferSchema.virtual('patient', {
  ref: 'User',
  localField: 'patientId',
  foreignField: '_id',
  justOne: true,
})

// Virtual for checking if offer is expired
OfferSchema.virtual('isExpired').get(function() {
  return this.validUntil < new Date() && this.status === 'pending'
})

// Auto-expire offers
OfferSchema.pre('find', function() {
  this.where({
    $or: [
      { status: { $ne: 'pending' } },
      { validUntil: { $gte: new Date() } }
    ]
  })
})

export const Offer = models.Offer || model<IOffer>('Offer', OfferSchema)