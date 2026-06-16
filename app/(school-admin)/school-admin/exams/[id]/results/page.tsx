'use client'

import { useParams } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getExamById, publishResults, generateReportCard } from '@/lib/actions/exam.actions'
import { getAllMarksForExam } from '@/lib/actions/marks.actions'
import { ResultsTable } from '@/components/exams/ResultsTable'
import { ReportCard } from '@/components/exams/ReportCard'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { ArrowLeft, Send, Loader2, ScrollText } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'
import { useState } from 'react'

export default function ExamResultsPage() {
  const params = useParams()
  const queryClient = useQueryClient()
  const examId = params.id as string
  const [selectedStudent, setSelectedStudent] = useState('')
  const [showReportCard, setShowReportCard] = useState(false)

  const { data: exam, isLoading } = useQuery({
    queryKey: ['exam', examId],
    queryFn: () => getExamById(examId),
  })

  const { data: marksData } = useQuery({
    queryKey: ['exam-all-marks', examId],
    queryFn: () => getAllMarksForExam(examId),
  })

  const { data: reportCard, isLoading: reportLoading } = useQuery({
    queryKey: ['report-card', examId, selectedStudent],
    queryFn: () => generateReportCard(selectedStudent, examId),
    enabled: !!selectedStudent && showReportCard,
  })

  const publishMutation = useMutation({
    mutationFn: () => publishResults(examId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exam', examId] })
      toast.success('Results published')
    },
    onError: (err: Error) => toast.error(err.message),
  })

  if (isLoading) {
    return <div className="space-y-3">{[...Array(6)].map((_: any, i: any) => <Skeleton key={i} className="h-12 w-full" />)}</div>
  }

  if (!exam) {
    return <p className="text-center py-12 text-muted-foreground">Exam not found</p>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/school-admin/exams"><ArrowLeft className="h-5 w-5" /></Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-gray-900">{exam.name} — Results</h1>
          <p className="text-gray-600 mt-1">
            {exam.classes?.name && `${exam.classes.name}${exam.classes.level ? ` - Level ${exam.classes.level}` : ''}`}
            {exam.terms?.name && ` · ${exam.terms.name}`}
          </p>
        </div>
        <Badge className={exam.is_published ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}>
          {exam.is_published ? 'Published' : 'Draft'}
        </Badge>
        {!exam.is_published && (
          <Button size="sm" onClick={() => publishMutation.mutate()} disabled={publishMutation.isPending}>
            {publishMutation.isPending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Send className="h-4 w-4 mr-1" />}
            Publish All
          </Button>
        )}
      </div>

      <ResultsTable examId={examId} />

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <ScrollText className="h-4 w-4" />
            Report Card
          </CardTitle>
          <CardDescription>Generate a report card for an individual student</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-end gap-3">
            <div className="w-72">
              <Select value={selectedStudent} onValueChange={(v) => { setSelectedStudent(v); setShowReportCard(false) }}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a student..." />
                </SelectTrigger>
                <SelectContent>
                  {marksData?.students?.map((s: any) => (
                    <SelectItem key={s.studentId} value={s.studentId}>
                      {s.name} ({s.admissionNumber})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              variant="outline"
              disabled={!selectedStudent}
              onClick={() => setShowReportCard(true)}
            >
              <ScrollText className="h-4 w-4 mr-1" /> Generate
            </Button>
          </div>

          {reportLoading && (
            <div className="space-y-2">{[...Array(4)].map((_: any, i: any) => <Skeleton key={i} className="h-8 w-full" />)}</div>
          )}

          {showReportCard && reportCard && !reportLoading && (
            <ReportCard data={reportCard} />
          )}
        </CardContent>
      </Card>
    </div>
  )
}
