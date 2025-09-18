'use client'

import { useState, useEffect, useRef } from 'react'
import { Send, Plus, Loader2, Paperclip, User, Bot } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { useChatStore, ChatMessage } from '@/src/stores/chatStore'
import { ChatProcessingService } from '@/src/services/ChatProcessingService'
import { cn } from '@/lib/utils'
// PDF.js needs a worker; this path works with Next + pdfjs-dist
import * as pdfjsLib from 'pdfjs-dist'
import { createWorker, PSM, OEM } from 'tesseract.js'

// @ts-expect-error - worker path for pdfjs in Next.js
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`

interface ChatInterfaceProps {
  className?: string
}

// ---------- OCR Worker (singleton) ----------
let _ocrWorker: ReturnType<typeof createWorker> | null = null
let _ocrInit: Promise<void> | null = null

async function getOCRWorker() {
  if (_ocrWorker) return _ocrWorker
  _ocrWorker = createWorker({
    logger: () => {} // silence to avoid perf hits
  })
  if (!_ocrInit) {
    _ocrInit = (async () => {
      await _ocrWorker!.load()
      await _ocrWorker!.loadLanguage('eng')
      await _ocrWorker!.initialize('eng', OEM.LSTM_ONLY)
      // PSM.SPARSE_TEXT gives good results for forms/receipts; we'll tune per job when calling
    })()
  }
  await _ocrInit
  return _ocrWorker!
}

// ---------- Utilities ----------
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))

// Limit concurrency (avoid pegging CPU / blocking UI)
async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length)
  let i = 0
  const workers = Array(Math.min(limit, items.length))
    .fill(0)
    .map(async () => {
      while (i < items.length) {
        const idx = i++
        results[idx] = await fn(items[idx], idx)
      }
    })
  await Promise.all(workers)
  return results
}

// Normalize whitespace and strip OCR cruft
function cleanText(t: string) {
  return t
    .replace(/\u00A0/g, ' ')
    .replace(/[ \t]+/g, ' ')
    .replace(/\s*\n\s*/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

// Render a PDF page to a canvas and return the ImageBitmap for OCR
async function renderPdfPageToBitmap(page: any, maxDim = 1600) {
  const viewport = (() => {
    const v = page.getViewport({ scale: 1.0 })
    const scale = Math.min(maxDim / v.width, maxDim / v.height, 2.0) // cap scale
    return page.getViewport({ scale })
  })()

  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d', { willReadFrequently: true }) as CanvasRenderingContext2D
  canvas.width = viewport.width
  canvas.height = viewport.height
  await page.render({ canvasContext: ctx, viewport }).promise
  const bitmap = await createImageBitmap(canvas)
  // cleanup
  canvas.width = 0; canvas.height = 0
  return bitmap
}

// OCR an ImageBitmap or File (image/*) with adaptive settings
async function ocrImageBitmapOrFile(input: ImageBitmap | File, opts?: { psm?: PSM; rotate?: boolean }) {
  const worker = await getOCRWorker()
  if (opts?.psm !== undefined) {
    await worker.setParameters({ tessedit_pageseg_mode: String(opts.psm) })
  } else {
    await worker.setParameters({ tessedit_pageseg_mode: String(PSM.SPARSE_TEXT_OSD) })
  }
  const result = await worker.recognize(input as any) // tesseract accepts bitmap or file/blob
  // Heuristic: if text is suspiciously empty, try a different PSM once
  if ((result.data.text || '').trim().length < 20 && !opts?.psm) {
    await worker.setParameters({ tessedit_pageseg_mode: String(PSM.AUTO) })
    const retry = await worker.recognize(input as any)
    return cleanText(retry.data.text || '')
  }
  return cleanText(result.data.text || '')
}

// Smart image resize (keeps EXIF orientation via createImageBitmap)
async function resizeImageForOCR(file: File, maxDim = 1600): Promise<File> {
  try {
    const bitmap = await createImageBitmap(file) // respects orientation in modern browsers
    const { width, height } = bitmap
    const scale = Math.min(maxDim / width, maxDim / height, 1) // only downscale
    const w = Math.round(width * scale)
    const h = Math.round(height * scale)

    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d', { alpha: false })!
    ctx.drawImage(bitmap, 0, 0, w, h)

    const blob = await new Promise<Blob | null>(res => canvas.toBlob(b => res(b), 'image/jpeg', 0.85))
    if (!blob) return file
    return new File([blob], file.name.replace(/\.(png|heic|tiff|bmp)$/i, '.jpg'), {
      type: 'image/jpeg',
      lastModified: Date.now()
    })
  } catch {
    return file
  }
}

export function ChatInterface({ className }: ChatInterfaceProps) {
  const {
    activeChat,
    activeChatId,
    createNewChat,
    addMessage,
    isProcessing,
    setProcessing,
  } = useChatStore()

  const [input, setInput] = useState('')
  const [isUploading, setIsUploading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const chatProcessor = ChatProcessingService.getInstance()

  useEffect(() => {
    scrollToBottom()
  }, [activeChat?.messages])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isProcessing) return

    let currentChatId = activeChatId
    
    // Create new chat if none exists
    if (!currentChatId) {
      const newChat = createNewChat()
      currentChatId = newChat.id
    }

    // Add user message
    addMessage(currentChatId, {
      role: 'user',
      content: input.trim(),
    })

    const userInput = input.trim()
    setInput('')
    setProcessing(true)

    try {
      // Process the message with the upgraded service
      const result = await chatProcessor.processMessage(userInput, activeChat?.messages || [])
      
      // Add assistant response
      addMessage(currentChatId, {
        role: 'assistant',
        content: result.reply,
        metadata: result.metadata,
      })

      // If we found provider matches, create notifications for them
      if (result.shouldCreateProviderMatches && result.metadata?.matchedProviders) {
        const notificationResult = await chatProcessor.createProviderNotifications(
          'Anonymous Patient', // TODO: Get actual patient name from auth store
          'patient-demo-123',  // TODO: Get actual patient ID from auth store
          userInput,
          result.metadata.matchedProviders,
          {
            specialty: result.metadata.specialty,
            location: result.metadata.location,
            urgency: result.metadata.urgency,
            priceRange: result.metadata.priceRange
          }
        )

        if (notificationResult?.success) {
          console.log(`✅ Successfully notified ${notificationResult.notifiedProviders.length} providers`)
        } else {
          console.log(`⚠️ Notification errors:`, notificationResult?.errors)
        }
      }

    } catch (error) {
      console.error('Chat processing error:', error)
      addMessage(currentChatId, {
        role: 'assistant',
        content: 'I apologize, but I encountered an error processing your request. Please try again.',
      })
    } finally {
      setProcessing(false)
    }
  }

  const handleNewChat = () => {
    createNewChat()
    setInput('')
  }

/**
 * Extracts text from user files:
 * - text/plain: direct read
 * - image/*: resize + OCR
 * - application/pdf: try text layer; if empty/sparse, OCR selected pages (first 3 + last 2)
 * Progressive, robust, and concurrency-limited.
 */
const handleFileUpload = async (files: FileList | null) => {
  if (!files || files.length === 0) return
  setIsUploading(true)

  try {
    const processOne = async (file: File): Promise<string> => {
      try {
        // 1) Plain text
        if (file.type === 'text/plain') {
          const t = await file.text()
          return cleanText(t)
        }

        // 2) Images -> resize + OCR
        if (file.type.startsWith('image/')) {
          const optimized = await resizeImageForOCR(file, 1600)
          const text = await ocrImageBitmapOrFile(optimized, { psm: PSM.SPARSE_TEXT_OSD })
          return text || `[Image had no recognizable text: ${file.name}]`
        }

        // 3) PDFs
        if (file.type === 'application/pdf' || /\.pdf$/i.test(file.name)) {
          const arrayBuffer = await file.arrayBuffer()
          const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) }).promise
          const total = pdf.numPages

          // Read a subset if large: first 3 + last 2 (configurable)
          const pagesToRead = total <= 7
            ? Array.from({ length: total }, (_, i) => i + 1)
            : [1, 2, 3, total - 1, total]

          // Try extracting text content first
          const pageTextResults = await mapWithConcurrency(pagesToRead, 2, async (pno) => {
            const page = await pdf.getPage(pno)
            const content = await page.getTextContent().catch(() => null)
            const text = content?.items?.map((it: any) => it.str).join(' ') || ''
            return cleanText(text)
          })

          const joined = pageTextResults.join('\n').trim()
          // If we got decent text, done; else try OCR on these pages
          const TEXT_THRESHOLD = 60 // characters
          if (joined.replace(/\s/g, '').length >= TEXT_THRESHOLD) {
            return joined
          }

          // OCR the selected pages (concurrency 2)
          const ocrResults = await mapWithConcurrency(pagesToRead, 2, async (pno) => {
            const page = await pdf.getPage(pno)
            const bitmap = await renderPdfPageToBitmap(page, 1600)
            const t = await ocrImageBitmapOrFile(bitmap, { psm: PSM.SPARSE_TEXT_OSD })
            // small backoff to keep UI responsive
            await sleep(10)
            return `\n[Page ${pno}]\n${t}`
          })

          const ocrJoined = cleanText(ocrResults.join('\n'))
          return ocrJoined || `[Scanned PDF contained no recognizable text: ${file.name}]`
        }

        // 4) Unknowns
        return `[Uploaded file: ${file.name}]`
      } catch (err) {
        console.error(`Error processing file ${file.name}:`, err)
        return `[Error processing ${file.name}]`
      }
    }

    // Process with bounded concurrency to keep UI responsive
    const texts = await mapWithConcurrency(Array.from(files), 2, processOne)
    const extracted = cleanText(texts.filter(Boolean).join('\n\n'))

    if (extracted) {
      // Append to the input so the user can edit/confirm before sending
      setInput(prev => (prev ? (prev + '\n\n' + extracted) : extracted))
    }
  } catch (error) {
    console.error('File upload error:', error)
  } finally {
    setIsUploading(false)
  }
}

  const MessageBubble = ({ message }: { message: ChatMessage }) => {
    const isUser = message.role === 'user'
    const isSystem = message.role === 'system'
    
    return (
      <div className={cn(
        "flex gap-3 mb-6",
        isUser ? "flex-row-reverse" : "flex-row"
      )}>
        {/* Avatar */}
        <div className={cn(
          "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0",
          isUser ? "bg-sky-600 text-white" : isSystem ? "bg-yellow-500 text-white" : "bg-gray-200 text-gray-600"
        )}>
          {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
        </div>

        {/* Message Content */}
        <div className={cn(
          "flex-1 max-w-[80%]",
          isUser ? "text-right" : "text-left"
        )}>
          <div className={cn(
            "inline-block px-4 py-3 rounded-2xl",
            isUser 
              ? "bg-sky-600 text-white" 
              : isSystem 
                ? "bg-yellow-100 text-yellow-800 border border-yellow-200"
                : "bg-gray-100 text-gray-900"
          )}>
            <div className="whitespace-pre-wrap text-sm leading-relaxed">
              {message.content}
            </div>
            
            {/* Parsed quote summary */}
            {message.metadata?.quote && (
              <div className="mt-3 pt-3 border-t border-white/20">
                <div className="text-xs opacity-75 mb-2">Parsed quote (optional upload):</div>
                <div className="text-xs bg-white/10 rounded p-2 mb-1">
                  {typeof message.metadata.quote.total === 'number' && (
                    <div className="font-medium">
                      Total: {message.metadata.quote.currency || 'USD'}{' '}
                      {message.metadata.quote.total.toLocaleString()}
                    </div>
                  )}
                  {!!message.metadata.quote.cptCodes?.length && (
                    <div className="opacity-75 mt-1">
                      CPT: {message.metadata.quote.cptCodes.slice(0,5).join(', ')}
                      {message.metadata.quote.cptCodes.length > 5 ? '…' : ''}
                    </div>
                  )}
                  {!!message.metadata.quote.icd10Codes?.length && (
                    <div className="opacity-75">
                      ICD-10: {message.metadata.quote.icd10Codes.slice(0,5).join(', ')}
                      {message.metadata.quote.icd10Codes.length > 5 ? '…' : ''}
                    </div>
                  )}
                  {!!message.metadata.quote.components?.length && (
                    <div className="opacity-75 mt-1">
                      Components: {message.metadata.quote.components.slice(0,3).map(c =>
                        `${c.label}${typeof c.amount === 'number' ? ` $${c.amount}` : ''}`
                      ).join(' | ')}
                      {message.metadata.quote.components.length > 3 ? '…' : ''}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Provider matches */}
            {message.metadata?.isProviderMatch && message.metadata.matchedProviders && (
              <div className="mt-3 pt-3 border-t border-white/20">
                <div className="text-xs opacity-75 mb-2">Found {message.metadata.matchedProviders.length} specialists:</div>
                {message.metadata.matchedProviders.slice(0, 2).map((provider) => (
                  <div key={provider.id} className="text-xs bg-white/10 rounded p-2 mb-1">
                    <div className="font-medium">{provider.name}</div>
                    <div className="opacity-75">
                      {provider.providerProfile?.specialty} • {provider.providerProfile?.city}, {provider.providerProfile?.state}
                    </div>
                  </div>
                ))}
                {message.metadata.matchedProviders.length > 2 && (
                  <div className="text-xs opacity-75">
                    +{message.metadata.matchedProviders.length - 2} more...
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Metadata badges */}
          {message.metadata && (
            <div className="flex gap-1 mt-2 flex-wrap">
              {message.metadata.specialty && (
                <Badge variant="outline" className="text-xs">
                  {message.metadata.specialty}
                </Badge>
              )}
              {message.metadata.urgency === 'high' && (
                <Badge variant="destructive" className="text-xs">
                  Urgent
                </Badge>
              )}
              {message.metadata.location && (
                <Badge variant="secondary" className="text-xs">
                  {message.metadata.location}
                </Badge>
              )}
            </div>
          )}

          {/* Timestamp */}
          <div className={cn(
            "text-xs text-gray-500 mt-1",
            isUser ? "text-right" : "text-left"
          )}>
            {message.timestamp.toLocaleTimeString([], { 
              hour: '2-digit', 
              minute: '2-digit' 
            })}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={cn("flex flex-col h-full bg-white", className)}>
      {/* Header */}
      <div className="border-b border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-sky-500 to-blue-600 flex items-center justify-center">
              <Bot className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="font-semibold text-gray-900">Doction AI</h2>
              <p className="text-sm text-gray-600">Find healthcare providers instantly</p>
            </div>
          </div>
          
          <Button onClick={handleNewChat} size="sm" variant="outline">
            <Plus className="w-4 h-4 mr-2" />
            New Chat
          </Button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4">
        {!activeChat || activeChat.messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-sky-500 to-blue-600 flex items-center justify-center mb-4">
              <Bot className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Welcome to Doction AI
            </h3>
            <p className="text-gray-600 max-w-md mb-6">
              Tell me what procedure or care you need and your city/state. <strong>If you have a quote please upload it</strong> — totally optional.
            </p>
            <div className="flex flex-wrap gap-2 justify-center">
              {[
                "Dermatology consult in Austin, TX",
                "Compare my MRI price",
                "Knee surgery second opinion",
                "Primary care visit under $150"
              ].map((example) => (
                <button
                  key={example}
                  onClick={() => setInput(example)}
                  className="px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  {example}
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-500 mt-3">
              Tip: <strong>If you have a quote please upload it</strong> so I can parse codes, totals, and line items for a better price match.
            </p>
          </div>
        ) : (
          <>
            {activeChat.messages.map((message) => (
              <MessageBubble key={message.id} message={message} />
            ))}
            
            {isProcessing && (
              <div className="flex gap-3 mb-6">
                <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                  <Bot className="w-4 h-4 text-gray-600" />
                </div>
                <div className="flex-1">
                  <div className="inline-block px-4 py-3 rounded-2xl bg-gray-100">
                    <div className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span className="text-sm text-gray-600">Processing your request...</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-gray-200 p-4">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <div className="flex-1 relative">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Describe your procedure + city/state (optional: If you have a quote please upload it)"
              disabled={isProcessing}
              className="pr-12"
            />
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*,application/pdf,.txt"
              onChange={(e) => handleFileUpload(e.target.files)}
              className="hidden"
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 p-0"
              onClick={() => fileInputRef.current?.click()}
              disabled={isProcessing || isUploading}
            >
              {isUploading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Paperclip className="w-4 h-4" />
              )}
            </Button>
          </div>
          <Button 
            type="submit" 
            disabled={!input.trim() || isProcessing}
            className="bg-sky-600 hover:bg-sky-700"
          >
            <Send className="w-4 h-4" />
          </Button>
        </form>
      </div>
    </div>
  )
}
