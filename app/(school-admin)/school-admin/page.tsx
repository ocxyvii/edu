'use client'

import { useQuery } from '@tanstack/react-query'
import {
  getDashboardStats,
  getWeeklyAttendance,
  getMonthlyFees,
} from '@/lib/actions/school-admin'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Users, GraduationCap, CalendarCheck, DollarSign, Plus, ClipboardList, Megaphone } from 'lucide-react'
import Link from 'next/link'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts'

const quickActions = [
  { label: 'Mark Attendance', href: '/school-admin/attendance', icon: CalendarCheck, color: 'bg-blue-500' },
  { label: 'Add Student', href: '/school-admin/students/new', icon: Plus, color: 'bg-green-500' },
  { label: 'Create Exam', href: '/school-admin/examinations', icon: ClipboardList, color: 'bg-purple-500' },
  { label: 'Send Announcement', href: '/school-admin/notifications', icon: Megaphone, color: 'bg-orange-500' },
]

export default function SchoolAdminDashboard() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['school-dashboard-stats'],
    queryFn: () => getDashboardStats(),
    refetchInterval: 30000,
  })

  const { data: weeklyData } = useQuery({
    queryKey: ['school-weekly-attendance'],
    queryFn: () => getWeeklyAttendance(),
  })

  const { data: monthlyFees } = useQuery({
    queryKey: ['school-monthly-fees'],
    queryFn: () => getMonthlyFees(),
  })

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">School Dashboard</h1>
        <p className="text-gray-600 mt-1">Welcome back! Here is what is happening today.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Present Today</CardTitle>
            <Users className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-8 w-20" /> : (
              <>
                <div className="text-2xl font-bold text-green-600">{stats?.present ?? 0}</div>
                <p className="text-xs text-muted-foreground">out of {stats?.totalStudents ?? 0} students</p>
              </>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Absent Today</CardTitle>
            <Users className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-8 w-20" /> : (
              <>
                <div className="text-2xl font-bold text-red-600">{stats?.absent ?? 0}</div>
                <p className="text-xs text-muted-foreground">{stats?.totalStudents ? Math.round(stats.absent / stats.totalStudents * 100) : 0}% absence rate</p>
              </>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Fees Collected Today</CardTitle>
            <DollarSign className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-8 w-20" /> : (
              <>
                <div className="text-2xl font-bold">KES {stats?.feesCollected?.toLocaleString() ?? 0}</div>
                <p className="text-xs text-muted-foreground">Today&apos;s collections</p>
              </>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Fees</CardTitle>
            <DollarSign className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-8 w-20" /> : (
              <>
                <div className="text-2xl font-bold text-orange-600">KES {stats?.pendingFees?.toLocaleString() ?? 0}</div>
                <p className="text-xs text-muted-foreground">Outstanding balance</p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Weekly Attendance Trend</CardTitle>
            <CardDescription>Last 7 days attendance</CardDescription>
          </CardHeader>
          <CardContent>
            {weeklyData ? (
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={weeklyData}>
                  <defs>
                    <linearGradient id="presentGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="absentGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} tickFormatter={(v) => new Date(v).toLocaleDateString('en', { weekday: 'short' })} />
                  <YAxis />
                  <Tooltip />
                  <Area type="monotone" dataKey="present" stroke="#22c55e" fill="url(#presentGrad)" name="Present" />
                  <Area type="monotone" dataKey="absent" stroke="#ef4444" fill="url(#absentGrad)" name="Absent" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[280px] text-muted-foreground">Loading...</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Monthly Fee Collection</CardTitle>
            <CardDescription>Last 6 months</CardDescription>
          </CardHeader>
          <CardContent>
            {monthlyFees ? (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={monthlyFees}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis tickFormatter={(v) => `KES ${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(value: number) => [`KES ${value.toLocaleString()}`, 'Collected']} />
                  <Bar dataKey="collected" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[280px] text-muted-foreground">Loading...</div>
            )}
          </CardContent>
        </Card>
      </div>

      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {quickActions.map((action) => {
            const Icon = action.icon
            return (
              <Link key={action.href} href={action.href}>
                <Card className="cursor-pointer hover:shadow-md transition-shadow">
                  <CardContent className="flex flex-col items-center justify-center py-6 gap-3">
                    <div className={`p-3 rounded-full ${action.color}`}>
                      <Icon className="h-6 w-6 text-white" />
                    </div>
                    <span className="text-sm font-medium text-gray-700">{action.label}</span>
                  </CardContent>
                </Card>
              </Link>
            )
          })}
        </div>
      </div>
    </div>
  )
}
