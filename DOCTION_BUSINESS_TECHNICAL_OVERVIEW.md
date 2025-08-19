# Doction: Healthcare Provider Matching Platform
## Business & Technical Overview

---

## 🏥 **BUSINESS MODEL OVERVIEW**

### **Core Concept**
Doction is a "reverse marketplace" for surgeries and dental procedures where:
- Patients upload existing quotes/estimates they've received
- Healthcare providers can view these requests and offer better deals/counter-quotes
- AI facilitates matching and negotiation between patients and providers

### **Target Market**
- **Primary**: Procedures where patients shop around (orthodontics, jaw surgery, cosmetic procedures)
- **Secondary**: Out-of-pocket medical procedures not heavily covered by insurance
- **Geographic Focus**: Starting with Austin, TX and LA markets

### **Revenue Streams**

#### 1. **Provider Subscription Fee**
- **Amount**: $5,000/month per practitioner
- **Model**: Free until first client acquired via platform
- **Payment**: Automated Stripe invoicing after first successful client booking
- **Value Prop**: High ROI (one jaw surgery @ $20k+ justifies monthly fee)

#### 2. **Appointment Setting Fee**
- **Amount**: $75 per Calendly booking
- **Trigger**: Automatic charge when patient books consultation with provider
- **Integration**: Calendly webhook → Stripe payment from provider's saved payment method

#### 3. **Fight Mode Premium Feature**
- **Amount**: $20/month subscription for patients
- **Function**: AI agent negotiates on patient's behalf for better prices/terms
- **Alternative**: $5 per negotiation attempt (pay-per-use)

#### 4. **Data Monetization** (Future)
- Anonymized pricing data sold to market research firms, insurance companies
- Healthcare analytics companies interested in procedure cost trends

### **Go-to-Market Strategy**
1. **Provider Acquisition**: Use public NPI registry to pre-populate provider database
2. **Patient Acquisition**: Target Reddit forums (r/jawsurgery, etc.), Instagram/TikTok ads
3. **Local Market Focus**: Austin/LA healthcare networks, hire local sales reps
4. **Community Outreach**: Patient forums where people seek cost-effective medical solutions

---

## 🛠 **TECHNICAL ARCHITECTURE**

### **Tech Stack**
- **Frontend**: Next.js 15.2.4 with TypeScript
- **Styling**: Tailwind CSS 4.0
- **Backend**: Next.js API Routes
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: Custom auth system with Zustand state management
- **Payments**: Stripe integration
- **Scheduling**: Calendly integration
- **Messaging**: Socket.io for real-time chat
- **AI**: OpenAI API integration for document processing and matching
- **File Processing**: PDF.js for document parsing, Tesseract.js for OCR
- **Logging**: Custom Winston-based logging system

### **Key Dependencies**
```json
{
  "@ai-sdk/openai": "^2.0.7",
  "stripe": "Connected via API",
  "mongoose": "^8.17.1",
  "socket.io-client": "^4.8.1",
  "tesseract.js": "^6.0.1",
  "pdfjs-dist": "^5.4.54"
}
```

---

## 🎯 **FEATURE BREAKDOWN WITH FILE LOCATIONS**

### **1. Patient Intake System**
**Location**: `doction-app/app/page.tsx`
**Supporting Files**:
- `doction-app/components/chat-view.tsx` - Main chat interface
- `doction-app/components/chat_composer.tsx` - Message input component
- `doction-app/components/simple-chat-composer.tsx` - Simplified chat input

**Functionality**:
- ChatGPT-style interface for natural conversation
- Collects patient information: procedure type, existing quotes, location preferences
- File upload for medical documents, X-rays, existing quotes (PDF/image support)
- AI extracts key information: provider name, quoted price, procedure details

### **2. Document Processing & AI Matching**
**Location**: `doction-app/app/api/extract-case/route.ts`
**Supporting Files**:
- `doction-app/src/services/ChatProcessingService.ts` - AI processing logic
- `doction-app/app/api/match-offers/route.ts` - Provider matching logic
- `doction-app/app/api/match-offers/from-text/route.ts` - Text-based matching

**Functionality**:
- OCR processing of uploaded documents using Tesseract.js
- AI analysis of patient needs using OpenAI API
- Automatic routing to relevant practitioners based on:
  - Procedure type and complexity
  - Geographic location
  - Provider specialties and availability
- Matching algorithm considers patient budget and provider pricing

### **3. Provider Management System**
**Location**: `doction-app/app/api/users/route.ts`
**Supporting Files**:
- `doction-app/src/lib/database/models/User.ts` - User/Provider data model
- `doction-app/src/lib/dao/impl/UserDao.ts` - Provider data access
- `doction-app/src/lib/services/impl/UserService.ts` - Provider business logic
- `doction-app/src/lib/data/providers.ts` - Provider data management

**Functionality**:
- Provider profiles with specialties, locations, pricing
- Integration with NPI (National Provider Identifier) registry for provider verification
- Automatic provider discovery using public medical databases
- Provider onboarding and verification system

### **4. Real-Time Chat System**
**Location**: `doction-app/app/room/[id]/page.tsx` (Patient view)
**Alternative**: `doction-app/app/provider/room/[id]/page.tsx` (Provider view)
**Supporting Files**:
- `doction-app/components/message-bubble.tsx` - Chat message display
- `doction-app/src/components/messaging/MessageThread.tsx` - Message threading
- `doction-app/src/components/messaging/ConversationList.tsx` - Conversation management
- `doction-app/src/stores/messagingStore.ts` - Chat state management
- `doction-app/src/stores/chatStore.ts` - Chat data persistence

