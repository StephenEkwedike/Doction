'use client'

import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Paperclip, ChevronUp, CornerDownLeft } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import { useCaseStore } from '@/hooks/use-case'
import { Dialog, DialogContent } from '@/components/ui/dialog'

// Optimized image resizing for faster OCR processing
async function resizeImageForOCR(file: File, maxWidth: number = 1200, maxHeight: number = 1200): Promise<File> {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')!
    const img = new Image()
    
    img.onload = () => {
      // Calculate optimal dimensions while maintaining aspect ratio
      let { width, height } = img
      
      if (width > maxWidth) {
        height = (height * maxWidth) / width
        width = maxWidth
      }
      
      if (height > maxHeight) {
        width = (width * maxHeight) / height
        height = maxHeight
      }
      
      // Set canvas dimensions
      canvas.width = width
      canvas.height = height
      
      // Draw and compress image
      ctx.drawImage(img, 0, 0, width, height)
      
      canvas.toBlob(
        (blob) => {
          if (blob) {
            const resizedFile = new File([blob], file.name, {
              type: 'image/jpeg',
              lastModified: Date.now()
            })
            resolve(resizedFile)
          } else {
            resolve(file) // Fallback to original if compression fails
          }
        },
        'image/jpeg',
        0.8 // 80% quality for good balance of size/quality
      )
    }
    
    img.src = URL.createObjectURL(file)
  })
}

// Configure PDF.js worker from CDN to avoid bundling hassles
async function getPdfJs() {
  const pdfjs: any = await import('pdfjs-dist/build/pdf')
  try {
    if (pdfjs?.GlobalWorkerOptions) {
      pdfjs.GlobalWorkerOptions.workerSrc =
        'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.worker.min.js'
    }
  } catch {}
  return pdfjs
}

// Optimized parallel file processing function
async function extractFromFiles(files: File[]): Promise<string> {
  const processFile = async (file: File): Promise<string> => {
    try {
      if (file.type === 'text/plain') {
        return await file.text()
      } 
      
      else if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
        const pdfjs = await getPdfJs()
        const pdf = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise
        const max = Math.min(pdf.numPages, 5) // Reduced pages for faster processing
        
        // Process pages in parallel
        const pagePromises = []
        for (let i = 1; i <= max; i++) {
          pagePromises.push(
            pdf.getPage(i).then(async (page: any) => {
              const content = await page.getTextContent()
              return content.items.map((it: any) => it.str).join(' ')
            })
          )
        }
        
        const pageTexts = await Promise.all(pagePromises)
        return pageTexts.join(' ')
      } 
      
      else if (file.type.startsWith('image/') || /\.(png|jpg|jpeg|webp)$/i.test(file.name)) {
        // Optimize image before OCR
        const optimizedFile = await resizeImageForOCR(file)
        const Tesseract = (await import('tesseract.js')).default
        
        // Use optimized Tesseract settings for faster processing
        const { data } = await Tesseract.recognize(optimizedFile, 'eng', {
          logger: () => {}, // Disable logging for performance
          // Configure CDN paths to ensure worker/core load correctly in browser
          workerPath: 'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/worker.min.js',
          corePath: 'https://cdn.jsdelivr.net/npm/tesseract.js-core@5/tesseract-core.wasm.js',
        } as any)
        
        return data?.text || ''
      } 
      
      else {
        // Fallback: include filename
        return `[Uploaded ${file.name}]`
      }
    } catch (error) {
      console.error(`Error processing file ${file.name}:`, error)
      return `[Error processing ${file.name}]`
    }
  }

  // Process all files in parallel for maximum speed
  try {
    const results = await Promise.all(Array.from(files).map(processFile))
    return results.filter(text => text.trim()).join('\n').trim()
  } catch (error) {
    console.error('Parallel file processing failed:', error)
    // Fallback to sequential processing
    let combined = ''
    for (const file of files) {
      const result = await processFile(file)
      if (result.trim()) {
        combined += '\n' + result
      }
    }
    return combined.trim()
  }
}

