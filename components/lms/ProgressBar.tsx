'use client'

import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'

interface ProgressBarProps {
  value: number
  max?: number
  showLabel?: boolean
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export function ProgressBar({ value, max = 100, showLabel = true, size = 'md', className }: ProgressBarProps) {
  const [width, setWidth] = useState(0)
  const percent = Math.min(100, Math.max(0, Math.round((value / max) * 100)))

  useEffect(() => {
    const timer = setTimeout(() => setWidth(percent), 100)
    return () => clearTimeout(timer)
  }, [percent])

  const colorClass =
    percent < 40 ? 'bg-red-500' :
    percent < 70 ? 'bg-amber-500' :
    'bg-green-500'

  const heightClass = size === 'sm' ? 'h-1.5' : size === 'lg' ? 'h-4' : 'h-2.5'

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div className={cn('flex-1 rounded-full bg-gray-200 overflow-hidden', heightClass)}>
        <div
          className={cn('h-full rounded-full transition-all duration-700 ease-out', colorClass)}
          style={{ width: `${width}%` }}
        />
      </div>
      {showLabel && (
        <span className={cn(
          'font-semibold tabular-nums flex-shrink-0',
          size === 'sm' ? 'text-xs' : 'text-sm',
          colorClass === 'bg-red-500' ? 'text-red-600' :
          colorClass === 'bg-amber-500' ? 'text-amber-600' :
          'text-green-600',
        )}>
          {percent}%
        </span>
      )}
    </div>
  )
}
