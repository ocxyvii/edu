'use server'

import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'
import { revalidatePath } from 'next/cache'

async function getAuthContext() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  const { data: profile } = await supabase
    .from('profiles')
    .select('school_id, role')
    .eq('id', user.id)
    .single()
  if (!profile?.school_id) throw new Error('No school assigned')
  return { userId: user.id, schoolId: profile.school_id, role: profile.role, supabase }
}

const CreateExamSchema = z.object({
  name: z.string().min(1),
  exam_type: z.enum(['midterm', 'final', 'quiz', 'assignment', 'cat']),
  class_id: z.string().min(1),
  term_id: z.string().min(1),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
  total_marks: z.number().int().positive().default(100),
  pass_marks: z.number().int().min(0).default(40),
  is_online: z.boolean().default(false),
  instructions: z.string().optional(),
  subjects: z.array(z.object({
    subject_id: z.string().min(1),
    max_marks: z.number().int().positive().default(100),
    pass_marks: z.number().int().min(0).default(40),
    exam_date: z.string().optional(),
    start_time: z.string().optional(),
    duration_minutes: z.number().int().positive().default(120),
  })).min(1),
})

export async function createExam(data: z.infer<typeof CreateExamSchema>) {
  const { supabase, schoolId, userId } = await getAuthContext()
  const parsed = CreateExamSchema.parse(data)

  const { data: exam, error: examError } = await supabase
    .from('exams')
    .insert({
      school_id: schoolId,
      name: parsed.name,
      exam_type: parsed.exam_type,
      class_id: parsed.class_id,
      term_id: parsed.term_id,
      start_date: parsed.start_date ?? null,
      end_date: parsed.end_date ?? null,
      total_marks: parsed.total_marks,
      pass_marks: parsed.pass_marks,
      is_online: parsed.is_online,
      instructions: parsed.instructions ?? null,
      created_by: userId,
    })
    .select('id')
    .single()

  if (examError) throw new Error(examError.message)

  const subjectRows = parsed.subjects.map(s => ({
    exam_id: exam.id,
    subject_id: s.subject_id,
    school_id: schoolId,
    max_marks: s.max_marks,
    pass_marks: s.pass_marks,
    exam_date: s.exam_date ?? null,
    start_time: s.start_time ?? null,
    duration_minutes: s.duration_minutes,
  }))

  const { error: subjError } = await supabase
    .from('exam_subjects')
    .insert(subjectRows)

  if (subjError) throw new Error(subjError.message)

  revalidatePath('/school-admin/exams')
  return exam
}

const UpdateExamSchema = CreateExamSchema.partial()

export async function updateExam(id: string, data: z.infer<typeof UpdateExamSchema>) {
  const { supabase, schoolId } = await getAuthContext()
  const parsed = UpdateExamSchema.parse(data)

  const updateData: any = {}
  if (parsed.name !== undefined) updateData.name = parsed.name
  if (parsed.exam_type !== undefined) updateData.exam_type = parsed.exam_type
  if (parsed.class_id !== undefined) updateData.class_id = parsed.class_id
  if (parsed.term_id !== undefined) updateData.term_id = parsed.term_id
  if (parsed.start_date !== undefined) updateData.start_date = parsed.start_date
  if (parsed.end_date !== undefined) updateData.end_date = parsed.end_date
  if (parsed.total_marks !== undefined) updateData.total_marks = parsed.total_marks
  if (parsed.pass_marks !== undefined) updateData.pass_marks = parsed.pass_marks
  if (parsed.is_online !== undefined) updateData.is_online = parsed.is_online
  if (parsed.instructions !== undefined) updateData.instructions = parsed.instructions
  updateData.updated_at = new Date().toISOString()

  const { error: examError } = await supabase
    .from('exams')
    .update(updateData)
    .eq('id', id)
    .eq('school_id', schoolId)

  if (examError) throw new Error(examError.message)

  if (parsed.subjects) {
    await supabase.from('exam_subjects').delete().eq('exam_id', id)

    const subjectRows = parsed.subjects.map(s => ({
      exam_id: id,
      subject_id: s.subject_id,
      school_id: schoolId,
      max_marks: s.max_marks,
      pass_marks: s.pass_marks,
      exam_date: s.exam_date ?? null,
      start_time: s.start_time ?? null,
      duration_minutes: s.duration_minutes,
    }))

    const { error: subjError } = await supabase
      .from('exam_subjects')
      .insert(subjectRows)

    if (subjError) throw new Error(subjError.message)
  }

  revalidatePath('/school-admin/exams')
}

export async function deleteExam(id: string) {
  const { supabase, schoolId } = await getAuthContext()

  const { error } = await supabase
    .from('exams')
    .delete()
    .eq('id', id)
    .eq('school_id', schoolId)

  if (error) throw new Error(error.message)
  revalidatePath('/school-admin/exams')
}

