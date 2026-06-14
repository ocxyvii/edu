'use server'

import { z } from 'zod'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { logCreate, logUpdate, logDelete } from '@/lib/security/auditLogger'

async function getAuthContext() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  const { data: profile } = await supabase
    .from('profiles')
    .select('school_id, role, id')
    .eq('id', user.id)
    .single()
  if (!profile?.school_id) throw new Error('No school assigned')
  return { userId: user.id, schoolId: profile.school_id, supabase }
}

const EntrySchema = z.object({
  section_id: z.string().uuid(),
  subject_id: z.string().uuid(),
  teacher_id: z.string().uuid(),
  day_of_week: z.enum(['monday', 'tuesday', 'wednesday', 'thursday', 'friday']),
  start_time: z.string().regex(/^\d{2}:\d{2}$/),
  end_time: z.string().regex(/^\d{2}:\d{2}$/),
  room: z.string().max(50).optional(),
  academic_year_id: z.string().uuid().optional(),
})

const UpdateEntrySchema = z.object({
  subject_id: z.string().uuid().optional(),
  teacher_id: z.string().uuid().optional(),
  day_of_week: z.enum(['monday', 'tuesday', 'wednesday', 'thursday', 'friday']).optional(),
  start_time: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  end_time: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  room: z.string().max(50).optional().nullable(),
})

export type TimetableEntry = {
  id: string
  school_id: string
  section_id: string
  subject_id: string
  teacher_id: string
  academic_year_id: string
  day_of_week: 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday'
  start_time: string
  end_time: string
  room: string | null
  created_at: string
  updated_at: string
  subjects?: { id: string; name: string; code: string }
  teachers?: { id: string; profiles: { first_name: string; last_name: string } }
  sections?: { id: string; name: string; classes: { id: string; name: string; level: number } }
}

function timeToMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}

function timesOverlap(aStart: string, aEnd: string, bStart: string, bEnd: string): boolean {
  return timeToMinutes(aStart) < timeToMinutes(bEnd) && timeToMinutes(bStart) < timeToMinutes(aEnd)
}

export async function checkConflicts(
  teacherId: string,
  dayOfWeek: string,
  startTime: string,
  endTime: string,
  excludeId?: string,
): Promise<{ hasConflict: boolean; conflictingEntries: any[] }> {
  const { schoolId, supabase } = await getAuthContext()

  let query = supabase
    .from('timetable')
    .select('*, subjects(name), sections(name, classes(name))')
    .eq('school_id', schoolId)
    .eq('teacher_id', teacherId)
    .eq('day_of_week', dayOfWeek as any)

  if (excludeId) {
    query = query.neq('id', excludeId)
  }

  const { data: entries } = await query

  const conflicting = (entries ?? []).filter(e =>
    timesOverlap(startTime, endTime, e.start_time, e.end_time)
  )

  return {
    hasConflict: conflicting.length > 0,
    conflictingEntries: conflicting,
  }
}

export async function createTimetableEntry(data: z.infer<typeof EntrySchema>) {
  const { schoolId, userId, supabase } = await getAuthContext()
  const parsed = EntrySchema.parse(data)

  const { data: year } = await supabase
    .from('academic_years')
    .select('id')
    .eq('school_id', schoolId)
    .eq('is_current', true)
    .single()

  if (!year) throw new Error('No current academic year set')

  const conflict = await checkConflicts(
    parsed.teacher_id,
    parsed.day_of_week,
    parsed.start_time,
    parsed.end_time,
  )

  if (conflict.hasConflict) {
    const names = conflict.conflictingEntries.map((e: any) =>
      `${e.subjects?.name} (${e.sections?.classes?.name} - ${e.sections?.name})`
    ).join(', ')
    throw new Error(`Teacher conflict: overlaps with ${names}`)
  }

  const { data: entry, error } = await supabase
    .from('timetable')
    .insert({
      school_id: schoolId,
      section_id: parsed.section_id,
      subject_id: parsed.subject_id,
      teacher_id: parsed.teacher_id,
      academic_year_id: parsed.academic_year_id ?? year.id,
      day_of_week: parsed.day_of_week as any,
      start_time: parsed.start_time,
      end_time: parsed.end_time,
      room: parsed.room ?? null,
    })
    .select('*, subjects(*), teachers!inner(profiles!inner(first_name, last_name))')
    .single()

  if (error) throw new Error(error.message)

  await logCreate(userId, 'timetable', entry.id, {
    section_id: parsed.section_id,
    subject_id: parsed.subject_id,
    teacher_id: parsed.teacher_id,
    day_of_week: parsed.day_of_week,
    start_time: parsed.start_time,
    end_time: parsed.end_time,
  }, schoolId)

  revalidatePath('/school-admin/timetable')
  revalidatePath('/teacher/timetable')
  return entry
}

