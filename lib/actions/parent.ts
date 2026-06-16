'use server'

import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

async function getParentContext() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*, parents!inner(*)')
    .eq('id', user.id)
    .single()

  if (!profile) throw new Error('Profile not found')
  return {
    userId: user.id,
    schoolId: (profile as any).parents?.school_id!,
    parentId: profile.id,
    profile,
    supabase,
  }
}

// ── Verify parent owns a child via parent_student ──

async function verifyChildOwnership(studentId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data: link } = await supabase
    .from('parent_student')
    .select('student_id, relationship')
    .eq('parent_id', user.id)
    .eq('student_id', studentId)
    .single()

  if (!link) throw new Error('Access denied: this student is not linked to your account')
  return link
}

// ── Dashboard ──────────────────────────────────────────────

export async function getParentDashboard(): Promise<any> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*, parents!inner(*)')
    .eq('id', user.id)
    .single()

  if (!profile) throw new Error('Parent profile not found')
  const schoolId = (profile as any).parents?.school_id!

  // Get children via parent_student
  const { data: childLinks } = await supabase
    .from('parent_student')
    .select(`
      student_id,
      relationship,
      is_primary,
      students (
        id,
        admission_number,
        enrollment_date,
        is_active,
        class_id,
        section_id,
        classes ( id, name, level, academic_years ( name, is_current ) ),
        sections ( id, name ),
        profiles!students_id_fkey ( id, first_name, last_name, avatar_url, gender, date_of_birth )
      )
    `)
    .eq('parent_id', user.id)

  const children = childLinks?.map(l => (l as any).students).filter(Boolean) ?? []
  const studentIds = children.map((c: any) => c.id)

  // Fetch data for all children in parallel
  const [attendanceRes, resultsRes, invoicesRes, messagesRes, announcementsRes] = await Promise.all([
    studentIds.length > 0
      ? supabase.from('attendance').select('student_id, date, status').in('student_id', studentIds).order('date', { ascending: false }).limit(500)
      : { data: [] },

    studentIds.length > 0
      ? supabase.from('results').select('*, subjects!inner(name, code), exams!inner(name, exam_type)').in('student_id', studentIds).eq('is_published', true).order('created_at', { ascending: false }).limit(50)
      : { data: [] },

    studentIds.length > 0
      ? supabase.from('fee_invoices').select('*, fee_structures(name, fee_type)').in('student_id', studentIds).neq('status', 'cancelled').order('due_date', { ascending: false })
      : { data: [] },

    supabase.from('messages').select('id, subject, content, created_at, sender_id, profiles!messages_sender_id_fkey(first_name, last_name, avatar_url)').eq('recipient_id', user.id).eq('is_read', false).order('created_at', { ascending: false }).limit(10),

    supabase.from('announcements').select('id, title, content, created_at').eq('school_id', schoolId).eq('is_published', true).contains('target_roles', ['parent']).order('created_at', { ascending: false }).limit(5),
  ])

  const attendanceData = attendanceRes.data ?? []
  const results = resultsRes.data ?? []
  const invoices = invoicesRes.data ?? []
  const unreadMessages = messagesRes.data ?? []
  const announcements = announcementsRes.data ?? []

  // Compute per-child stats
  const childrenWithStats = children.map((child: any) => {
    const ca = attendanceData.filter((a: any) => a.student_id === child.id)
    const present = ca.filter((a: any) => a.status === 'present').length
    const absent = ca.filter((a: any) => a.status === 'absent').length
    const late = ca.filter((a: any) => a.status === 'late').length
    const total = ca.length

    const cr = results.filter((r: any) => r.student_id === child.id)
    const ci = invoices.filter((i: any) => i.student_id === child.id)
    const balance = ci.reduce((s: number, i: any) => s + Number(i.balance), 0)

    // Today's attendance
    const today = new Date().toISOString().split('T')[0]
    const todayAtt = ca.find((a: any) => a.date === today)

    return {
      ...child,
      attendanceStats: {
        total, present, absent, late,
        percentage: total > 0 ? Math.round((present / total) * 100) : 0,
        todayStatus: todayAtt?.status ?? 'not_marked',
      },
      resultCount: cr.length,
      feeBalance: balance,
    }
  })

  return {
    parent: profile,
    children: childrenWithStats,
    hasChildren: childrenWithStats.length > 0,
    results,
    invoices,
    unreadMessages,
    announcements,
  }
}

