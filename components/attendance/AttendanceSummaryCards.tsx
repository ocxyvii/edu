'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { TrendingUp, TrendingDown, Users, CheckCircle2, XCircle, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'

interface AttendanceSummary {
  total: number
  present: number
  absent: number
  late: number
  excused: number
  percentage: number
}

interface AttendanceSummaryCardsProps {
  summary?: AttendanceSummary
  isLoading?: boolean
  title?: string
}

export function AttendanceSummaryCards({ summary, isLoading, title }: AttendanceSummaryCardsProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {[...Array(5)].map((_, i) => (
          <Card key={i}>
            <CardContent className="py-4">
              <Skeleton className="h-8 w-16 mx-auto mb-2" />
              <Skeleton className="h-3 w-20 mx-auto" />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (!summary) return null

  const percentageColor =
    summary.percentage >= 90 ? 'text-green-600' :
    summary.percentage >= 75 ? 'text-yellow-600' :
    'text-red-600'

  const TrendIcon = summary.percentage >= 75 ? TrendingUp : TrendingDown

  return (
    <div className="space-y-2">
      {title && <h3 className="text-sm font-medium text-muted-foreground">{title}</h3>}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardContent className="py-4 text-center">
            <div className={cn('flex items-center justify-center gap-1', percentageColor)}>
              <span className="text-2xl font-bold">{summary.percentage}%</span>
              <TrendIcon className="h-4 w-4" />
            </div>
            <p className="text-xs text-muted-foreground mt-1">Attendance Rate</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="py-4 text-center">
            <div className="flex items-center justify-center gap-1 text-gray-900">
              <Users className="h-4 w-4" />
              <span className="text-2xl font-bold">{summary.total}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Total Days</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="py-4 text-center">
            <div className="flex items-center justify-center gap-1 text-green-600">
              <CheckCircle2 className="h-4 w-4" />
              <span className="text-2xl font-bold">{summary.present}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Present</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="py-4 text-center">
            <div className="flex items-center justify-center gap-1 text-red-600">
              <XCircle className="h-4 w-4" />
              <span className="text-2xl font-bold">{summary.absent}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Absent</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="py-4 text-center">
            <div className="flex items-center justify-center gap-1 text-yellow-600">
              <Clock className="h-4 w-4" />
              <span className="text-2xl font-bold">{summary.late}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Late</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
