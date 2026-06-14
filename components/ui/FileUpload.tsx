'use client'

import { useState, useRef, useCallback } from 'react'
import { cn } from '@/lib/utils'
import { Button } from './button'
import { Upload, X, File, Image as ImageIcon, FileText } from 'lucide-react'

export interface FileUploadProps {
  accept?: string
  maxSize?: number
  multiple?: boolean
  onFilesSelected: (files: File[]) => void
  className?: string
  label?: string
  description?: string
  showPreview?: boolean
  disabled?: boolean
}

export function FileUpload({
  accept = 'image/*,.pdf,.doc,.docx',
  maxSize = 5 * 1024 * 1024,
  multiple = false,
  onFilesSelected,
  className,
  label = 'Upload files',
  description = 'Drag and drop or click to browse',
  showPreview = true,
  disabled = false,
}: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [files, setFiles] = useState<File[]>([])
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const validateAndAdd = useCallback((newFiles: FileList | File[]) => {
    setError(null)
    const valid: File[] = []
    for (const file of Array.from(newFiles)) {
      if (file.size > maxSize) {
        setError(`"${file.name}" exceeds the ${maxSize / 1024 / 1024}MB limit`)
        continue
      }
      valid.push(file)
    }
    const combined = multiple ? [...files, ...valid] : valid.slice(0, 1)
    setFiles(combined)
    onFilesSelected(combined)
  }, [files, maxSize, multiple, onFilesSelected])

  const removeFile = (index: number) => {
    const updated = files.filter((_, i) => i !== index)
    setFiles(updated)
    onFilesSelected(updated)
  }

  const getIcon = (file: File) => {
    if (file.type.startsWith('image/')) return ImageIcon
    if (file.type.includes('pdf')) return FileText
    return File
  }

  return (
    <div className={cn('space-y-3', className)}>
      <div
        className={cn(
          'relative flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 transition-colors',
          isDragging ? 'border-primary bg-primary/5' : 'border-gray-300 hover:border-gray-400',
          disabled && 'cursor-not-allowed opacity-50',
        )}
        onClick={() => !disabled && inputRef.current?.click()}
        onDragOver={e => { e.preventDefault(); setIsDragging(true) }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={e => { e.preventDefault(); setIsDragging(false); validateAndAdd(e.dataTransfer.files) }}
        role="button"
        tabIndex={0}
        onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') inputRef.current?.click() }}
      >
        <Upload className="mb-3 h-8 w-8 text-muted-foreground" />
        <p className="text-sm font-medium text-gray-900">{label}</p>
        <p className="mt-1 text-xs text-muted-foreground">{description}</p>
        <p className="mt-1 text-[10px] text-muted-foreground">
          Accepted: {accept.replace(/,/g, ', ')} | Max: {maxSize / 1024 / 1024}MB
        </p>
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          className="hidden"
          onChange={e => e.target.files && validateAndAdd(e.target.files)}
          disabled={disabled}
        />
      </div>

      {error && (
        <p className="text-xs text-red-500">{error}</p>
      )}

      {showPreview && files.length > 0 && (
        <div className="space-y-2">
          {files.map((file, i) => {
            const Icon = getIcon(file)
            const previewUrl = file.type.startsWith('image/') ? URL.createObjectURL(file) : null
            return (
              <div key={i} className="flex items-center gap-3 rounded-lg border bg-white p-3">
                {previewUrl ? (
                  <img src={previewUrl} alt={file.name} className="h-10 w-10 rounded object-cover" />
                ) : (
                  <div className="flex h-10 w-10 items-center justify-center rounded bg-muted">
                    <Icon className="h-5 w-5 text-muted-foreground" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{file.name}</p>
                  <p className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(1)} KB</p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0"
                  onClick={() => removeFile(i)}
                  disabled={disabled}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
