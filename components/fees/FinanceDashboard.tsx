'use client'

import { useQuery } from '@tanstack/react-query'
import { getFeeDashboard, getFeeStructures, getClasses } from '@/lib/actions/fees.actions'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { DollarSign, TrendingUp, TrendingDown, AlertTriangle, Banknote, Wallet, PieChart } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart as RePie, Pie, Cell, Legend } from 'recharts'

const COLORS = ['#22c55e', '#f59e0b', '#ef4444', '#3b82f6', '#8b5cf6', '#ec4899']

export function FinanceDashboard() {
  const { data: dashboard, isLoading } = useQuery({
    queryKey: ['fee-dashboard'],
    queryFn: getFeeDashboard,
    refetchInterval: 30000,
  })

  if (isLoading) return <div className="space-y-4">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}</div>

  if (!dashboard) return null

  const methodData = Object.entries(dashboard.methodBreakdown).map(([name, value]) => ({ name, value }))

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium">Total Billed</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">KES {dashboard.total.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">{dashboard.invoiceCount} invoices</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium">Collected</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">KES {dashboard.collected.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">{dashboard.collectionRate}% collection rate</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium">Outstanding</CardTitle>
            <TrendingDown className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">KES {dashboard.outstanding.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">{dashboard.overdueCount} overdue invoices</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium">Last 30 Days</CardTitle>
            <Wallet className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">KES {dashboard.last30DaysCollected.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Recent collections</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Monthly Collection Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dashboard.monthlyTrend}>
                  <XAxis dataKey="month" fontSize={12} />
                  <YAxis fontSize={12} tickFormatter={(v) => `KES ${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(value: number) => [`KES ${value.toLocaleString()}`, 'Collected']} />
                  <Bar dataKey="collected" fill="#22c55e" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Payment Method Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              {methodData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <RePie>
                    <Pie data={methodData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                      {methodData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip formatter={(value: number) => `KES ${value.toLocaleString()}`} />
                    <Legend />
                  </RePie>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">No payment data yet</div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-red-500" />
            Top Defaulters
          </CardTitle>
        </CardHeader>
        <CardContent>
          {dashboard.topDefaulters.length === 0 ? (
            <p className="text-muted-foreground text-sm">No defaulters. All invoices are in good standing.</p>
          ) : (
            <div className="space-y-2">
              {dashboard.topDefaulters.map((d: any) => (
                <div key={d.student_id} className="flex items-center justify-between p-2 rounded bg-red-50">
                  <span className="text-sm font-medium">{d.students?.profiles?.first_name} {d.students?.profiles?.last_name}</span>
                  <span className="text-sm font-semibold text-red-600">KES {Number(d.balance).toLocaleString()}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
