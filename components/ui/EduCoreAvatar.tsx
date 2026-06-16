'use client'

import { cn } from '@/lib/utils'
import { Avatar, AvatarFallback, AvatarImage } from './avatar'

export interface EduCoreAvatarProps {
  name: string
  avatarUrl?: string | null
  size?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
}

const sizeMap = {
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-12 w-12 text-base',
  xl: 'h-16 w-16 text-xl',
}

export function EduCoreAvatar({ name, avatarUrl, size = 'md', className }: EduCoreAvatarProps) {
  const initials = name
    .split(' ')
    .map((w: any) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  const colors = [
    'bg-blue-100 text-blue-700',
    'bg-emerald-100 text-emerald-700',
    'bg-purple-100 text-purple-700',
    'bg-amber-100 text-amber-700',
    'bg-rose-100 text-rose-700',
    'bg-cyan-100 text-cyan-700',
  ]

  const colorIndex = name.split('').reduce((acc: any, c: any) => acc + c.charCodeAt(0), 0) % colors.length

  return (
    <Avatar className={cn(sizeMap[size], 'shrink-0', className)}>
      {avatarUrl ? (
        <AvatarImage src={avatarUrl} alt={name} />
      ) : null}
      <AvatarFallback className={cn(colors[colorIndex], 'font-semibold')}>
        {initials}
      </AvatarFallback>
    </Avatar>
  )
}
