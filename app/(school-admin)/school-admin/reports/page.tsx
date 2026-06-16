'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getAttendanceReport, getFeeCollectionReport, getSchoolOverviewReport } from '@/lib/actions/reports.actions'
import { getClasses } from '@/lib/actions/school-admin'
import { PageHeader } from '@/components/ui/PageHeader'
import { StatCard } from '@/components/ui/StatCard'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { BarChart3, TrendingUp, Users, DollarSign, DownloadCloud, GraduationCap, CalendarCheck, BookOpen } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, LineChart, Line, PieChart, Pie, Cell } from 'recharts'
import { formatCurrency } from '@/lib/utils'

const COLORS = ['#1E40AF', '#059669', '#7C3AED', '#D97706', '#DC2626', '#0891B2']

export default function ReportsPage() {
  const [tab, setTab] = useState('overview')
  const [classFilter, setClassFilter] = useState('')
  const [dateRange, setDateRange] = useState({ from: '', to: '' })

  const { data: classes } = useQuery({ queryKey: ['classes'], queryFn: getClasses })
  const { data: overview } = useQuery({ queryKey: ['report-overview'], queryFn: () => getSchoolOverviewReport() })
  const { data: attendance } = useQuery({
    queryKey: ['report-attendance', classFilter, dateRange],
    queryFn: () => getAttendanceReport({ classId: classFilter || undefined, dateRange: dateRange.from ? dateRange : undefined }),
  })
  const { data: fees } = useQuery({
    queryKey: ['report-fees'],
    queryFn: () => getFeeCollectionReport(),
  })

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reports & Analytics"
        subtitle="School-wide data and insights"
        actions={
          <Button variant="outline"><DownloadCloud className="mr-2 h-4 w-4" /> Export All</Button>
        }
      />

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="overview"><BarChart3 className="mr-2 h-4 w-4" /> Overview</TabsTrigger>
          <TabsTrigger value="attendance"><CalendarCheck className="mr-2 h-4 w-4" /> Attendance</TabsTrigger>
          <TabsTrigger value="academic"><BookOpen className="mr-2 h-4 w-4" /> Academic</TabsTrigger>
          <TabsTrigger value="fees"><DollarSign className="mr-2 h-4 w-4" /> Fees</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard icon={GraduationCap} label="Total Students" value={overview?.kpis?.totalStudents ?? '-'} variant="primary" />
            <StatCard icon={Users} label="Total Teachers" value={overview?.kpis?.totalTeachers ?? '-'} />
            <StatCard icon={CalendarCheck} label="Attendance Rate" value={overview?.kpis ? `${overview.kpis.attendanceRate}%` : '-'} variant="success" />
            <StatCard icon={DollarSign} label="Fee Collection" value={overview?.kpis ? `${overview.kpis.collectionRate}%` : '-'} variant="warning" />
          </div>

          <div className="grid lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader><CardTitle className="text-sm font-medium">Fee Collection Overview</CardTitle></CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={[
                        { name: 'Collected', value: overview?.kpis?.totalFeeCollected ?? 0 },
                        { name: 'Outstanding', value: overview?.kpis?.totalFeeOutstanding ?? 0 },
                      ]} cx="50%" cy="50%" labelLine={false} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} outerRadius={80} dataKey="value">
                        {COLORS.slice(0, 2).map((c: any) => <Cell key={c} fill={c} />)}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-sm font-medium">Quick Stats</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-sm text-muted-foreground">Current Term</span>
                  <span className="text-sm font-medium">{overview?.currentTerm ?? 'N/A'}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-sm text-muted-foreground">Total Classes</span>
                  <span className="text-sm font-medium">{overview?.kpis?.totalClasses ?? 0}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-sm text-muted-foreground">Total Fees</span>
                  <span className="text-sm font-medium">{formatCurrency(overview?.kpis?.totalFeeAmount ?? 0)}</span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-sm text-muted-foreground">Outstanding Fees</span>
                  <span className="text-sm font-medium text-red-600">{formatCurrency(overview?.kpis?.totalFeeOutstanding ?? 0)}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="attendance" className="space-y-6">
          <div className="flex flex-wrap gap-3">
            <Select value={classFilter} onValueChange={setClassFilter}>
              <SelectTrigger className="w-56"><SelectValue placeholder="All classes" /></SelectTrigger>
              <SelectContent>
                <SelectItem value=" ">All classes</SelectItem>
                {classes?.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <input type="date" value={dateRange.from} onChange={e => setDateRange(f => ({ ...f, from: e.target.value }))} className="h-10 rounded-md border border-input bg-background px-3 text-sm" />
            <input type="date" value={dateRange.to} onChange={e => setDateRange(f => ({ ...f, to: e.target.value }))} className="h-10 rounded-md border border-input bg-background px-3 text-sm" />
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard icon={CalendarCheck} label="Avg Attendance" value={attendance ? `${attendance.summary.averageAttendance}%` : '-'} variant="primary" />
            <StatCard icon={Users} label="Students Tracked" value={attendance?.summary.totalStudents ?? '-'} />
            <StatCard icon={TrendingUp} label="At Risk (<75%)" value={attendance?.summary.atRiskCount ?? '-'} variant={attendance?.summary.atRiskCount && attendance.summary.atRiskCount > 0 ? 'danger' : 'success'} />
          </div>

          {attendance?.dailyRates && attendance.dailyRates.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-sm font-medium">Daily Attendance Rate</CardTitle></CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={attendance.dailyRates}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" fontSize={12} />
                      <YAxis fontSize={12} unit="%" />
                      <Tooltip />
                      <Line type="monotone" dataKey="rate" stroke="#1E40AF" strokeWidth={2} dot={{ r: 3 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader><CardTitle className="text-sm font-medium">Per-Class Attendance</CardTitle></CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={attendance?.classAttendance ?? []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="class_name" fontSize={12} />
                    <YAxis fontSize={12} unit="%" />
                    <Tooltip />
                    <Bar dataKey="rate" fill="#059669" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="academic" className="space-y-6">
          <Card>
            <CardContent className="py-12 text-center text-sm text-muted-foreground">
              Select an exam from the Exams page to view academic performance reports, grade distribution, and student rankings.
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="fees" className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard icon={DollarSign} label="Expected" value={fees ? formatCurrency(fees.summary.expected) : '-'} variant="primary" />
            <StatCard icon={TrendingUp} label="Collected" value={fees ? formatCurrency(fees.summary.collected) : '-'} variant="success" />
            <StatCard icon={BarChart3} label="Collection Rate" value={fees ? `${fees.summary.collectionRate}%` : '-'} />
            <StatCard icon={Users} label="Overdue" value={fees?.summary.overdue ?? '-'} variant="danger" />
          </div>

          {fees?.monthlyTrend && fees.monthlyTrend.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-sm font-medium">Monthly Collection Trend</CardTitle></CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={fees.monthlyTrend}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" fontSize={12} />
                      <YAxis fontSize={12} />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="collected" fill="#059669" radius={[4, 4, 0, 0]} name="Collected" />
                      <Bar dataKey="target" fill="#1E40AF" radius={[4, 4, 0, 0]} name="Target" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}

          {fees?.defaulters && fees.defaulters.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-sm font-medium">Top Defaulters</CardTitle></CardHeader>
              <CardContent>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b"><th className="text-left py-2 font-medium">Student</th><th className="text-left py-2 font-medium">Amount</th><th className="text-left py-2 font-medium">Outstanding</th><th className="text-left py-2 font-medium">Days Overdue</th></tr>
                  </thead>
                  <tbody>
                    {fees.defaulters.slice(0, 10).map((d: any) => (
                      <tr key={d.invoice_id} className="border-b">
                        <td className="py-2 font-medium">{d.name}</td>
                        <td className="py-2">{formatCurrency(d.amount)}</td>
                        <td className="py-2 text-red-600 font-medium">{formatCurrency(d.outstanding)}</td>
                        <td className="py-2">{d.days_overdue}d</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
