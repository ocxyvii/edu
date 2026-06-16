'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

async function getStudentInfo() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profile) throw new Error('Profile not found')

  const { data: student } = await supabase
    .from('students')
    .select('*')
    .eq('id', user.id)
    .maybeSingle()

  if (!student) throw new Error('Student record not found. Contact your school admin.')

  return {
    userId: user.id,
    schoolId: student.school_id,
    studentId: student.id,
    classId: student.class_id,
    sectionId: student.section_id,
    admissionNumber: student.admission_number,
    profile,
  }
}

// ── Dashboard ────────────────────────────────────────────────

export async function getStudentDashboard(): Promise<any> {
  const supabase = await createClient()
  const { studentId, classId, sectionId, schoolId } = await getStudentInfo()
  const { data: classInfo } = await supabase
    .from('classes')
    .select('name, level')
    .eq('id', classId)
    .single()
  const { data: sectionInfo } = sectionId
    ? await supabase.from('sections').select('name').eq('id', sectionId).single()
    : { data: null }

  const today = new Date().toISOString().split('T')[0]
  const dayName = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][new Date().getDay()]

  const [timetable, assignments, attendance, results, unreadMessages, invoices, announcements] = await Promise.all([
    supabase
      .from('timetable')
      .select('*, subjects(name, code), teachers!inner(profiles!inner(first_name, last_name))')
      .eq('school_id', schoolId)
      .eq('section_id', sectionId)
      .eq('day_of_week', dayName)
      .order('start_time'),

    supabase
      .from('assignments')
      .select('id, title, subject_id, subjects(name), due_date, max_marks')
      .eq('school_id', schoolId)
      .eq('class_id', classId)
      .or(`section_id.eq.${sectionId},section_id.is.null`)
      .gte('due_date', today)
      .order('due_date', { ascending: true })
      .limit(5),

    supabase
      .from('attendance')
      .select('date, status')
      .eq('student_id', studentId)
      .order('date', { ascending: false })
      .limit(30),

    supabase
      .from('results')
      .select('*, exams(name, type), subjects(name, code)')
      .eq('student_id', studentId)
      .eq('is_published', true)
      .order('created_at', { ascending: false })
      .limit(10),

    supabase
      .from('messages')
      .select('id, subject, content, sender_id, created_at, profiles!messages_sender_id_fkey(first_name, last_name)')
      .eq('school_id', schoolId)
      .eq('recipient_id', studentId)
      .eq('is_read', false)
      .order('created_at', { ascending: false })
      .limit(5),

    supabase
      .from('fee_invoices')
      .select('id, amount, paid_amount, balance, status, due_date, description')
      .eq('student_id', studentId)
      .eq('school_id', schoolId)
      .in('status', ['pending', 'partial', 'overdue'])
      .order('due_date', { ascending: true }),

    supabase
      .from('announcements')
      .select('id, title, content, created_at')
      .eq('school_id', schoolId)
      .eq('is_published', true)
      .lte('published_at', new Date().toISOString())
      .order('published_at', { ascending: false })
      .limit(5),
  ])

  const totalDays = attendance.data?.length ?? 1
  const presentDays = attendance.data?.filter(a => a.status === 'present').length ?? 0
  const attendancePercent = totalDays > 0 ? Math.round((presentDays / totalDays) * 100) : 0

  const avgMarks = results.data?.length
    ? results.data.reduce((sum, r) => sum + Number((r as any).marks_obtained), 0) / results.data.length
    : 0

  const totalFeeBalance = invoices.data?.reduce((sum, inv) => sum + Number(inv.balance), 0) ?? 0

  return {
    class: classInfo ?? null,
    section: sectionInfo ?? null,
    todayClasses: timetable.data ?? [],
    pendingAssignments: assignments.data ?? [],
    attendancePercent,
    avgMarks: Math.round(avgMarks * 10) / 10,
    totalDays,
    presentDays,
    recentResults: results.data ?? [],
    unreadMessages: unreadMessages.data ?? [],
    feeBalance: totalFeeBalance,
    announcements: announcements.data ?? [],
  }
}

// ── Timetable ────────────────────────────────────────────────

export async function getStudentTimetable(): Promise<any> {
  const supabase = await createClient()
  const { sectionId, schoolId } = await getStudentInfo()

  const { data } = await supabase
    .from('timetable')
    .select('*, subjects(name, code), teachers!inner(profiles!inner(first_name, last_name))')
    .eq('school_id', schoolId)
    .eq('section_id', sectionId)
    .order('day_of_week')
    .order('start_time')

  return data ?? []
}

// ── Assignments ──────────────────────────────────────────────

