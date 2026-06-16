'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createTeacherExam } from '@/lib/actions/teacher'
import { getTeachersSubjects } from '@/lib/actions/teacher'
import { getClasses, getAcademicYears, getTerms, getCurrentTerm } from '@/lib/actions/school-admin'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { toast } from 'sonner'
import { X, Plus, Loader2, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default function CreateTeacherExamPage() {
  const router = useRouter()
  const queryClient = useQueryClient()

  const [name, setName] = useState('')
  const [examType, setExamType] = useState('midterm')
  const [classId, setClassId] = useState('')
  const [termId, setTermId] = useState('')
  const [academicYearId, setAcademicYearId] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [totalMarks, setTotalMarks] = useState('100')
  const [passMarks, setPassMarks] = useState('40')
  const [instructions, setInstructions] = useState('')
  const [subjects, setSubjects] = useState<{ subject_id: string; max_marks: string; pass_marks: string; exam_date: string; duration_minutes: string }[]>([])
  const [selectedSubject, setSelectedSubject] = useState('')

  const { data: classes } = useQuery({
    queryKey: ['teacher-classes'],
    queryFn: () => getClasses(),
  })

  const { data: teacherSubjects } = useQuery({
    queryKey: ['teacher-subjects'],
    queryFn: () => getTeachersSubjects(),
  })

  const { data: academicYears } = useQuery({
    queryKey: ['academic-years'],
    queryFn: () => getAcademicYears(),
  })

  const { data: terms } = useQuery({
    queryKey: ['terms', academicYearId],
    queryFn: () => getTerms(academicYearId),
    enabled: !!academicYearId,
  })

  const createMutation = useMutation({
    mutationFn: () => createTeacherExam({
      name,
      exam_type: examType as any,
      class_id: classId,
      term_id: termId,
      start_date: startDate || undefined,
      end_date: endDate || undefined,
      total_marks: parseInt(totalMarks),
      pass_marks: parseInt(passMarks),
      instructions: instructions || undefined,
      subjects: subjects.map((s: any) => ({
        subject_id: s.subject_id,
        max_marks: parseInt(s.max_marks),
        pass_marks: parseInt(s.pass_marks),
        exam_date: s.exam_date || undefined,
        duration_minutes: parseInt(s.duration_minutes) || 120,
      })),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teacher-exams'] })
      toast.success('Exam created')
      router.push('/teacher/exams')
    },
    onError: (err: Error) => toast.error(err.message),
  })

  function addSubject() {
    if (!selectedSubject) return
    if (subjects.find((s: any) => s.subject_id === selectedSubject)) {
      toast.error('Subject already added')
      return
    }
    setSubjects(prev => [...prev, {
      subject_id: selectedSubject,
      max_marks: totalMarks,
      pass_marks: passMarks,
      exam_date: '',
      duration_minutes: '120',
    }])
    setSelectedSubject('')
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name) { toast.error('Exam name is required'); return }
    if (!classId) { toast.error('Class is required'); return }
    if (!termId) { toast.error('Term is required'); return }
    if (subjects.length === 0) { toast.error('Add at least one subject'); return }
    createMutation.mutate()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/teacher/exams"><ArrowLeft className="h-5 w-5" /></Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Create Exam</h1>
          <p className="text-gray-600 mt-1">Set up a new exam for your class</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Exam Details</CardTitle>
          <CardDescription>Fill in the details and select subjects you teach</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Exam Name</Label>
                <Input id="name" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. End of Term Exam" />
              </div>

              <div className="space-y-2">
                <Label>Exam Type</Label>
                <Select value={examType} onValueChange={setExamType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="midterm">Midterm</SelectItem>
                    <SelectItem value="final">Final</SelectItem>
                    <SelectItem value="quiz">Quiz</SelectItem>
                    <SelectItem value="cat">CAT</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Class</Label>
                <Select value={classId} onValueChange={setClassId}>
                  <SelectTrigger><SelectValue placeholder="Select class" /></SelectTrigger>
                  <SelectContent>
                    {classes?.map((c: any) => (
                      <SelectItem key={c.id} value={c.id}>{c.name} {c.level ? `- Level ${c.level}` : ''}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Academic Year</Label>
                <Select value={academicYearId} onValueChange={(v) => { setAcademicYearId(v); setTermId('') }}>
                  <SelectTrigger><SelectValue placeholder="Select year" /></SelectTrigger>
                  <SelectContent>
                    {academicYears?.map((y: any) => (
                      <SelectItem key={y.id} value={y.id}>{y.name}{y.is_current ? ' (Current)' : ''}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Term</Label>
                <Select value={termId} onValueChange={setTermId} disabled={!academicYearId}>
                  <SelectTrigger><SelectValue placeholder={!academicYearId ? 'Select year first' : 'Select term'} /></SelectTrigger>
                  <SelectContent>
                    {terms?.map((t: any) => (
                      <SelectItem key={t.id} value={t.id}>{t.name}{t.is_current ? ' (Current)' : ''}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Start Date</Label>
                <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
              </div>

              <div className="space-y-2">
                <Label>End Date</Label>
                <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
              </div>

              <div className="space-y-2">
                <Label>Total Marks</Label>
                <Input type="number" value={totalMarks} onChange={e => setTotalMarks(e.target.value)} />
              </div>

              <div className="space-y-2">
                <Label>Pass Marks</Label>
                <Input type="number" value={passMarks} onChange={e => setPassMarks(e.target.value)} />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Instructions (optional)</Label>
              <textarea
                value={instructions}
                onChange={e => setInstructions(e.target.value)}
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                placeholder="Exam instructions..."
              />
            </div>

            <div className="space-y-3">
              <div className="flex items-end gap-2">
                <div className="flex-1 space-y-2">
                  <Label>Add Subject</Label>
                  <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                    <SelectTrigger><SelectValue placeholder="Choose a subject you teach" /></SelectTrigger>
                    <SelectContent>
                      {teacherSubjects?.map((s: any) => (
                        <SelectItem key={s.id} value={s.id}>{s.name} ({s.code})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button type="button" variant="outline" onClick={addSubject} disabled={!selectedSubject}>
                  <Plus className="h-4 w-4 mr-1" /> Add
                </Button>
              </div>

              {subjects.length > 0 && (
                <div className="space-y-2">
                  {subjects.map((s: any) => {
                    const subj = teacherSubjects?.find((ts: any) => ts.id === s.subject_id)
                    return (
                      <Card key={s.subject_id}>
                        <CardContent className="p-3">
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-medium text-sm">{subj?.name} ({subj?.code})</span>
                            <Button type="button" variant="ghost" size="sm" onClick={() => setSubjects(prev => prev.filter((x: any) => x.subject_id !== s.subject_id))}>
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                          <div className="grid grid-cols-3 gap-2">
                            <div>
                              <Label className="text-xs">Max Marks</Label>
                              <Input type="number" value={s.max_marks} onChange={e => setSubjects(prev => prev.map((x: any) => x.subject_id === s.subject_id ? { ...x, max_marks: e.target.value } : x))} className="h-8 text-sm" />
                            </div>
                            <div>
                              <Label className="text-xs">Pass Marks</Label>
                              <Input type="number" value={s.pass_marks} onChange={e => setSubjects(prev => prev.map((x: any) => x.subject_id === s.subject_id ? { ...x, pass_marks: e.target.value } : x))} className="h-8 text-sm" />
                            </div>
                            <div>
                              <Label className="text-xs">Duration (min)</Label>
                              <Input type="number" value={s.duration_minutes} onChange={e => setSubjects(prev => prev.map((x: any) => x.subject_id === s.subject_id ? { ...x, duration_minutes: e.target.value } : x))} className="h-8 text-sm" />
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
              )}
            </div>

            <div className="flex gap-2 justify-end">
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Create Exam
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
