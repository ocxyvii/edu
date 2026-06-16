'use client'

import { useQuery } from '@tanstack/react-query'
import { getStudentDashboard } from '@/lib/actions/student'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import {
  ClipboardCheck,
  Clock,
  MessageSquare,
  Megaphone,
  CheckSquare,
  TrendingUp,
  BookOpen,
  DollarSign,
  GraduationCap,
  MapPin,
} from 'lucide-react'
import Link from 'next/link'

export default function StudentDashboard() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['student-dashboard'],
    queryFn: () => getStudentDashboard(),
    retry: false,
  })

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_: any, i: any) => <Skeleton key={i} className="h-28" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-red-500 font-medium">Failed to load dashboard</p>
          <p className="text-sm text-muted-foreground mt-1">
            {(error as Error).message}
          </p>
        </div>
      </div>
    )
  }

  const kpis = [
    {
      label: 'Attendance',
      value: `${data?.attendancePercent ?? 0}%`,
      sub: `${data?.presentDays ?? 0}/${data?.totalDays ?? 0} days`,
      icon: CheckSquare,
      color: 'text-emerald-600',
      bg: 'bg-emerald-100',
    },
    {
      label: 'Average Marks',
      value: data?.avgMarks ?? '—',
      sub: 'Across all subjects',
      icon: TrendingUp,
      color: 'text-blue-600',
      bg: 'bg-blue-100',
    },
    {
      label: 'Pending Work',
      value: data?.pendingAssignments?.length ?? 0,
      sub: 'Assignments due',
      icon: BookOpen,
      color: 'text-amber-600',
      bg: 'bg-amber-100',
    },
    {
      label: 'Fee Balance',
      value: data?.feeBalance != null
        ? `KES ${Number(data.feeBalance).toLocaleString()}`
        : '—',
      sub: 'Outstanding',
      icon: DollarSign,
      color: 'text-red-600',
      bg: 'bg-red-100',
    },
  ]

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Student Dashboard</h1>
        <p className="text-gray-600 mt-1">Track your academic progress</p>
      </div>

      {/* My Class Card */}
      {data?.class && (
        <Card className="bg-gradient-to-br from-edu-blue-600 to-edu-blue-800 text-white border-none shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-blue-200 text-xs font-medium uppercase tracking-wider">My Class</p>
                <h2 className="text-2xl font-bold">{data.class.name}{data.class.level != null ? ` (Level ${data.class.level})` : ''}</h2>
                {data.section && (
                  <p className="text-blue-100 flex items-center gap-1.5 text-sm">
                    <MapPin className="h-3.5 w-3.5" />
                    Section: {data.section.name}
                  </p>
                )}
              </div>
              <GraduationCap className="h-12 w-12 text-blue-300/40" />
            </div>
          </CardContent>
        </Card>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi: any) => {
          const Icon = kpi.icon
          return (
            <Card key={kpi.label}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">
                  {kpi.label}
                </CardTitle>
                <div className={`rounded-lg ${kpi.bg} p-2`}>
                  <Icon className={`h-4 w-4 ${kpi.color}`} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{kpi.value}</div>
                <p className="text-xs text-muted-foreground mt-1">{kpi.sub}</p>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Today's Schedule + Pending Assignments */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" /> Today&apos;s Schedule
            </CardTitle>
            <CardDescription>Your classes for today</CardDescription>
          </CardHeader>
          <CardContent>
            {!data?.todayClasses || data.todayClasses.length === 0 ? (
              <p className="text-center py-8 text-muted-foreground">
                No classes scheduled for today
              </p>
            ) : (
              <div className="space-y-3">
                {data.todayClasses.map((cls: any) => (
                  <div
                    key={cls.id}
                    className="flex items-center justify-between p-3 rounded-lg border border-gray-100"
                  >
                    <div className="flex items-center gap-3">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="font-medium">{cls.subjects?.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {cls.teachers?.profiles?.first_name}{' '}
                          {cls.teachers?.profiles?.last_name}
                          {cls.room && ` · Room ${cls.room}`}
                        </p>
                      </div>
                    </div>
                    <span className="text-sm font-mono text-muted-foreground">
                      {cls.start_time?.slice(0, 5)}–{cls.end_time?.slice(0, 5)}
                    </span>
                  </div>
                ))}
                <Link
                  href="/student/timetable"
                  className="text-sm text-blue-600 hover:underline block mt-2"
                >
                  View full timetable →
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ClipboardCheck className="h-5 w-5" /> Pending Assignments
            </CardTitle>
            <CardDescription>Assignments due soon</CardDescription>
          </CardHeader>
          <CardContent>
            {!data?.pendingAssignments || data.pendingAssignments.length === 0 ? (
              <p className="text-center py-8 text-muted-foreground">
                All caught up! No pending assignments.
              </p>
            ) : (
              <div className="space-y-3">
                {data.pendingAssignments.map((a: any) => {
                  const due = new Date(a.due_date)
                  const daysLeft = Math.ceil(
                    (due.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
                  )
                  return (
                    <div
                      key={a.id}
                      className="flex items-center justify-between p-3 rounded-lg border border-gray-100"
                    >
                      <div>
                        <p className="font-medium">{a.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {a.subjects?.name}
                        </p>
                      </div>
                      <Badge
                        className={
                          daysLeft <= 0
                            ? 'bg-red-100 text-red-800'
                            : daysLeft <= 1
                            ? 'bg-red-100 text-red-800'
                            : daysLeft <= 3
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-green-100 text-green-800'
                        }
                      >
                        {daysLeft <= 0 ? 'Overdue' : `${daysLeft}d left`}
                      </Badge>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Results + Messages */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" /> Recent Results
            </CardTitle>
            <CardDescription>Your latest exam scores</CardDescription>
          </CardHeader>
          <CardContent>
            {!data?.recentResults || data.recentResults.length === 0 ? (
              <p className="text-center py-8 text-muted-foreground">
                No results published yet
              </p>
            ) : (
              <div className="space-y-3">
                {data.recentResults.slice(0, 5).map((r: any) => (
                  <div
                    key={r.id}
                    className="flex items-center justify-between p-3 rounded-lg border border-gray-100"
                  >
                    <div>
                      <p className="font-medium">{r.subjects?.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {r.exams?.name}
                      </p>
                    </div>
                    <div className="text-right">
                      <span
                        className={`font-semibold ${
                          Number(r.marks_obtained) >= 80
                            ? 'text-green-600'
                            : Number(r.marks_obtained) >= 50
                            ? 'text-amber-600'
                            : 'text-red-600'
                        }`}
                      >
                        {r.marks_obtained}
                        {r.grade ? ` (${r.grade})` : ''}
                      </span>
                    </div>
                  </div>
                ))}
                <Link
                  href="/student/results"
                  className="text-sm text-blue-600 hover:underline block mt-2"
                >
                  View all results →
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" /> Messages
            </CardTitle>
            <CardDescription>Recent unread messages</CardDescription>
          </CardHeader>
          <CardContent>
            {!data?.unreadMessages || data.unreadMessages.length === 0 ? (
              <p className="text-center py-8 text-muted-foreground">
                No unread messages
              </p>
            ) : (
              <div className="space-y-3">
                {data.unreadMessages.slice(0, 3).map((m: any) => (
                  <div
                    key={m.id}
                    className="flex items-start gap-3 p-3 rounded-lg border border-gray-100"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">
                        {m.subject || 'No subject'}
                      </p>
                      <p className="text-xs text-muted-foreground line-clamp-1">
                        {m.content}
                      </p>
                    </div>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {new Date(m.created_at).toLocaleDateString()}
                    </span>
                  </div>
                ))}
                <Link
                  href="/student/messages"
                  className="text-sm text-blue-600 hover:underline block mt-2"
                >
                  View all messages →
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Announcements */}
      {data?.announcements && data.announcements.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Megaphone className="h-5 w-5" /> Announcements
            </CardTitle>
            <CardDescription>School announcements and updates</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.announcements.map((a: any) => (
                <div
                  key={a.id}
                  className="p-3 rounded-lg border border-gray-100"
                >
                  <p className="font-medium text-sm">{a.title}</p>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                    {a.content}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    {new Date(a.created_at).toLocaleDateString()}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}