export async function getStudentAssignments(): Promise<any> {
  const supabase = await createClient()
  const { classId, sectionId, schoolId, studentId } = await getStudentInfo()

  const { data: submissions } = await supabase
    .from('submissions')
    .select('assignment_id, status, marks, feedback, content, attachments, submitted_at')
    .eq('student_id', studentId)

  const submittedIds = new Set(submissions?.map(s => s.assignment_id) ?? [])
  const submissionMap = new Map(submissions?.map(s => [s.assignment_id, s]) ?? [])

  const { data: assignments } = await supabase
    .from('assignments')
    .select('*, subjects(name)')
    .eq('school_id', schoolId)
    .eq('class_id', classId)
    .or(`section_id.eq.${sectionId},section_id.is.null`)
    .order('due_date', { ascending: false })

  return (assignments ?? []).map(a => ({
    ...a,
    isSubmitted: submittedIds.has(a.id),
    submission: submissionMap.get(a.id) ?? null,
  }))
}

export async function submitAssignment(data: {
  assignmentId: string
  content?: string
  attachments?: { name: string; url: string; type: string }[]
}) {
  const supabase = await createClient()
  const { studentId, schoolId } = await getStudentInfo()

  const { error } = await supabase.from('submissions').upsert({
    assignment_id: data.assignmentId,
    student_id: studentId,
    school_id: schoolId,
    content: data.content ?? null,
    attachments: data.attachments ?? [],
    status: 'submitted',
    submitted_at: new Date().toISOString(),
  }, { onConflict: 'assignment_id,student_id' })

  if (error) throw new Error(error.message)
  revalidatePath('/student/assignments')
}

// ── Attendance ───────────────────────────────────────────────

export async function getStudentAttendance(): Promise<any> {
  const supabase = await createClient()
  const { studentId, schoolId } = await getStudentInfo()

  const { data } = await supabase
    .from('attendance')
    .select('date, status')
    .eq('student_id', studentId)
    .eq('school_id', schoolId)
    .order('date', { ascending: false })
    .limit(90)

  const stats = {
    total: data?.length ?? 0,
    present: data?.filter(a => a.status === 'present').length ?? 0,
    absent: data?.filter(a => a.status === 'absent').length ?? 0,
    late: data?.filter(a => a.status === 'late').length ?? 0,
    excused: data?.filter(a => a.status === 'excused').length ?? 0,
    percentage: data?.length
      ? Math.round((data.filter(a => a.status === 'present').length / data.length) * 100)
      : 0,
  }

  return { records: data ?? [], stats }
}

// ── Exams ────────────────────────────────────────────────────

export async function getStudentExams(): Promise<any> {
  const supabase = await createClient()
  const { classId, schoolId } = await getStudentInfo()

  const { data } = await supabase
    .from('exams')
    .select('*, classes(name, level), terms(name), exam_subjects(*, subjects(name, code))')
    .eq('school_id', schoolId)
    .eq('class_id', classId)
    .order('start_date', { ascending: false })

  return data ?? []
}

// ── Results ──────────────────────────────────────────────────

export async function getStudentResults(): Promise<any> {
  const supabase = await createClient()
  const { studentId } = await getStudentInfo()

  const { data } = await supabase
    .from('results')
    .select('*, exams(name, type, classes(name)), subjects(name, code)')
    .eq('student_id', studentId)
    .eq('is_published', true)
    .order('created_at', { ascending: false })

  return data ?? []
}

// ── Fees ─────────────────────────────────────────────────────

export async function getStudentFees(): Promise<any> {
  const supabase = await createClient()
  const { studentId, schoolId } = await getStudentInfo()

  const { data: invoices } = await supabase
    .from('fee_invoices')
    .select('*, fee_structures(name, fee_type, description)')
    .eq('student_id', studentId)
    .eq('school_id', schoolId)
    .order('due_date', { ascending: false })

  const invoiceIds = invoices?.map(inv => inv.id) ?? []

  const [paymentsResult, scholarshipsResult] = await Promise.all([
    invoiceIds.length > 0
      ? supabase
          .from('payments')
          .select('*, invoice:invoice_id(invoice_number)')
          .eq('school_id', schoolId)
          .in('invoice_id', invoiceIds)
          .order('paid_at', { ascending: false })
      : { data: [] as any[] },
    supabase
      .from('scholarships')
      .select('*')
      .eq('student_id', studentId)
      .eq('school_id', schoolId),
  ])

  const payments = paymentsResult.data ?? []
  const scholarships = scholarshipsResult.data ?? []

  const totalBilled = invoices?.reduce((s, i) => s + Number(i.amount), 0) ?? 0
  const totalPaid = invoices?.reduce((s, i) => s + Number(i.paid_amount), 0) ?? 0
  const totalBalance = invoices?.reduce((s, i) => s + Number(i.balance), 0) ?? 0
  const scholarshipPercent = scholarships.reduce((s, sc) => s + Number(sc.percentage), 0)
  const overdueInvoices = invoices?.filter(
    i => i.status === 'overdue' || (i.status === 'pending' && i.due_date && new Date(i.due_date) < new Date())
  ) ?? []

  return {
    invoices: invoices ?? [],
    payments,
    scholarships,
    summary: { totalBilled, totalPaid, totalBalance, scholarshipPercent },
    arrears: {
      count: overdueInvoices.length,
      total: overdueInvoices.reduce((s, i) => s + Number(i.balance), 0),
      invoices: overdueInvoices,
    },
  }
}

