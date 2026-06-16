'use client'

import { useQuery } from '@tanstack/react-query'
import { getApplicationStats } from '@/lib/actions/admissions.actions'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { FileText, Clock, CheckCircle, XCircle, UserPlus, ListChecks } from 'lucide-react'

export function ApplicationStats() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['application-stats'],
    queryFn: () => getApplicationStats(),
    refetchInterval: 30_000,
  })

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[...Array(4)].map((_: any, i: any) => (
          <Card key={i}><CardHeader className="pb-2"><Skeleton className="h-4 w-24" /></CardHeader><CardContent><Skeleton className="h-8 w-16" /></CardContent></Card>
        ))}
      </div>
    )
  }

  const cards = [
    { label: 'Total Applications', value: stats?.total ?? 0, icon: FileText, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Pending Review', value: (stats?.pending ?? 0) + (stats?.reviewing ?? 0), icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50' },
    { label: 'Approved', value: stats?.approved ?? 0, icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-50' },
    { label: 'Enrolled', value: stats?.enrolled ?? 0, icon: UserPlus, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'Waitlisted', value: stats?.waitlisted ?? 0, icon: ListChecks, color: 'text-purple-600', bg: 'bg-purple-50' },
    { label: 'Rejected', value: stats?.rejected ?? 0, icon: XCircle, color: 'text-red-600', bg: 'bg-red-50' },
  ]

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      {cards.map((card: any) => (
        <Card key={card.label}>
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">{card.label}</CardTitle>
            <div className={`h-8 w-8 rounded-full ${card.bg} flex items-center justify-center`}>
              <card.icon className={`h-4 w-4 ${card.color}`} />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{card.value}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
