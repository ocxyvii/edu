'use server'

import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

const MarkTeacherAttendanceSchema = z.object({
  teacherId: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  status: z.enum(['present', 'absent', 'late', 'excused']),
  checkInTime: z.string().optional(),
  checkOutTime: z.string().optional(),
  notes: z.string().max(500).optional(),
})

const BulkTeacherAttendanceSchema = z.object({
  records: z.array(z.object({
    teacherId: z.string().uuid(),
    status: z.enum(['present', 'absent', 'late', 'excused']),
    checkInTime: z.string().optional(),
    checkOutTime: z.string().optional(),
    notes: z.string().max(500).optional(),
  })).min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
})

export type MarkTeacherAttendanceInput = z.infer<typeof MarkTeacherAttendanceSchema>

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

export async function markTeacherAttendance(raw: MarkTeacherAttendanceInput) {
  const parsed = MarkTeacherAttendanceSchema.safeParse(raw)
  if (!parsed.success) throw new Error(parsed.error.errors.map(e => e.message).join(', '))

  const { schoolId, supabase } = await getAuthContext()
  const { teacherId, date, status, checkInTime, checkOutTime, notes } = parsed.data

  const { data: existing } = await supabase
    .from('teacher_attendance')
    .select('id')
    .eq('school_id', schoolId)
    .eq('teacher_id', teacherId)
    .eq('date', date)
    .maybeSingle()

  if (existing) {
    const { error } = await supabase
      .from('teacher_attendance')
      .update({
        status,
        check_in_time: checkInTime ?? null,
        check_out_time: checkOutTime ?? null,
        notes: notes ?? null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existing.id)
    if (error) throw new Error(error.message)
  } else {
    const { error } = await supabase
      .from('teacher_attendance')
      .insert({
        school_id: schoolId,
        teacher_id: teacherId,
        date,
        status,
        check_in_time: checkInTime ?? null,
        check_out_time: checkOutTime ?? null,
        notes: notes ?? null,
      })
    if (error) throw new Error(error.message)
  }

  revalidatePath('/school-admin/attendance')
  return { success: true }
}

export async function bulkMarkTeacherAttendance(raw: BulkTeacherAttendanceSchema) {
  const parsed = BulkTeacherAttendanceSchema.safeParse(raw)
  if (!parsed.success) throw new Error(parsed.error.errors.map(e => e.message).join(', '))

  const { schoolId, supabase } = await getAuthContext()
  const { records, date } = parsed.data

  for (const r of records) {
    const { data: existing } = await supabase
      .from('teacher_attendance')
      .select('id')
      .eq('school_id', schoolId)
      .eq('teacher_id', r.teacherId)
      .eq('date', date)
      .maybeSingle()

    if (existing) {
      await supabase
        .from('teacher_attendance')
        .update({
          status: r.status,
          check_in_time: r.checkInTime ?? null,
          check_out_time: r.checkOutTime ?? null,
          notes: r.notes ?? null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id)
    } else {
      await supabase
        .from('teacher_attendance')
        .insert({
          school_id: schoolId,
          teacher_id: r.teacherId,
          date,
          status: r.status,
          check_in_time: r.checkInTime ?? null,
          check_out_time: r.checkOutTime ?? null,
          notes: r.notes ?? null,
        })
    }
  }

  revalidatePath('/school-admin/attendance')
  return { success: true }
}

export async function getTeacherAttendanceForDate(date: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error('Invalid date format')

  const { schoolId, supabase } = await getAuthContext()

  const { data, error } = await supabase
    .from('teacher_attendance')
    .select('*, teachers!inner(employee_number, profiles!inner(id, first_name, last_name, avatar_url))')
    .eq('school_id', schoolId)
    .eq('date', date)

  if (error) throw new Error(error.message)
  return data ?? []
}

export async function getTeacherAttendanceSummary(teacherId: string) {
  const { schoolId, supabase } = await getAuthContext()

  const { data, error } = await supabase
    .from('teacher_attendance')
    .select('date, status, check_in_time, check_out_time')
    .eq('school_id', schoolId)
    .eq('teacher_id', teacherId)
    .order('date', { ascending: false })
    .limit(90)

  if (error) throw new Error(error.message)

  const total = data?.length ?? 0
  const present = data?.filter(a => a.status === 'present').length ?? 0
  const absent = data?.filter(a => a.status === 'absent').length ?? 0
  const late = data?.filter(a => a.status === 'late').length ?? 0
  const excused = data?.filter(a => a.status === 'excused').length ?? 0
  const percentage = total > 0 ? Math.round((present / total) * 100) : 0

  return {
    records: data ?? [],
    summary: { total, present, absent, late, excused, percentage },
  }
}

export async function getAllTeachers() {
  const { schoolId, supabase } = await getAuthContext()

  const { data, error } = await supabase
    .from('teachers')
    .select('id, employee_number, department, profiles!inner(id, first_name, last_name, avatar_url, email)')
    .eq('school_id', schoolId)
    .eq('is_active', true)
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)
  return data ?? []
}
