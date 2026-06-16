'use client'

import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getAttendanceReport } from '@/lib/actions/reports.actions'
import { getClasses } from '@/lib/actions/school-admin'
import { ChartWrapper } from '@/components/reports/ChartWrapper'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Download, Search, FileText, CalendarCheck, AlertTriangle, Users } from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

export default function AttendanceReportPage() {
  const [classId, setClassId] = useState('')
  const [sectionId, setSectionId] = useState('')
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date()
    d.setDate(d.getDate() - 30)
    return d.toISOString().slice(0, 10)
  })
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().slice(0, 10))
  const [search, setSearch] = useState('')

  const { data: classes } = useQuery({
    queryKey: ['classes-for-report'],
    queryFn: () => getClasses(),
  })

  const { data: report, isLoading } = useQuery({
    queryKey: ['attendance-report', classId, sectionId, dateFrom, dateTo],
    queryFn: () => getAttendanceReport({
      classId: classId || undefined,
      sectionId: sectionId || undefined,
      dateRange: { from: dateFrom, to: dateTo },
    }),
    enabled: !!dateFrom && !!dateTo,
  })

  const filteredStudents = useMemo(() => {
    if (!report?.students) return []
    if (!search) return report.students
    const q = search.toLowerCase()
    return report.students.filter((s: any) =>
      s.name.toLowerCase().includes(q) || s.admission_number.toLowerCase().includes(q)
    )
  }, [report?.students, search])

  const exportCsv = () => {
    if (!filteredStudents.length) return
    const headers = ['Name', 'Admission No', 'Present', 'Absent', 'Late', 'Excused', 'Total', 'Percentage']
    const rows = filteredStudents.map((s: any) => [s.name, s.admission_number, s.present, s.absent, s.late, s.excused, s.total, s.percentage])
    const csv = [headers, ...rows].map((r: any) => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `attendance-report-${dateFrom}-to-${dateTo}.csv`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('CSV exported')
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Attendance Report</h1>
          <p className="text-muted-foreground mt-1">Daily attendance rates, class breakdowns, and at-risk students</p>
        </div>
        <Button variant="outline" onClick={exportCsv} disabled={!report?.students.length}>
          <Download className="h-4 w-4 mr-2" /> Export CSV
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Class</Label>
              <Select value={classId} onValueChange={setClassId}>
                <SelectTrigger><SelectValue placeholder="All classes" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All classes</SelectItem>
                  {(classes ?? []).map((c: any) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Section</Label>
              <Select value={sectionId} onValueChange={setSectionId}>
                <SelectTrigger><SelectValue placeholder="All sections" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All sections</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">From</Label>
              <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">To</Label>
              <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Search</Label>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input className="pl-8" placeholder="Student name..." value={search} onChange={e => setSearch(e.target.value)} />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary KPIs */}
      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_: any, i: any) => <Skeleton key={i} className="h-28 rounded-xl" />)}
        </div>
      ) : report ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6 text-center">
              <CalendarCheck className="h-6 w-6 text-blue-600 mx-auto mb-2" />
              <p className="text-2xl font-bold">{report.summary.averageAttendance}%</p>
              <p className="text-xs text-muted-foreground">Avg Attendance</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 text-center">
              <Users className="h-6 w-6 text-emerald-600 mx-auto mb-2" />
              <p className="text-2xl font-bold">{report.summary.totalStudents}</p>
              <p className="text-xs text-muted-foreground">Students Tracked</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 text-center">
              <FileText className="h-6 w-6 text-purple-600 mx-auto mb-2" />
              <p className="text-2xl font-bold">{report.summary.totalRecords}</p>
              <p className="text-xs text-muted-foreground">Total Records</p>
            </CardContent>
          </Card>
          <Card className={cn(report.summary.atRiskCount > 0 ? 'border-red-300 bg-red-50/50' : '')}>
            <CardContent className="pt-6 text-center">
              <AlertTriangle className={cn('h-6 w-6 mx-auto mb-2', report.summary.atRiskCount > 0 ? 'text-red-600' : 'text-gray-400')} />
              <p className={cn('text-2xl font-bold', report.summary.atRiskCount > 0 ? 'text-red-600' : '')}>{report.summary.atRiskCount}</p>
              <p className="text-xs text-muted-foreground">At Risk (&lt;75%)</p>
            </CardContent>
          </Card>
        </div>
      ) : null}

      {/* Charts */}
      {report && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ChartWrapper
            title="Daily Attendance Rate"
            type="line"
            data={report.dailyRates}
            xKey="date"
            yKey={['rate']}
            colors={['#2563eb']}
            height={280}
            loading={isLoading}
            emptyMessage="No attendance records for the selected period"
          />
          <ChartWrapper
            title="Attendance by Class"
            type="bar"
            data={report.classAttendance}
            xKey="class_name"
            yKey={['present', 'absent']}
            colors={['#16a34a', '#dc2626']}
            height={280}
            loading={isLoading}
            emptyMessage="No class data available"
          />
        </div>
      )}

      {/* Student Data Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Student Attendance Breakdown</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Student</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Admission No</th>
                  <th className="text-center px-3 py-3 font-medium text-muted-foreground">Present</th>
                  <th className="text-center px-3 py-3 font-medium text-muted-foreground">Absent</th>
                  <th className="text-center px-3 py-3 font-medium text-muted-foreground">Late</th>
                  <th className="text-center px-3 py-3 font-medium text-muted-foreground">Excused</th>
                  <th className="text-center px-3 py-3 font-medium text-muted-foreground">Total</th>
                  <th className="text-center px-3 py-3 font-medium text-muted-foreground">%</th>
                </tr>
              </thead>
              <tbody>
                {filteredStudents.length === 0 ? (
                  <tr><td colSpan={8} className="text-center py-8 text-muted-foreground">No matching students</td></tr>
                ) : (
                  filteredStudents.map((s: any, i: any) => (
                    <tr key={s.student_id} className={cn(
                      'border-b last:border-0 hover:bg-gray-50/50',
                      s.percentage < 75 ? 'bg-red-50/50' : '',
                    )}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className={cn(
                            'font-medium',
                            s.percentage < 75 ? 'text-red-700' : '',
                          )}>{s.name}</span>
                          {s.percentage < 75 && <Badge variant="destructive" className="text-[10px] px-1 py-0">At Risk</Badge>}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{s.admission_number}</td>
                      <td className="text-center px-3 py-3">{s.present}</td>
                      <td className={cn('text-center px-3 py-3', s.absent > 0 ? 'text-red-600' : '')}>{s.absent}</td>
                      <td className="text-center px-3 py-3">{s.late}</td>
                      <td className="text-center px-3 py-3">{s.excused}</td>
                      <td className="text-center px-3 py-3">{s.total}</td>
                      <td className={cn('text-center px-3 py-3 font-semibold', s.percentage < 75 ? 'text-red-600' : 'text-green-600')}>
                        {s.percentage}%
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
