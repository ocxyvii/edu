'use server'

import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

const attendanceStatusEnum = z.enum(['present', 'absent', 'late', 'excused'])

const MarkAttendanceInputSchema = z.object({
  studentId: z.string().uuid(),
  classId: z.string().uuid(),
  sectionId: z.string().uuid().optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  status: attendanceStatusEnum,
  notes: z.string().max(500).optional(),
})

const BulkMarkAttendanceSchema = z.object({
  classId: z.string().uuid(),
  records: z.array(z.object({
    studentId: z.string().uuid(),
    status: attendanceStatusEnum,
    notes: z.string().max(500).optional(),
  })).min(1),
})

const AttendanceQuerySchema = z.object({
  classId: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  sectionId: z.string().uuid().optional(),
})

const StudentAttendanceSummarySchema = z.object({
  studentId: z.string().uuid(),
  termId: z.string().uuid().optional(),
})

const SchoolAttendanceSummarySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
})

export type MarkAttendanceInput = z.infer<typeof MarkAttendanceInputSchema>
export type BulkMarkAttendanceInput = z.infer<typeof BulkMarkAttendanceSchema>

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

export async function markStudentAttendance(raw: MarkAttendanceInput) {
  const parsed = MarkAttendanceInputSchema.safeParse(raw)
  if (!parsed.success) throw new Error(parsed.error.errors.map(e => e.message).join(', '))

  const { userId, schoolId, supabase } = await getAuthContext()
  const { studentId, classId, sectionId, date, status, notes } = parsed.data

  const { data: existing } = await supabase
    .from('attendance')
    .select('id')
    .eq('school_id', schoolId)
    .eq('student_id', studentId)
    .eq('date', date)
    .maybeSingle()

  if (existing) {
    const { error } = await supabase
      .from('attendance')
      .update({ status, notes: notes ?? null, marked_by: userId, updated_at: new Date().toISOString() })
      .eq('id', existing.id)
    if (error) throw new Error(error.message)
  } else {
    const { error } = await supabase
      .from('attendance')
      .insert({
        school_id: schoolId,
        student_id: studentId,
        class_id: classId,
        section_id: sectionId ?? null,
        date,
        status,
        marked_by: userId,
        notes: notes ?? null,
      })
    if (error) throw new Error(error.message)
  }

  revalidatePath('/teacher/attendance')
  return { success: true }
}

export async function bulkMarkAttendance(raw: BulkMarkAttendanceInput & { sectionId?: string; date: string }) {
  const parsed = BulkMarkAttendanceSchema.safeParse(raw)
  if (!parsed.success) throw new Error(parsed.error.errors.map(e => e.message).join(', '))
  if (!raw.date) throw new Error('Date is required')

  const { userId, schoolId, supabase } = await getAuthContext()
  const { classId, records } = parsed.data

  const rows = records.map(r => ({
    school_id: schoolId,
    student_id: r.studentId,
    class_id: classId,
    section_id: raw.sectionId ?? null,
    date: raw.date,
    status: r.status,
    marked_by: userId,
    notes: r.notes ?? null,
  }))

  const { error } = await supabase
    .from('attendance')
    .upsert(rows, { onConflict: 'student_id,date' })

  if (error) throw new Error(error.message)
  revalidatePath('/teacher/attendance')
  return { success: true }
}

export async function getClassAttendance(raw: { classId: string; date: string; sectionId?: string }) {
  const parsed = AttendanceQuerySchema.safeParse(raw)
  if (!parsed.success) throw new Error(parsed.error.errors.map(e => e.message).join(', '))

  const { schoolId, supabase } = await getAuthContext()
  const { classId, date, sectionId } = parsed.data

  let query = supabase
    .from('attendance')
    .select('id, student_id, status, notes, marked_by, created_at, students!inner(admission_number, profiles!inner(id, first_name, last_name, avatar_url))')
    .eq('school_id', schoolId)
    .eq('class_id', classId)
    .eq('date', date)

  if (sectionId) {
    query = query.eq('section_id', sectionId)
  }

  const { data, error } = await query
  if (error) throw new Error(error.message)
  return data ?? []
}

