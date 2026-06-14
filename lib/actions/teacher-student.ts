'use server'

import { createClient, createServiceClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

async function getTeacherContext() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  const { data: profile } = await supabase
    .from('profiles')
    .select('school_id, first_name, last_name')
    .eq('id', user.id)
    .single()
  if (!profile?.school_id) throw new Error('No school assigned')
  return { userId: user.id, schoolId: profile.school_id, supabase }
}

// ── Section roster ──────────────────────────────────────────

export async function getSectionRoster(sectionId: string) {
  const { supabase, schoolId } = await getTeacherContext()

  const { data: section } = await supabase
    .from('sections')
    .select('id, name, room, capacity, class_teacher_id, class_id, classes!inner(id, name, level, academic_years!inner(name, is_current))')
    .eq('id', sectionId)
    .eq('school_id', schoolId)
    .single()

  const classId = (section.classes as any)?.id ?? section.class_id

  // Fetch students assigned to this section
  const { data: sectionStudents } = await supabase
    .from('students')
    .select(`
      id, admission_number, enrollment_date, is_active, class_id, section_id,
      profiles!inner(id, first_name, last_name, avatar_url, gender, date_of_birth, email, phone)
    `)
    .eq('school_id', schoolId)
    .eq('section_id', sectionId)
    .eq('is_active', true)
    .order('admission_number')

  // ALSO fetch students who belong to this class but have no section (orphaned)
  const { data: classOnlyStudents } = classId
    ? await supabase
        .from('students')
        .select(`
          id, admission_number, enrollment_date, is_active, class_id, section_id,
          profiles!inner(id, first_name, last_name, avatar_url, gender, date_of_birth, email, phone)
        `)
        .eq('school_id', schoolId)
        .eq('class_id', classId)
        .is('section_id', null)
        .eq('is_active', true)
        .order('admission_number')
    : { data: [] }

  // Merge and deduplicate by student id
  const allStudents = [
    ...(sectionStudents ?? []),
    ...(classOnlyStudents ?? []),
  ]
  const uniqueStudents = Array.from(
    new Map(allStudents.map(s => [s.id, s])).values()
  )

  // Enrich with today's attendance status
  const today = new Date().toISOString().split('T')[0]
  const { data: todayAttendance } = await supabase
    .from('attendance')
    .select('student_id, status')
    .eq('school_id', schoolId)
    .eq('section_id', sectionId)
    .eq('date', today)

  const todayMap = new Map((todayAttendance ?? []).map(a => [a.student_id, a.status]))

  // Enrich with per-student attendance percentage
  const studentIds = uniqueStudents.map(s => s.id)
  const { data: allAttendance } = studentIds.length > 0
    ? await supabase.from('attendance').select('student_id, status').in('student_id', studentIds)
    : { data: [] }

  const studentAttMap = new Map<string, { total: number; present: number }>()
  allAttendance?.forEach((a: any) => {
    if (!studentAttMap.has(a.student_id)) {
      studentAttMap.set(a.student_id, { total: 0, present: 0 })
    }
    const entry = studentAttMap.get(a.student_id)!
    entry.total++
    if (a.status === 'present') entry.present++
  })

  const enriched = uniqueStudents.map(s => {
    const att = studentAttMap.get(s.id)
    const total = att?.total ?? 0
    const present = att?.present ?? 0
    return {
      ...s,
      todayStatus: todayMap.get(s.id) ?? 'not_marked',
      attendancePercent: total > 0 ? Math.round((present / total) * 100) : null,
      totalDays: total,
      presentDays: present,
    }
  })

  return { section, students: enriched }
}

// ── Student detail ──────────────────────────────────────────