// ── Child Attendance ───────────────────────────────────────

export async function getChildAttendance(studentId: string, month?: number, year?: number): Promise<any> {
  const { supabase } = await getParentContext()
  await verifyChildOwnership(studentId)

  const targetMonth = month ?? new Date().getMonth() + 1
  const targetYear = year ?? new Date().getFullYear()
  const startDate = `${targetYear}-${String(targetMonth).padStart(2, '0')}-01`
  const endDate = new Date(targetYear, targetMonth, 0).toISOString().split('T')[0]

  const { data: attendance } = await supabase
    .from('attendance')
    .select('id, date, status, notes')
    .eq('student_id', studentId)
    .gte('date', startDate)
    .lte('date', endDate)
    .order('date', { ascending: true })

  const summary = {
    total: attendance?.length ?? 0,
    present: attendance?.filter(a => a.status === 'present').length ?? 0,
    absent: attendance?.filter(a => a.status === 'absent').length ?? 0,
    late: attendance?.filter(a => a.status === 'late').length ?? 0,
    excused: attendance?.filter(a => a.status === 'excused').length ?? 0,
  }

  return {
    attendance: attendance ?? [],
    summary,
    percentage: summary.total > 0 ? Math.round((summary.present / summary.total) * 100) : 0,
  }
}

// ── Child Results ──────────────────────────────────────────

export async function getChildResults(studentId: string): Promise<any> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  await verifyChildOwnership(studentId)

  const { data } = await supabase
    .from('results')
    .select(`
      id, marks_obtained, percentage, grade, remarks, created_at,
      subjects ( id, name, code ),
      exams ( id, name, exam_type, total_marks, pass_marks, terms ( name ), academic_years ( name ) )
    `)
    .eq('student_id', studentId)
    .eq('is_published', true)
    .order('created_at', { ascending: false })

  return data ?? []
}

// ── Child Fees ─────────────────────────────────────────────

export async function getChildFees(studentId: string): Promise<any> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  await verifyChildOwnership(studentId)

  const { data: invoices } = await supabase
    .from('fee_invoices')
    .select(`
      id, invoice_number, amount, discount, paid_amount, balance, status, due_date, description, created_at,
      fee_structures ( name, fee_type )
    `)
    .eq('student_id', studentId)
    .order('created_at', { ascending: false })

  const invoiceIds = invoices?.map(i => i.id) ?? []

  const { data: payments } = invoiceIds.length > 0
    ? await supabase
        .from('payments')
        .select(`
          id, amount, payment_method, transaction_ref, receipt_number, paid_at,
          fee_invoices ( invoice_number, description )
        `)
        .in('invoice_id', invoiceIds)
        .order('paid_at', { ascending: false })
    : { data: [] }

  return {
    invoices: invoices ?? [],
    payments: payments ?? [],
    summary: {
      totalBilled: invoices?.reduce((s, i) => s + Number(i.amount), 0) ?? 0,
      totalPaid: invoices?.reduce((s, i) => s + Number(i.paid_amount), 0) ?? 0,
      totalBalance: invoices?.reduce((s, i) => s + Number(i.balance), 0) ?? 0,
      overdueCount: invoices?.filter(i => i.status === 'overdue').length ?? 0,
    },
  }
}

// ── Child Assignments ──────────────────────────────────────

