'use client'

import { useCallback, useRef } from 'react'
import {
  ResponsiveContainer,
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, Area, AreaChart,
} from 'recharts'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { Download, ImageIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

type ChartType = 'line' | 'bar' | 'pie' | 'area'

interface ChartWrapperProps {
  title?: string
  type: ChartType
  data: any[]
  loading?: boolean
  emptyMessage?: string
  height?: number
  xKey?: string
  yKey?: string | string[]
  colors?: string[]
  showExport?: boolean
  children?: React.ReactNode
}

const DEFAULT_COLORS = ['#2563eb', '#16a34a', '#dc2626', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316']

export function ChartWrapper({
  title, type, data, loading, emptyMessage, height = 300,
  xKey = 'name', yKey = 'value', colors = DEFAULT_COLORS,
  showExport = true,
}: ChartWrapperProps) {
  const chartRef = useRef<HTMLDivElement>(null)

  const exportAsPng = useCallback(async () => {
    if (!chartRef.current) return
    try {
      const { toPng } = await import('html-to-image')
      const dataUrl = await toPng(chartRef.current, { backgroundColor: '#fff' })
      const link = document.createElement('a')
      link.download = `${title ?? 'chart'}-${Date.now()}.png`
      link.href = dataUrl
      link.click()
    } catch {
      // fallback: inform user
    }
  }, [title])

  if (loading) {
    return (
      <div className="space-y-3">
        {title && <Skeleton className="h-5 w-48" />}
        <Skeleton className="w-full rounded-lg" style={{ height }} />
      </div>
    )
  }

  if (!data || data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center" style={{ height }}>
        <ImageIcon className="h-8 w-8 text-muted-foreground/50 mb-2" />
        <p className="text-sm text-muted-foreground">{emptyMessage ?? 'No data available'}</p>
      </div>
    )
  }

  const yKeys = Array.isArray(yKey) ? yKey : [yKey]

  const renderChart = () => {
    switch (type) {
      case 'line':
        return (
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey={xKey} tick={{ fontSize: 11 }} stroke="#888" />
            <YAxis tick={{ fontSize: 11 }} stroke="#888" />
            <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            {yKeys.map((key: any, i: any) => (
              <Line
                key={key}
                type="monotone"
                dataKey={key}
                stroke={colors[i % colors.length]}
                strokeWidth={2}
                dot={{ r: 3 }}
                activeDot={{ r: 5 }}
              />
            ))}
          </LineChart>
        )

      case 'bar':
        return (
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey={xKey} tick={{ fontSize: 11 }} stroke="#888" />
            <YAxis tick={{ fontSize: 11 }} stroke="#888" />
            <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            {yKeys.map((key: any, i: any) => (
              <Bar key={key} dataKey={key} fill={colors[i % colors.length]} radius={[4, 4, 0, 0]} />
            ))}
          </BarChart>
        )

      case 'pie':
        return (
          <PieChart>
            <Pie
              data={data}
              dataKey={yKeys[0]}
              nameKey={xKey}
              cx="50%"
              cy="50%"
              outerRadius={Math.min(height / 3, 120)}
              label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              labelLine
            >
              {data.map((_: any, i: any) => (
                <Cell key={i} fill={colors[i % colors.length]} />
              ))}
            </Pie>
            <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
          </PieChart>
        )

      case 'area':
        return (
          <AreaChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey={xKey} tick={{ fontSize: 11 }} stroke="#888" />
            <YAxis tick={{ fontSize: 11 }} stroke="#888" />
            <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            {yKeys.map((key: any, i: any) => (
              <Area
                key={key}
                type="monotone"
                dataKey={key}
                fill={colors[i % colors.length]}
                fillOpacity={0.15}
                stroke={colors[i % colors.length]}
                strokeWidth={2}
              />
            ))}
          </AreaChart>
        )
    }
  }

  return (
    <div className="space-y-3">
      {title && (
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-gray-700">{title}</h3>
          {showExport && data.length > 0 && (
            <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={exportAsPng}>
              <Download className="h-3 w-3" /> PNG
            </Button>
          )}
        </div>
      )}
      <div ref={chartRef} className={cn('rounded-lg border bg-white p-4')}>
        <ResponsiveContainer width="100%" height={height}>
          {renderChart()}
        </ResponsiveContainer>
      </div>
    </div>
  )
}