export async function getStudentPaymentReceipt(paymentId: string): Promise<any> {
  const supabase = await createClient()
  const { studentId, schoolId } = await getStudentInfo()

  const { data: payment, error: payError } = await supabase
    .from('payments')
    .select('*')
    .eq('id', paymentId)
    .eq('school_id', schoolId)
    .eq('student_id', studentId)
    .single()
  if (payError || !payment) throw new Error('Payment not found')

  const { data: invoice } = await supabase
    .from('fee_invoices')
    .select('*, fee_structures(*), students!inner(admission_number, profiles!inner(first_name, last_name, phone))')
    .eq('id', payment.invoice_id)
    .eq('school_id', schoolId)
    .single()

  const { data: school } = await supabase
    .from('schools')
    .select('name, address, phone, email, logo_url')
    .eq('id', schoolId)
    .single()

  return { payment: { ...payment, invoice }, school }
}

// ── Profile ──────────────────────────────────────────────────

export async function getStudentProfile(): Promise<any> {
  const supabase = await createClient()
  const { userId } = await getStudentInfo()

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()

  return { profile }
}

export async function updateStudentProfile(data: {
  phone?: string
  avatar_url?: string
}) {
  const supabase = await createClient()
  const { userId } = await getStudentInfo()

  const updateData: any = {}
  if (data.phone !== undefined) updateData.phone = data.phone
  if (data.avatar_url !== undefined) updateData.avatar_url = data.avatar_url

  const { error } = await supabase
    .from('profiles')
    .update(updateData)
    .eq('id', userId)

  if (error) throw new Error(error.message)
  revalidatePath('/student/profile')
}

export async function changeStudentPassword(currentPassword: string, newPassword: string) {
  const supabase = await createClient()
  const { error } = await supabase.auth.updateUser({
    password: newPassword,
  })
  if (error) throw new Error(error.message)
}

// ── Materials ───────────────────────────────────────────────

export async function getStudentMaterials(): Promise<any> {
  const supabase = await createClient()
  const { schoolId, classId } = await getStudentInfo()

  const { data: courses } = await supabase
    .from('courses')
    .select('id, title, subject_id, subjects!inner(name, code), classes(name, level)')
    .eq('school_id', schoolId)
    .eq('class_id', classId)
    .eq('is_published', true)
    .order('created_at', { ascending: false })

  const courseIds = courses?.map(c => c.id) ?? []

  if (!courseIds.length) return { courses: [], materials: [] }

  const { data: materials } = await supabase
    .from('course_materials')
    .select('*')
    .in('course_id', courseIds)
    .eq('is_published', true)
    .order('created_at', { ascending: false })

  return { courses: courses ?? [], materials: materials ?? [] }
}

// ── Messages ─────────────────────────────────────────────────

export async function getStudentMessages(): Promise<any> {
  const supabase = await createClient()
  const { studentId, schoolId } = await getStudentInfo()

  const { data: received } = await supabase
    .from('messages')
    .select('*, profiles!messages_sender_id_fkey(first_name, last_name, avatar_url)')
    .eq('school_id', schoolId)
    .eq('recipient_id', studentId)
    .order('created_at', { ascending: false })
    .limit(50)

  return { received: received ?? [] }
}

export async function markMessageRead(messageId: string) {
  const supabase = await createClient()
  const { studentId } = await getStudentInfo()
  await supabase
    .from('messages')
    .update({ is_read: true, read_at: new Date().toISOString() })
    .eq('id', messageId)
    .eq('recipient_id', studentId)
}

export async function getUnreadMessageCount(): Promise<any> {
  const supabase = await createClient()
  const { studentId, schoolId } = await getStudentInfo()
  const { count } = await supabase
    .from('messages')
    .select('*', { count: 'exact', head: true })
    .eq('school_id', schoolId)
    .eq('recipient_id', studentId)
    .eq('is_read', false)
  return count ?? 0
}

// ── Parent-sent queries (for students messaging parents) ─────

export async function getStudentParents(): Promise<any> {
  const supabase = await createClient()
  const { studentId, schoolId } = await getStudentInfo()

  const { data } = await supabase
    .from('parent_student')
    .select('parent_id, profiles!parent_student_parent_id_fkey(first_name, last_name)')
    .eq('student_id', studentId)
    .eq('school_id', schoolId)

  return data ?? []
}

export async function sendMessage(data: { recipient_id: string; subject?: string; content: string }) {
  const supabase = await createClient()
  const { userId, schoolId } = await getStudentInfo()

  const { error } = await supabase.from('messages').insert({
    school_id: schoolId,
    sender_id: userId,
    recipient_id: data.recipient_id,
    subject: data.subject ?? null,
    content: data.content,
  })
  if (error) throw new Error(error.message)
  revalidatePath('/student/messages')
}
