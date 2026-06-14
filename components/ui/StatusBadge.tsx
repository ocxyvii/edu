'use client'

import { cn } from '@/lib/utils'
import { Badge } from './badge'

export interface StatusBadgeProps {
  status: string
  className?: string
}

const statusMap: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  // Attendance
  present: { label: 'Present', variant: 'default' },
  absent: { label: 'Absent', variant: 'destructive' },
  late: { label: 'Late', variant: 'secondary' },
  excused: { label: 'Excused', variant: 'outline' },
  holiday: { label: 'Holiday', variant: 'outline' },

  // Fee / Payment
  paid: { label: 'Paid', variant: 'default' },
  pending: { label: 'Pending', variant: 'secondary' },
  overdue: { label: 'Overdue', variant: 'destructive' },
  partial: { label: 'Partial', variant: 'secondary' },
  cancelled: { label: 'Cancelled', variant: 'outline' },
  refunded: { label: 'Refunded', variant: 'outline' },

  // Application
  approved: { label: 'Approved', variant: 'default' },
  rejected: { label: 'Rejected', variant: 'destructive' },
  reviewing: { label: 'Reviewing', variant: 'secondary' },
  waitlisted: { label: 'Waitlisted', variant: 'secondary' },
  enrolled: { label: 'Enrolled', variant: 'default' },

  // Student status
  active: { label: 'Active', variant: 'default' },
  inactive: { label: 'Inactive', variant: 'secondary' },
  graduated: { label: 'Graduated', variant: 'outline' },
  transferred: { label: 'Transferred', variant: 'secondary' },
  suspended: { label: 'Suspended', variant: 'destructive' },
  withdrawn: { label: 'Withdrawn', variant: 'outline' },

  // Exam / Results
  published: { label: 'Published', variant: 'default' },
  draft: { label: 'Draft', variant: 'secondary' },
  passed: { label: 'Passed', variant: 'default' },
  failed: { label: 'Failed', variant: 'destructive' },

  // Leave
  approved_leave: { label: 'Approved', variant: 'default' },
  rejected_leave: { label: 'Rejected', variant: 'destructive' },

  // Subscription
  free: { label: 'Free', variant: 'secondary' },
  basic: { label: 'Basic', variant: 'outline' },
  premium: { label: 'Premium', variant: 'default' },
  enterprise: { label: 'Enterprise', variant: 'default' },

  // Payroll
  processed: { label: 'Processed', variant: 'default' },

  // Book
  issued: { label: 'Issued', variant: 'secondary' },
  returned: { label: 'Returned', variant: 'default' },
  lost: { label: 'Lost', variant: 'destructive' },

  // Notification
  info: { label: 'Info', variant: 'outline' },
  success: { label: 'Success', variant: 'default' },
  warning: { label: 'Warning', variant: 'secondary' },
  error: { label: 'Error', variant: 'destructive' },

  // General
  enabled: { label: 'Enabled', variant: 'default' },
  disabled: { label: 'Disabled', variant: 'secondary' },
  yes: { label: 'Yes', variant: 'default' },
  no: { label: 'No', variant: 'secondary' },
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusMap[status.toLowerCase()] || { label: status, variant: 'outline' as const }
  return (
    <Badge variant={config.variant} className={cn('font-medium capitalize', className)}>
      {config.label}
    </Badge>
  )
}
