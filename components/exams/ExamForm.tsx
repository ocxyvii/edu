'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getClasses, getSubjects, getAcademicYears, getTerms } from '@/lib/actions/school-admin'
import { createExam, updateExam } from '@/lib/actions/exam.actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { X, Plus, Loader2 } from 'lucide-react'

interface ExamFormProps {
  initialData?: any
  onSuccess?: () => void
}

export function ExamForm({ initialData, onSuccess }: ExamFormProps) {
  const queryClient = useQueryClient()
  const isEditing = !!initialData

  const [name, setName] = useState(initialData?.name ?? '')
  const [examType, setExamType] = useState(initialData?.exam_type ?? 'midterm')
  const [classId, setClassId] = useState(initialData?.class_id ?? '')
  const [termId, setTermId] = useState(initialData?.term_id ?? '')
  const [academicYearId, setAcademicYearId] = useState('')
  const [startDate, setStartDate] = useState(initialData?.start_date ?? '')
  const [endDate, setEndDate] = useState(initialData?.end_date ?? '')
  const [totalMarks, setTotalMarks] = useState(String(initialData?.total_marks ?? 100))
  const [passMarks, setPassMarks] = useState(String(initialData?.pass_marks ?? 40))
  const [isOnline, setIsOnline] = useState(initialData?.is_online ?? false)
  const [instructions, setInstructions] = useState(initialData?.instructions ?? '')
  const [subjects, setSubjects] = useState<{
    subject_id: string
    max_marks: string
    pass_marks: string
    exam_date: string
    start_time: string
    duration_minutes: string
  }[]>(
    initialData?.exam_subjects?.map((es: any) => ({
      subject_id: es.subject_id,
      max_marks: String(es.max_marks),
      pass_marks: String(es.pass_marks),
      exam_date: es.exam_date ?? '',
      start_time: es.start_time ?? '',
      duration_minutes: String(es.duration_minutes ?? 120),
    })) ?? []
  )

  const [selectedSubject, setSelectedSubject] = useState('')

  const { data: classes } = useQuery({
    queryKey: ['classes'],
    queryFn: () => getClasses(),
  })

  const { data: subjectsList } = useQuery({
    queryKey: ['subjects'],
    queryFn: () => getSubjects(),
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
    mutationFn: () => createExam({
      name,
      exam_type: examType as any,
      class_id: classId,
      term_id: termId,
      start_date: startDate || undefined,
      end_date: endDate || undefined,
      total_marks: parseInt(totalMarks),
      pass_marks: parseInt(passMarks),
      is_online: isOnline,
      instructions: instructions || undefined,
      subjects: subjects.map((s: any) => ({
        subject_id: s.subject_id,
        max_marks: parseInt(s.max_marks),
        pass_marks: parseInt(s.pass_marks),
        exam_date: s.exam_date || undefined,
        start_time: s.start_time || undefined,
        duration_minutes: parseInt(s.duration_minutes),
      })),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['school-exams'] })
      toast.success('Exam created')
      onSuccess?.()
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const updateMutation = useMutation({
    mutationFn: () => updateExam(initialData.id, {
      name,
      exam_type: examType as any,
      class_id: classId,
      term_id: termId,
      start_date: startDate || undefined,
      end_date: endDate || undefined,
      total_marks: parseInt(totalMarks),
      pass_marks: parseInt(passMarks),
      is_online: isOnline,
      instructions: instructions || undefined,
      subjects: subjects.map((s: any) => ({
        subject_id: s.subject_id,
        max_marks: parseInt(s.max_marks),
        pass_marks: parseInt(s.pass_marks),
        exam_date: s.exam_date || undefined,
        start_time: s.start_time || undefined,
        duration_minutes: parseInt(s.duration_minutes),
      })),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['school-exams'] })
      toast.success('Exam updated')
      onSuccess?.()
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const isPending = createMutation.isPending || updateMutation.isPending

  function addSubject() {
    if (!selectedSubject) return
    if (subjects.find((s: any) => s.subject_id === selectedSubject)) {
      toast.error('Subject already added')
      return
    }
    const subj = subjectsList?.find((s: any) => s.id === selectedSubject)
    setSubjects(prev => [...prev, {
      subject_id: selectedSubject,
      max_marks: totalMarks,
      pass_marks: passMarks,
      exam_date: '',
      start_time: '',
      duration_minutes: '120',
    }])
    setSelectedSubject('')
  }

  function removeSubject(id: string) {
    setSubjects(prev => prev.filter((s: any) => s.subject_id !== id))
  }

  function updateSubject(id: string, field: string, value: string) {
    setSubjects(prev => prev.map((s: any) => s.subject_id === id ? { ...s, [field]: value } : s))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name) { toast.error('Exam name is required'); return }
    if (!classId) { toast.error('Class is required'); return }
    if (!termId) { toast.error('Term is required'); return }
    if (subjects.length === 0) { toast.error('Add at least one subject'); return }

    if (isEditing) {
      updateMutation.mutate()
    } else {
      createMutation.mutate()
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="name">Exam Name</Label>
          <Input id="name" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. End of Term Examination" />
        </div>

        <div className="space-y-2">
          <Label htmlFor="type">Exam Type</Label>
          <Select value={examType} onValueChange={setExamType}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="midterm">Midterm</SelectItem>
              <SelectItem value="final">Final</SelectItem>
              <SelectItem value="quiz">Quiz</SelectItem>
              <SelectItem value="assignment">Assignment</SelectItem>
              <SelectItem value="cat">CAT</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="class">Class</Label>
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
          <Label htmlFor="academicYear">Academic Year</Label>
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
          <Label htmlFor="term">Term</Label>
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
          <Label htmlFor="isOnline">Mode</Label>
          <Select value={isOnline ? 'online' : 'offline'} onValueChange={(v) => setIsOnline(v === 'online')}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="offline">Offline (Paper-based)</SelectItem>
              <SelectItem value="online">Online</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="startDate">Start Date</Label>
          <Input id="startDate" type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="endDate">End Date</Label>
          <Input id="endDate" type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="totalMarks">Total Marks</Label>
          <Input id="totalMarks" type="number" value={totalMarks} onChange={e => setTotalMarks(e.target.value)} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="passMarks">Pass Marks</Label>
          <Input id="passMarks" type="number" value={passMarks} onChange={e => setPassMarks(e.target.value)} />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="instructions">Instructions</Label>
        <textarea
          id="instructions"
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
              <SelectTrigger><SelectValue placeholder="Choose a subject" /></SelectTrigger>
              <SelectContent>
                {subjectsList?.map((s: any) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name} ({s.code})
                  </SelectItem>
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
              const subj = subjectsList?.find((sl: any) => sl.id === s.subject_id)
              return (
                <Card key={s.subject_id}>
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-sm">{subj?.name} ({subj?.code})</span>
                      <Button type="button" variant="ghost" size="sm" onClick={() => removeSubject(s.subject_id)}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                      <div>
                        <Label className="text-xs">Max Marks</Label>
                        <Input type="number" value={s.max_marks} onChange={e => updateSubject(s.subject_id, 'max_marks', e.target.value)} className="h-8 text-sm" />
                      </div>
                      <div>
                        <Label className="text-xs">Pass Marks</Label>
                        <Input type="number" value={s.pass_marks} onChange={e => updateSubject(s.subject_id, 'pass_marks', e.target.value)} className="h-8 text-sm" />
                      </div>
                      <div>
                        <Label className="text-xs">Date</Label>
                        <Input type="date" value={s.exam_date} onChange={e => updateSubject(s.subject_id, 'exam_date', e.target.value)} className="h-8 text-sm" />
                      </div>
                      <div>
                        <Label className="text-xs">Duration (min)</Label>
                        <Input type="number" value={s.duration_minutes} onChange={e => updateSubject(s.subject_id, 'duration_minutes', e.target.value)} className="h-8 text-sm" />
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
        <Button type="submit" disabled={isPending}>
          {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          {isEditing ? 'Update Exam' : 'Create Exam'}
        </Button>
      </div>
    </form>
  )
}
