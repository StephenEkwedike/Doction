import { ChatMessage } from '@/src/stores/chatStore'
import { getProvidersBySpecialty, searchProviders } from '@/src/lib/data/providers'
import { User } from '@/src/types'
import { ProviderNotificationService } from './ProviderNotificationService'
import { logger } from '@/src/lib/logger/Logger'

type WebSearchHit = { title: string; url: string; snippet?: string }
type LLMMessage = { role: 'system' | 'user' | 'assistant'; content: string }

export interface ChatExternalTools {
  llm?: (messages: LLMMessage[]) => Promise<string>
  webSearch?: (q: string, opts?: { k?: number }) => Promise<WebSearchHit[]>
  defaultLocation?: () => Promise<{ city?: string; state?: string } | null>
}

export interface ProcessedChatResult {
  reply: string
  metadata?: {
    isProviderMatch: boolean
    matchedProviders?: User[]
    specialty?: string
    location?: string
    priceRange?: { min: number; max: number }
    urgency?: 'low' | 'medium' | 'high'
    intent: 'consultation' | 'information' | 'pricing' | 'scheduling' | 'general'
    citations?: WebSearchHit[]
    safety?: { emergencyFlag: boolean; disclaimerShown: boolean }
    domain?: 'medical' | 'off-domain'
    /** Parsed quote details if user pasted/uploaded a quote */
    quote?: ParsedQuote | null
  }
  shouldCreateProviderMatches?: boolean
  suggestedActions?: string[]
  /** New: signal to kick off a reverse-auction broadcast */
  shouldCreateAuctionRequest?: boolean
  /** New: ready-to-send auction payload */
  auctionDraft?: AuctionDraft | null
}

// ---------- Reverse auction data ----------
export type ParsedQuote = {
  source?: string
  currency?: string
  total?: number
  components?: Array<{ label: string; amount?: number }>
  cptCodes?: string[]     // CPT like 99213, 15788, etc.
  icd10Codes?: string[]   // ICD-10 like K08.1, M54.5
  notes?: string
}

export type AuctionDraft = {
  baselineQuoteUSD?: number
  currency?: string
  components?: Array<{ label: string; amountUSD?: number }>
  cptCodes?: string[]
  icd10Codes?: string[]
  location?: { city?: string; state?: string }
  specialtyGuess?: string | null
  urgency: 'low' | 'medium' | 'high'
  deadlineHours?: number // e.g., respond within 72h
  userMessage: string
}

type Intent = 'consultation' | 'information' | 'pricing' | 'scheduling' | 'general'
type Urgency = 'low' | 'medium' | 'high'

const SYSTEM_PROMPT = `You are Doction: a chatty, concise medical navigator for ANY specialty.
You help users (a) understand options, (b) compare prices, and (c) request competing offers (reverse auction) from licensed providers.
Stay medical-only. Do not diagnose or prescribe. Be concise and action-oriented. If emergency-suggestive, advise immediate emergency care.
When you cite the web, use reputable medical sources (.gov, .edu, NIH/CDC/Mayo/etc.).`

// Red-flag symptoms requiring emergency advice
const EMERGENCY_PATTERNS = [
  /chest\s*pain/i,
  /short(ness)?\s*of\s*breath/i,
  /faint(ing)?|passed\s*out/i,
  /stroke|facial\s*droop|slurred\s*speech/i,
  /uncontrolled\s*bleeding/i,
  /allergic\s*reaction|anaphylaxis/i,
  /suicidal|hurt\s*myself/i,
]

// Broad medical allowlist & off-domain blocklist (keeps us on mission)
const MEDICAL_ALLOWLIST = [
  'doctor','clinic','hospital','urgent care','er','telehealth','insurance','copay','deductible','prior auth',
  'symptom','treatment','procedure','surgery','recovery','medication','side effect','therapy','imaging','mri','ct','x-ray','ultrasound','lab','blood test',
  // dental + beyond
  'orthodontist','oral surgeon','dentist','jaw','tmj','implant','root canal',
  // many specialties
  'cardiology','dermatology','endocrinology','ent','otolaryngology','gastroenterology','gi','general surgery',
  'hematology','infectious disease','nephrology','neurology','neurosurgery','obgyn','gynecology','oncology',
  'ophthalmology','optometry','orthopedics','plastic surgery','psychiatry','psychology','pulmonology',
  'rheumatology','urology','pain management','anesthesiology','pediatrics','primary care','family medicine',
  // admin/price/auctions
  'quote','estimate','cpt','icd-10','icd10','cash pay','self pay','out of pocket','price match','bidding','auction'
]