**Functionality**:
- Socket.io powered real-time messaging
- Secure patient-provider communication
- File sharing capabilities within chat
- Message encryption and HIPAA compliance features
- Chat history and conversation threading

### **5. Appointment Scheduling System**
**Location**: Calendly Integration (External)
**Supporting Files**:
- `doction-app/app/api/notify/route.ts` - Notification system for bookings
- Webhook handlers (to be implemented) for Calendly events

**Functionality**:
- Embedded Calendly booking within chat interface
- Automatic $75 fee charging via Stripe when appointment scheduled
- Appointment confirmation and reminder system
- Integration with provider calendars

### **6. Payment Processing**
**Location**: Stripe Integration (External)
**Supporting Files**:
- Payment processing logic distributed across API routes
- Provider billing automation
- Subscription management for Fight Mode

**Functionality**:
- Provider subscription billing ($5,000/month after first client)
- Per-appointment fees ($75 per Calendly booking)
- Fight Mode subscription billing ($20/month)
- Payment method storage and management
- Automated invoicing and dunning

### **7. Fight Mode (AI Negotiation)**
**Status**: To be implemented
**Proposed Location**: `doction-app/app/api/fight-mode/`

**Functionality**:
- AI-powered price negotiation on patient's behalf
- Professional communication with providers
- Leverage competing offers for better pricing
- Negotiation tracking and success metrics
- Different negotiation styles (polite, firm, aggressive)

### **8. Authentication & User Management**
**Location**: `doction-app/components/auth-modal.tsx`
**Supporting Files**:
- `doction-app/src/components/layout/AuthProvider.tsx` - Auth context
- `doction-app/src/stores/authStore.ts` - Authentication state
- `doction-app/app/layout.tsx` - App layout with auth

**Functionality**:
- User registration and login
- Role-based access (Patient vs Provider)
- Session management
- Profile management for both user types

### **9. Comprehensive Logging System**
**Location**: `doction-app/src/lib/logger/` (excluded from git via .gitignore)
**Files**:
- `Logger.ts` - Main logging class
- `init.ts` - Logger initialization
- `middleware.ts` - Request logging middleware

**Functionality**:
- Detailed API request/response logging
- Error tracking and monitoring
- Performance metrics collection
- User activity logging
- HIPAA-compliant audit trails

### **10. Admin Dashboard & Analytics**
**Location**: `doction-app/app/dev-logs/page.tsx` (Development logs viewer)
**Future**: Dedicated admin dashboard

**Functionality**:
- Provider management interface
- Patient case monitoring
- Revenue analytics and reporting
- System health monitoring
- Conversion tracking (quotes → bookings → procedures)

---

## 🔒 **SECURITY & COMPLIANCE**

### **HIPAA Compliance**
- Encrypted data transmission and storage
- Audit logs for all medical data access
- User consent tracking
- Secure file upload and storage
- Data retention policies

### **Data Protection**
- `.gitignore` excludes sensitive files:
  - `logs/` directory (local only)
  - `.env.local` (API keys, database credentials)
  - `node_modules/`
  - Build artifacts

### **Payment Security**
- Stripe PCI DSS compliance
- Tokenized payment method storage
- Secure webhook signature verification
- Automated billing with dispute handling

---

## 📊 **DATABASE SCHEMA**

### **Core Models** (`doction-app/src/lib/database/models/`)

#### **User.ts**
- User authentication and profile data
- Role differentiation (patient/provider)
- Contact information and preferences

#### **CaseProfile.ts**
- Patient medical case information
- Procedure details and requirements
- Document attachments and references

#### **Conversation.ts**
- Chat messages and threading
- Participant management
- Message encryption and compliance

#### **Offer.ts**
- Provider quotes and counter-offers
- Pricing and terms details
- Offer status tracking

---

## 🚀 **DEPLOYMENT & INFRASTRUCTURE**

### **Environment Configuration**
- Development: Local MongoDB, test Stripe keys
- Production: MongoDB Atlas, live Stripe keys
- Environment variables managed via `.env.local`

### **Build Process**
```bash
npm run build    # Next.js production build
npm run start    # Production server
npm run dev      # Development with Turbopack
npm run lint     # Code quality checks
```

### **Monitoring & Observability**
- Custom logging system with log rotation
- API endpoint monitoring
- Payment transaction tracking
- User conversion funnel analytics

---

## 📈 **GROWTH STRATEGY**

### **Phase 1: MVP (Current)**
- Core chat and matching functionality
- Basic provider onboarding
- Stripe payment integration
- Austin/LA market focus

### **Phase 2: Scale**
- Fight Mode implementation
- Advanced provider analytics
- Multi-market expansion
- Mobile app development

### **Phase 3: Platform**
- Data monetization products
- API for third-party integrations
- White-label solutions for healthcare systems
- International expansion

---

## 🔧 **DEVELOPMENT PRIORITIES**

### **Immediate**
1. Complete Calendly-Stripe webhook integration
2. Implement provider NPI database population
3. Enhance AI matching algorithm accuracy
4. Set up production deployment pipeline

### **Short-term**
1. Fight Mode development and testing
2. Provider onboarding automation
3. Patient acquisition funnel optimization
4. Admin dashboard for operations

### **Medium-term**
1. Mobile-responsive improvements
2. Advanced analytics and reporting
3. Provider success metrics tracking
4. Customer support integration

This overview provides your new developer with a comprehensive understanding of Doction's business model, technical architecture, and development roadmap. Each feature is mapped to specific file locations for easy navigation and development planning.