export async function getStudentAttendanceSummary(raw: { studentId: string; termId?: string }) {
  const parsed = StudentAttendanceSummarySchema.safeParse(raw)
  if (!parsed.success) throw new Error(parsed.error.errors.map(e => e.message).join(', '))

  const { schoolId, supabase } = await getAuthContext()
  const { studentId } = parsed.data

  let query = supabase
    .from('attendance')
    .select('date, status')
    .eq('student_id', studentId)
    .eq('school_id', schoolId)
    .order('date', { ascending: false })
    .limit(180)

  const { data, error } = await query
  if (error) throw new Error(error.message)

  const total = data?.length ?? 0
  const present = data?.filter(a => a.status === 'present').length ?? 0
  const absent = data?.filter(a => a.status === 'absent').length ?? 0
  const late = data?.filter(a => a.status === 'late').length ?? 0
  const excused = data?.filter(a => a.status === 'excused').length ?? 0
  const percentage = total > 0 ? Math.round((present / total) * 100) : 0

  const streaks = computeConsecutiveAbsences(data ?? [])

  return {
    records: data ?? [],
    summary: { total, present, absent, late, excused, percentage },
    consecutiveAbsences: streaks,
  }
}

export async function getSchoolAttendanceSummary(raw: { date: string }) {
  const parsed = SchoolAttendanceSummarySchema.safeParse(raw)
  if (!parsed.success) throw new Error(parsed.error.errors.map(e => e.message).join(', '))

  const { schoolId, supabase } = await getAuthContext()
  const { date } = parsed.data

  const { data, error } = await supabase
    .from('attendance')
    .select('student_id, status, class_id')
    .eq('school_id', schoolId)
    .eq('date', date)

  if (error) throw new Error(error.message)

  const total = data?.length ?? 0
  const present = data?.filter(a => a.status === 'present').length ?? 0
  const absent = data?.filter(a => a.status === 'absent').length ?? 0
  const late = data?.filter(a => a.status === 'late').length ?? 0
  const excused = data?.filter(a => a.status === 'excused').length ?? 0
  const percentage = total > 0 ? Math.round((present / total) * 100) : 0

  const byClass: Record<string, { total: number; present: number; absent: number }> = {}
  for (const a of data ?? []) {
    if (!byClass[a.class_id]) byClass[a.class_id] = { total: 0, present: 0, absent: 0 }
    byClass[a.class_id].total++
    if (a.status === 'present') byClass[a.class_id].present++
    if (a.status === 'absent') byClass[a.class_id].absent++
  }

  return {
    date,
    summary: { total, present, absent, late, excused, percentage },
    byClass,
  }
}

export async function generateAbsenceNotifications() {
  const { schoolId, supabase, userId } = await getAuthContext()

  const threeDaysAgo = new Date(Date.now() - 3 * 86400000).toISOString().split('T')[0]
  const today = new Date().toISOString().split('T')[0]

  const { data: records } = await supabase
    .from('attendance')
    .select('student_id, date, status')
    .eq('school_id', schoolId)
    .in('status', ['absent', 'late'])
    .gte('date', threeDaysAgo)
    .lte('date', today)
    .order('student_id')
    .order('date')

  if (!records) return []

  const grouped: Record<string, { date: string; status: string }[]> = {}
  for (const r of records) {
    if (!grouped[r.student_id]) grouped[r.student_id] = []
    grouped[r.student_id].push(r)
  }

  const absentStudents: { studentId: string; days: number; consecutiveCount: number }[] = []

  for (const [studentId, days] of Object.entries(grouped)) {
    const sorted = days.sort((a, b) => a.date.localeCompare(b.date))
    const maxStreak = findLongestStreak(sorted)
    if (maxStreak >= 3) {
      absentStudents.push({ studentId, days: sorted.length, consecutiveCount: maxStreak })
    }
  }

  const { data: studentProfiles } = await supabase
    .from('students')
    .select('id, profiles!inner(id, first_name, last_name)')
    .in('id', absentStudents.map(s => s.studentId))

  const profileMap = new Map(studentProfiles?.map(s => [s.id, (s.profiles as any)]) ?? [])

  const notifications = absentStudents.map(s => ({
    school_id: schoolId,
    user_id: userId,
    title: 'Attendance Warning',
    body: `${profileMap.get(s.studentId)?.first_name ?? 'Unknown'} ${profileMap.get(s.studentId)?.last_name ?? ''} has been absent for ${s.consecutiveCount} consecutive days.`,
    type: 'attendance' as const,
    metadata: { studentId: s.studentId, consecutiveDays: s.consecutiveCount },
  }))

  if (notifications.length > 0) {
    const { error } = await supabase.from('notifications').insert(notifications)
    if (error) throw new Error(error.message)
  }

  return absentStudents
}