// Heuristics to reject off-domain chat (tech, sports, politics, programming, general chit-chat, etc.)
const OFF_DOMAIN_BLOCKLIST = [
  'stock','crypto','code','git','react','spring','football','nba','soccer','politics','election','celebrity','movie','music rights','airline','hotel','restaurant','hiking','car wash','tesla','marketing funnel','seo','sales cadence','cold email'
]

// ----------------------
// Extraction & intent
// ----------------------
function isEmergency(msg: string) {
  return EMERGENCY_PATTERNS.some(re => re.test(msg))
}

function detectSpecialty(message: string): string | null {
  const map: Record<string, string[]> = {
    'primary care': ['primary care','family medicine','pcp','internal medicine','general practitioner','annual physical'],
    'cardiology': ['cardiology','cardiologist','heart','ekg','stress test'],
    'dermatology': ['dermatology','dermatologist','skin','acne','mole','rash','psoriasis','eczema'],
    'endocrinology': ['endocrinology','endocrinologist','thyroid','diabetes','hashimoto','adrenal'],
    'ent': ['ent','otolaryngology','ear nose throat','tonsil','sinus','septum','hearing'],
    'gastroenterology': ['gastroenterology','gastroenterologist','gi','colonoscopy','endoscopy','gerd','ibs'],
    'general surgery': ['hernia','gallbladder','appendix','general surgery','surgeon'],
    'hematology': ['hematology','oncology hematology','blood disorder'],
    'infectious disease': ['infectious disease','id doctor','hiv specialist'],
    'nephrology': ['nephrology','nephrologist','kidney','dialysis'],
    'neurology': ['neurology','neurologist','migraine','seizure','epilepsy','neuropathy'],
    'neurosurgery': ['neurosurgery','neurosurgeon','spine surgery','brain surgery'],
    'obgyn': ['obgyn','gynecology','gynecologist','obstetrics','pregnancy','fibroids','pap smear'],
    'oncology': ['oncology','oncologist','cancer','chemotherapy','radiation therapy'],
    'ophthalmology': ['ophthalmology','ophthalmologist','cataract','lasik','glaucoma','retina'],
    'optometry': ['optometrist','eye exam','contact lenses','glasses'],
    'orthopedics': ['orthopedics','orthopedic','knee','hip','shoulder','acl','meniscus','rotator cuff','fracture'],
    'plastic surgery': ['plastic surgery','cosmetic surgery','rhinoplasty','tummy tuck','liposuction','blepharoplasty'],
    'psychiatry': ['psychiatry','psychiatrist','med management','adhd meds','bipolar','schizophrenia'],
    'psychology': ['therapist','psychologist','cbt','therapy','counseling'],
    'pulmonology': ['pulmonology','pulmonologist','asthma','sleep apnea','copd'],
    'rheumatology': ['rheumatology','rheumatologist','lupus','ra','rheumatoid','sjogren'],
    'urology': ['urology','urologist','kidney stones','prostate','vasectomy'],
    'pain management': ['pain management','pain clinic','epidural','nerve block'],
    'anesthesiology': ['anesthesiology','anesthesiologist','sedation','asa'],
    'pediatrics': ['pediatrics','pediatrician','child checkup'],
    'radiology': ['radiology','imaging','mri','ct','x-ray','ultrasound','mammogram'],
    'lab': ['lab test','blood test','cbc','cmp','a1c','lipid panel'],
    // dental (still supported)
    'orthodontics': ['orthodontist','orthodontics','braces','invisalign','malocclusion','overbite','underbite'],
    'oral surgery': ['oral surgeon','oral surgery','wisdom teeth','extraction','implant','bone graft','tmj surgery'],
    'general dentistry': ['dentist','dental','cavity','cleaning','checkup','root canal','crown','bridge','toothache'],
  }

  const m = message.toLowerCase()
  let best: { s: string; hits: number } | null = null
  for (const [s, keys] of Object.entries(map)) {
    const hits = keys.reduce((acc, k) => acc + (m.includes(k) ? 1 : 0), 0)
    if (hits > 0 && (!best || hits > best.hits)) best = { s, hits }
  }
  return best?.s ?? null
}

