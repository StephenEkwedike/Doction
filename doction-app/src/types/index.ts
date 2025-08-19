// Core Domain Types
export interface User {
  id: string
  email: string
  phone?: string
  name?: string
  role: 'patient' | 'provider'
  isActive: boolean
  avatar?: string
  lastActiveAt?: Date
  createdAt: Date
  updatedAt: Date
}

export interface PatientProfile {
  age?: number
  location?: string
  preferredLanguage?: string
  insuranceProvider?: string
}

export interface ProviderProfile {
  specialty: 'Orthodontics' | 'Oral Surgery' | 'Jaw Surgery' | 'General Dentistry'
  licenseNumber: string
  yearsExperience?: number
  city: string
  state: string
  basePriceUSD: number
  acceptsInsurance: boolean
  availableForConsults: boolean
  bio?: string
  rating?: number
  responseTime?: string
}

export interface Message {
  id: string
  conversationId: string
  senderId: string
  senderRole: 'patient' | 'provider'
  content: string
  messageType: 'text' | 'attachment' | 'system'
  attachments?: Attachment[]
  isRead: boolean
  createdAt: Date
}

export interface Attachment {
  id: string
  filename: string
  url: string
  fileType: string
  size: number
}

export interface Conversation {
  id: string
  patientId: string
  providerId: string
  patient?: User
  provider?: User
  offerId?: string
  status: 'active' | 'archived' | 'closed'
  lastMessage?: string
  lastMessageAt?: Date
  unreadCount: number
  messages: Message[]
  metadata: {
    specialty?: string
    estimatedPrice?: number
    consultScheduled?: Date
    consultCompleted?: boolean
  }
  createdAt: Date
  updatedAt: Date
}

export interface Offer {
  id: string
  providerId: string
  patientId: string
  provider?: User
  specialty: string
  procedure?: string
  priceUSD: number
  originalQuotePrice?: number
  discountAmount: number
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
  isExpired: boolean
  createdAt: Date
  updatedAt: Date
}

export interface CaseProfile {
  id: string
  patientId: string
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

// API Response Types
export interface ApiResponse<T> {
  data: T
  message?: string
  success: boolean
}

export interface PaginatedResponse<T> {
  data: T[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
  success: boolean
}

export interface ApiError {
  message: string
  status: number
  code?: string
  details?: any
}

// UI State Types
export interface LoadingState {
  isLoading: boolean
  error?: string | null
}

export interface NotificationState {
  id: string
  type: 'success' | 'error' | 'warning' | 'info'
  message: string
  duration?: number
  action?: {
    label: string
    onClick: () => void
  }
}

// Form Types
export interface ContactForm {
  name: string
  email: string
  phone?: string
  message: string
}

export interface MessageForm {
  content: string
  attachments?: File[]
}

export interface SearchFilters {
  specialty?: string
  location?: string
  priceRange?: {
    min: number
    max: number
  }
  acceptsInsurance?: boolean
  availableForConsults?: boolean
}

// Real-time Event Types
export interface SocketEvent {
  type: 'message' | 'offer' | 'conversation_updated' | 'user_online' | 'user_offline'
  data: any
}

export interface MessageEvent {
  conversationId: string
  message: Message
}

export interface OfferEvent {
  patientId: string
  offer: Offer
}

// Navigation Types
export interface NavigationItem {
  icon: React.ElementType
  label: string
  href: string
  matchPattern?: string
  badge?: number
  requiresAuth?: boolean
}

// Theme Types
export interface Theme {
  mode: 'light' | 'dark'
  primaryColor: string
  accentColor: string
}