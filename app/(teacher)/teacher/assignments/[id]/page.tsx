'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useParams } from 'next/navigation'
import { getTeacherAssignments, getAssignmentSubmissions, gradeSubmission } from '@/lib/actions/assignments.actions'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default function AssignmentDetailPage() {
  const params = useParams()
  const id = params.id as string
  const queryClient = useQueryClient()
  const [marks, setMarks] = useState<Record<string, string>>({})
  const [feedback, setFeedback] = useState<Record<string, string>>({})

  const { data: assignments, isLoading } = useQuery({
    queryKey: ['teacher-assignments'],
    queryFn: () => getTeacherAssignments(),
  })

  const assignment = assignments?.find((a: any) => a.id === id)

  const { data: submissions } = useQuery({
    queryKey: ['assignment-submissions', id],
    queryFn: () => getAssignmentSubmissions(id),
    enabled: !!id,
  })

  const gradeMutation = useMutation({
    mutationFn: ({ submissionId, marks: m, feedback: f }: { submissionId: string; marks: number; feedback: string }) =>
      gradeSubmission(submissionId, m, f),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assignment-submissions', id] })
      toast.success('Submission graded')
    },
    onError: (err: Error) => toast.error(err.message),
  })

  if (isLoading) {
    return <div className="space-y-4"><Skeleton className="h-12 w-64" /><Skeleton className="h-64 w-full" /></div>
  }

  if (!assignment) {
    return <p className="text-center py-12 text-muted-foreground">Assignment not found</p>
  }

  const pendingCount = submissions?.filter((s: any) => s.status === 'submitted' || s.status === 'late').length ?? 0
  const gradedCount = submissions?.filter((s: any) => s.status === 'graded').length ?? 0

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/teacher/assignments"><ArrowLeft className="h-5 w-5" /></Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{assignment.title}</h1>
          <p className="text-sm text-muted-foreground">
            {assignment.classes?.name} · {assignment.subjects?.name}
            {assignment.sections?.name && ` · ${assignment.sections.name}`}
            · Due {new Date(assignment.due_date).toLocaleString()}
            · Max {assignment.max_marks} marks
          </p>
        </div>
      </div>

      {assignment.description && (
        <Card>
          <CardHeader><CardTitle>Description</CardTitle></CardHeader>
          <CardContent><p className="text-sm whitespace-pre-wrap">{assignment.description}</p></CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Submissions</CardTitle>
              <CardDescription>{gradedCount} graded · {pendingCount} pending</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {submissions?.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">No submissions yet</p>
          ) : (
            <div className="space-y-3">
              {submissions?.map((sub: any) => {
                const isPending = sub.status === 'submitted' || sub.status === 'late'
                return (
                  <div key={sub.id} className="p-4 rounded-lg border border-gray-200">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={sub.students?.profiles?.avatar_url ?? ''} />
                          <AvatarFallback className="text-xs">
                            {sub.students?.profiles?.first_name?.[0]}{sub.students?.profiles?.last_name?.[0]}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-medium">{sub.students?.profiles?.first_name} {sub.students?.profiles?.last_name}</p>
                          <p className="text-xs text-muted-foreground">{sub.students?.admission_number}</p>
                        </div>
                      </div>
                      <Badge className={
                        sub.status === 'graded' ? 'bg-green-100 text-green-800' :
                        sub.status === 'late' ? 'bg-red-100 text-red-800' :
                        'bg-blue-100 text-blue-800'
                      }>
                        {sub.status}
                      </Badge>
                    </div>
                    <div className="text-xs text-muted-foreground mb-3">
                      Submitted {new Date(sub.submitted_at).toLocaleString()}
                    </div>
                    {isPending ? (
                      <div className="flex gap-3 items-end">
                        <div>
                          <label className="text-xs font-medium block mb-1">Marks (max {assignment.max_marks})</label>
                          <Input
                            type="number"
                            max={assignment.max_marks}
                            className="w-24"
                            value={marks[sub.id] ?? ''}
                            onChange={(e) => setMarks(prev => ({ ...prev, [sub.id]: e.target.value }))}
                          />
                        </div>
                        <div className="flex-1">
                          <label className="text-xs font-medium block mb-1">Feedback</label>
                          <Input
                            value={feedback[sub.id] ?? ''}
                            onChange={(e) => setFeedback(prev => ({ ...prev, [sub.id]: e.target.value }))}
                            placeholder="Optional feedback..."
                          />
                        </div>
                        <Button
                          size="sm"
                          onClick={() => {
                            const m = parseInt(marks[sub.id])
                            if (isNaN(m)) { toast.error('Enter valid marks'); return }
                            gradeMutation.mutate({ submissionId: sub.id, marks: m, feedback: feedback[sub.id] ?? '' })
                          }}
                          disabled={gradeMutation.isPending}
                        >
                          Grade
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-4 text-sm">
                        <span className="font-medium">Marks: {sub.marks}/{assignment.max_marks}</span>
                        {sub.feedback && <span className="text-muted-foreground">· {sub.feedback}</span>}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