export async function getChildAssignments(studentId: string, filterStatus?: string): Promise<any> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  const link = await verifyChildOwnership(studentId)

  // Get the child's class_id and section_id
  const { data: student } = await supabase
    .from('students')
    .select('class_id, section_id')
    .eq('id', studentId)
    .single()

  if (!student) throw new Error('Student not found')

  let query = supabase
    .from('assignments')
    .select('*, subjects(name, code), sections(name)')
    .eq('class_id', student.class_id)
    .order('due_date', { ascending: false })

  if (student.section_id) {
    query = query.or(`section_id.eq.${student.section_id},section_id.is.null`)
  }

  const { data: assignments } = await query

  // Get submissions for this student
  const assignmentIds = assignments?.map(a => a.id) ?? []
  const { data: submissions } = assignmentIds.length > 0
    ? await supabase
        .from('submissions')
        .select('*')
        .eq('student_id', studentId)
        .in('assignment_id', assignmentIds)
    : { data: [] }

  const submissionMap = new Map(submissions?.map(s => [s.assignment_id, s]) ?? [])

  const enriched = assignments?.map(a => ({
    ...a,
    submission: submissionMap.get(a.id) ?? null,
  })) ?? []

  if (filterStatus === 'pending') return enriched.filter(a => !a.submission)
  if (filterStatus === 'submitted') return enriched.filter(a => a.submission && a.submission.status === 'submitted')
  if (filterStatus === 'graded') return enriched.filter(a => a.submission && a.submission.status === 'graded')

  return enriched
}

// ── Child Teachers ─────────────────────────────────────────

export async function getChildTeachers(studentId: string): Promise<any> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  await verifyChildOwnership(studentId)

  const { data: student } = await supabase
    .from('students')
    .select('section_id')
    .eq('id', studentId)
    .single()

  if (!student?.section_id) return []

  const { data: teachers } = await supabase
    .from('teacher_subjects')
    .select(`
      teachers!inner (
        id,
        department,
        profiles!inner ( first_name, last_name, avatar_url, email )
      ),
      subjects!inner ( name, code )
    `)
    .eq('section_id', student.section_id)

  const unique = new Map()
  teachers?.forEach((t: any) => {
    if (t.teachers && !unique.has(t.teachers.id)) {
      unique.set(t.teachers.id, {
        id: t.teachers.id,
        firstName: t.teachers.profiles?.first_name ?? '',
        lastName: t.teachers.profiles?.last_name ?? '',
        avatarUrl: t.teachers.profiles?.avatar_url ?? null,
        email: t.teachers.profiles?.email ?? '',
        department: t.teachers.department ?? '',
        subjects: teachers
          .filter((x: any) => x.teachers?.id === t.teachers.id)
          .map((x: any) => x.subjects?.name)
          .filter(Boolean),
      })
    }
  })

  return Array.from(unique.values())
}

// ── Child Detail ───────────────────────────────────────────

export async function getChildDetail(studentId: string): Promise<any> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  await verifyChildOwnership(studentId)

  const { data: student } = await supabase
    .from('students')
    .select(`
      id, admission_number, enrollment_date, is_active, class_id, section_id,
      classes ( id, name ),
      sections ( id, name ),
      profiles!students_id_fkey ( id, first_name, last_name, avatar_url, gender, date_of_birth, email, phone )
    `)
    .eq('id', studentId)
    .single()

  if (!student) throw new Error('Student not found')

  const { data: attendance } = await supabase
    .from('attendance')
    .select('status')
    .eq('student_id', studentId)

  const present = attendance?.filter(a => a.status === 'present').length ?? 0
  const absent = attendance?.filter(a => a.status === 'absent').length ?? 0
  const late = attendance?.filter(a => a.status === 'late').length ?? 0
  const total = attendance?.length ?? 0

  const { data: results } = await supabase
    .from('results')
    .select('id')
    .eq('student_id', studentId)
    .eq('is_published', true)

  return {
    student,
    attendanceStats: {
      percentage: total > 0 ? Math.round((present / total) * 100) : 0,
      present, absent, late,
    },
    results: results ?? [],
  }
}

// ── Parent Fees (all children) ─────────────────────────────

