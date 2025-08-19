'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

export function AuthGate({
  open,
  onOpenChange,
  onConfirm,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  onConfirm: (email: string, phone: string) => void
}) {
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <span />
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Before we reveal your offers</DialogTitle>
          <DialogDescription>
            Enter your email and phone so we can notify you about provider
            messages and follow-ups.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <Input
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Input
            type="tel"
            placeholder="(555) 123-4567"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
          <Button
            className="w-full bg-sky-600 hover:bg-sky-700 text-white"
            onClick={() => onConfirm(email, phone)}
            disabled={!email || !phone}
          >
            Continue
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
