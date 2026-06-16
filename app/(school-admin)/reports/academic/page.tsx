'use client'

import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getAcademicPerformanceReport } from '@/lib/actions/reports.actions'
import { ChartWrapper } from '@/components/reports/ChartWrapper'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

const GRADE_COLORS: Record<string, string> = {
  A: 'text-green-600 bg-green-50 border-green-200',
  B: 'text-blue-600 bg-blue-50 border-blue-200',
  C: 'text-amber-600 bg-amber-50 border-amber-200',
  D: 'text-orange-600 bg-orange-50 border-orange-200',
  F: 'text-red-600 bg-red-50 border-red-200',
}

export default function AcademicReportPage() {
  const [examId, setExamId] = useState('')
  const [classId, setClassId] = useState('')
  const [search, setSearch] = useState('')

  // Fetch exams for the school
  const { data: examsList } = useQuery({
    queryKey: ['exams-for-report'],
    queryFn: async () => {
      const { createClient } = await import('@/lib/supabase/client')
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return []
      const { data: profile } = await supabase.from('profiles').select('school_id').eq('id', user.id).single()
      if (!profile?.school_id) return []
      const { data: exams } = await supabase
        .from('exams')
        .select('id, name, exam_type, term_id, terms!inner(name)')
        .eq('school_id', profile.school_id)
        .eq('is_published', true)
        .order('start_date', { ascending: false })
        .limit(50)
      return exams?.map((e: any) => ({ id: e.id, name: e.name, term: e.terms?.name })) ?? []
    },
  })

  const { data: report, isLoading } = useQuery({
    queryKey: ['academic-report', examId, classId],
    queryFn: () => getAcademicPerformanceReport({ examId, classId: classId || undefined }),
    enabled: !!examId,
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
    if (!report?.students?.length) return
    const subjectHeaders = report.subjects.map((s: any) => `${s.subject_name} (${s.subject_code})`)
    const headers = ['Rank', 'Name', 'Admission No', ...subjectHeaders, 'Total', 'Percentage', 'Grade']
    const rows = report.students.map((s: any) => [
      s.rank, s.name, s.admission_number,
      ...report.subjects.map((sub: any) => {
        const found = s.subjects.find((ss: any) => ss.subject_id === sub.subject_id)
        return found?.marksObtained ?? '-'
      }),
      s.totalObtained, s.percentage, s.overallGrade,
    ])
    const csv = [headers, ...rows].map((r: any) => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `academic-report-${examId}.csv`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('CSV exported')
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Academic Performance</h1>
          <p className="text-muted-foreground mt-1">Exam results, grade distribution, and student rankings</p>
        </div>
        <Button variant="outline" onClick={exportCsv} disabled={!report?.students?.length}>
          Export CSV
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Exam *</Label>
              <Select value={examId} onValueChange={setExamId}>
                <SelectTrigger><SelectValue placeholder="Select exam" /></SelectTrigger>
                <SelectContent>
                  {(examsList ?? []).map((e: any) => (
                    <SelectItem key={e.id} value={e.id}>{e.name} ({e.term})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Class (optional)</Label>
              <Select value={classId} onValueChange={setClassId}>
                <SelectTrigger><SelectValue placeholder="All classes" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All classes</SelectItem>
                </SelectContent>
              </Select>
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

      {!examId ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Select an exam to view the performance report
          </CardContent>
        </Card>
      ) : isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-96 w-full" />
        </div>
      ) : report ? (
        <>
          {/* Summary KPIs */}
          {report.summary && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardContent className="pt-6 text-center">
                  <p className="text-3xl font-bold text-blue-600">{report.summary.averageScore}%</p>
                  <p className="text-xs text-muted-foreground mt-1">Average Score</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6 text-center">
                  <p className="text-3xl font-bold text-emerald-600">{report.summary.passRate}%</p>
                  <p className="text-xs text-muted-foreground mt-1">Pass Rate</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6 text-center">
                  <p className="text-3xl font-bold text-gray-700">{report.summary.totalStudents}</p>
                  <p className="text-xs text-muted-foreground mt-1">Students</p>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ChartWrapper
              title="Average Score by Subject"
              type="bar"
              data={report.subjects}
              xKey="subject_name"
              yKey={['average']}
              colors={['#2563eb']}
              height={280}
              loading={isLoading}
              emptyMessage="No subject data available"
            />
            <ChartWrapper
              title="Grade Distribution"
              type="pie"
              data={report.gradeDistribution}
              xKey="grade"
              yKey={['count']}
              colors={['#16a34a', '#2563eb', '#f59e0b', '#f97316', '#dc2626']}
              height={280}
              loading={isLoading}
              emptyMessage="No grade data available"
            />
          </div>

          {/* Student Rankings Table */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-sm">Student Rankings</CardTitle>
              <Badge variant="secondary">{report.students.length} students</Badge>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-gray-50">
                      <th className="text-left px-3 py-3 font-medium text-muted-foreground w-10">#</th>
                      <th className="text-left px-3 py-3 font-medium text-muted-foreground">Student</th>
                      <th className="text-left px-3 py-3 font-medium text-muted-foreground">Adm No</th>
                      {report.subjects.map((sub: any) => (
                        <th key={sub.subject_id} className="text-center px-2 py-3 font-medium text-muted-foreground text-xs">
                          {sub.subject_code}
                        </th>
                      ))}
                      <th className="text-center px-3 py-3 font-medium text-muted-foreground">Total</th>
                      <th className="text-center px-3 py-3 font-medium text-muted-foreground">%</th>
                      <th className="text-center px-3 py-3 font-medium text-muted-foreground">Grade</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredStudents.length === 0 ? (
                      <tr><td colSpan={report.subjects.length + 6} className="text-center py-8 text-muted-foreground">No students</td></tr>
                    ) : (
                      filteredStudents.map((s: any) => (
                        <tr key={s.student_id} className={cn(
                          'border-b last:border-0 hover:bg-gray-50/50',
                          s.rank <= 3 ? 'bg-amber-50/30' : '',
                        )}>
                          <td className="px-3 py-2.5">
                            <span className={cn(
                              'inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold',
                              s.rank === 1 ? 'bg-yellow-100 text-yellow-700' :
                              s.rank === 2 ? 'bg-gray-100 text-gray-600' :
                              s.rank === 3 ? 'bg-orange-100 text-orange-700' :
                              'text-muted-foreground',
                            )}>
                              {s.rank}
                            </span>
                          </td>
                          <td className="px-3 py-2.5 font-medium">{s.name}</td>
                          <td className="px-3 py-2.5 text-muted-foreground">{s.admission_number}</td>
                          {report.subjects.map((sub: any) => {
                            const subResult = s.subjects.find((ss: any) => ss.subject_id === sub.subject_id)
                            return (
                              <td key={sub.subject_id} className="text-center px-2 py-2.5">
                                <span className={cn(
                                  'text-xs font-mono',
                                  subResult?.grade === 'A' ? 'text-green-600' :
                                  subResult?.grade === 'F' ? 'text-red-600' : '',
                                )}>
                                  {subResult?.marksObtained ?? '-'}
                                </span>
                              </td>
                            )
                          })}
                          <td className="text-center px-3 py-2.5 font-medium">{s.totalObtained}</td>
                          <td className="text-center px-3 py-2.5">
                            <span className={cn(
                              'font-semibold',
                              s.percentage >= 80 ? 'text-green-600' :
                              s.percentage >= 65 ? 'text-blue-600' :
                              s.percentage >= 50 ? 'text-amber-600' :
                              s.percentage >= 40 ? 'text-orange-600' :
                              'text-red-600',
                            )}>
                              {s.percentage}%
                            </span>
                          </td>
                          <td className="text-center px-3 py-2.5">
                            <span className={cn(
                              'inline-flex px-2 py-0.5 rounded text-xs font-bold border',
                              GRADE_COLORS[s.overallGrade] || 'text-gray-600 bg-gray-50 border-gray-200',
                            )}>
                              {s.overallGrade}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </>
      ) : null}
    </div>
  )
}