export async function getParentFees(): Promise<any> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data: childLinks } = await supabase
    .from('parent_student')
    .select(`
      student_id,
      students (
        id, admission_number,
        profiles!students_id_fkey ( first_name, last_name )
      )
    `)
    .eq('parent_id', user.id)

  const studentIds = childLinks?.map(l => (l as any).student_id).filter(Boolean) ?? []

  if (studentIds.length === 0) {
    return { invoices: [], payments: [], children: childLinks ?? [] }
  }

  const { data: invoices } = await supabase
    .from('fee_invoices')
    .select(`
      id, student_id, invoice_number, amount, discount, paid_amount, balance, status, due_date, description, created_at,
      fee_structures ( name, fee_type )
    `)
    .in('student_id', studentIds)
    .neq('status', 'cancelled')
    .order('created_at', { ascending: false })

  const invoiceIds = invoices?.map(i => i.id) ?? []

  const { data: payments } = invoiceIds.length > 0
    ? await supabase
        .from('payments')
        .select(`
          id, invoice_id, student_id, amount, payment_method, transaction_ref, receipt_number, paid_at,
          fee_invoices ( invoice_number, description )
        `)
        .in('invoice_id', invoiceIds)
        .order('paid_at', { ascending: false })
    : { data: [] }

  return {
    invoices: invoices ?? [],
    payments: payments ?? [],
    children: childLinks ?? [],
  }
}

// ── Process Payment ────────────────────────────────────────

export async function processPayment(data: {
  invoice_id: string
  student_id: string
  amount: number
  payment_method: string
  transaction_ref?: string
}) {
  const supabase = await createClient()
  const { userId, schoolId } = await getParentContext()
  await verifyChildOwnership(data.student_id)

  const { error } = await supabase.from('payments').insert({
    invoice_id: data.invoice_id,
    student_id: data.student_id,
    amount: data.amount,
    payment_method: data.payment_method,
    transaction_ref: data.transaction_ref ?? null,
    school_id: schoolId,
    recorded_by: userId,
    paid_at: new Date().toISOString(),
  })

  if (error) throw new Error(error.message)

  // Update invoice paid_amount and status
  const { data: invoice } = await supabase
    .from('fee_invoices')
    .select('amount, paid_amount')
    .eq('id', data.invoice_id)
    .single()

  if (invoice) {
    const newPaid = Number(invoice.paid_amount) + data.amount
    const newStatus = newPaid >= Number(invoice.amount) ? 'paid' : 'partial'

    await supabase
      .from('fee_invoices')
      .update({ paid_amount: newPaid, status: newStatus })
      .eq('id', data.invoice_id)
  }

  revalidatePath('/parent/fees')
  return { success: true }
}

// ── Parent Teachers (all children) ─────────────────────────

export async function getParentTeachers(): Promise<any> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data: childLinks } = await supabase
    .from('parent_student')
    .select('student_id')
    .eq('parent_id', user.id)

  const studentIds = childLinks?.map(l => l.student_id).filter(Boolean) ?? []

  if (studentIds.length === 0) return []

  const { data: students } = await supabase
    .from('students')
    .select('section_id')
    .in('id', studentIds)

  const sectionIds = [...new Set(students?.map(s => s.section_id).filter(Boolean) ?? [])]

  if (sectionIds.length === 0) return []

  const { data: teacherSubjects } = await supabase
    .from('teacher_subjects')
    .select(`
      teachers!inner (
        id,
        profiles!inner ( first_name, last_name, avatar_url )
      ),
      subjects!inner ( name )
    `)
    .in('section_id', sectionIds)

  const unique = new Map()
  teacherSubjects?.forEach((t: any) => {
    if (t.teachers && !unique.has(t.teachers.id)) {
      unique.set(t.teachers.id, {
        id: t.teachers.id,
        name: `${t.teachers.profiles?.first_name ?? ''} ${t.teachers.profiles?.last_name ?? ''}`.trim(),
        subject: t.subjects?.name ?? '',
      })
    }
  })

  return Array.from(unique.values())
}

// ── Send Message ───────────────────────────────────────────

