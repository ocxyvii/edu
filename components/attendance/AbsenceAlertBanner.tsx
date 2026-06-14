'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { AlertTriangle, RefreshCw, Loader2, X, CheckCircle2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface AbsenceAlert {
  studentId: string
  days: number
  consecutiveCount: number
}

interface AbsenceAlertBannerProps {
  alerts?: AbsenceAlert[]
  isLoading?: boolean
  onGenerate?: () => void
  isGenerating?: boolean
}

export function AbsenceAlertBanner({
  alerts,
  isLoading,
  onGenerate,
  isGenerating,
}: AbsenceAlertBannerProps) {
  const [dismissed, setDismissed] = useState(false)

  if (isLoading) return null

  const activeAlerts = alerts?.filter(a => a.consecutiveCount >= 3) ?? []

  if (dismissed || activeAlerts.length === 0) {
    return (
      <Card className="border-green-200 bg-green-50">
        <CardContent className="py-3 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-green-700">
            <CheckCircle2 className="h-4 w-4" />
            <span>No students with 3+ consecutive absences</span>
          </div>
          {onGenerate && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onGenerate}
              disabled={isGenerating}
              className="text-green-600 hover:text-green-800 hover:bg-green-100"
            >
              <RefreshCw className={cn('h-4 w-4 mr-1', isGenerating && 'animate-spin')} />
              Check Now
            </Button>
          )}
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={cn('border-amber-300 bg-amber-50', activeAlerts.length > 5 && 'border-red-300 bg-red-50')}>
      <CardContent className="py-3">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-2">
            <AlertTriangle className={cn(
              'h-5 w-5 mt-0.5 flex-shrink-0',
              activeAlerts.length > 5 ? 'text-red-500' : 'text-amber-500'
            )} />
            <div>
              <p className={cn(
                'text-sm font-medium',
                activeAlerts.length > 5 ? 'text-red-800' : 'text-amber-800'
              )}>
                {activeAlerts.length} student{activeAlerts.length > 1 ? 's' : ''} with 3+ consecutive absences
              </p>
              <p className="text-xs text-amber-600 mt-0.5">
                {activeAlerts.length > 5
                  ? 'Multiple students at risk — consider sending notifications.'
                  : 'These students may need follow-up.'}
              </p>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {activeAlerts.slice(0, 10).map((alert) => (
                  <Badge key={alert.studentId} variant="outline" className="bg-white text-xs border-amber-200">
                    {alert.consecutiveCount} days absent
                  </Badge>
                ))}
                {activeAlerts.length > 10 && (
                  <Badge variant="outline" className="bg-white text-xs border-amber-200">
                    +{activeAlerts.length - 10} more
                  </Badge>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 ml-4">
            {onGenerate && (
              <Button
                variant="outline"
                size="sm"
                onClick={onGenerate}
                disabled={isGenerating}
                className="border-amber-300 text-amber-700 hover:bg-amber-100"
              >
                {isGenerating ? (
                  <><Loader2 className="h-3 w-3 mr-1 animate-spin" /> Generating...</>
                ) : (
                  <><RefreshCw className="h-3 w-3 mr-1" /> Generate Alerts</>
                )}
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setDismissed(true)}
              className="h-6 w-6 text-amber-500 hover:text-amber-700"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