export async function getStudentDetail(studentId: string) {
  const { supabase, schoolId } = await getTeacherContext()

  const { data: student } = await supabase
    .from('students')
    .select(`
      id, admission_number, enrollment_date, is_active,
      profiles!inner(*),
      classes!inner(id, name, level),
      sections!inner(id, name, room)
    `)
    .eq('id', studentId)
    .eq('school_id', schoolId)
    .single()

  if (!student) throw new Error('Student not found')

  // Attendance stats (current month)
  const monthStart = new Date()
  monthStart.setDate(1)
  const monthStr = monthStart.toISOString().split('T')[0]

  const { data: attendance } = await supabase
    .from('attendance')
    .select('date, status')
    .eq('school_id', schoolId)
    .eq('student_id', studentId)
    .gte('date', monthStr)
    .order('date', { ascending: false })
    .limit(60)

  const totalMarked = attendance?.length ?? 0
  const present = attendance?.filter(a => a.status === 'present').length ?? 0
  const absent = attendance?.filter(a => a.status === 'absent').length ?? 0
  const late = attendance?.filter(a => a.status === 'late').length ?? 0

  // Recent results
  const { data: results } = await supabase
    .from('results')
    .select('*, exams(name, exam_type), subjects(name, code)')
    .eq('school_id', schoolId)
    .eq('student_id', studentId)
    .order('created_at', { ascending: false })
    .limit(10)

  // Fee summary
  const { data: invoices } = await supabase
    .from('fee_invoices')
    .select('amount, paid_amount, balance, status')
    .eq('school_id', schoolId)
    .eq('student_id', studentId)

  const totalFees = invoices?.reduce((s, i) => s + Number(i.amount), 0) ?? 0
  const paidFees = invoices?.reduce((s, i) => s + Number(i.paid_amount), 0) ?? 0
  const outstandingFees = invoices?.reduce((s, i) => s + Number(i.balance), 0) ?? 0

  return {
    student,
    attendance: { totalMarked, present, absent, late, percentage: totalMarked > 0 ? Math.round((present / totalMarked) * 100) : 0 },
    results: results ?? [],
    fees: { totalFees, paidFees, outstandingFees },
  }
}

// ── Teacher notes ───────────────────────────────────────────

const AddNoteSchema = z.object({
  studentId: z.string().uuid(),
  content: z.string().min(1, 'Note cannot be empty'),
  is_private: z.boolean().default(true),
})

export async function addTeacherNote(data: z.infer<typeof AddNoteSchema>) {
  const { supabase, userId, schoolId } = await getTeacherContext()
  const parsed = AddNoteSchema.parse(data)

  const { error } = await supabase.from('teacher_student_notes').insert({
    school_id: schoolId,
    teacher_id: userId,
    student_id: parsed.studentId,
    content: parsed.content,
    is_private: parsed.is_private,
  })
  if (error) throw new Error(error.message)
  revalidatePath(`/teacher/classes`)
}

export async function getTeacherNotes(studentId: string) {
  const { supabase, userId } = await getTeacherContext()

  const { data } = await supabase
    .from('teacher_student_notes')
    .select('*')
    .eq('teacher_id', userId)
    .eq('student_id', studentId)
    .order('created_at', { ascending: false })

  return data ?? []
}

export async function deleteTeacherNote(noteId: string) {
  const { supabase, userId } = await getTeacherContext()
  const { error } = await supabase
    .from('teacher_student_notes')
    .delete()
    .eq('id', noteId)
    .eq('teacher_id', userId)
  if (error) throw new Error(error.message)
  revalidatePath(`/teacher/classes`)
}

// ── Attendance history for a student ────────────────────────

export async function getStudentAttendanceHistory(studentId: string, months = 3) {
  const { supabase, schoolId } = await getTeacherContext()

  const startDate = new Date()
  startDate.setMonth(startDate.getMonth() - months)

  const { data } = await supabase
    .from('attendance')
    .select('date, status')
    .eq('school_id', schoolId)
    .eq('student_id', studentId)
    .gte('date', startDate.toISOString().split('T')[0])
    .order('date', { ascending: false })

  return data ?? []
}

// ── Notify class teacher when new student enrolled ──────────

export async function notifyClassTeacherEnrollment(params: {
  sectionId: string
  studentName: string
  admissionNumber: string
  className: string
}) {
  const { supabase, schoolId } = await getTeacherContext()

  // Find the class teacher for this section
  const { data: section } = await supabase
    .from('sections')
    .select('class_teacher_id, classes!inner(name)')
    .eq('id', params.sectionId)
    .eq('school_id', schoolId)
    .single()

  if (!section?.class_teacher_id) return // no class teacher assigned

  // Create notification using service client (may need to bypass RLS)
  const serviceClient = createServiceClient()
  await serviceClient.from('notifications').insert({
    school_id: schoolId,
    user_id: section.class_teacher_id,
    title: 'New Student Enrolled',
    body: `${params.studentName} (${params.admissionNumber}) has been enrolled in ${params.className} - ${section.classes?.name}`,
    type: 'info',
    action_url: `/teacher/my-classes/${params.sectionId}`,
    metadata: { section_id: params.sectionId, type: 'enrollment' },
  })
}
