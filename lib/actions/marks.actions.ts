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

const BulkMarksEntrySchema = z.object({
  examId: z.string().min(1),
  entries: z.array(z.object({
    student_id: z.string().min(1),
    subject_id: z.string().min(1),
    marks_obtained: z.number().min(0),
  })).min(1),
})

export async function saveMarks(data: z.infer<typeof BulkMarksEntrySchema>) {
  const { supabase, schoolId, userId } = await getAuthContext()
  const parsed = BulkMarksEntrySchema.parse(data)

  const subjectIds = [...new Set(parsed.entries.map(e => e.subject_id))]

  const { data: examSubjects } = await supabase
    .from('exam_subjects')
    .select('subject_id, max_marks, pass_marks')
    .eq('exam_id', parsed.examId)
    .in('subject_id', subjectIds)
    .eq('school_id', schoolId)

  const subjectMap = new Map(examSubjects?.map(es => [es.subject_id, es]) ?? [])

  for (const entry of parsed.entries) {
    const subj = subjectMap.get(entry.subject_id)
    if (!subj) throw new Error(`Subject ${entry.subject_id} not found in exam`)

    const percentage = (entry.marks_obtained / subj.max_marks) * 100
    const grade = await computeGrade(percentage)

    const { error } = await supabase
      .from('results')
      .upsert({
        school_id: schoolId,
        exam_id: parsed.examId,
        subject_id: entry.subject_id,
        student_id: entry.student_id,
        marks_obtained: entry.marks_obtained,
        percentage,
        grade,
        entered_by: userId,
      }, { onConflict: 'student_id,exam_id,subject_id' })

    if (error) throw new Error(error.message)
  }

  revalidatePath(`/school-admin/exams/${parsed.examId}`)
  return { count: parsed.entries.length }
}

export async function getMarksForExam(examId: string, subjectId: string, classId?: string) {
  const { supabase, schoolId } = await getAuthContext()

  let query = supabase
    .from('students')
    .select('id, admission_number, profiles!inner(first_name, last_name)')
    .eq('school_id', schoolId)
    .eq('is_active', true)
    .order('admission_number')

  if (classId) query = query.eq('class_id', classId)

  const { data: students, error: studentsError } = await query
  if (studentsError) throw new Error(studentsError.message)

  const { data: examSubject } = await supabase
    .from('exam_subjects')
    .select('max_marks, pass_marks')
    .eq('exam_id', examId)
    .eq('subject_id', subjectId)
    .eq('school_id', schoolId)
    .single()

  const { data: results } = await supabase
    .from('results')
    .select('*')
    .eq('exam_id', examId)
    .eq('subject_id', subjectId)
    .eq('school_id', schoolId)

  return {
    students: students ?? [],
    results: results ?? [],
    maxMarks: examSubject?.max_marks ?? 100,
    passMarks: examSubject?.pass_marks ?? 40,
  }
}

export async function getAllMarksForExam(examId: string) {
  const { supabase, schoolId } = await getAuthContext()

  const { data: exam } = await supabase
    .from('exams')
    .select('class_id, name')
    .eq('id', examId)
    .eq('school_id', schoolId)
    .single()

  if (!exam) throw new Error('Exam not found')

  const { data: examSubjects } = await supabase
    .from('exam_subjects')
    .select('*, subjects(name, code)')
    .eq('exam_id', examId)
    .eq('school_id', schoolId)

  const { data: students } = await supabase
    .from('students')
    .select('id, admission_number, profiles!inner(first_name, last_name)')
    .eq('school_id', schoolId)
    .eq('class_id', exam.class_id)
    .eq('is_active', true)
    .order('admission_number')

  const { data: results } = await supabase
    .from('results')
    .select('*, subjects(name, code)')
    .eq('exam_id', examId)
    .eq('school_id', schoolId)

  const totalMaxMarks = examSubjects?.reduce((sum: number, es: any) => sum + es.max_marks, 0) ?? 0

  const studentRows = (students ?? []).map((s: any) => {
    const studentResults = (results ?? []).filter(r => r.student_id === s.id)
    const subjectMarks: Record<string, { marks: number | null; grade: string; maxMarks: number; passMarks: number }> = {}
    let totalObtained = 0
    let obtainedCount = 0

    for (const es of examSubjects ?? []) {
      const r = studentResults.find(sr => sr.subject_id === es.subject_id)
      const marks = r ? Number(r.marks_obtained) : null
      subjectMarks[es.subject_id] = {
        marks,
        grade: r?.grade ?? '',
        maxMarks: es.max_marks,
        passMarks: es.pass_marks,
      }
      if (marks !== null) {
        totalObtained += marks
        obtainedCount++
      }
    }

    const average = obtainedCount > 0 ? Math.round((totalObtained / obtainedCount) * 100) / 100 : 0
    const percentage = totalMaxMarks > 0 ? Math.round((totalObtained / totalMaxMarks) * 100) : 0
    const passed = Object.values(subjectMarks).filter(
      (sm: any) => sm.marks !== null && sm.marks >= sm.passMarks
    ).length

    return {
      studentId: s.id,
      name: `${s.profiles.first_name} ${s.profiles.last_name}`,
      admissionNumber: s.admission_number,
      subjectMarks,
      totalObtained,
      totalMaxMarks,
      average,
      percentage,
      overallGrade: await computeGrade(percentage),
      passed,
      totalSubjects: examSubjects?.length ?? 0,
    }
  })

  studentRows.sort((a: any, b: any) => b.percentage - a.percentage)

  const ranked = studentRows.map((row: any, index: number) => ({
    ...row,
    rank: index + 1,
  }))

  return {
    examName: exam.name,
    subjects: examSubjects ?? [],
    students: ranked,
    totalMaxMarks,
  }
}

export async function computeGrade(percentage: number): Promise<string> {
  if (percentage >= 80) return 'A'
  if (percentage >= 65) return 'B'
  if (percentage >= 50) return 'C'
  if (percentage >= 40) return 'D'
  return 'F'
}