export async function getAttendanceReport(raw: {
  classId?: string
  sectionId?: string
  fromDate: string
  toDate: string
}) {
  const fromRegex = /^\d{4}-\d{2}-\d{2}$/
  if (!fromRegex.test(raw.fromDate) || !fromRegex.test(raw.toDate)) {
    throw new Error('Invalid date format')
  }

  const { schoolId, supabase } = await getAuthContext()

  let query = supabase
    .from('attendance')
    .select('student_id, date, status, class_id, section_id, students!inner(admission_number, profiles!inner(id, first_name, last_name), classes!inner(name, level))')
    .eq('school_id', schoolId)
    .gte('date', raw.fromDate)
    .lte('date', raw.toDate)

  if (raw.classId) query = query.eq('class_id', raw.classId)
  if (raw.sectionId) query = query.eq('section_id', raw.sectionId)

  const { data, error } = await query
  if (error) throw new Error(error.message)

  const perStudent: Record<string, {
    studentId: string
    firstName: string
    lastName: string
    admissionNumber: string
    className: string
    total: number
    present: number
    absent: number
    late: number
    excused: number
    percentage: number
  }> = {}

  for (const a of data ?? []) {
    const sid = a.student_id
    if (!perStudent[sid]) {
      const s = a.students as any
      perStudent[sid] = {
        studentId: sid,
        firstName: s.profiles?.first_name ?? '',
        lastName: s.profiles?.last_name ?? '',
        admissionNumber: s.admission_number ?? '',
        className: s.classes ? `${s.classes.name} ${s.classes.level ?? ''}`.trim() : '',
        total: 0, present: 0, absent: 0, late: 0, excused: 0, percentage: 0,
      }
    }
    perStudent[sid].total++
    if (a.status === 'present') perStudent[sid].present++
    else if (a.status === 'absent') perStudent[sid].absent++
    else if (a.status === 'late') perStudent[sid].late++
    else if (a.status === 'excused') perStudent[sid].excused++
  }

  const rows = Object.values(perStudent)
  for (const r of rows) {
    r.percentage = r.total > 0 ? Math.round((r.present / r.total) * 100) : 0
  }
  rows.sort((a, b) => a.percentage - b.percentage)

  return rows
}

function computeConsecutiveAbsences(records: { date: string; status: string }[]) {
  const sorted = [...records].filter(r => r.status === 'absent').sort((a, b) => a.date.localeCompare(b.date))
  if (sorted.length === 0) return 0

  let maxStreak = 1
  let currentStreak = 1

  for (let i = 1; i < sorted.length; i++) {
    const prevDate = new Date(sorted[i - 1].date)
    const currDate = new Date(sorted[i].date)
    const diffDays = (currDate.getTime() - prevDate.getTime()) / 86400000
    if (diffDays === 1) {
      currentStreak++
      maxStreak = Math.max(maxStreak, currentStreak)
    } else {
      currentStreak = 1
    }
  }

  return maxStreak
}

function findLongestStreak(days: { date: string; status: string }[]) {
  const absentDates = days
    .filter(d => d.status === 'absent')
    .map(d => new Date(d.date).getTime())
    .sort((a, b) => a - b)

  if (absentDates.length === 0) return 0

  let maxStreak = 1
  let currentStreak = 1
  for (let i = 1; i < absentDates.length; i++) {
    const diff = (absentDates[i] - absentDates[i - 1]) / 86400000
    if (diff === 1) {
      currentStreak++
      maxStreak = Math.max(maxStreak, currentStreak)
    } else {
      currentStreak = 1
    }
  }
  return maxStreak
}
