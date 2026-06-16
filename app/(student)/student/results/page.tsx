'use client'

import { useMemo, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getStudentResults } from '@/lib/actions/student'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { TrendingUp, Printer } from 'lucide-react'

export default function ResultsPage() {
  const printRef = useRef<HTMLDivElement>(null)
  const { data: results, isLoading } = useQuery({
    queryKey: ['student-results'],
    queryFn: () => getStudentResults(),
  })

  const groupedByExam = useMemo(() => {
    if (!results?.length) return []
    const map = new Map<string, any[]>()
    results.forEach((r: any) => {
      const key = r.exam_id
      if (!map.has(key)) {
        map.set(key, { exam: r.exams, subjects: [] })
      }
      map.get(key)!.subjects.push(r)
    })
    return Array.from(map.values())
  }, [results])

  const overallStats = useMemo(() => {
    if (!results?.length) return null
    const totalMarks = results.reduce((sum: number, r: any) => sum + Number(r.marks_obtained), 0)
    const avg = totalMarks / results.length
    const grades = results.map((r: any) => r.grade)
    const gradeCounts: Record<string, number> = {}
    grades.forEach((g: any) => { gradeCounts[g] = (gradeCounts[g] || 0) + 1 })
    return { average: Math.round(avg * 10) / 10, total: results.length, gradeCounts }
  }, [results])

  const handlePrint = () => {
    window.print()
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">My Results</h1>
          <p className="text-gray-600 mt-1">Exam scores and academic performance</p>
        </div>
        <Button variant="outline" onClick={handlePrint}>
          <Printer className="h-4 w-4 mr-2" /> Print Report Card
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-4">{[...Array(3)].map((_: any, i: any) => <Skeleton key={i} className="h-48 w-full" />)}</div>
      ) : !results?.length ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">No results published yet.</CardContent></Card>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Overall Average</CardTitle></CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-edu-blue-600">{overallStats?.average ?? '—'}</div>
                <p className="text-xs text-muted-foreground">Across {overallStats?.total ?? 0} subjects</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Subjects</CardTitle></CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{results.length}</div>
                <p className="text-xs text-muted-foreground">Total graded subjects</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Performance</CardTitle></CardHeader>
              <CardContent>
                <div className="flex gap-1 flex-wrap">
                  {Object.entries(overallStats?.gradeCounts ?? {}).map(([grade, count]) => (
                    <Badge key={grade} className={
                      grade === 'A' ? 'bg-green-100 text-green-800' :
                      grade === 'B' ? 'bg-blue-100 text-blue-800' :
                      grade === 'C' ? 'bg-amber-100 text-amber-800' :
                      'bg-red-100 text-red-800'
                    }>
                      {grade}: {count}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          <div ref={printRef} className="space-y-6 print:space-y-8">
            {groupedByExam.map(({ exam, subjects }: any) => {
              const examAvg = subjects.reduce((s: number, r: any) => s + Number(r.marks_obtained), 0) / subjects.length
              return (
                <Card key={exam?.id || Math.random()} className="print:border-2 print:shadow-none">
                  <CardHeader className="print:pb-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle>{exam?.name || 'Exam'}</CardTitle>
                        <CardDescription>{exam?.type} · {exam?.classes?.name}</CardDescription>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold">{Math.round(examAvg * 10) / 10}</p>
                        <p className="text-xs text-muted-foreground">Average</p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {subjects.map((r: any) => (
                        <div key={r.id} className="flex items-center justify-between p-3 rounded-lg border border-gray-100">
                          <div className="flex items-center gap-3">
                            <TrendingUp className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <p className="font-medium text-sm">{r.subjects?.name} ({r.subjects?.code})</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-sm text-muted-foreground">{r.marks_obtained} marks</span>
                            <Badge className={
                              r.grade === 'A' ? 'bg-green-100 text-green-800' :
                              r.grade === 'B' ? 'bg-blue-100 text-blue-800' :
                              r.grade === 'C' ? 'bg-amber-100 text-amber-800' :
                              'bg-red-100 text-red-800'
                            }>{r.grade || '—'}</Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>

          <style jsx>{`
            @media print {
              body * { visibility: hidden; }
              .print\\:space-y-8, .print\\:space-y-8 * { visibility: visible; }
              .print\\:space-y-8 { position: absolute; left: 0; top: 0; width: 100%; }
              .print\\:border-2 { border-width: 2px; }
              .print\\:shadow-none { box-shadow: none; }
              .print\\:pb-2 { padding-bottom: 0.5rem; }
            }
          `}</style>
        </>
      )}
    </div>
  )
}
