'use client'

import { cn } from '@/lib/utils'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

export type TrendDirection = 'up' | 'down' | 'neutral'

export interface StatCardProps {
  icon?: React.ElementType
  label: string
  value: string | number
  trend?: { direction: TrendDirection; value: string }
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'danger'
  className?: string
  onClick?: () => void
}

const variantStyles = {
  default: { icon: 'text-blue-600', bg: 'bg-blue-50', border: '' },
  primary: { icon: 'text-indigo-600', bg: 'bg-indigo-50', border: '' },
  success: { icon: 'text-emerald-600', bg: 'bg-emerald-50', border: '' },
  warning: { icon: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200' },
  danger: { icon: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200' },
}

export function StatCard({ icon: Icon, label, value, trend, variant = 'default', className, onClick }: StatCardProps) {
  const v = variantStyles[variant]
  const TrendIcon = trend?.direction === 'up' ? TrendingUp : trend?.direction === 'down' ? TrendingDown : Minus
  const trendColor = trend?.direction === 'up' ? 'text-emerald-600' : trend?.direction === 'down' ? 'text-red-600' : 'text-gray-400'

  return (
    <div
      className={cn(
        'rounded-xl border bg-white p-5 transition-all duration-200',
        onClick && 'cursor-pointer hover:shadow-md hover:border-gray-300',
        v.border,
        className,
      )}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-sm font-medium text-muted-foreground">{label}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
        </div>
        {Icon && (
          <div className={cn('flex h-10 w-10 items-center justify-center rounded-lg', v.bg)}>
            <Icon className={cn('h-5 w-5', v.icon)} />
          </div>
        )}
      </div>
      {trend && (
        <div className="mt-2 flex items-center gap-1 text-xs">
          <TrendIcon className={cn('h-3.5 w-3.5', trendColor)} />
          <span className={cn('font-medium', trendColor)}>{trend.value}</span>
          <span className="text-muted-foreground">vs last period</span>
        </div>
      )}
    </div>
  )
}
