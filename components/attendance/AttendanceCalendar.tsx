'use client'

import { useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface DayRecord {
  date: string
  status: 'present' | 'absent' | 'late' | 'excused'
}

interface AttendanceCalendarProps {
  records: DayRecord[]
  studentName?: string
  year?: number
  month?: number
}

const STATUS_COLORS: Record<string, string> = {
  present: 'bg-green-500 text-white',
  absent: 'bg-red-500 text-white',
  late: 'bg-yellow-400 text-white',
  excused: 'bg-blue-400 text-white',
}

const STATUS_LABELS: Record<string, string> = {
  present: 'Present',
  absent: 'Absent',
  late: 'Late',
  excused: 'Excused',
}

export function AttendanceCalendar({
  records,
  studentName,
  year: propYear,
  month: propMonth,
}: AttendanceCalendarProps) {
  const now = new Date()
  const [viewYear, setViewYear] = useState(propYear ?? now.getFullYear())
  const [viewMonth, setViewMonth] = useState(propMonth ?? now.getMonth())
  const [selectedDay, setSelectedDay] = useState<{ date: string; status: string } | null>(null)

  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate()
  const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay()

  const attendanceMap = useMemo(() => {
    const map = new Map<string, string>()
    records.forEach((r: any) => { map.set(r.date, r.status) })
    return map
  }, [records])

  const calendarDays = useMemo(() => {
    const days: { date: number; dateStr: string; status?: string; isToday: boolean }[] = []
    for (let i = 0; i < firstDayOfWeek; i++) {
      days.push({ date: 0, dateStr: '', isToday: false })
    }
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
      const isToday =
        d === now.getDate() && viewMonth === now.getMonth() && viewYear === now.getFullYear()
      days.push({
        date: d,
        dateStr,
        status: attendanceMap.get(dateStr),
        isToday,
      })
    }
    return days
  }, [viewYear, viewMonth, daysInMonth, firstDayOfWeek, attendanceMap, now])

  const prevMonth = () => {
    if (viewMonth === 0) {
      setViewYear(y => y - 1)
      setViewMonth(11)
    } else {
      setViewMonth(m => m - 1)
    }
  }

  const nextMonth = () => {
    if (viewMonth === 11) {
      setViewYear(y => y + 1)
      setViewMonth(0)
    } else {
      setViewMonth(m => m + 1)
    }
  }

  const monthName = new Date(viewYear, viewMonth).toLocaleString('default', {
    month: 'long',
    year: 'numeric',
  })

  const dayRecords = selectedDay
    ? records.filter((r: any) => r.date === selectedDay.date)
    : []

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">{studentName ? `${studentName}'s Attendance` : 'Attendance Calendar'}</CardTitle>
          </div>
          <CardDescription>Color-coded attendance by day</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between mb-4">
            <Button variant="ghost" size="icon" onClick={prevMonth}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-medium">{monthName}</span>
            <Button variant="ghost" size="icon" onClick={nextMonth}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex items-center gap-3 mb-3 text-xs text-muted-foreground flex-wrap">
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-green-500" /> Present</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-red-500" /> Absent</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-yellow-400" /> Late</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-blue-400" /> Excused</span>
          </div>

          <div className="grid grid-cols-7 gap-1">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d: any) => (
              <div key={d} className="text-center text-xs font-medium text-muted-foreground py-1">
                {d}
              </div>
            ))}
            {calendarDays.map((day: any, i: any) => (
              <div
                key={i}
                className={cn(
                  'aspect-square rounded-md flex items-center justify-center text-sm transition-colors',
                  day.date === 0 ? '' : 'border border-gray-100 cursor-pointer',
                  day.status ? STATUS_COLORS[day.status] + ' font-medium' : day.date > 0 ? 'bg-gray-50' : '',
                  day.isToday ? 'ring-2 ring-edu-blue-500 ring-offset-1' : '',
                  day.date > 0 && !day.status ? 'hover:bg-gray-100' : ''
                )}
                onClick={() => {
                  if (day.dateStr && day.status) {
                    setSelectedDay({ date: day.dateStr, status: day.status })
                  }
                }}
              >
                {day.date > 0 ? day.date : ''}
              </div>
            ))}
          </div>

          <div className="mt-4 grid grid-cols-5 gap-2 text-center text-xs">
            <div>
              <p className="text-lg font-bold text-gray-900">
                {records.length}
              </p>
              <p className="text-muted-foreground">Total</p>
            </div>
            <div>
              <p className="text-lg font-bold text-green-600">
                {records.filter((r: any) => r.status === 'present').length}
              </p>
              <p className="text-muted-foreground">Present</p>
            </div>
            <div>
              <p className="text-lg font-bold text-red-600">
                {records.filter((r: any) => r.status === 'absent').length}
              </p>
              <p className="text-muted-foreground">Absent</p>
            </div>
            <div>
              <p className="text-lg font-bold text-yellow-600">
                {records.filter((r: any) => r.status === 'late').length}
              </p>
              <p className="text-muted-foreground">Late</p>
            </div>
            <div>
              <p className="text-lg font-bold text-blue-600">
                {records.filter((r: any) => r.status === 'excused').length}
              </p>
              <p className="text-muted-foreground">Excused</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!selectedDay} onOpenChange={(o) => { if (!o) setSelectedDay(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selectedDay ? new Date(selectedDay.date + 'T12:00:00').toLocaleDateString('en-US', {
                weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
              }) : ''}
            </DialogTitle>
          </DialogHeader>
          {selectedDay && (
            <div className="py-4 text-center">
              <div className={cn(
                'inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium',
                STATUS_COLORS[selectedDay.status] ?? 'bg-gray-100'
              )}>
                {STATUS_LABELS[selectedDay.status] ?? selectedDay.status}
              </div>
            </div>
          )}
          {dayRecords.map((r: any, i: any) => (
            <p key={i} className="text-sm text-muted-foreground text-center">
              {r.status === 'present' ? 'Student was present' :
               r.status === 'absent' ? 'Student was absent' :
               r.status === 'late' ? 'Student arrived late' :
               'Student was excused'}
            </p>
          ))}
        </DialogContent>
      </Dialog>
    </>
  )
}
