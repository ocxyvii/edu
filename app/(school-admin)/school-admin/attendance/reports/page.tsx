'use client'

import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getClasses } from '@/lib/actions/school-admin'
import { getAttendanceReport } from '@/lib/actions/attendance.actions'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Download, FileText, Search, Printer } from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

interface ReportRow {
  studentId: string
  firstName: string
  lastName: string
  admissionNumber: string
  className: string
  total: number
  present: number
  absent: number
  late: number
  excused: number
  percentage: number
}

export default function AttendanceReportsPage() {
  const today = new Date().toISOString().split('T')[0]
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0]

  const [selectedClass, setSelectedClass] = useState('all')
  const [selectedSection, setSelectedSection] = useState('all')
  const [fromDate, setFromDate] = useState(thirtyDaysAgo)
  const [toDate, setToDate] = useState(today)
  const [searchQuery, setSearchQuery] = useState('')

  const { data: classes } = useQuery({
    queryKey: ['classes'],
    queryFn: () => getClasses(),
  })

  const sections = useMemo(() => {
    if (!selectedClass || !classes) return []
    const cls = classes.find(c => c.id === selectedClass)
    return cls?.sections ?? []
  }, [selectedClass, classes])

  const { data: reportData, isLoading: reportLoading, refetch } = useQuery({
    queryKey: ['attendance-report', selectedClass, selectedSection, fromDate, toDate],
    queryFn: () => getAttendanceReport({
      classId: selectedClass && selectedClass !== 'all' ? selectedClass : undefined,
      sectionId: selectedSection && selectedSection !== 'all' ? selectedSection : undefined,
      fromDate,
      toDate,
    }),
    enabled: true,
  })

  const filtered = useMemo(() => {
    if (!reportData) return []
    if (!searchQuery) return reportData
    const q = searchQuery.toLowerCase()
    return reportData.filter(r =>
      r.firstName.toLowerCase().includes(q) ||
      r.lastName.toLowerCase().includes(q) ||
      r.admissionNumber.toLowerCase().includes(q)
    )
  }, [reportData, searchQuery])

  const overallStats = useMemo(() => {
    if (!filtered.length) return null
    const total = filtered.reduce((s, r) => s + r.total, 0)
    const present = filtered.reduce((s, r) => s + r.present, 0)
    const absent = filtered.reduce((s, r) => s + r.absent, 0)
    const late = filtered.reduce((s, r) => s + r.late, 0)
    return {
      total,
      present,
      absent,
      late,
      percentage: total > 0 ? Math.round((present / total) * 100) : 0,
    }
  }, [filtered])

  function exportCSV() {
    if (!filtered.length) {
      toast.error('No data to export')
      return
    }

    const headers = ['Admission No', 'First Name', 'Last Name', 'Class', 'Total Days', 'Present', 'Absent', 'Late', 'Excused', 'Attendance %']
    const rows = filtered.map(r => [
      r.admissionNumber,
      r.firstName,
      r.lastName,
      r.className,
      r.total,
      r.present,
      r.absent,
      r.late,
      r.excused,
      r.percentage,
    ])
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `attendance-report-${fromDate}-to-${toDate}.csv`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('CSV exported')
  }

  function exportPDF() {
    if (!filtered.length) {
      toast.error('No data to export')
      return
    }
    const printWindow = window.open('', '_blank')
    if (!printWindow) {
      toast.error('Popup blocked. Please allow popups for PDF export.')
      return
    }

    const rowsHtml = filtered.map(r => {
      const color = r.percentage < 75 ? 'color: #dc2626;' : r.percentage < 90 ? 'color: #ca8a04;' : 'color: #16a34a;'
      return `<tr>
        <td style="padding: 6px 8px; border-bottom: 1px solid #e5e7eb;">${r.admissionNumber}</td>
        <td style="padding: 6px 8px; border-bottom: 1px solid #e5e7eb;">${r.firstName} ${r.lastName}</td>
        <td style="padding: 6px 8px; border-bottom: 1px solid #e5e7eb;">${r.className}</td>
        <td style="padding: 6px 8px; border-bottom: 1px solid #e5e7eb; text-align: center;">${r.total}</td>
        <td style="padding: 6px 8px; border-bottom: 1px solid #e5e7eb; text-align: center;">${r.present}</td>
        <td style="padding: 6px 8px; border-bottom: 1px solid #e5e7eb; text-align: center;">${r.absent}</td>
        <td style="padding: 6px 8px; border-bottom: 1px solid #e5e7eb; text-align: center;">${r.late}</td>
        <td style="padding: 6px 8px; border-bottom: 1px solid #e5e7eb; text-align: center; ${color} font-weight: bold;">${r.percentage}%</td>
      </tr>`
    }).join('')

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Attendance Report</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 40px; color: #1f2937; }
          h1 { font-size: 24px; margin-bottom: 4px; }
          .subtitle { color: #6b7280; font-size: 14px; margin-bottom: 24px; }
          table { width: 100%; border-collapse: collapse; font-size: 13px; }
          th { background: #f3f4f6; padding: 8px; text-align: left; border-bottom: 2px solid #d1d5db; font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em; }
          .stats { display: flex; gap: 24px; margin-bottom: 24px; }
          .stat { background: #f9fafb; padding: 12px 20px; border-radius: 8px; text-align: center; }
          .stat-value { font-size: 24px; font-weight: bold; }
          .stat-label { font-size: 12px; color: #6b7280; }
          @media print { body { margin: 20px; } }
        </style>
      </head>
      <body>
        <h1>Attendance Report</h1>
        <p class="subtitle">${fromDate} to ${toDate}${selectedClass ? ' | Filtered by class' : ''}${selectedSection ? ' | Filtered by section' : ''}</p>
        <div class="stats">
          <div class="stat"><div class="stat-value">${overallStats?.percentage ?? 0}%</div><div class="stat-label">Overall Rate</div></div>
          <div class="stat"><div class="stat-value">${overallStats?.total ?? 0}</div><div class="stat-label">Total Records</div></div>
          <div class="stat"><div class="stat-value">${overallStats?.present ?? 0}</div><div class="stat-label">Present</div></div>
          <div class="stat"><div class="stat-value">${overallStats?.absent ?? 0}</div><div class="stat-label">Absent</div></div>
          <div class="stat"><div class="stat-value">${overallStats?.late ?? 0}</div><div class="stat-label">Late</div></div>
        </div>
        <table>
          <thead>
            <tr>
              <th>Admission No</th>
              <th>Name</th>
              <th>Class</th>
              <th style="text-align: center;">Total</th>
              <th style="text-align: center;">Present</th>
              <th style="text-align: center;">Absent</th>
              <th style="text-align: center;">Late</th>
              <th style="text-align: center;">%</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>
        <p style="margin-top: 24px; font-size: 11px; color: #9ca3af; text-align: center;">
          Generated on ${new Date().toLocaleString()} | EduCore School Management System
        </p>
        <script>
          window.onload = function() { window.print(); }
        <\/script>
      </body>
      </html>
    `)
    printWindow.document.close()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Attendance Reports</h1>
          <p className="text-gray-600 mt-1">View and export student attendance data</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportCSV} disabled={!filtered.length}>
            <Download className="h-4 w-4 mr-2" /> Export CSV
          </Button>
          <Button variant="outline" onClick={exportPDF} disabled={!filtered.length}>
            <FileText className="h-4 w-4 mr-2" /> Export PDF
          </Button>
          <Button variant="outline" onClick={() => refetch()}>
            <Printer className="h-4 w-4 mr-2" /> Refresh
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-3 mb-4">
            <Select value={selectedClass} onValueChange={(v) => { setSelectedClass(v); setSelectedSection('all') }}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="All Classes" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Classes</SelectItem>
                {classes?.map(c => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={selectedSection}
              onValueChange={setSelectedSection}
              disabled={!selectedClass || sections.length === 0}
            >
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder={!selectedClass ? 'Select a class first' : 'All Sections'} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sections</SelectItem>
                {sections.map((s: any) => (
                  <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="flex items-center gap-2">
              <label className="text-xs text-muted-foreground">From</label>
              <Input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="w-[150px]"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs text-muted-foreground">To</label>
              <Input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="w-[150px]"
              />
            </div>

            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search students..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {overallStats && (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <Card>
            <CardContent className="py-4 text-center">
              <p className={cn(
                'text-2xl font-bold',
                overallStats.percentage >= 90 ? 'text-green-600' :
                overallStats.percentage >= 75 ? 'text-yellow-600' : 'text-red-600'
              )}>
                {overallStats.percentage}%
              </p>
              <p className="text-xs text-muted-foreground">Overall Attendance</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-4 text-center">
              <p className="text-2xl font-bold text-gray-900">{overallStats.total}</p>
              <p className="text-xs text-muted-foreground">Total Records</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-4 text-center">
              <p className="text-2xl font-bold text-green-600">{overallStats.present}</p>
              <p className="text-xs text-muted-foreground">Present</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-4 text-center">
              <p className="text-2xl font-bold text-red-600">{overallStats.absent}</p>
              <p className="text-xs text-muted-foreground">Absent</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-4 text-center">
              <p className="text-2xl font-bold text-yellow-600">{overallStats.late}</p>
              <p className="text-xs text-muted-foreground">Late</p>
            </CardContent>
          </Card>
        </div>
      )}

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Student Attendance Details</CardTitle>
          <CardDescription>
            {filtered.length} students · Sorted by attendance rate (lowest first)
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {reportLoading ? (
            <div className="p-6 space-y-3">
              {[...Array(8)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-center py-12 text-muted-foreground">
              No attendance records found for the selected filters
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">Student</th>
                    <th className="text-left py-3 px-2 text-xs font-medium text-gray-500 uppercase">Admission No</th>
                    <th className="text-left py-3 px-2 text-xs font-medium text-gray-500 uppercase">Class</th>
                    <th className="text-center py-3 px-2 text-xs font-medium text-gray-500 uppercase">Total</th>
                    <th className="text-center py-3 px-2 text-xs font-medium text-gray-500 uppercase">Present</th>
                    <th className="text-center py-3 px-2 text-xs font-medium text-gray-500 uppercase">Absent</th>
                    <th className="text-center py-3 px-2 text-xs font-medium text-gray-500 uppercase">Late</th>
                    <th className="text-center py-3 px-2 text-xs font-medium text-gray-500 uppercase">%</th>
                    <th className="text-center py-3 px-2 text-xs font-medium text-gray-500 uppercase">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((row) => {
                    const colorClass =
                      row.percentage < 75 ? 'text-red-600 bg-red-50' :
                      row.percentage < 90 ? 'text-yellow-600 bg-yellow-50' :
                      'text-green-600 bg-green-50'

                    return (
                      <tr key={row.studentId} className={cn(
                        'border-b border-gray-100 hover:bg-gray-50 transition-colors',
                        row.percentage < 75 && 'bg-red-50/30'
                      )}>
                        <td className="py-3 px-4">
                          <span className="text-sm font-medium text-gray-900">
                            {row.firstName} {row.lastName}
                          </span>
                        </td>
                        <td className="py-3 px-2 text-sm text-gray-600">{row.admissionNumber}</td>
                        <td className="py-3 px-2 text-sm text-gray-600">{row.className}</td>
                        <td className="py-3 px-2 text-sm text-center">{row.total}</td>
                        <td className="py-3 px-2 text-sm text-center text-green-600 font-medium">{row.present}</td>
                        <td className="py-3 px-2 text-sm text-center text-red-600 font-medium">{row.absent}</td>
                        <td className="py-3 px-2 text-sm text-center text-yellow-600 font-medium">{row.late}</td>
                        <td className={cn('py-3 px-2 text-sm text-center font-bold', colorClass)}>
                          {row.percentage}%
                        </td>
                        <td className="py-3 px-2 text-center">
                          <Badge className={cn(
                            'text-xs',
                            row.percentage >= 90 && 'bg-green-100 text-green-800',
                            row.percentage >= 75 && row.percentage < 90 && 'bg-yellow-100 text-yellow-800',
                            row.percentage < 75 && 'bg-red-100 text-red-800'
                          )}>
                            {row.percentage >= 90 ? 'Excellent' :
                             row.percentage >= 75 ? 'Good' : 'At Risk'}
                          </Badge>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
