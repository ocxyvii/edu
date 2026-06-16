'use client'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Users, Search, FileSearch, CreditCard, BookOpen, Bell, Inbox, AlertCircle } from 'lucide-react'

const presets: Record<string, { icon: React.ElementType; title: string; description: string; actionLabel?: string }> = {
  noStudents: {
    icon: Users,
    title: 'No students yet',
    description: 'Add your first student to get started with attendance, grades, and more.',
    actionLabel: 'Add Student',
  },
  noResults: {
    icon: Search,
    title: 'No results found',
    description: 'Try adjusting your search or filter criteria.',
  },
  noPayments: {
    icon: CreditCard,
    title: 'No payments recorded',
    description: 'Payment records will appear here once students start making payments.',
    actionLabel: 'Record Payment',
  },
  noClasses: {
    icon: BookOpen,
    title: 'No classes created',
    description: 'Create your first class to organize students and assign teachers.',
    actionLabel: 'Create Class',
  },
  noNotifications: {
    icon: Bell,
    title: 'All caught up',
    description: 'You have no new notifications at this time.',
  },
  noData: {
    icon: Inbox,
    title: 'No data available',
    description: 'There is nothing to display here yet.',
  },
  noExams: {
    icon: FileSearch,
    title: 'No exams scheduled',
    description: 'Create exams for your classes to track student performance.',
    actionLabel: 'Create Exam',
  },
  error: {
    icon: AlertCircle,
    title: 'Something went wrong',
    description: 'An unexpected error occurred. Please try again.',
    actionLabel: 'Try Again',
  },
}

export type EmptyStatePreset = keyof typeof presets

interface EmptyStateProps {
  preset?: EmptyStatePreset
  icon?: React.ElementType
  title?: string
  description?: string
  actionLabel?: string
  onAction?: () => void
  className?: string
}

export function EmptyState({
  preset,
  icon: IconOverride,
  title,
  description,
  actionLabel,
  onAction,
  className,
}: EmptyStateProps) {
  const config = preset ? presets[preset] : null
  const Icon = IconOverride || config?.icon || Inbox
  const displayTitle = title || config?.title || 'No data'
  const displayDescription = description || config?.description || ''
  const displayActionLabel = actionLabel || config?.actionLabel

  return (
    <div className={cn('flex flex-col items-center justify-center py-16 px-4', className)}>
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
        <Icon className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="mb-1 text-lg font-semibold text-gray-900">{displayTitle}</h3>
      {displayDescription && (
        <p className="mb-6 max-w-sm text-center text-sm text-muted-foreground">{displayDescription}</p>
      )}
      {displayActionLabel && onAction && (
        <Button onClick={onAction} size="sm">
          {displayActionLabel}
        </Button>
      )}
    </div>
  )
}
