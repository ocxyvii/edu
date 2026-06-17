'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useParams, useRouter } from 'next/navigation'
import { getAssignmentSubmissions, gradeSubmission } from '@/lib/actions/assignments.actions'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import { ArrowLeft, CheckCircle2, Clock, Download, FileText } from 'lucide-react'

export default function SubmissionsPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string
  const queryClient = useQueryClient()
  const [marks, setMarks] = useState<Record<string, string>>({})
  const [feedback, setFeedback] = useState<Record<string, string>>({})

  const { data: submissions, isLoading } = useQuery({
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

  const gradedCount = submissions?.filter((s: any) => s.status === 'graded').length ?? 0
  const pendingCount = submissions?.filter((s: any) => s.status === 'submitted' || s.status === 'late').length ?? 0

  if (isLoading) {
    return <div className="space-y-4"><Skeleton className="h-12 w-64" /><Skeleton className="h-64 w-full" /></div>
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Submissions</h1>
          <p className="text-sm text-muted-foreground">
            {gradedCount} graded · {pendingCount} pending · {submissions?.length ?? 0} total
          </p>
        </div>
      </div>

      {submissions?.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No submissions yet. Students haven&apos;t submitted this assignment.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {submissions?.map((sub: any) => {
            const isPending = sub.status === 'submitted' || sub.status === 'late'
            return (
              <Card key={sub.id} className={sub.status === 'graded' ? 'border-green-200' : 'border-gray-200'}>
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={sub.students?.profiles?.avatar_url ?? ''} />
                      <AvatarFallback className="text-xs">
                        {sub.students?.profiles?.first_name?.[0]}{sub.students?.profiles?.last_name?.[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {sub.students?.profiles?.first_name} {sub.students?.profiles?.last_name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {sub.students?.admission_number ?? '—'}
                      </p>
                    </div>
                    <Badge className={
                      sub.status === 'graded' ? 'bg-green-100 text-green-800' :
                      sub.status === 'late' ? 'bg-red-100 text-red-800' :
                      'bg-blue-100 text-blue-800'
                    }>
                      {sub.status === 'graded' ? <CheckCircle2 className="h-3 w-3 mr-1" /> :
                       sub.status === 'late' ? <Clock className="h-3 w-3 mr-1" /> :
                       <Clock className="h-3 w-3 mr-1" />}
                      {sub.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-xs text-muted-foreground">
                    Submitted {new Date(sub.submitted_at).toLocaleString()}
                  </p>

                  {sub.content && (
                    <p className="text-sm bg-gray-50 rounded-lg p-3 line-clamp-4">{sub.content}</p>
                  )}

                  {sub.attachments?.length > 0 && (
                    <div className="space-y-1">
                      {sub.attachments.map((att: any, i: number) => (
                        <a key={i} href={att.url} target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-2 text-xs text-edu-blue-600 hover:underline p-2 bg-blue-50 rounded-lg">
                          <FileText className="h-3 w-3" />
                          <span className="truncate">{att.name}</span>
                          <Download className="h-3 w-3 shrink-0 ml-auto" />
                        </a>
                      ))}
                    </div>
                  )}

                  {sub.status === 'graded' ? (
                    <div className="bg-green-50 rounded-lg p-3 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-green-800">Score</span>
                        <span className="text-lg font-bold text-green-700">{sub.marks}</span>
                      </div>
                      {sub.feedback && (
                        <p className="text-xs text-green-700"><span className="font-medium">Feedback: </span>{sub.feedback}</p>
                      )}
                      <p className="text-xs text-green-500">Graded {new Date(sub.graded_at).toLocaleString()}</p>
                    </div>
                  ) : (
                    <div className="space-y-2 pt-2 border-t">
                      <Input
                        type="number"
                        placeholder="Marks"
                        min={0}
                        value={marks[sub.id] ?? ''}
                        onChange={(e) => setMarks(prev => ({ ...prev, [sub.id]: e.target.value }))}
                      />
                      <Input
                        placeholder="Feedback (optional)"
                        value={feedback[sub.id] ?? ''}
                        onChange={(e) => setFeedback(prev => ({ ...prev, [sub.id]: e.target.value }))}
                      />
                      <Button
                        size="sm"
                        className="w-full"
                        onClick={() => {
                          const m = parseInt(marks[sub.id])
                          if (isNaN(m)) { toast.error('Enter valid marks'); return }
                          gradeMutation.mutate({ submissionId: sub.id, marks: m, feedback: feedback[sub.id] ?? '' })
                        }}
                        disabled={gradeMutation.isPending}
                      >
                        {gradeMutation.isPending ? 'Grading...' : 'Grade'}
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