export async function getExamsByTerm(termId: string, schoolId?: string) {
  const ctx = await getAuthContext()
  const supabase = ctx.supabase
  const sid = schoolId ?? ctx.schoolId

  let query = supabase
    .from('exams')
    .select('*, classes(name, level), terms(name), exam_subjects(*, subjects(name, code))')
    .eq('school_id', sid)
    .order('start_date', { ascending: false })

  if (termId) query = query.eq('term_id', termId)

  const { data, error } = await query
  if (error) throw new Error(error.message)
  return data ?? []
}

export async function getExamById(id: string) {
  const { supabase, schoolId } = await getAuthContext()

  const { data, error } = await supabase
    .from('exams')
    .select('*, classes(name, level), terms(name, academic_year_id, academic_years(name)), exam_subjects(*, subjects(name, code))')
    .eq('id', id)
    .eq('school_id', schoolId)
    .single()

  if (error) throw new Error(error.message)
  return data
}

export async function getSchoolExams() {
  const { supabase, schoolId } = await getAuthContext()

  const { data, error } = await supabase
    .from('exams')
    .select('*, classes(name, level), terms(name), exam_subjects(*, subjects(name, code))')
    .eq('school_id', schoolId)
    .order('start_date', { ascending: false })

  if (error) throw new Error(error.message)
  return data ?? []
}

export async function publishResults(examId: string) {
  const { supabase, schoolId } = await getAuthContext()

  const { error } = await supabase
    .from('results')
    .update({ is_published: true })
    .eq('exam_id', examId)
    .eq('school_id', schoolId)

  if (error) throw new Error(error.message)
  revalidatePath(`/school-admin/exams/${examId}/results`)
}

export async function generateReportCard(studentId: string, examId: string): Promise<any> {
  const { supabase, schoolId } = await getAuthContext()

  const { data: exam } = await supabase
    .from('exams')
    .select('*, classes(name, level), terms(name), exam_subjects(*, subjects(name, code))')
    .eq('id', examId)
    .eq('school_id', schoolId)
    .single()

  if (!exam) throw new Error('Exam not found')

  const { data: student } = await supabase
    .from('students')
    .select('id, admission_number, class_id, section_id, profiles!inner(first_name, last_name, avatar_url), sections(name)')
    .eq('id', studentId)
    .eq('school_id', schoolId)
    .single()

  if (!student) throw new Error('Student not found')

  const { data: results } = await supabase
    .from('results')
    .select('*, subjects(name, code)')
    .eq('student_id', studentId)
    .eq('exam_id', examId)
    .eq('school_id', schoolId)

  if (!results || results.length === 0) throw new Error('No results found')

  const subjectsWithMarks = exam.exam_subjects.map((es: any) => {
    const result = results.find(r => r.subject_id === es.subject_id)
    return {
      subject: es.subjects?.name ?? 'Unknown',
      code: es.subjects?.code ?? '',
      maxMarks: es.max_marks,
      passMarks: es.pass_marks,
      marksObtained: result ? Number(result.marks_obtained) : null,
      grade: result?.grade ?? 'F',
      remarks: result?.remarks ?? '',
    }
  })

  const totalMarks = subjectsWithMarks.reduce((sum: number, s: any) => sum + (s.marksObtained ?? 0), 0)
  const totalMaxMarks = subjectsWithMarks.reduce((sum: number, s: any) => sum + s.maxMarks, 0)
  const average = subjectsWithMarks.filter((s: any) => s.marksObtained !== null).length > 0
    ? totalMarks / subjectsWithMarks.filter((s: any) => s.marksObtained !== null).length
    : 0
  const percentage = totalMaxMarks > 0 ? Math.round((totalMarks / totalMaxMarks) * 100) : 0

  let overallGrade = 'F'
  if (percentage >= 80) overallGrade = 'A'
  else if (percentage >= 65) overallGrade = 'B'
  else if (percentage >= 50) overallGrade = 'C'
  else if (percentage >= 40) overallGrade = 'D'

  const passed = subjectsWithMarks.filter(
    (s: any) => s.marksObtained !== null && s.marksObtained >= s.passMarks
  ).length
  const totalSubjects = subjectsWithMarks.filter((s: any) => s.marksObtained !== null).length

  const { data: allStudents } = await supabase
    .from('students')
    .select('id')
    .eq('school_id', schoolId)
    .eq('class_id', exam.class_id)
    .eq('is_active', true)

  let position = 0
  if (allStudents && allStudents.length > 0) {
    const studentIds = allStudents.map(s => s.id)

    const { data: allResults } = await supabase
      .from('results')
      .select('student_id, marks_obtained')
      .eq('exam_id', examId)
      .in('student_id', studentIds)

    if (allResults && allResults.length > 0) {
      const studentAverages = studentIds.map(sid => {
        const studentMarks = allResults.filter(r => r.student_id === sid)
        return {
          studentId: sid,
          avg: studentMarks.length > 0
            ? studentMarks.reduce((sum, r) => sum + Number(r.marks_obtained), 0) / studentMarks.length
            : 0,
        }
      })
      studentAverages.sort((a, b) => b.avg - a.avg)
      position = studentAverages.findIndex(s => s.studentId === studentId) + 1
    }
  }

  return {
    exam: { name: exam.name, type: exam.exam_type, start_date: exam.start_date, end_date: exam.end_date },
    term: exam.terms?.name ?? '',
    className: `${exam.classes?.name ?? ''} ${exam.classes?.level ?? ''}`.trim(),
    student: {
      name: `${(student.profiles as any).first_name} ${(student.profiles as any).last_name}`,
      admissionNumber: student.admission_number,
      section: (student.sections as any)?.name ?? '',
    },
    subjects: subjectsWithMarks,
    summary: {
      totalMarks,
      totalMaxMarks,
      average: Math.round(average * 100) / 100,
      percentage,
      overallGrade,
      passed,
      totalSubjects,
      position,
      totalStudents: allStudents?.length ?? 0,
    },
  }
}

