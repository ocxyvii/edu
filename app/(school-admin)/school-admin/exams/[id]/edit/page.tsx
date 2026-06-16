'use client'

import { useParams, useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { getExamById } from '@/lib/actions/exam.actions'
import { ExamForm } from '@/components/exams/ExamForm'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

export default function EditExamPage() {
  const params = useParams()
  const router = useRouter()
  const examId = params.id as string

  const { data: exam, isLoading } = useQuery({
    queryKey: ['exam', examId],
    queryFn: () => getExamById(examId),
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/school-admin/exams"><ArrowLeft className="h-5 w-5" /></Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Edit Exam</h1>
          <p className="text-gray-600 mt-1">Update examination details</p>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">{[...Array(6)].map((_: any, i: any) => <Skeleton key={i} className="h-12 w-full" />)}</div>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>{exam?.name}</CardTitle>
            <CardDescription>Modify exam settings and subjects</CardDescription>
          </CardHeader>
          <CardContent>
            <ExamForm initialData={exam} onSuccess={() => router.push('/school-admin/exams')} />
          </CardContent>
        </Card>
      )}
    </div>
  )
}
