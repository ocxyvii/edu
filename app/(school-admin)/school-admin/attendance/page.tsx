'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getClasses } from '@/lib/actions/school-admin'
import { getDashboardStats } from '@/lib/actions/school-admin'
import { AttendanceSheet } from '@/components/attendance/AttendanceSheet'
import { AttendanceSummaryCards } from '@/components/attendance/AttendanceSummaryCards'
import { PageHeader } from '@/components/ui/PageHeader'
import { StatCard } from '@/components/ui/StatCard'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'
import { CalendarCheck, BarChart3, Users, Calendar } from 'lucide-react'

export default function AttendancePage() {
  const [selectedClass, setSelectedClass] = useState('')
  const [selectedSection, setSelectedSection] = useState('')
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [view, setView] = useState<'mark' | 'stats'>('mark')

  const { data: classes } = useQuery({
    queryKey: ['classes'],
    queryFn: getClasses,
  })

  const { data: stats } = useQuery({
    queryKey: ['attendance-dashboard-stats'],
    queryFn: getDashboardStats,
  })

  const selectedClassData = classes?.find((c: any) => c.id === selectedClass)
  const sections = selectedClassData?.sections ?? []

  return (
    <div className="space-y-6">
      <PageHeader
        title="Attendance"
        subtitle="Mark and monitor student attendance"
        actions={
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <Link href="/school-admin/attendance/reports"><BarChart3 className="mr-2 h-4 w-4" /> Reports</Link>
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={CalendarCheck} label="Today's Attendance" value={stats ? `${Math.round((stats.attendance_rate ?? 0) * 100)}%` : '-'} variant="primary" />
        <StatCard icon={Users} label="Total Students" value={stats?.total_students ?? '-'} />
        <StatCard icon={Calendar} label="This Month" value="View Report" onClick={() => window.location.href = '/school-admin/attendance/reports'} />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Select value={selectedClass} onValueChange={v => { setSelectedClass(v); setSelectedSection('') }}>
          <SelectTrigger className="w-56"><SelectValue placeholder="Select class" /></SelectTrigger>
          <SelectContent>
            {classes?.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>

        {sections.length > 0 && (
          <Select value={selectedSection} onValueChange={setSelectedSection}>
            <SelectTrigger className="w-44"><SelectValue placeholder="All sections" /></SelectTrigger>
            <SelectContent>
              <SelectItem value=" ">All sections</SelectItem>
              {sections.map((s: any) => <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>)}
            </SelectContent>
          </Select>
        )}

        <input
          type="date"
          value={selectedDate}
          onChange={e => setSelectedDate(e.target.value)}
          className="h-10 rounded-md border border-input bg-background px-3 text-sm"
        />
      </div>

      {selectedClass ? (
        <AttendanceSheet
          classId={selectedClass}
          sectionId={selectedSection || undefined}
          date={selectedDate}
        />
      ) : (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            Select a class and date to start marking attendance.
          </CardContent>
        </Card>
      )}
    </div>
  )
}