export async function getQuestionsForExam(examId: string) {
  const { supabase, schoolId } = await getAuthContext()

  const { data: exam } = await supabase
    .from('exams')
    .select('exam_subjects(subject_id)')
    .eq('id', examId)
    .eq('school_id', schoolId)
    .single()

  if (!exam) throw new Error('Exam not found')

  const subjectIds = (exam.exam_subjects ?? []).map((es: any) => es.subject_id)

  if (subjectIds.length === 0) return []

  const { data, error } = await supabase
    .from('question_bank')
    .select('*')
    .eq('school_id', schoolId)
    .in('subject_id', subjectIds)
    .eq('is_active', true)

  if (error) throw new Error(error.message)
  return data ?? []
}

export async function getOnlineExamSession(examId: string) {
  const { supabase, schoolId, userId } = await getAuthContext()

  const { data, error } = await supabase
    .from('online_exam_sessions')
    .select('*')
    .eq('exam_id', examId)
    .eq('student_id', userId)
    .eq('school_id', schoolId)
    .maybeSingle()

  if (error) throw new Error(error.message)
  return data
}

export async function startOnlineExam(examId: string) {
  const { supabase, schoolId, userId } = await getAuthContext()

  const { data: existing } = await supabase
    .from('online_exam_sessions')
    .select('id')
    .eq('exam_id', examId)
    .eq('student_id', userId)

  if (existing && existing.length > 0) {
    return existing[0]
  }

  const { data, error } = await supabase
    .from('online_exam_sessions')
    .insert({
      school_id: schoolId,
      exam_id: examId,
      student_id: userId,
      started_at: new Date().toISOString(),
      answers: {},
      is_submitted: false,
    })
    .select('id')
    .single()

  if (error) throw new Error(error.message)
  return data
}

export async function saveAnswers(examId: string, answers: Record<string, string>) {
  const { supabase, schoolId, userId } = await getAuthContext()

  const { data: session } = await supabase
    .from('online_exam_sessions')
    .select('id, answers')
    .eq('exam_id', examId)
    .eq('student_id', userId)
    .eq('school_id', schoolId)
    .single()

  if (!session) throw new Error('Session not found')
  if (session.answers && typeof session.answers === 'object' && !Array.isArray(session.answers)) {
    Object.assign(session.answers, answers)
  } else {
    session.answers = answers
  }

  const { error } = await supabase
    .from('online_exam_sessions')
    .update({ answers: session.answers, updated_at: new Date().toISOString() })
    .eq('id', session.id)

  if (error) throw new Error(error.message)
}

export async function submitOnlineExam(examId: string) {
  const { supabase, schoolId, userId } = await getAuthContext()

  const { data: session } = await supabase
    .from('online_exam_sessions')
    .select('id, answers')
    .eq('exam_id', examId)
    .eq('student_id', userId)
    .eq('school_id', schoolId)
    .single()

  if (!session) throw new Error('Session not found')

  const { data: questions } = await supabase
    .from('question_bank')
    .select('*')
    .eq('school_id', schoolId)
    .in('id', Object.keys(session.answers ?? {}))

  let score = 0
  const answers = (session.answers ?? {}) as Record<string, string>

  for (const q of questions ?? []) {
    const studentAnswer = answers[q.id]
    if (studentAnswer && studentAnswer.toLowerCase().trim() === (q.correct_answer ?? '').toLowerCase().trim()) {
      score += q.marks
    }
  }

  const { error } = await supabase
    .from('online_exam_sessions')
    .update({
      submitted_at: new Date().toISOString(),
      is_submitted: true,
      score,
    })
    .eq('id', session.id)

  if (error) throw new Error(error.message)
  revalidatePath(`/student/exams/${examId}`)
}
