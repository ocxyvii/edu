'use client'

import { useQuery } from '@tanstack/react-query'
import { getTeacherExams } from '@/lib/actions/teacher'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { FileEdit, ChevronRight, Plus } from 'lucide-react'
import Link from 'next/link'

export default function ExamsPage() {
  const { data: exams, isLoading } = useQuery({
    queryKey: ['teacher-exams'],
    queryFn: () => getTeacherExams(),
  })

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Exams & Marks</h1>
          <p className="text-gray-600 mt-1">Enter marks and manage exam results</p>
        </div>
        <Button asChild>
          <Link href="/teacher/exams/create">
            <Plus className="h-4 w-4 mr-2" /> Create Exam
          </Link>
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">{[...Array(4)].map((_: any, i: any) => <Skeleton key={i} className="h-24 w-full" />)}</div>
      ) : exams?.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center text-muted-foreground">
            <FileEdit className="h-10 w-10 mx-auto mb-3 text-gray-300" />
            <p className="font-medium">No exams yet</p>
            <p className="text-sm mt-1">Create your first exam to start entering marks</p>
            <Button asChild className="mt-4">
              <Link href="/teacher/exams/create">Create Exam</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {exams?.map((exam: any) => (
            <Card key={exam.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">{exam.name}</CardTitle>
                    <CardDescription>
                      {exam.classes?.name} · {exam.terms?.name}
                      {exam.start_date && ` · ${new Date(exam.start_date).toLocaleDateString()}`}
                      {exam.end_date && ` – ${new Date(exam.end_date).toLocaleDateString()}`}
                    </CardDescription>
                  </div>
                  <Badge className={exam.is_published ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}>
                    {exam.is_published ? 'Published' : 'Draft'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {exam.exam_subjects?.map((es: any) => (
                    <Link
                      key={es.id}
                      href={`/teacher/exams/${exam.id}/marks?subjectId=${es.subject_id}`}
                    >
                      <Badge variant="outline" className="cursor-pointer hover:bg-edu-blue-50 hover:border-edu-blue-300 py-2 px-3 gap-2">
                        <FileEdit className="h-3 w-3" />
                        {es.subjects?.name} ({es.subjects?.code})
                        <span className="text-muted-foreground">· Max {es.max_marks}</span>
                        <ChevronRight className="h-3 w-3" />
                      </Badge>
                    </Link>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