export function ChatComposer({
  placeholder = 'Ask AI a question or make a request...',
  onSend,
  disabled = false,
  resetKey = 0,
}: {
  placeholder?: string
  onSend: (text: string) => void | Promise<void>
  disabled?: boolean
  resetKey?: number
}) {
  const [value, setValue] = useState('')
  const [citation, setCitation] = useState(true)
  const fileRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const { setProfile, setOffers } = useCaseStore()
  const [previews, setPreviews] = useState<{ id: string; url: string; name: string }[]>([])
  const [lightbox, setLightbox] = useState<{ open: boolean; url: string; name: string } | null>(null)

  useEffect(() => {
    return () => {
      // Revoke object URLs to avoid memory leaks
      previews.forEach(p => URL.revokeObjectURL(p.url))
    }
  }, [previews])

  const submit = async () => {
    if (!value.trim()) return
    await onSend(value.trim())
    setValue('')
    setPreviews([])
  }

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return
    // Show image previews immediately
    const imgs = Array.from(files)
      .filter(f => f.type.startsWith('image/') || /\.(png|jpg|jpeg|webp)$/i.test(f.name))
      .slice(0, 4) // limit previews
      .map(f => ({ id: crypto.randomUUID(), url: URL.createObjectURL(f), name: f.name }))
    if (imgs.length > 0) {
      setPreviews(prev => [...imgs, ...prev].slice(0, 4))
    }
    setUploading(true)
    try {
      // Prefer server-side OCR if enabled
      let text = ''
      try {
        const fd = new FormData()
        Array.from(files).forEach((f) => fd.append('files', f))
        const serverRes = await fetch('/api/upload', { method: 'POST', body: fd })
        if (serverRes.ok) {
          const data = await serverRes.json()
          text = data.text || ''
        }
      } catch {
        // ignore and fallback
      }
      if (!text) {
        text = await extractFromFiles(Array.from(files))
      }
      // Ask server to structure the case
      const extractRes = await fetch('/api/extract-case', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      })
      const extracted = await extractRes.json()
      setProfile({
        ...extracted.profile,
        rawSummary: extracted.raw,
      })

      // Match offers
      const offersRes = await fetch('/api/match-offers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profile: extracted.profile }),
      })
      const { offers } = await offersRes.json()
      setOffers(offers)
    } catch (e) {
      console.error('Upload/extract failed', e)
    } finally {
      setUploading(false)
    }
  }

  // Reset previews/input when resetKey changes (New Thread)
  useEffect(() => {
    setValue('')
    setPreviews([])
  }, [resetKey])

  return (
    <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
      {/* Image mini-previews (like ChatGPT) */}
      {previews.length > 0 && (
        <div className="px-3 pt-3">
          <div className="flex gap-2 overflow-x-auto pb-2">
            {previews.map(p => (
              <div key={p.id} className="group relative rounded-lg overflow-hidden border border-gray-200 shadow-sm" style={{ width: 72, height: 72 }}>
                <img
                  src={p.url}
                  alt={p.name}
                  className="h-full w-full object-cover cursor-pointer"
                  onClick={() => setLightbox({ open: true, url: p.url, name: p.name })}
                />
                <button
                  className="absolute top-1 left-1 bg-white/95 border border-gray-300 rounded-full text-xs px-1.5 leading-none opacity-0 group-hover:opacity-100 transition"
                  onClick={() => {
                    URL.revokeObjectURL(p.url)
                    setPreviews(prev => prev.filter(x => x.id !== p.id))
                  }}
                  aria-label={`Remove ${p.name}`}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
      <div className="flex items-center gap-2 p-2">
        <button
          aria-label="Attach"
          onClick={() => fileRef.current?.click()}
          className={cn(
            'inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm',
            'text-gray-600 hover:bg-gray-100'
          )}
          disabled={uploading}
        >
          <Paperclip className="h-4 w-4" />
          <span>{uploading ? 'Processing…' : 'Attach'}</span>
        </button>
        <input
          ref={fileRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className={cn(
                'ml-1 inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm',
                'text-gray-600 hover:bg-gray-100'
              )}
              disabled={uploading}
            >
              <span>Writing Styles</span>
              <ChevronUp className="h-4 w-4 text-gray-400" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuLabel>Choose a style</DropdownMenuLabel>
            <DropdownMenuItem onClick={() => {}}>Professional</DropdownMenuItem>
            <DropdownMenuItem onClick={() => {}}>Friendly</DropdownMenuItem>
            <DropdownMenuItem onClick={() => {}}>Concise</DropdownMenuItem>
            <DropdownMenuItem onClick={() => {}}>Detailed</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="ml-auto flex items-center gap-2 pr-2">
          <Label htmlFor="citation-toggle" className="text-sm text-gray-600">
            Citation
          </Label>
          <Switch
            id="citation-toggle"
            checked={citation}
            onCheckedChange={setCitation}
          />
        </div>
      </div>

      <div className="px-3 pb-3">
        <div className="relative">
          <textarea
            className={cn(
              'w-full rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-sky-500',
              'px-4 pr-12 py-3 text-[15px] resize-none leading-6'
            )}
            placeholder={placeholder}
            rows={1}
            onInput={(e) => {
              const el = e.currentTarget
              el.style.height = 'auto'
              el.style.height = Math.min(el.scrollHeight, 6 * 24 + 16) + 'px'
            }}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                submit()
              }
            }}
            aria-label="Chat input"
            disabled={uploading}
          />
          <Button
            type="button"
            size="icon"
            disabled={disabled || uploading || value.trim().length === 0}
            onClick={submit}
            className={cn(
              'absolute right-1.5 top-1/2 -translate-y-1/2',
              'bg-gray-900 text-white hover:bg-gray-800 rounded-lg h-9 w-9'
            )}
            aria-label="Send message"
          >
            <CornerDownLeft className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Lightbox for preview */}
      <Dialog open={!!lightbox?.open} onOpenChange={(o) => setLightbox(o ? lightbox : null)}>
        <DialogContent className="max-w-3xl">
          {lightbox?.url && (
            <img src={lightbox.url} alt={lightbox?.name || 'Preview'} className="w-full h-auto rounded-lg" />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
