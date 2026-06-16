'use client'

import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Building2, DollarSign, TrendingUp, TrendingDown, AlertTriangle, Users } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { useState } from 'react'

export default function SuperAdminFinancePage() {
  const [period, setPeriod] = useState('month')

  const { data: schools, isLoading } = useQuery({
    queryKey: ['super-admin-schools-finance'],
    queryFn: async () => {
      const supabase = createClient()
      const { data: schools } = await supabase.from('schools').select('id, name, slug, subscription_plan, is_active').eq('is_active', true)
      if (!schools) return []

      const schoolsWithFinance = await Promise.all(
        schools.map(async (school) => {
          const { data: invoices } = await supabase
            .from('fee_invoices')
            .select('amount, paid_amount, balance, status')
            .eq('school_id', school.id)

          const { data: students } = await supabase
            .from('students')
            .select('id', { count: 'exact', head: true })
            .eq('school_id', school.id)
            .eq('is_active', true)

          const total = invoices?.reduce((s: any, i: any) => s + Number(i.amount), 0) ?? 0
          const collected = invoices?.reduce((s: any, i: any) => s + Number(i.paid_amount), 0) ?? 0
          const outstanding = invoices?.reduce((s: any, i: any) => s + Number(i.balance), 0) ?? 0
          const overdueCount = invoices?.filter((i: any) => i.status === 'overdue').length ?? 0
          const paidCount = invoices?.filter((i: any) => i.status === 'paid').length ?? 0
          const invoiceCount = invoices?.length ?? 0

          return {
            ...school,
            total,
            collected,
            outstanding,
            overdueCount,
            paidCount,
            invoiceCount,
            studentCount: students?.length ?? 0,
            collectionRate: total > 0 ? Math.round((collected / total) * 100) : 0,
          }
        })
      )

      return schoolsWithFinance
    },
  })

  const { data: aggregated } = useQuery({
    queryKey: ['super-admin-finance-aggregated'],
    queryFn: async () => {
      const supabase = createClient()
      const { data: payments } = await supabase
        .from('payments')
        .select('amount, paid_at, school_id')

      const currentYear = new Date().getFullYear()
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
      const monthlyTrend: { month: string; collected: number }[] = []

      for (let i = 5; i >= 0; i--) {
        const d = new Date()
        d.setMonth(d.getMonth() - i)
        const month = d.getMonth()
        const year = d.getFullYear()
        const collected = (payments ?? [])
          .filter((p: any) => {
            const pd = new Date(p.paid_at)
            return pd.getMonth() === month && pd.getFullYear() === year
          })
          .reduce((s: any, p: any) => s + Number(p.amount), 0)
        monthlyTrend.push({ month: monthNames[month], collected })
      }

      const totalPlatformCollected = (payments ?? []).reduce((s: any, p: any) => s + Number(p.amount), 0)

      return { monthlyTrend, totalPlatformCollected }
    },
  })

  const totals = schools?.reduce((acc, s: any) => ({
    total: acc.total + s.total,
    collected: acc.collected + s.collected,
    outstanding: acc.outstanding + s.outstanding,
    overdueCount: acc.overdueCount + s.overdueCount,
    students: acc.students + s.studentCount,
    schools: acc.schools + 1,
  }), { total: 0, collected: 0, outstanding: 0, overdueCount: 0, students: 0, schools: 0 }) ?? {
    total: 0, collected: 0, outstanding: 0, overdueCount: 0, students: 0, schools: 0,
  }

  const platformRate = totals.total > 0 ? Math.round((totals.collected / totals.total) * 100) : 0

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Cross-School Finance Overview</h1>
        <p className="text-gray-600 mt-1">Monitor fee collection across all schools</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-xs font-medium">Active Schools</CardTitle></CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totals.schools}</div>
            <p className="text-xs text-muted-foreground flex items-center gap-1"><Building2 className="h-3 w-3" /> Platform</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-xs font-medium">Total Students</CardTitle></CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totals.students.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground flex items-center gap-1"><Users className="h-3 w-3" /> Across schools</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-xs font-medium">Total Billed</CardTitle></CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">KES {totals.total.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-xs font-medium">Total Collected</CardTitle></CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">KES {totals.collected.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">{platformRate}% rate</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-xs font-medium">Total Outstanding</CardTitle></CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">KES {totals.outstanding.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-xs font-medium">Overdue</CardTitle></CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{totals.overdueCount}</div>
            <p className="text-xs text-muted-foreground">Invoices overdue</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Platform Collection Trend (6 Months)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={aggregated?.monthlyTrend ?? []}>
                <XAxis dataKey="month" fontSize={12} />
                <YAxis fontSize={12} tickFormatter={(v) => `KES ${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(value: number) => [`KES ${value.toLocaleString()}`, 'Collected']} />
                <Bar dataKey="collected" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="all">
        <TabsList>
          <TabsTrigger value="all">All Schools</TabsTrigger>
          <TabsTrigger value="atrisk">At Risk</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>School Collection Summary</CardTitle>
              <CardDescription>Fee collection performance per school</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-3">{[...Array(3)].map((_: any, i: any) => <Skeleton key={i} className="h-16 w-full" />)}</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 font-medium">School</th>
                        <th className="text-right py-3 font-medium">Students</th>
                        <th className="text-right py-3 font-medium">Plan</th>
                        <th className="text-right py-3 font-medium">Billed</th>
                        <th className="text-right py-3 font-medium">Collected</th>
                        <th className="text-right py-3 font-medium">Outstanding</th>
                        <th className="text-right py-3 font-medium">Rate</th>
                        <th className="text-right py-3 font-medium">Overdue</th>
                      </tr>
                    </thead>
                    <tbody>
                      {schools
                        ?.sort((a: any, b: any) => b.collected - a.collected)
                        .map((school: any) => (
                          <tr key={school.id} className="border-t hover:bg-gray-50">
                            <td className="py-3 font-medium">{school.name}</td>
                            <td className="py-3 text-right">{school.studentCount}</td>
                            <td className="py-3 text-right">
                              <Badge variant="outline" className="text-xs">{school.subscription_plan}</Badge>
                            </td>
                            <td className="py-3 text-right">KES {school.total.toLocaleString()}</td>
                            <td className="py-3 text-right text-green-600">KES {school.collected.toLocaleString()}</td>
                            <td className="py-3 text-right text-orange-600">KES {school.outstanding.toLocaleString()}</td>
                            <td className="py-3 text-right">
                              <span className={school.collectionRate >= 70 ? 'text-green-600' : school.collectionRate >= 40 ? 'text-yellow-600' : 'text-red-600'}>
                                {school.collectionRate}%
                              </span>
                            </td>
                            <td className="py-3 text-right">
                              <span className={school.overdueCount > 0 ? 'text-red-600 font-medium' : ''}>
                                {school.overdueCount}
                              </span>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="atrisk" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Schools Needing Attention</CardTitle>
              <CardDescription>Schools with collection rates below 50% or high overdue counts</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-32 w-full" />
              ) : (
                <div className="space-y-3">
                  {schools
                    ?.filter((s: any) => s.collectionRate < 50 || s.overdueCount > 10)
                    .sort((a: any, b: any) => a.collectionRate - b.collectionRate)
                    .map((school: any) => (
                      <div key={school.id} className="flex items-center justify-between p-3 rounded-lg bg-red-50 border border-red-100">
                        <div className="flex items-center gap-3">
                          <AlertTriangle className="h-5 w-5 text-red-500" />
                          <div>
                            <p className="font-medium text-gray-900">{school.name}</p>
                            <p className="text-xs text-gray-500">
                              {school.collectionRate}% collection rate · {school.overdueCount} overdue invoices
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-red-600">KES {school.outstanding.toLocaleString()}</p>
                          <p className="text-xs text-gray-500">outstanding</p>
                        </div>
                      </div>
                    ))}

                  {schools?.filter((s: any) => s.collectionRate < 50 || s.overdueCount > 10).length === 0 && (
                    <p className="text-muted-foreground text-sm py-8 text-center">All schools are in good financial standing.</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
