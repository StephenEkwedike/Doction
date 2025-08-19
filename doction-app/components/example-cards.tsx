'use client'

import { Card, CardContent } from '@/components/ui/card'
import { FileText, DollarSign, MapPin, Calendar } from 'lucide-react'

const EXAMPLES = [
  {
    title: 'Compare my orthodontic quotes',
    icon: DollarSign,
    prompt:
      'I have a quote for braces at $6,200. Help me compare options and find lower-cost providers.',
  },
  {
    title: 'Extract details from my PDF quote',
    icon: FileText,
    prompt:
      'I’m uploading a PDF. Extract provider name, procedure, and total price, then match me to alternatives.',
  },
  {
    title: 'Find nearby surgeons within my budget',
    icon: MapPin,
    prompt:
      'Show jaw surgery options near Austin under $12,000, open to payment plans.',
  },
  {
    title: 'Request a consult message',
    icon: Calendar,
    prompt:
      'Draft a short message asking a surgeon for a consult and any pre-appointment requirements.',
  },
] as const

export function ExampleCards({ onClick }: { onClick: (prompt: string) => void }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
      {EXAMPLES.map((ex) => {
        const Icon = ex.icon
        return (
          <button
            key={ex.title}
            onClick={() => onClick(ex.prompt)}
            className="text-left"
          >
            <Card className="hover:bg-gray-50 transition-colors">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-gray-600 mb-2">
                  <Icon className="h-4 w-4" />
                  <span className="text-xs">Example</span>
                </div>
                <div className="text-sm text-gray-900">{ex.title}</div>
              </CardContent>
            </Card>
          </button>
        )
      })}
    </div>
  )
}
