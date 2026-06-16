'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useParams, useSearchParams } from 'next/navigation'
import { getStudentsForMarks, saveMarks, publishResults, getTeacherExams } from '@/lib/actions/teacher'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import { ArrowLeft, Check, Send } from 'lucide-react'
import Link from 'next/link'

export default function MarksEntryPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const examId = params.id as string
  const subjectId = searchParams.get('subjectId') ?? ''
  const queryClient = useQueryClient()
  const [marks, setMarks] = useState<Record<string, string>>({})
  const [savedMarks, setSavedMarks] = useState<Record<string, number>>({})
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({})

  const { data: examData, isLoading } = useQuery({
    queryKey: ['exam-marks', examId, subjectId],
    queryFn: () => getStudentsForMarks(examId, subjectId),
    enabled: !!examId && !!subjectId,
  })

  const { data: exam } = useQuery({
    queryKey: ['teacher-exams'],
    queryFn: () => getTeacherExams(),
  })

  const currentExam = exam?.find((e: any) => e.id === examId)

  useEffect(() => {
    if (examData?.results) {
      const initial: Record<string, string> = {}
      const saved: Record<string, number> = {}
      examData.results.forEach(r => {
        initial[r.student_id] = String(r.marks_obtained)
        saved[r.student_id] = r.marks_obtained
      })
      examData.students.forEach(s => {
        if (!initial[s.id]) initial[s.id] = ''
      })
      setMarks(initial)
      setSavedMarks(saved)
    }
  }, [examData])

  const saveMutation = useMutation({
    mutationFn: () => saveMarks({
      examId,
      subjectId,
      marks: Object.entries(marks)
        .filter(([_, v]) => v !== '')
        .map(([student_id, marks_obtained]) => ({
          student_id,
          marks_obtained: parseFloat(marks_obtained),
        })),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exam-marks', examId, subjectId] })
      toast.success('Marks saved')
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const publishMutation = useMutation({
    mutationFn: () => publishResults(examId, subjectId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teacher-exams'] })
      toast.success('Results published')
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>, studentId: string, index: number) => {
    if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault()
      const students = examData?.students ?? []
      const nextIndex = index + 1
      if (nextIndex < students.length) {
        const nextId = students[nextIndex].id
        inputRefs.current[nextId]?.focus()
        inputRefs.current[nextId]?.select()
      }
    }
  }, [examData])

  if (!subjectId) {
    return <p className="text-center py-12 text-muted-foreground">Select a subject to enter marks</p>
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/teacher/exams"><ArrowLeft className="h-5 w-5" /></Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Marks Entry</h1>
          <p className="text-sm text-muted-foreground">
            {currentExam?.name} · {currentExam?.classes?.name}
            · Max {examData?.maxMarks ?? 100} marks · Pass {examData?.passMarks ?? 40}
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">{[...Array(10)].map((_: any, i: any) => <Skeleton key={i} className="h-14 w-full" />)}</div>
      ) : (
        <>
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Student Marks</CardTitle>
                  <CardDescription>
                    {examData?.students.length ?? 0} students · Tab/Enter to move to next row
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
                    <Check className="h-4 w-4 mr-2" /> Save Marks
                  </Button>
                  <Button onClick={() => publishMutation.mutate()} disabled={publishMutation.isPending}>
                    <Send className="h-4 w-4 mr-2" /> Publish Results
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase w-12">#</th>
                      <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">Student</th>
                      <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">Admission</th>
                      <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase w-40">
                        Marks (max {examData?.maxMarks ?? 100})
                      </th>
                      <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase w-20">Grade</th>
                      <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase w-20">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {examData?.students.map((student: any, index: number) => {
                      const val = marks[student.id] ?? ''
                      const numVal = parseFloat(val)
                      const calculatedGrade = isNaN(numVal) ? '-' :
                        numVal >= 80 ? 'A' : numVal >= 65 ? 'B' : numVal >= 50 ? 'C' : numVal >= 40 ? 'D' : 'F'
                      const isSaved = savedMarks[student.id] !== undefined
                      const hasChanged = savedMarks[student.id] !== numVal

                      return (
                        <tr key={student.id} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="py-2 px-4 text-sm text-gray-500">{index + 1}</td>
                          <td className="py-2 px-4 text-sm font-medium">{student.profiles?.first_name} {student.profiles?.last_name}</td>
                          <td className="py-2 px-4 text-sm text-gray-500">{student.admission_number}</td>
                          <td className="py-2 px-4">
                            <Input
                              ref={el => { inputRefs.current[student.id] = el }}
                              type="number"
                              max={examData?.maxMarks ?? 100}
                              value={val}
                              onChange={(e) => setMarks(prev => ({ ...prev, [student.id]: e.target.value }))}
                              onKeyDown={(e) => handleKeyDown(e, student.id, index)}
                              className="w-24"
                            />
                          </td>
                          <td className="py-2 px-4">
                            <Badge className={
                              calculatedGrade === 'A' ? 'bg-green-100 text-green-800' :
                              calculatedGrade === 'B' ? 'bg-blue-100 text-blue-800' :
                              calculatedGrade === 'C' ? 'bg-yellow-100 text-yellow-800' :
                              calculatedGrade === 'D' ? 'bg-orange-100 text-orange-800' :
                              calculatedGrade === 'F' ? 'bg-red-100 text-red-800' :
                              'bg-gray-100 text-gray-800'
                            }>{calculatedGrade}</Badge>
                          </td>
                          <td className="py-2 px-4">
                            {isSaved && !hasChanged ? (
                              <Badge className="bg-green-100 text-green-800">Saved</Badge>
                            ) : val ? (
                              <Badge className="bg-yellow-100 text-yellow-800">Unsaved</Badge>
                            ) : (
                              <span className="text-xs text-gray-400">–</span>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
