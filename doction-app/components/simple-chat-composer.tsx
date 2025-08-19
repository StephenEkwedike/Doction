'use client'

import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Paperclip, Send, X, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface UploadedFile {
  id: string
  file: File
  preview?: string
  text?: string
}

interface SimpleChatComposerProps {
  placeholder?: string
  onSend: (text: string, files?: UploadedFile[]) => void | Promise<void>
  disabled?: boolean
}

export function SimpleChatComposer({
  placeholder = 'Ask about dental care or describe what you need...',
  onSend,
  disabled = false,
}: SimpleChatComposerProps) {
  const [input, setInput] = useState('')
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault()
    if (!input.trim() || disabled) return

    const messageText = input.trim()
    const filesToSend = [...uploadedFiles]
    
    // Clear input and files immediately for better UX
    setInput('')
    setUploadedFiles([])
    
    // Send the message
    await onSend(messageText, filesToSend)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return
    
    setIsUploading(true)
    const newFiles: UploadedFile[] = []

    try {
      for (const file of Array.from(files)) {
        const fileId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
        const uploadedFile: UploadedFile = {
          id: fileId,
          file,
        }

        // Create preview for images
        if (file.type.startsWith('image/')) {
          const preview = URL.createObjectURL(file)
          uploadedFile.preview = preview
        }

        // For text files, read content
        if (file.type === 'text/plain') {
          try {
            uploadedFile.text = await file.text()
          } catch (error) {
            console.error('Error reading text file:', error)
          }
        }

        newFiles.push(uploadedFile)
      }

      setUploadedFiles(prev => [...prev, ...newFiles])
    } catch (error) {
      console.error('File upload error:', error)
    } finally {
      setIsUploading(false)
    }
  }

  const removeFile = (fileId: string) => {
    setUploadedFiles(prev => {
      const updated = prev.filter(f => f.id !== fileId)
      // Clean up preview URLs to prevent memory leaks
      const removed = prev.find(f => f.id === fileId)
      if (removed?.preview) {
        URL.revokeObjectURL(removed.preview)
      }
      return updated
    })
  }

  const hasContent = input.trim() || uploadedFiles.length > 0

  return (
    <div className="border-t border-gray-200 bg-white">
      {/* File previews */}
      {uploadedFiles.length > 0 && (
        <div className="flex gap-2 p-3 pb-2 flex-wrap">
          {uploadedFiles.map((file) => (
            <div key={file.id} className="relative group">
              {file.preview ? (
                // Image preview
                <div className="relative">
                  <img
                    src={file.preview}
                    alt={file.file.name}
                    className="w-16 h-16 object-cover rounded-lg border border-gray-200"
                  />
                  <button
                    onClick={() => removeFile(file.id)}
                    className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="w-3 h-3" />
                  </button>
                  <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-xs px-1 py-0.5 rounded-b-lg truncate">
                    {file.file.name}
                  </div>
                </div>
              ) : (
                // File icon preview
                <div className="relative w-16 h-16 bg-gray-100 rounded-lg border border-gray-200 flex flex-col items-center justify-center">
                  <Paperclip className="w-4 h-4 text-gray-500" />
                  <div className="text-xs text-gray-600 mt-1 text-center px-1">
                    {file.file.name.split('.').pop()?.toUpperCase()}
                  </div>
                  <button
                    onClick={() => removeFile(file.id)}
                    className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Input area */}
      <form onSubmit={handleSubmit} className="flex items-end gap-2 p-3">
        <div className="flex-1">
          <div className="relative">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              disabled={disabled || isUploading}
              className="pr-12 py-3 min-h-[44px] resize-none"
            />
            
            {/* File upload button */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={disabled || isUploading}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-gray-400 hover:text-gray-600 transition-colors"
            >
              {isUploading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Paperclip className="w-4 h-4" />
              )}
            </button>
          </div>
          
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*,application/pdf,.txt"
            onChange={(e) => handleFileUpload(e.target.files)}
            className="hidden"
          />
        </div>

        {/* Send button */}
        <Button
          type="submit"
          disabled={!hasContent || disabled || isUploading}
          className="bg-sky-600 hover:bg-sky-700 px-4 py-3 h-[44px]"
        >
          <Send className="w-4 h-4" />
        </Button>
      </form>
    </div>
  )
}