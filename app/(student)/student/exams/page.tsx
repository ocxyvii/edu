'use client'

import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getStudentExams } from '@/lib/actions/student'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { FileEdit, Clock, CheckCircle, AlertCircle, Play, ExternalLink } from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'

export default function StudentExamsPage() {
  const { data: exams, isLoading } = useQuery({
    queryKey: ['student-exams'],
    queryFn: () => getStudentExams(),
  })

  const now = new Date()

  const categorized = useMemo(() => {
    if (!exams) return { upcoming: [], ongoing: [], completed: [] }

    const upcoming: any[] = []
    const ongoing: any[] = []
    const completed: any[] = []

    exams.forEach((exam: any) => {
      const start = exam.start_date ? new Date(exam.start_date) : null
      const end = exam.end_date ? new Date(exam.end_date) : null

      if (end && end < now) {
        completed.push(exam)
      } else if (start && start <= now && (!end || end >= now)) {
        ongoing.push(exam)
      } else {
        upcoming.push(exam)
      }
    })

    return { upcoming, ongoing, completed }
  }, [exams])

  const today = now.toISOString().split('T')[0]

  function renderExamCard(exam: any, status: 'upcoming' | 'ongoing' | 'completed') {
    const isOnline = exam.is_online
    const isActive = status === 'ongoing'
    const isPublished = exam.is_published

    return (
      <Card key={exam.id} className={cn(isActive && 'ring-2 ring-edu-blue-400')}>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <CardTitle className="text-lg">{exam.name}</CardTitle>
              <CardDescription>
                {exam.classes?.name && `${exam.classes.name}${exam.classes.level ? ` - Level ${exam.classes.level}` : ''}`}
                {exam.terms?.name && ` · ${exam.terms.name}`}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {status === 'ongoing' && (
                <Badge className="bg-green-100 text-green-800 animate-pulse">
                  <Play className="h-3 w-3 mr-1" /> Ongoing
                </Badge>
              )}
              {status === 'upcoming' && (
                <Badge variant="outline" className="text-blue-600 border-blue-300">
                  <Clock className="h-3 w-3 mr-1" /> Upcoming
                </Badge>
              )}
              {status === 'completed' && (
                <Badge className={isPublished ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}>
                  <CheckCircle className="h-3 w-3 mr-1" />
                  {isPublished ? 'Results Published' : 'Completed'}
                </Badge>
              )}
              {isOnline && <Badge className="bg-blue-100 text-blue-800">Online</Badge>}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex flex-wrap gap-2">
              {exam.exam_subjects?.map((es: any) => (
                <Badge key={es.id} variant="secondary" className="text-xs">
                  {es.subjects?.name ?? 'Subject'}
                  <span className="text-muted-foreground ml-1">/{es.max_marks}</span>
                </Badge>
              ))}
            </div>
            <div className="flex gap-2">
              {isOnline && isActive && (
                <Button size="sm" asChild>
                  <Link href={`/student/exams/${exam.id}`}>
                    <Play className="h-4 w-4 mr-1" /> Take Exam
                  </Link>
                </Button>
              )}
              {isPublished && (
                <Button size="sm" variant="outline" asChild>
                  <Link href="/student/results">
                    <ExternalLink className="h-4 w-4 mr-1" /> View Results
                  </Link>
                </Button>
              )}
              {!isOnline && (
                <Button size="sm" variant="outline" asChild>
                  <Link href="/student/results">
                    <FileEdit className="h-4 w-4 mr-1" /> Details
                  </Link>
                </Button>
              )}
            </div>
          </div>
          {(exam.start_date || exam.end_date) && (
            <p className="text-xs text-muted-foreground mt-3">
              {exam.start_date && `Start: ${new Date(exam.start_date).toLocaleDateString()}`}
              {exam.end_date && ` · End: ${new Date(exam.end_date).toLocaleDateString()}`}
            </p>
          )}
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">My Exams</h1>
        <p className="text-gray-600 mt-1">View your upcoming, ongoing, and completed exams</p>
      </div>

      {isLoading ? (
        <div className="space-y-4">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-32 w-full" />)}</div>
      ) : exams?.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center text-muted-foreground">
            <AlertCircle className="h-10 w-10 mx-auto mb-3 text-gray-300" />
            <p className="font-medium">No exams available</p>
            <p className="text-sm mt-1">Exams will appear here once your teacher sets them up</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {categorized.ongoing.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-green-700 flex items-center gap-2">
                <Play className="h-5 w-5" /> Active Exams
              </h2>
              {categorized.ongoing.map((e: any) => renderExamCard(e, 'ongoing'))}
            </div>
          )}

          {categorized.upcoming.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-blue-700 flex items-center gap-2">
                <Clock className="h-5 w-5" /> Upcoming Exams
              </h2>
              {categorized.upcoming.map((e: any) => renderExamCard(e, 'upcoming'))}
            </div>
          )}

          {categorized.completed.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-gray-700 flex items-center gap-2">
                <CheckCircle className="h-5 w-5" /> Completed Exams
              </h2>
              {categorized.completed.map((e: any) => renderExamCard(e, 'completed'))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
