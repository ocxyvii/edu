'use client'

import { useRouter } from 'next/navigation'
import { ExamForm } from '@/components/exams/ExamForm'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

export default function CreateExamPage() {
  const router = useRouter()

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/school-admin/exams"><ArrowLeft className="h-5 w-5" /></Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Create Exam</h1>
          <p className="text-gray-600 mt-1">Set up a new examination with subjects</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Exam Details</CardTitle>
          <CardDescription>Fill in the examination details and add subjects</CardDescription>
        </CardHeader>
        <CardContent>
          <ExamForm onSuccess={() => router.push('/school-admin/exams')} />
        </CardContent>
      </Card>
    </div>
  )
}
