'use client'

import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getAllMarksForExam } from '@/lib/actions/marks.actions'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Input } from '@/components/ui/input'
import { Download, Search, ArrowUpDown, Printer } from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

interface ResultsTableProps {
  examId: string
}

export function ResultsTable({ examId }: ResultsTableProps) {
  const [sortBy, setSortBy] = useState<'rank' | 'name' | 'total' | 'percentage'>('rank')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const [searchQuery, setSearchQuery] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['exam-all-marks', examId],
    queryFn: () => getAllMarksForExam(examId),
  })

  const filtered = useMemo(() => {
    if (!data?.students) return []
    let list = [...data.students]

    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      list = list.filter((s: any) =>
        s.name.toLowerCase().includes(q) ||
        s.admissionNumber.toLowerCase().includes(q)
      )
    }

    list.sort((a, b) => {
      let cmp = 0
      if (sortBy === 'rank') cmp = a.rank - b.rank
      else if (sortBy === 'name') cmp = a.name.localeCompare(b.name)
      else if (sortBy === 'total') cmp = a.totalObtained - b.totalObtained
      else if (sortBy === 'percentage') cmp = a.percentage - b.percentage
      return sortDir === 'asc' ? cmp : -cmp
    })

    return list
  }, [data, sortBy, sortDir, searchQuery])

  function toggleSort(field: typeof sortBy) {
    if (sortBy === field) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(field)
      setSortDir('asc')
    }
  }

  function exportCSV() {
    if (!filtered.length) {
      toast.error('No data to export')
      return
    }

    const subjectHeaders = data?.subjects.map((s: any) => `${s.subjects?.name ?? 'Subject'} (${s.max_marks})`) ?? []
    const headers = ['Rank', 'Student Name', 'Admission No', ...subjectHeaders, 'Total', 'Average', 'Percentage', 'Grade']

    const rows = filtered.map((s: any) => {
      const subjectMarks = data?.subjects.map((sub: any) => s.subjectMarks[sub.subject_id]?.marks ?? '')
      return [s.rank, s.name, s.admissionNumber, ...subjectMarks, s.totalObtained, s.average, `${s.percentage}%`, s.overallGrade]
    })

    const csv = [headers.join(','), ...rows.map((r: any) => r.join(','))].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `exam-results-${examId}.csv`
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
      toast.error('Popup blocked. Please allow popups.')
      return
    }

    const subjectHeaders = data?.subjects.map((s: any) =>
      `<th style="text-align: center; padding: 6px 4px; border: 1px solid #d1d5db; font-size: 11px;">${s.subjects?.name ?? 'Subj'}</th>`
    ).join('') ?? ''

    const rowsHtml = filtered.map((s: any) => {
      const subjectCells = data?.subjects.map((sub: any) => {
        const marks = s.subjectMarks[sub.subject_id]
        const val = marks?.marks
        const isFail = val !== null && val !== undefined && val < sub.pass_marks
        const color = isFail ? 'color: #dc2626;' : ''
        return `<td style="text-align: center; padding: 6px 4px; border: 1px solid #e5e7eb; ${color}">${val ?? '-'}</td>`
      }).join('') ?? ''

      const gradeColor = s.overallGrade === 'A' ? 'color: #16a34a;' : s.overallGrade === 'F' ? 'color: #dc2626;' : ''
      return `<tr>
        <td style="text-align: center; padding: 6px 8px; border: 1px solid #e5e7eb;">${s.rank}</td>
        <td style="padding: 6px 8px; border: 1px solid #e5e7eb;">${s.name}</td>
        <td style="text-align: center; padding: 6px 8px; border: 1px solid #e5e7eb;">${s.admissionNumber}</td>
        ${subjectCells}
        <td style="text-align: center; padding: 6px 8px; border: 1px solid #e5e7eb; font-weight: bold;">${s.totalObtained}</td>
        <td style="text-align: center; padding: 6px 8px; border: 1px solid #e5e7eb;">${s.average}</td>
        <td style="text-align: center; padding: 6px 8px; border: 1px solid #e5e7eb; font-weight: bold; ${gradeColor}">${s.percentage}%</td>
        <td style="text-align: center; padding: 6px 8px; border: 1px solid #e5e7eb; font-weight: bold; ${gradeColor}">${s.overallGrade}</td>
      </tr>`
    }).join('')

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Exam Results - ${data?.examName ?? ''}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 30px; color: #1f2937; }
          h1 { font-size: 22px; margin-bottom: 4px; }
          .subtitle { color: #6b7280; font-size: 13px; margin-bottom: 20px; }
          table { width: 100%; border-collapse: collapse; font-size: 12px; }
          th { background: #f3f4f6; padding: 8px 6px; border: 1px solid #d1d5db; text-align: center; font-size: 11px; text-transform: uppercase; }
          @media print { body { margin: 15px; } }
        </style>
      </head>
      <body>
        <h1>${data?.examName ?? 'Exam Results'}</h1>
        <p class="subtitle">Class Results · ${filtered.length} students</p>
        <table>
          <thead>
            <tr>
              <th>Rank</th>
              <th style="text-align: left;">Student</th>
              <th>Adm No</th>
              ${subjectHeaders}
              <th>Total</th>
              <th>Avg</th>
              <th>%</th>
              <th>Grade</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>
        <p style="margin-top: 20px; font-size: 11px; color: #9ca3af; text-align: center;">
          Generated on ${new Date().toLocaleString()} · EduCore School Management System
        </p>
        <script>window.onload = function() { window.print(); }<\/script>
      </body>
      </html>
    `)
    printWindow.document.close()
  }

  const SortHeader = ({ field, label }: { field: typeof sortBy; label: string }) => (
    <button
      className="inline-flex items-center gap-1 hover:text-gray-900"
      onClick={() => toggleSort(field)}
    >
      {label}
      <ArrowUpDown className="h-3 w-3" />
    </button>
  )

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6 space-y-3">
          {[...Array(8)].map((_: any, i: any) => <Skeleton key={i} className="h-12 w-full" />)}
        </CardContent>
      </Card>
    )
  }

  if (!data || data.students.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          No results available for this exam
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <CardTitle className="text-lg">{data.examName} — Results</CardTitle>
            <CardDescription>{data.students.length} students · {data.subjects.length} subjects</CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={exportCSV}>
              <Download className="h-4 w-4 mr-1" /> CSV
            </Button>
            <Button variant="outline" size="sm" onClick={exportPDF}>
              <Printer className="h-4 w-4 mr-1" /> PDF
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="px-4 pb-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search students..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-9 h-9"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-center py-3 px-3 text-xs font-medium text-gray-500 uppercase w-14">
                  <SortHeader field="rank" label="Rank" />
                </th>
                <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">
                  <SortHeader field="name" label="Student" />
                </th>
                <th className="text-left py-3 px-3 text-xs font-medium text-gray-500 uppercase">Admission</th>
                {data.subjects.map((sub: any) => (
                  <th key={sub.subject_id} className="text-center py-3 px-2 text-xs font-medium text-gray-500 uppercase min-w-[80px]">
                    {sub.subjects?.code ?? sub.subject_id.slice(0, 6)}<br />
                    <span className="text-[10px] font-normal">/{sub.max_marks}</span>
                  </th>
                ))}
                <th className="text-center py-3 px-3 text-xs font-medium text-gray-500 uppercase w-16">
                  <SortHeader field="total" label="Total" />
                </th>
                <th className="text-center py-3 px-3 text-xs font-medium text-gray-500 uppercase w-16">Avg</th>
                <th className="text-center py-3 px-3 text-xs font-medium text-gray-500 uppercase w-16">
                  <SortHeader field="percentage" label="%" />
                </th>
                <th className="text-center py-3 px-3 text-xs font-medium text-gray-500 uppercase w-16">Grade</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((s: any) => (
                <tr key={s.studentId} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                  <td className="py-2 px-3 text-center">
                    <span className={cn(
                      'inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold',
                      s.rank === 1 ? 'bg-yellow-100 text-yellow-800' :
                      s.rank === 2 ? 'bg-gray-100 text-gray-700' :
                      s.rank === 3 ? 'bg-orange-100 text-orange-800' :
                      'text-gray-500'
                    )}>
                      {s.rank}
                    </span>
                  </td>
                  <td className="py-2 px-4 text-sm font-medium">{s.name}</td>
                  <td className="py-2 px-3 text-sm text-gray-500">{s.admissionNumber}</td>
                  {data.subjects.map((sub: any) => {
                    const marks = s.subjectMarks[sub.subject_id]
                    const val = marks?.marks
                    const isFail = val !== null && val !== undefined && val < sub.pass_marks
                    return (
                      <td key={sub.subject_id} className={cn(
                        'py-2 px-2 text-sm text-center',
                        isFail ? 'text-red-600 font-medium' : ''
                      )}>
                        {val ?? <span className="text-gray-300">–</span>}
                      </td>
                    )
                  })}
                  <td className="py-2 px-3 text-sm text-center font-medium">{s.totalObtained}</td>
                  <td className="py-2 px-3 text-sm text-center text-gray-600">{s.average}</td>
                  <td className={cn(
                    'py-2 px-3 text-sm text-center font-bold',
                    s.percentage >= 80 ? 'text-green-600' :
                    s.percentage >= 65 ? 'text-blue-600' :
                    s.percentage >= 50 ? 'text-yellow-600' :
                    s.percentage >= 40 ? 'text-orange-600' : 'text-red-600'
                  )}>
                    {s.percentage}%
                  </td>
                  <td className="py-2 px-3 text-center">
                    <Badge className={cn(
                      s.overallGrade === 'A' && 'bg-green-100 text-green-800',
                      s.overallGrade === 'B' && 'bg-blue-100 text-blue-800',
                      s.overallGrade === 'C' && 'bg-yellow-100 text-yellow-800',
                      s.overallGrade === 'D' && 'bg-orange-100 text-orange-800',
                      s.overallGrade === 'F' && 'bg-red-100 text-red-800',
                    )}>
                      {s.overallGrade}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}