export async function updateTimetableEntry(id: string, data: z.infer<typeof UpdateEntrySchema>) {
  const { schoolId, userId, supabase } = await getAuthContext()
  const parsed = UpdateEntrySchema.parse(data)

  const { data: existing } = await supabase
    .from('timetable')
    .select('*')
    .eq('id', id)
    .eq('school_id', schoolId)
    .single()

  if (!existing) throw new Error('Entry not found')

  const teacherId = parsed.teacher_id ?? existing.teacher_id
  const dayOfWeek = parsed.day_of_week ?? existing.day_of_week
  const startTime = parsed.start_time ?? existing.start_time
  const endTime = parsed.end_time ?? existing.end_time

  const conflict = await checkConflicts(teacherId, dayOfWeek, startTime, endTime, id)
  if (conflict.hasConflict) {
    const names = conflict.conflictingEntries.map((e: any) =>
      `${e.subjects?.name} (${e.sections?.classes?.name} - ${e.sections?.name})`
    ).join(', ')
    throw new Error(`Teacher conflict: overlaps with ${names}`)
  }

  const { data: updated, error } = await supabase
    .from('timetable')
    .update({
      ...parsed,
      day_of_week: parsed.day_of_week as any ?? undefined,
      room: parsed.room !== undefined ? parsed.room : undefined,
    })
    .eq('id', id)
    .eq('school_id', schoolId)
    .select('*, subjects(*), teachers!inner(profiles!inner(first_name, last_name))')
    .single()

  if (error) throw new Error(error.message)

  await logUpdate(userId, 'timetable', id, existing, parsed, schoolId)
  revalidatePath('/school-admin/timetable')
  revalidatePath('/teacher/timetable')
  return updated
}

export async function deleteTimetableEntry(id: string) {
  const { schoolId, userId, supabase } = await getAuthContext()

  const { data: existing } = await supabase
    .from('timetable')
    .select('*')
    .eq('id', id)
    .eq('school_id', schoolId)
    .single()

  if (!existing) throw new Error('Entry not found')

  const { error } = await supabase
    .from('timetable')
    .delete()
    .eq('id', id)
    .eq('school_id', schoolId)

  if (error) throw new Error(error.message)

  await logDelete(userId, 'timetable', id, existing, schoolId)
  revalidatePath('/school-admin/timetable')
  revalidatePath('/teacher/timetable')
}

export async function getTimetableForSection(sectionId: string): Promise<TimetableEntry[]> {
  const { schoolId, supabase } = await getAuthContext()

  const { data } = await supabase
    .from('timetable')
    .select('*, subjects(*), teachers!inner(profiles!inner(first_name, last_name))')
    .eq('school_id', schoolId)
    .eq('section_id', sectionId)
    .order('day_of_week')
    .order('start_time')

  return (data ?? []) as unknown as TimetableEntry[]
}

export async function getTimetableForTeacher(): Promise<TimetableEntry[]> {
  const { userId, schoolId, supabase } = await getAuthContext()

  const { data } = await supabase
    .from('timetable')
    .select('*, subjects(*), sections(name, classes(name, level))')
    .eq('school_id', schoolId)
    .eq('teacher_id', userId)
    .order('day_of_week')
    .order('start_time')

  return (data ?? []) as unknown as TimetableEntry[]
}

export async function getAvailableSubjectsForSection(sectionId: string) {
  const { schoolId, supabase } = await getAuthContext()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data: section } = await supabase
    .from('sections')
    .select('class_id')
    .eq('id', sectionId)
    .single()

  if (!section?.class_id) return []

  const { data: alreadyAssigned } = await supabase
    .from('teacher_subjects')
    .select('subject_id')
    .eq('teacher_id', user.id)
    .eq('section_id', sectionId)

  const assignedIds = new Set(alreadyAssigned?.map(a => a.subject_id) ?? [])

  const { data: subjects } = await supabase
    .from('subjects')
    .select('id, name, code')
    .eq('school_id', schoolId)
    .eq('class_id', section.class_id)
    .eq('is_active', true)
    .order('name')

  return (subjects ?? []).filter(s => !assignedIds.has(s.id))
}

export async function addTeacherSubject(sectionId: string, subjectId: string) {
  const { schoolId, supabase } = await getAuthContext()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { error } = await supabase.from('teacher_subjects').upsert({
    teacher_id: user.id,
    subject_id: subjectId,
    section_id: sectionId,
    school_id: schoolId,
  }, { onConflict: 'teacher_id, subject_id, section_id', ignoreDuplicates: true })

  if (error) throw new Error(error.message)
  revalidatePath('/teacher/timetable')
}

export async function removeTeacherSubject(sectionId: string, subjectId: string) {
  const { supabase } = await getAuthContext()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { error } = await supabase
    .from('teacher_subjects')
    .delete()
    .eq('teacher_id', user.id)
    .eq('subject_id', subjectId)
    .eq('section_id', sectionId)

  if (error) throw new Error(error.message)
  revalidatePath('/teacher/timetable')
}

