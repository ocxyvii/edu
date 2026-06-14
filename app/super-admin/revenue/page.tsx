'use client'

import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { PageHeader } from '@/components/ui/PageHeader'
import { StatCard } from '@/components/ui/StatCard'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { formatCurrency } from '@/lib/utils'
import { TrendingUp, DollarSign, Building2, CreditCard, ArrowUpRight } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, LineChart, Line } from 'recharts'

const supabase = createClient()

export default function RevenuePage() {
  const { data, isLoading } = useQuery({
    queryKey: ['super-admin-revenue'],
    queryFn: async () => {
      const { data: schools } = await supabase.from('schools').select('id, name, subscription_plan, is_active')
      const { data: payments } = await supabase.from('payments').select('amount, paid_at, school_id, payment_method')

      const totalRevenue = (payments ?? []).reduce((s, p) => s + Number(p.amount), 0)
      const activeSchools = (schools ?? []).filter(s => s.is_active).length
      const avgPerSchool = activeSchools > 0 ? Math.round(totalRevenue / activeSchools) : 0
      const totalTransactions = payments?.length ?? 0

      // Monthly trend across all schools
      const monthlyMap = new Map<string, { month: string; revenue: number; transactions: number }>()
      for (const p of payments ?? []) {
        const m = p.paid_at?.slice(0, 7) ?? 'unknown'
        if (!monthlyMap.has(m)) monthlyMap.set(m, { month: m, revenue: 0, transactions: 0 })
        const e = monthlyMap.get(m)!
        e.revenue += Number(p.amount)
        e.transactions++
      }
      const monthlyRevenue = Array.from(monthlyMap.values()).sort((a, b) => a.month.localeCompare(b.month))

      // School breakdown
      const schoolRevenue = (schools ?? []).map(s => {
        const schoolPayments = (payments ?? []).filter(p => p.school_id === s.id)
        return {
          name: s.name,
          plan: s.subscription_plan,
          active: s.is_active,
          revenue: schoolPayments.reduce((sum, p) => sum + Number(p.amount), 0),
          transactions: schoolPayments.length,
        }
      }).sort((a, b) => b.revenue - a.revenue)

      // Payment method breakdown
      const methodMap = new Map<string, number>()
      for (const p of payments ?? []) {
        methodMap.set(p.payment_method, (methodMap.get(p.payment_method) ?? 0) + Number(p.amount))
      }
      const methodBreakdown = Array.from(methodMap.entries()).map(([method, amount]) => ({ method, amount }))

      return { totalRevenue, activeSchools, avgPerSchool, totalTransactions, monthlyRevenue, schoolRevenue, methodBreakdown }
    },
  })

  if (isLoading) return <div className="space-y-4">{[...Array(6)].map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}</div>

  return (
    <div className="space-y-6">
      <PageHeader title="Revenue" subtitle="Platform-wide revenue analytics" />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={DollarSign} label="Total Revenue" value={formatCurrency(data?.totalRevenue ?? 0)} variant="primary" />
        <StatCard icon={Building2} label="Active Schools" value={data?.activeSchools ?? 0} />
        <StatCard icon={TrendingUp} label="Avg/School" value={formatCurrency(data?.avgPerSchool ?? 0)} />
        <StatCard icon={CreditCard} label="Transactions" value={data?.totalTransactions ?? 0} />
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-sm font-medium">Monthly Revenue</CardTitle></CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data?.monthlyRevenue}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" fontSize={12} />
                  <YAxis fontSize={12} />
                  <Tooltip />
                  <Bar dataKey="revenue" fill="#1E40AF" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-sm font-medium">Payment Methods</CardTitle></CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data?.methodBreakdown} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" fontSize={12} />
                  <YAxis type="category" dataKey="method" fontSize={12} width={80} />
                  <Tooltip />
                  <Bar dataKey="amount" fill="#059669" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-sm font-medium">School Revenue Breakdown</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>School</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Transactions</TableHead>
                <TableHead className="text-right">Revenue</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data?.schoolRevenue.map((s: any) => (
                <TableRow key={s.name}>
                  <TableCell className="font-medium">{s.name}</TableCell>
                  <TableCell className="capitalize">{s.plan}</TableCell>
                  <TableCell><Badge variant={s.active ? 'default' : 'destructive'} className="text-[10px]">{s.active ? 'Active' : 'Inactive'}</Badge></TableCell>
                  <TableCell className="text-right">{s.transactions}</TableCell>
                  <TableCell className="text-right font-medium">{formatCurrency(s.revenue)}</TableCell>
                </TableRow>
              ))}
              {!data?.schoolRevenue.length && (
                <TableRow><TableCell colSpan={5} className="py-8 text-center text-muted-foreground">No payment data yet.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
