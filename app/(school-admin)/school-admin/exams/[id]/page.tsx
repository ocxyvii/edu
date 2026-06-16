'use client'

import { useState } from 'react'
import { useParams } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getExamById, publishResults } from '@/lib/actions/exam.actions'
import { getMarksForExam } from '@/lib/actions/marks.actions'
import { MarksEntryTable } from '@/components/exams/MarksEntryTable'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ArrowLeft, Send, Loader2, Check } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'

export default function ExamDetailPage() {
  const params = useParams()
  const queryClient = useQueryClient()
  const examId = params.id as string
  const [selectedSubject, setSelectedSubject] = useState('')

  const { data: exam, isLoading } = useQuery({
    queryKey: ['exam', examId],
    queryFn: () => getExamById(examId),
  })

  const subjects = exam?.exam_subjects ?? []

  const { data: marksData, isLoading: marksLoading } = useQuery({
    queryKey: ['exam-marks-admin', examId, selectedSubject],
    queryFn: () => getMarksForExam(examId, selectedSubject, exam?.class_id),
    enabled: !!selectedSubject && !!exam?.class_id,
  })

  const publishMutation = useMutation({
    mutationFn: () => publishResults(examId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exam', examId] })
      toast.success('All results published')
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
          <h1 className="text-3xl font-bold text-gray-900">{exam.name}</h1>
          <p className="text-gray-600 mt-1">
            {exam.classes?.name && `${exam.classes.name}${exam.classes.level ? ` - Level ${exam.classes.level}` : ''}`}
            {exam.terms?.name && ` · ${exam.terms.name}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge className={exam.is_published ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}>
            {exam.is_published ? 'Published' : 'Draft'}
          </Badge>
          {!exam.is_published && (
            <Button
              size="sm"
              onClick={() => publishMutation.mutate()}
              disabled={publishMutation.isPending}
            >
              {publishMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <Send className="h-4 w-4 mr-1" />
              )}
              Publish All
            </Button>
          )}
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Exam Info</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Type</span>
              <p className="font-medium capitalize">{exam.exam_type}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Total Marks</span>
              <p className="font-medium">{exam.total_marks}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Pass Marks</span>
              <p className="font-medium">{exam.pass_marks}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Mode</span>
              <p className="font-medium">{exam.is_online ? 'Online' : 'Offline'}</p>
            </div>
            {exam.start_date && (
              <div>
                <span className="text-muted-foreground">Start</span>
                <p className="font-medium">{new Date(exam.start_date).toLocaleDateString()}</p>
              </div>
            )}
            {exam.end_date && (
              <div>
                <span className="text-muted-foreground">End</span>
                <p className="font-medium">{new Date(exam.end_date).toLocaleDateString()}</p>
              </div>
            )}
            <div>
              <span className="text-muted-foreground">Subjects</span>
              <p className="font-medium">{subjects.length}</p>
            </div>
          </div>
          {exam.instructions && (
            <p className="mt-3 text-sm text-muted-foreground italic">{exam.instructions}</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">Marks Entry</CardTitle>
              <CardDescription>Select a subject to enter marks</CardDescription>
            </div>
            <div className="w-64">
              <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a subject..." />
                </SelectTrigger>
                <SelectContent>
                  {subjects.map((es: any) => (
                    <SelectItem key={es.subject_id} value={es.subject_id}>
                      {es.subjects?.name ?? es.subject_id.slice(0, 6)} (Max {es.max_marks})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {!selectedSubject ? (
            <p className="text-center py-8 text-muted-foreground text-sm">
              Select a subject to view and enter marks
            </p>
          ) : marksLoading ? (
            <div className="space-y-2">{[...Array(8)].map((_: any, i: any) => <Skeleton key={i} className="h-10 w-full" />)}</div>
          ) : (
            <MarksEntryTable
              examId={examId}
              students={marksData?.students ?? []}
              subjects={subjects.filter((s: any) => s.subject_id === selectedSubject).map((s: any) => ({
                subject_id: s.subject_id,
                subject_name: s.subjects?.name ?? '',
                subject_code: s.subjects?.code ?? '',
                max_marks: s.max_marks,
                pass_marks: s.pass_marks,
              }))}
              existingResults={(marksData?.results ?? []).map((r: any) => ({
                student_id: r.student_id,
                marks_obtained: Number(r.marks_obtained),
                grade: r.grade,
              }))}
              onPublish={exam.is_published ? undefined : () => publishMutation.mutate()}
              isPublishing={publishMutation.isPending}
            />
          )}
        </CardContent>
      </Card>
    </div>
  )
}