export async function getTeacherTimetableSubjects(sectionId: string) {
  const { schoolId, supabase } = await getAuthContext()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const [subjectsResult, teacherProfile] = await Promise.all([
    supabase
      .from('teacher_subjects')
      .select('subjects!inner(id, name, code)')
      .eq('school_id', schoolId)
      .eq('teacher_id', user.id)
      .eq('section_id', sectionId),
    supabase
      .from('profiles')
      .select('first_name, last_name')
      .eq('id', user.id)
      .single(),
  ])

  const subjects = (subjectsResult.data ?? []).map((ts: any) => ts.subjects).filter(Boolean)

  return {
    subjects: subjects as { id: string; name: string; code: string }[],
    teacher: {
      id: user.id,
      profiles: {
        first_name: teacherProfile.data?.first_name ?? '',
        last_name: teacherProfile.data?.last_name ?? '',
      },
    },
    teacherName: `${teacherProfile.data?.first_name ?? ''} ${teacherProfile.data?.last_name ?? ''}`.trim(),
  }
}

export async function getTimetableForStudent(): Promise<TimetableEntry[]> {
  const { schoolId, supabase } = await getAuthContext()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data: student } = await supabase
    .from('students')
    .select('section_id')
    .eq('id', user.id)
    .single()

  if (!student?.section_id) return []

  const { data } = await supabase
    .from('timetable')
    .select('*, subjects(*), teachers!inner(profiles!inner(first_name, last_name))')
    .eq('school_id', schoolId)
    .eq('section_id', student.section_id)
    .order('day_of_week')
    .order('start_time')

  return (data ?? []) as unknown as TimetableEntry[]
}

export async function autoGenerateTimetable(sectionId: string): Promise<{ created: number; errors: string[] }> {
  const { schoolId, supabase } = await getAuthContext()

  const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday']
  const periods = [
    { start: '07:00', end: '07:45' },
    { start: '07:50', end: '08:35' },
    { start: '08:40', end: '09:25' },
    { start: '09:30', end: '10:15' },
    { start: '10:20', end: '11:05' },
    { start: '11:10', end: '11:55' },
    { start: '12:00', end: '12:45' },
    { start: '12:50', end: '13:35' },
    { start: '13:40', end: '14:25' },
    { start: '14:30', end: '15:15' },
  ]

  const { data: subjects } = await supabase
    .from('subjects')
    .select('id')
    .eq('school_id', schoolId)

  const { data: teachers } = await supabase
    .from('teachers')
    .select('id, profiles!inner(first_name, last_name)')
    .eq('school_id', schoolId)
    .eq('is_active', true)

  if (!subjects?.length || !teachers?.length) {
    return { created: 0, errors: ['No subjects or teachers available'] }
  }

  const { data: existingEntries } = await supabase
    .from('timetable')
    .select('*')
    .eq('school_id', schoolId)
    .eq('section_id', sectionId)

  if (existingEntries?.length) {
    return { created: 0, errors: ['Timetable already has entries. Clear it first.'] }
  }

  const { data: year } = await supabase
    .from('academic_years')
    .select('id')
    .eq('school_id', schoolId)
    .eq('is_current', true)
    .single()

  if (!year) return { created: 0, errors: ['No current academic year'] }

  const teacherSchedule = new Map<string, Set<string>>()
  const subjectFrequency = new Map<string, number>()
  const created: string[] = []
  const errors: string[] = []

  for (const day of days) {
    for (const period of periods) {
      const slotKey = `${day}:${period.start}`

      // Find subject that needs more coverage
      let minFreq = Infinity
      let selectedSubject: string | null = null
      for (const sub of subjects) {
        const freq = subjectFrequency.get(sub.id) ?? 0
        if (freq < minFreq) {
          minFreq = freq
          selectedSubject = sub.id
        }
      }

      if (!selectedSubject) break

      // Find available teacher for this subject slot
      let selectedTeacher: string | null = null
      for (const teacher of teachers ?? []) {
        const teacherKey = `${teacher.id}:${day}`
        const booked = teacherSchedule.get(teacherKey) ?? new Set()
        let isFree = true
        for (const existing of booked) {
          if (timesOverlap(period.start, period.end, existing.split(':')[0], existing.split(':')[1])) {
            isFree = false
            break
          }
        }
        if (isFree) {
          selectedTeacher = teacher.id
          const updated = new Set(booked)
          updated.add(`${period.start}:${period.end}`)
          teacherSchedule.set(teacherKey, updated)
          break
        }
      }

      if (!selectedTeacher) {
        errors.push(`No teacher available for ${day} ${period.start}`)
        continue
      }

      try {
        const { data: entry, error } = await supabase
          .from('timetable')
          .insert({
            school_id: schoolId,
            section_id: sectionId,
            subject_id: selectedSubject,
            teacher_id: selectedTeacher,
            academic_year_id: year.id,
            day_of_week: day as any,
            start_time: period.start,
            end_time: period.end,
            room: null,
          })
          .select()
          .single()

        if (error) {
          errors.push(error.message)
        } else {
          created.push(entry.id)
          subjectFrequency.set(selectedSubject, (subjectFrequency.get(selectedSubject) ?? 0) + 1)
        }
      } catch (err: any) {
        errors.push(err.message)
      }
    }
  }

  revalidatePath('/school-admin/timetable')
  return { created: created.length, errors }
}
