import { NextRequest } from 'next/server'

// Optional server-side OCR route. Enable by setting SERVER_OCR_ENABLED=true
// In constrained environments, this route returns 501 and the client will fallback to client-side OCR.

export const maxDuration = 30

export async function POST(req: NextRequest) {
  const enabled = process.env.SERVER_OCR_ENABLED === 'true'
  if (!enabled) {
    return new Response(
      JSON.stringify({ error: 'Server OCR disabled' }),
      { status: 501, headers: { 'Content-Type': 'application/json' } }
    )
  }

  try {
    const form = await req.formData()
    const files = form.getAll('files') as File[]
    if (!files || files.length === 0) {
      return new Response(JSON.stringify({ error: 'No files provided' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Minimal OCR: image types via tesseract.js; PDFs are returned as unsupported unless you provide server PDF parsing
    const results: { name: string; text: string }[] = []

    for (const file of files) {
      const buf = Buffer.from(await file.arrayBuffer())
      if (file.type.startsWith('image/') || /\.(png|jpg|jpeg|webp)$/i.test(file.name)) {
        // Lazy import to avoid bundling when disabled
        const Tesseract = (await import('tesseract.js')).default
        const { data } = await Tesseract.recognize(buf, 'eng', {
          logger: () => {},
        } as any)
        results.push({ name: file.name, text: data?.text || '' })
      } else if (file.type === 'application/pdf' || /\.pdf$/i.test(file.name)) {
        // Server-side PDF text extraction via pdfjs-dist
        try {
          const pdfjs: any = await import('pdfjs-dist/build/pdf')
          const doc = await pdfjs.getDocument({ data: new Uint8Array(buf) }).promise
          const pageCount = Math.min(doc.numPages, 10)
          const texts: string[] = []
          for (let i = 1; i <= pageCount; i++) {
            const page: any = await doc.getPage(i)
            const content = await page.getTextContent()
            texts.push(content.items.map((it: any) => it.str).join(' '))
          }
          results.push({ name: file.name, text: texts.join('\n') })
        } catch (e) {
          results.push({ name: file.name, text: '' })
        }
      } else if (file.type === 'text/plain') {
        results.push({ name: file.name, text: buf.toString('utf8') })
      } else {
        results.push({ name: file.name, text: '' })
      }
    }

    const combined = results.map(r => r.text).filter(Boolean).join('\n').trim()
    return new Response(JSON.stringify({ text: combined }), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: 'Upload/OCR failed', message: error?.message || String(error) }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}