async function detectLocation(message: string, defaultLocation?: ChatExternalTools['defaultLocation']) {
  const patterns = [
    /(?:in|near|around|at)\s+([A-Za-z][A-Za-z\s'.-]+?),?\s*([A-Z]{2})\b/g,
    /\b([A-Za-z][A-Za-z\s'.-]+?),\s*([A-Z]{2})\b/g,
    /\b(Austin|Dallas|Houston|San Antonio|Los Angeles|San Francisco|San Jose|Sacramento|New York|Chicago|Miami|Seattle|Boston|Atlanta)\b/gi,
    /\b(\d{5})(?:-\d{4})?\b/g,
  ]
  let city: string | undefined, state: string | undefined
  for (const re of patterns) {
    const m = [...message.matchAll(re)][0]
    if (!m) continue
    if (m.length >= 3) { city = (m[1]||'').trim(); state = (m[2]||'').trim().toUpperCase(); break }
    if (m.length >= 2) { city = (m[1]||'').trim(); break }
  }
  if (!city && !state && defaultLocation) {
    try { const v = await defaultLocation(); if (v?.city || v?.state) return v } catch {}
  }
  return { city, state }
}

function detectPriceRange(message: string): { min: number; max: number } | null {
  const m = message.toLowerCase()
  const asNumber = (s: string) => {
    const k = s.replace(/[, $]/g, '')
    if (/^\d+(\.\d+)?k$/.test(k)) return Math.round(parseFloat(k) * 1000)
    return parseInt(k, 10)
  }
  const range = /\$?\s*([\d.,]+k?)\s*(?:to|-|–|—)\s*\$?\s*([\d.,]+k?)/i.exec(m)
  if (range) {
    const min = asNumber(range[1]); const max = asNumber(range[2])
    if (Number.isFinite(min) && Number.isFinite(max) && min <= max) return { min, max }
  }
  const under = /(under|less\s*than|max(?:imum)?)\s*\$?\s*([\d.,]+k?)/i.exec(m)
  if (under) { const max = asNumber(under[2]); if (Number.isFinite(max)) return { min: 0, max } }
  const around = /(around|about|~)\s*\$?\s*([\d.,]+k?)/i.exec(m)
  if (around) { const p = asNumber(around[2]); if (Number.isFinite(p)) return { min: Math.round(p*0.8), max: Math.round(p*1.2) } }
  const budget = /(budget|price\s*range|spend)\s*(is|of|around|about|:)?\s*\$?\s*([\d.,]+k?)/i.exec(m)
  if (budget) { const p = asNumber(budget[3]); if (Number.isFinite(p)) return { min: 0, max: p } }
  return null
}

function detectUrgency(message: string): Urgency {
  const m = message.toLowerCase()
  const urgent = ['urgent','emergency','asap','immediately','right away','today','severe',"can't wait",'can’t wait']
  const medium = ['soon','this week','next week','within a month','whenever possible','not urgent']
  if (urgent.some(k => m.includes(k))) return 'high'
  if (medium.some(k => m.includes(k))) return 'medium'
  return 'low'
}

function detectIntent(message: string): Intent {
  const m = message.toLowerCase()
  const map: Record<Intent, string[]> = {
    consultation: ['looking for','need','find','consultation','treatment','see a','recommend a','second opinion'],
    pricing: ['cost','price','quote','estimate','affordable','budget','payment','cash pay','self pay','price match','bid','auction'],
    scheduling: ['appointment','schedule','book','available','availability','time slot'],
    information: ['what is','how does','tell me about','information','explain','risks','recovery','options'],
    general: [],
  }
  for (const [intent, keys] of Object.entries(map) as [Intent, string[]][]) {
    if (keys.some(k => m.includes(k))) return intent
  }
  return 'general'
}

// ---------------------------
// Quote parsing (from pasted/uploaded text)
// ---------------------------
const CURRENCY_RE = /(USD|\$|EUR|£|AUD|CAD)/i
const MONEY_RE = /\$?\s*([\d]{1,3}(?:[,.\s]\d{3})*(?:\.\d{2})?|\d+(?:\.\d{2})?)\b/
const CPT_RE = /\b(\d{5})\b/g
const ICD10_RE = /\b([A-TV-Z][0-9][A-Z0-9](?:\.[A-Z0-9]{1,4})?)\b/g
const COMPONENT_HINTS = ['surgeon','facility','anesthesia','implants','labs','imaging','radiology','pathology','consult','post-op','medication','therapy']

function parseQuoteFromText(text: string): ParsedQuote | null {
  if (!text || text.trim().length < 10) return null
  const t = text.replace(/\u00A0/g, ' ')
  const currencyMatch = t.match(CURRENCY_RE)?.[1]
  const currency = currencyMatch?.toUpperCase() === 'USD' ? 'USD' :
                   currencyMatch === '$' ? 'USD' :
                   currencyMatch ? currencyMatch.toUpperCase() : 'USD'

  // total: prefer lines with "total|estimate|amount due"
  const lines = t.split(/\n|\r/).map(l => l.trim()).filter(Boolean)
  let total: number | undefined
  for (const l of lines) {
    if (/total|estimate|amount due|grand total/i.test(l)) {
      const m = l.match(MONEY_RE)
      if (m) { total = Number(String(m[1]).replace(/[,\s]/g, '')); break }
    }
  }
  if (!total) {
    const allAmounts = Array.from(t.matchAll(MONEY_RE)).map(m => Number(String(m[1]).replace(/[,\s]/g, '')))
    const plausible = allAmounts.filter(n => n && n > 30)
    if (plausible.length) total = Math.max(...plausible)
  }

  // components
  const components: Array<{ label: string; amount?: number }> = []
  for (const l of lines) {
    if (COMPONENT_HINTS.some(h => l.toLowerCase().includes(h))) {
      const amount = l.match(MONEY_RE)?.[1]
      components.push({
        label: l.replace(MONEY_RE, '').trim(),
        amount: amount ? Number(String(amount).replace(/[,\s]/g, '')) : undefined
      })
    }
  }

  // codes
  const cptCodes = Array.from(t.matchAll(CPT_RE)).map(m => m[1])
  const icd10Codes = Array.from(t.matchAll(ICD10_RE)).map(m => m[1])

  return {
    source: 'user-supplied',
    currency,
    total,
    components: components.length ? components : undefined,
    cptCodes: cptCodes.length ? Array.from(new Set(cptCodes)) : undefined,
    icd10Codes: icd10Codes.length ? Array.from(new Set(icd10Codes)) : undefined,
    notes: undefined
  }
}

// ----------------------
// Domain control
// ----------------------
function isMedicalDomain(message: string): boolean {
  const m = message.toLowerCase()
  const allowHit = MEDICAL_ALLOWLIST.some(k => m.includes(k))
  const blockHit = OFF_DOMAIN_BLOCKLIST.some(k => m.includes(k))
  // If it mentions medical terms, allow—even if block words appear (e.g., "insurance app").
  // Otherwise block if it looks off-domain.
  return allowHit || !blockHit
}

function offDomainRefocus(): string {
  return "I'm your medical assistant. Ask me about procedures, quotes, insurance basics, or provider options. If you have a quote please upload it (optional) to start a price match."
}

// ----------------------
// Provider scoring
// ----------------------
function scoreProvider(provider: User, opts: {
  specialty?: string | null
  loc?: { city?: string; state?: string }
  price?: { min: number; max: number } | null
  urgency: Urgency
}) {
  const p = provider.providerProfile!
  let score = 0
  if (opts.specialty && p.specialty?.toLowerCase().includes(opts.specialty)) score += 40
  if (opts.loc?.city && p.city.toLowerCase().includes(opts.loc.city.toLowerCase())) score += 20
  if (opts.loc?.state && p.state.toLowerCase().includes((opts.loc.state||'').toLowerCase())) score += 10
  if (opts.price) {
    const { min, max } = opts.price
    if (p.basePriceUSD >= min && p.basePriceUSD <= max) score += 20
    else if (p.basePriceUSD <= max * 1.2) score += 8
  }
  score += Math.min(10, (p.rating || 0) * 2)
  if (opts.urgency === 'high') {
    if (/^<\s*2\s*hrs/i.test(p.responseTime)) score += 10
    else if (/same\s*day/i.test(p.responseTime)) score += 7
    else if (/1-2\s*days/i.test(p.responseTime)) score += 4
  }
  return score
}

function rerankProviders(providers: User[], opts: {
  specialty?: string | null
  loc?: { city?: string; state?: string }
  price?: { min: number; max: number } | null
  urgency: Urgency
}) {
  return [...providers]
    .map(u => ({ u, s: scoreProvider(u, opts) }))
    .sort((a,b) => b.s - a.s)
    .map(({ u }) => u)
}

// ----------------------
// LLM / Web augmentation
// ----------------------
async function generateMedicalInfo(
  userMsg: string,
  tools?: ChatExternalTools
): Promise<{ text: string; citations: WebSearchHit[] }> {
  // If neither tool is provided, give safe on-device help
  if (!tools?.llm && !tools?.webSearch) {
    return {
      text: "Here’s general medical guidance. Share your symptoms/procedure, city/state, and budget, and I’ll match you with licensed providers. For urgent or severe symptoms, seek in-person care immediately.",
      citations: []
    }
  }

  let citations: WebSearchHit[] = []
  if (tools.webSearch) {
    try {
      citations = await tools.webSearch(userMsg, { k: 3 })
    } catch (e) {
      logger.warn('chat', 'webSearch failed', { err: String(e) })
    }
  }

  if (tools.llm) {
    try {
      const citeBlock = citations.length
        ? `\n\nSources:\n${citations.map((c, i) => `${i+1}. ${c.title} — ${c.url}`).join('\n')}`
        : ''
      const ans = await tools.llm([
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userMsg },
        { role: 'assistant', content: 'Answer in 3–6 concise paragraphs or tight bullets. Avoid diagnosis; provide next steps.' }
      ])
      return { text: ans + citeBlock, citations }
    } catch (e) {
      logger.warn('chat', 'llm failed', { err: String(e) })
    }
  }

  if (citations.length) {
    return {
      text: "Here are reputable medical sources related to your question.\n\n" +
            citations.map(c => `• ${c.title} — ${c.url}`).join('\n') +
            "\n\nFor personalized advice, consult a licensed clinician.",
      citations
    }
  }

  return {
    text: "Tell me your procedure, city/state, and if you have a quote please upload it (optional). I'll help you request competing offers from licensed providers. For urgent symptoms, seek in-person care.",
    citations: []
  }
}

// ----------------------
// Service
// ----------------------
export class ChatProcessingService {
  private static instance: ChatProcessingService
  private notificationService: ProviderNotificationService
  private tools?: ChatExternalTools

  static getInstance(tools?: ChatExternalTools): ChatProcessingService {
    if (!ChatProcessingService.instance) {
      ChatProcessingService.instance = new ChatProcessingService(tools)
    }
    return ChatProcessingService.instance
  }

  constructor(tools?: ChatExternalTools) {
    this.notificationService = ProviderNotificationService.getInstance()
    this.tools = tools
  }

  async processMessage(message: string, conversationHistory: ChatMessage[]): Promise<ProcessedChatResult> {
    logger.debug('chat', 'Processing message', { len: message.length, turns: conversationHistory.length })

    const emergencyFlag = isEmergency(message)
    const domainOk = isMedicalDomain(message)
    const specialty = detectSpecialty(message)
    const loc = await detectLocation(message, this.tools?.defaultLocation)
    const priceRange = detectPriceRange(message)
    const urgency = detectUrgency(message)
    const intent = detectIntent(message)

    // Try to parse a quote from the user's text (useful if they pasted an estimate)
    const parsedQuote = parseQuoteFromText(message)

    logger.info('chat', 'extraction', {
      domainOk, emergencyFlag, specialty, hasLoc: !!(loc.city||loc.state),
      hasPrice: !!priceRange, urgency, intent, hasQuote: !!parsedQuote
    })

    // Emergency handoff
    if (emergencyFlag) {
      const reply = "⚠️ If you’re experiencing severe symptoms (e.g., chest pain, trouble breathing, stroke signs, uncontrolled bleeding), call your local emergency number or go to the nearest ER now. I can help with follow-up care after you’re safe."
      return {
        reply,
        metadata: {
          isProviderMatch: false,
          specialty: specialty || undefined,
          location: loc.city || loc.state ? `${loc.city ?? ''}${loc.city && loc.state ? ', ' : ''}${loc.state ?? ''}` : undefined,
          priceRange: priceRange || undefined,
          urgency, intent, safety: { emergencyFlag: true, disclaimerShown: true }, domain: 'medical'
        },
        shouldCreateProviderMatches: false,
        suggestedActions: ['Find nearby urgent care / ER','Share symptoms for triage','Arrange follow-up with a specialist']
      }
    }

    if (!domainOk) {
      const reply = [
        "_I stick to health topics._",
        offDomainRefocus(),
        "\n\nUpload a quote or tell me the procedure + city/state and I'll invite providers to beat your price."
      ].join(' ')
      return {
        reply,
        metadata: { isProviderMatch: false, urgency, intent, safety: { emergencyFlag: false, disclaimerShown: true }, domain: 'off-domain' },
        shouldCreateProviderMatches: false,
        suggestedActions: ['Describe your procedure','Add city/state','Paste your quote for parsing'],
        shouldCreateAuctionRequest: false,
        auctionDraft: null
      }
    }

    // If the user is price-focused or provided a quote, bias toward auction flow
    const priceOrAuctionIntent = intent === 'pricing' || !!parsedQuote

    let matchedProviders: User[] = []
    let reply = ''
    let citations: WebSearchHit[] = []
    let shouldCreateProviderMatches = false
    let shouldCreateAuctionRequest = false
    let auctionDraft: AuctionDraft | null = null

    // Try provider search (for visibility) unless purely informational
    const wantsProvider = priceOrAuctionIntent || intent === 'consultation' || intent === 'scheduling' || /find|recommend|see a|specialist/i.test(message)

    if (wantsProvider) {
      const base = specialty ? getProvidersBySpecialty(specialty) : searchProviders(message)
      const ranked = rerankProviders(base.filter(Boolean) as User[], { specialty, loc, price: priceRange, urgency })

      matchedProviders = ranked.filter(p => {
        const prof = p.providerProfile!
        const locOk = !loc.city && !loc.state ? true : [
          !loc.city || prof.city.toLowerCase().includes((loc.city||'').toLowerCase()),
          !loc.state || prof.state.toLowerCase().includes((loc.state||'').toLowerCase()),
        ].every(Boolean)
        const priceOk = !priceRange ? true : (prof.basePriceUSD >= priceRange.min && prof.basePriceUSD <= priceRange.max)
        return locOk && priceOk
      })

      if (matchedProviders.length) {
        shouldCreateProviderMatches = true
        reply = this.renderMatches(specialty || 'relevant', matchedProviders, loc, priceRange, urgency)
      } else {
        reply = this.noMatches(specialty || 'the right', loc, priceRange)
      }
    } else {
      // Information path
      const info = await generateMedicalInfo(message, this.tools)
      reply = this.disclaimer(info.text)
      citations = info.citations
    }

    // If price/auction intent or we parsed a quote -> prepare auction draft
    if (priceOrAuctionIntent) {
      shouldCreateAuctionRequest = true
      auctionDraft = this.buildAuctionDraft(message, loc, specialty, urgency, parsedQuote)
      // Append a short CTA about the auction to the reply
      reply += `\n\n**Reverse auction option:** I can post your request ${loc.city || loc.state ? `near ${[loc.city, loc.state].filter(Boolean).join(', ')}` : ''} and have verified providers submit lower offers within ${auctionDraft.deadlineHours} hours. If you have a quote please upload it (optional) for better comparisons. Shall I start that?`
    }

    const result: ProcessedChatResult = {
      reply,
      metadata: {
        isProviderMatch: matchedProviders.length > 0,
        matchedProviders,
        specialty: specialty || undefined,
        location: loc.city || loc.state ? `${loc.city ?? ''}${loc.city && loc.state ? ', ' : ''}${loc.state ?? ''}` : undefined,
        priceRange: priceRange || undefined,
        urgency, intent,
        citations: citations.length ? citations : undefined,
        safety: { emergencyFlag: false, disclaimerShown: true },
        domain: 'medical',
        quote: parsedQuote || undefined
      },
      shouldCreateProviderMatches,
      suggestedActions: this.suggestedActions(intent, specialty, matchedProviders.length > 0, urgency, !!(loc.city||loc.state), !!parsedQuote),
      shouldCreateAuctionRequest,
      auctionDraft
    }

    logger.info('chat', 'done', { matches: matchedProviders.length, notify: shouldCreateProviderMatches, auction: shouldCreateAuctionRequest })
    return result
  }

  private disclaimer(text: string) {
    const d = "_This is general medical information, not a diagnosis. For personal advice, consult a licensed clinician. If symptoms feel severe, seek urgent care._\n\n"
    return `${d}${text}`.trim()
  }

  private renderMatches(specialtyLabel: string, providers: User[], loc: { city?: string; state?: string }, price: { min: number; max: number } | null, urgency: Urgency) {
    const count = providers.length
    const locationText = loc.city || loc.state ? ` in ${[loc.city, loc.state].filter(Boolean).join(', ')}` : ''
    const priceText = price ? ` within $${price.min.toLocaleString()}–$${price.max.toLocaleString()}` : ''
    let out = `I found ${count} ${specialtyLabel} specialist${count>1?'s':''}${locationText}${priceText}.\n\n`
    providers.slice(0,3).forEach((provider, i) => {
      const p = provider.providerProfile!
      out += `**${i+1}. ${provider.name}**\n`
      out += `• ${p.specialty} — ${p.city}, ${p.state}\n`
      out += `• From $${p.basePriceUSD.toLocaleString()} • ${p.yearsExperience} yrs exp • ⭐️ ${p.rating}/5\n`
      out += `• Typical response: ${p.responseTime}${p.acceptsInsurance ? ' • Accepts insurance' : ''}\n\n`
    })
    if (count > 3) out += `*+${count-3} more available…*\n\n`
    out += urgency === 'high'
      ? `Time-sensitive? I can message multiple providers to secure the soonest slot. Who should I contact?`
      : `Want me to send a consultation request or compare availability/costs?`
    return out
  }

  private noMatches(specialtyLabel: string, loc: { city?: string; state?: string }, price: { min: number; max: number } | null) {
    const locationText = loc.city || loc.state ? ` in ${[loc.city, loc.state].filter(Boolean).join(', ')}` : ''
    let out = `I didn't find ${specialtyLabel} specialists${locationText}`
    if (price) out += ` within $${price.min.toLocaleString()}–$${price.max.toLocaleString()}`
    out += `. Options:\n\n`
    out += `• **Expand area** — include nearby cities.\n`
    out += `• **Adjust budget** — many offer payment plans.\n`
    out += `• **Start a reverse auction** — invite verified providers to beat your quote.\n\n`
    out += `Which should we try?`
    return out
  }

  private buildAuctionDraft(userMessage: string, loc: { city?: string; state?: string }, specialty: string | null, urgency: Urgency, parsedQuote?: ParsedQuote | null): AuctionDraft {
    // Heuristics: default 72h bidding window; use parsed totals if present
    const baselineUSD = parsedQuote?.total
    return {
      baselineQuoteUSD: baselineUSD,
      currency: parsedQuote?.currency || 'USD',
      components: parsedQuote?.components?.map(c => ({ label: c.label, amountUSD: c.amount })) || undefined,
      cptCodes: parsedQuote?.cptCodes,
      icd10Codes: parsedQuote?.icd10Codes,
      location: loc,
      specialtyGuess: specialty,
      urgency,
      deadlineHours: 72,
      userMessage
    }
  }

  private withDisclaimer(text: string) {
    const d = "_This is general medical information, not a diagnosis. For personal advice, consult a licensed clinician. If symptoms worsen or feel severe, seek urgent care._\n\n"
    return `${d}${text}`.trim()
  }

  private renderMatchReply(
    specialty: string,
    providers: User[],
    loc: { city?: string; state?: string },
    price: { min: number; max: number } | null,
    urgency: Urgency
  ) {
    const count = providers.length
    const locationText = loc.city || loc.state ? ` in ${[loc.city, loc.state].filter(Boolean).join(', ')}` : ''
    const priceText = price ? ` within $${price.min.toLocaleString()}–$${price.max.toLocaleString()}` : ''
    let out = `I found ${count} ${specialty} specialist${count>1?'s':''}${locationText}${priceText}.\n\n`
    providers.slice(0,3).forEach((provider, i) => {
      const p = provider.providerProfile!
      out += `**${i+1}. ${provider.name}**\n`
      out += `• ${p.specialty} — ${p.city}, ${p.state}\n`
      out += `• From $${p.basePriceUSD.toLocaleString()} • ${p.yearsExperience} yrs exp • ⭐️ ${p.rating}/5\n`
      out += `• Typical response: ${p.responseTime}${p.acceptsInsurance ? ' • Accepts insurance' : ''}\n\n`
    })
    if (count > 3) out += `*+${count-3} more available…*\n\n`
    out += urgency === 'high'
      ? `This sounds time-sensitive. I can message multiple providers at once to secure the soonest slot. Which should I contact?`
      : `Want me to send a consultation request or compare availability and costs?`
    return out
  }

  private renderNoMatchReply(specialty: string, loc: { city?: string; state?: string }, price: { min: number; max: number } | null) {
    const locationText = loc.city || loc.state ? ` in ${[loc.city, loc.state].filter(Boolean).join(', ')}` : ''
    let out = `I didn’t find ${specialty} specialists${locationText}`
    if (price) out += ` within $${price.min.toLocaleString()}–$${price.max.toLocaleString()}`
    out += `. Here are options:\n\n`
    out += `• **Expand area** — include nearby cities.\n`
    out += `• **Adjust budget** — many offer payment plans.\n`
    out += `• **Join waitlist** — I’ll notify you when new providers join.\n\n`
    out += `Which should we try?`
    return out
  }

  private suggestedActions(
    intent: Intent,
    specialty: string | null,
    hasMatches: boolean,
    urgency: Urgency,
    hasLocation: boolean,
    hasQuote: boolean
  ): string[] {
    const actions: string[] = []
    if (hasQuote || intent === 'pricing') {
      actions.push('Start reverse auction (invite providers to beat my quote)')
      actions.push('Set bidding deadline (24–96 hours)')
    }
    if (hasMatches) {
      actions.push('Send consultation request')
      actions.push('Compare provider pricing & ratings')
      actions.push('See next available appointment times')
      if (urgency === 'high') actions.push('Contact multiple providers for fastest slot')
    } else if (specialty) {
      actions.push('Expand search radius')
      actions.push('Adjust budget or request payment plans')
      actions.push('Join waitlist for this specialty')
    } else {
      actions.push('Describe your procedure or upload your quote')
      actions.push(hasLocation ? 'Share your budget' : 'Add your city/state')
    }
    return Array.from(new Set(actions))
  }

  // ----------------------
  // Notifications (unchanged)
  // ----------------------
  /**
   * Existing consultation notifications (unchanged).
   */
  async createProviderNotifications(
    patientName: string,
    patientId: string,
    originalMessage: string,
    matchedProviders: User[],
    metadata: {
      specialty?: string
      location?: string
      urgency?: Urgency
      priceRange?: { min: number; max: number }
    }
  ) {
    if (!matchedProviders.length) return null
    try {
      const result = await this.notificationService.createProviderRequest(
        patientName,
        patientId,
        originalMessage,
        matchedProviders,
        {
          specialty: metadata.specialty,
          location: metadata.location,
          urgency: metadata.urgency,
          priceRange: metadata.priceRange,
          additionalNotes: `Auto-generated from chat: "${originalMessage.slice(0,200)}..."`
        }
      )
      logger.info('providers', 'Created provider notifications', {
        requestId: result.requestId,
        notifiedProviders: result.notifiedProviders.length,
        errors: result.errors.length
      })
      return result
    } catch (error) {
      logger.error('providers', 'Failed to create provider notifications', { error: String(error) })
      return null
    }
  }

  /**
   * New: Reverse auction broadcast.
   * Reuses ProviderNotificationService with auction-specific metadata.
   */
  async createAuctionBroadcast(
    patientName: string,
    patientId: string,
    draft: AuctionDraft,
    candidateProviders: User[]
  ) {
    if (!candidateProviders.length) return null
    try {
      const extra = {
        specialty: draft.specialtyGuess || undefined,
        location: [draft.location?.city, draft.location?.state].filter(Boolean).join(', ') || undefined,
        urgency: draft.urgency,
        priceRange: draft.baselineQuoteUSD ? { min: 0, max: draft.baselineQuoteUSD } : undefined,
        additionalNotes:
          `REVERSE AUCTION REQUEST\n` +
          (draft.baselineQuoteUSD ? `Baseline: $${draft.baselineQuoteUSD.toLocaleString()} ${draft.currency}\n` : '') +
          (draft.cptCodes?.length ? `CPT: ${draft.cptCodes.join(', ')}\n` : '') +
          (draft.icd10Codes?.length ? `ICD-10: ${draft.icd10Codes.join(', ')}\n` : '') +
          (draft.components?.length ? `Components: ${draft.components.map(c => `${c.label}${c.amountUSD?` $${c.amountUSD}`:''}`).join(' | ')}\n` : '') +
          `Deadline: ${draft.deadlineHours} hours\n` +
          `Message: ${draft.userMessage.slice(0,300)}`
      }

      const result = await this.notificationService.createProviderRequest(
        patientName,
        patientId,
        draft.userMessage,
        candidateProviders,
        extra
      )
      logger.info('providers', 'Auction broadcast created', {
        requestId: result.requestId, notifiedProviders: result.notifiedProviders.length, errors: result.errors.length
      })
      return result
    } catch (error) {
      logger.error('providers', 'Failed to create auction broadcast', { error: String(error) })
      return null
    }
  }
}