export async function sendParentMessage(data: { recipient_id: string; subject?: string; content: string }) {
  const supabase = await createClient()
  const { userId, schoolId } = await getParentContext()

  const { error } = await supabase.from('messages').insert({
    school_id: schoolId,
    sender_id: userId,
    recipient_id: data.recipient_id,
    subject: data.subject ?? null,
    content: data.content,
  })
  if (error) throw new Error(error.message)
  revalidatePath('/parent/messages')
}

// ── Messages ───────────────────────────────────────────────

export async function getParentMessages(): Promise<any> {
  const supabase = await createClient()
  const { userId, schoolId } = await getParentContext()

  const { data: received } = await supabase
    .from('messages')
    .select('*, profiles!messages_sender_id_fkey(first_name, last_name, avatar_url)')
    .eq('school_id', schoolId)
    .eq('recipient_id', userId)
    .order('created_at', { ascending: false })
    .limit(50)

  const { data: sent } = await supabase
    .from('messages')
    .select('*, profiles!messages_recipient_id_fkey(first_name, last_name, avatar_url)')
    .eq('school_id', schoolId)
    .eq('sender_id', userId)
    .order('created_at', { ascending: false })
    .limit(50)

  return { received: received ?? [], sent: sent ?? [] }
}

export async function markParentMessageRead(messageId: string) {
  const supabase = await createClient()
  const { userId } = await getParentContext()

  const { error } = await supabase
    .from('messages')
    .update({ is_read: true, read_at: new Date().toISOString() })
    .eq('id', messageId)
    .eq('recipient_id', userId)
  if (error) throw new Error(error.message)
}

export async function getUnreadMessageCount() {
  const supabase = await createClient()
  const { userId } = await getParentContext()

  const { count } = await supabase
    .from('messages')
    .select('*', { count: 'exact', head: true })
    .eq('recipient_id', userId)
    .eq('is_read', false)
  return count ?? 0
}

// ── Announcements ──────────────────────────────────────────

export async function getParentAnnouncements(): Promise<any> {
  const supabase = await createClient()
  const { schoolId } = await getParentContext()

  const { data } = await supabase
    .from('announcements')
    .select('id, title, content, created_at')
    .eq('school_id', schoolId)
    .eq('is_published', true)
    .contains('target_roles', ['parent'])
    .lte('published_at', new Date().toISOString())
    .order('published_at', { ascending: false })
    .limit(20)

  return data ?? []
}

// ── Notification Preferences ──────────────────────────────

export async function getNotificationPreferences() {
  const supabase = await createClient()
  const { userId } = await getParentContext()

  const { data } = await supabase
    .from('notification_preferences')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle()

  if (data) return data

  const { data: created } = await supabase
    .from('notification_preferences')
    .insert({ user_id: userId })
    .select()
    .single()

  return created ?? {
    email_notifications: true,
    sms_notifications: false,
    push_notifications: true,
    attendance_alerts: true,
    fee_reminders: true,
    exam_results: true,
    announcements: true,
    marketing_emails: false,
    quiet_hours_start: null,
    quiet_hours_end: null,
  }
}

const UpdateNotificationPrefsSchema = z.object({
  email_notifications: z.boolean().optional(),
  sms_notifications: z.boolean().optional(),
  push_notifications: z.boolean().optional(),
  attendance_alerts: z.boolean().optional(),
  fee_reminders: z.boolean().optional(),
  exam_results: z.boolean().optional(),
  announcements: z.boolean().optional(),
  marketing_emails: z.boolean().optional(),
  quiet_hours_start: z.string().nullable().optional(),
  quiet_hours_end: z.string().nullable().optional(),
})

export async function updateNotificationPreferences(data: z.infer<typeof UpdateNotificationPrefsSchema>) {
  const supabase = await createClient()
  const { userId } = await getParentContext()
  const parsed = UpdateNotificationPrefsSchema.parse(data)

  const { error } = await supabase
    .from('notification_preferences')
    .update(parsed)
    .eq('user_id', userId)

  if (error) throw new Error(error.message)
  revalidatePath('/parent/notifications')
  return { success: true }
}
