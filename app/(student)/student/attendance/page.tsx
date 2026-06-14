'use client'

import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getStudentAttendance } from '@/lib/actions/student'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { CheckCircle2, XCircle, Clock, AlertCircle } from 'lucide-react'

const STATUS_COLORS: Record<string, string> = {
  present: 'bg-green-500',
  absent: 'bg-red-500',
  late: 'bg-yellow-400',
  excused: 'bg-blue-400',
}

export default function AttendancePage() {
  const { data, isLoading } = useQuery({
    queryKey: ['student-attendance'],
    queryFn: () => getStudentAttendance(),
  })

  const calendarDays = useMemo(() => {
    if (!data?.records?.length) return []
    const now = new Date()
    const year = now.getFullYear()
    const month = now.getMonth()
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const firstDay = new Date(year, month, 1).getDay()

    const attendanceMap = new Map<string, string>()
    data.records.forEach(r => {
      attendanceMap.set(r.date, r.status)
    })

    const days: { date: number; status?: string; isToday: boolean }[] = []
    for (let i = 0; i < firstDay; i++) {
      days.push({ date: 0, isToday: false })
    }
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
      const isToday = d === now.getDate() && month === now.getMonth() && year === now.getFullYear()
      days.push({
        date: d,
        status: attendanceMap.get(dateStr),
        isToday,
      })
    }
    return days
  }, [data])

  const stats = data?.stats ?? { total: 0, present: 0, absent: 0, late: 0, excused: 0, percentage: 0 }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Attendance</h1>
        <p className="text-gray-600 mt-1">Your attendance record</p>
      </div>

      {isLoading ? (
        <Skeleton className="h-96 w-full" />
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            <Card><CardContent className="py-4 text-center">
              <p className="text-2xl font-bold text-gray-900">{stats.percentage}%</p>
              <p className="text-xs text-muted-foreground">Attendance Rate</p>
            </CardContent></Card>
            <Card><CardContent className="py-4 text-center">
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
              <p className="text-xs text-muted-foreground">Total Days</p>
            </CardContent></Card>
            <Card><CardContent className="py-4 text-center">
              <p className="text-2xl font-bold text-green-600">{stats.present}</p>
              <p className="text-xs text-muted-foreground">Present</p>
            </CardContent></Card>
            <Card><CardContent className="py-4 text-center">
              <p className="text-2xl font-bold text-red-600">{stats.absent}</p>
              <p className="text-xs text-muted-foreground">Absent</p>
            </CardContent></Card>
            <Card><CardContent className="py-4 text-center">
              <p className="text-2xl font-bold text-yellow-600">{stats.late}</p>
              <p className="text-xs text-muted-foreground">Late</p>
            </CardContent></Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>This Month</CardTitle>
              <CardDescription>
                {new Date().toLocaleString('default', { month: 'long', year: 'numeric' })} — color-coded attendance
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4 mb-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-green-500" /> Present</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-500" /> Absent</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-yellow-400" /> Late</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-blue-400" /> Excused</span>
              </div>
              <div className="grid grid-cols-7 gap-1">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                  <div key={d} className="text-center text-xs font-medium text-muted-foreground py-1">{d}</div>
                ))}
                {calendarDays.map((day, i) => (
                  <div
                    key={i}
                    className={`aspect-square rounded-md flex items-center justify-center text-sm
                      ${day.date === 0 ? '' : 'border border-gray-100'}
                      ${day.status ? STATUS_COLORS[day.status] + ' text-white font-medium' : day.date > 0 ? 'bg-gray-50' : ''}
                      ${day.isToday ? 'ring-2 ring-edu-blue-500 ring-offset-1' : ''}
                    `}
                  >
                    {day.date > 0 ? day.date : ''}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
