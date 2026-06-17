'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

async function getTeacherInfo() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  const { data: profile } = await supabase
    .from('profiles')
    .select('school_id, first_name, last_name, avatar_url')
    .eq('id', user.id)
    .single()
  if (!profile?.school_id) throw new Error('No school assigned')
  return { userId: user.id, schoolId: profile.school_id, profile }
}

// ── Dashboard ────────────────────────────────────────────────

export async function getTeacherDashboard(): Promise<any> {
  const supabase = await createClient()
  const { userId, schoolId } = await getTeacherInfo()

  const today = new Date().toISOString().split('T')[0]
  const dayName = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][new Date().getDay()]

  const { data: timetable } = await supabase
    .from('timetable')
    .select('*, subjects(name, code), sections(name, classes(name, level))')
    .eq('school_id', schoolId)
    .eq('teacher_id', userId)
    .eq('day_of_week', dayName)
    .order('start_time')

  const { data: assignments } = await supabase
    .from('assignments')
    .select('id, title, due_date, class_id, classes(name), subject_id, subjects(name)')
    .eq('school_id', schoolId)
    .eq('teacher_id', userId)
    .order('due_date', { ascending: true })
    .limit(5)

  const { data: unreadMessages } = await supabase
    .from('messages')
    .select('id, subject, content, sender_id, created_at, profiles!messages_sender_id_fkey(first_name, last_name)')
    .eq('school_id', schoolId)
    .eq('recipient_id', userId)
    .eq('is_read', false)
    .order('created_at', { ascending: false })
    .limit(5)

  const { data: teacherSections } = await supabase
    .from('teacher_subjects')
    .select('section_id')
    .eq('school_id', schoolId)
    .eq('teacher_id', userId)
    .not('section_id', 'is', null)

  const { data: ctSections } = await supabase
    .from('sections')
    .select('id')
    .eq('school_id', schoolId)
    .eq('class_teacher_id', userId)

  const sectionIds = [
    ...new Set([
      ...(teacherSections?.map(ts => ts.section_id) ?? []),
      ...(ctSections?.map(s => s.id) ?? []),
    ].filter(Boolean)),
  ]
  let attendanceMarked = 0
  let totalStudents = 0

  if (sectionIds.length > 0) {
    const { data: sectionStudents } = await supabase
      .from('students')
      .select('id, section_id', { count: 'exact', head: false })
      .eq('school_id', schoolId)
      .in('section_id', sectionIds)
      .eq('is_active', true)

    const studentIds = sectionStudents?.map(s => s.id) ?? []
    totalStudents = studentIds.length

    if (studentIds.length > 0) {
      const { data: todayAttendance } = await supabase
        .from('attendance')
        .select('student_id')
        .eq('school_id', schoolId)
        .eq('date', today)
        .in('student_id', studentIds)

      const markedStudentIds = new Set(todayAttendance?.map(a => a.student_id) ?? [])
      attendanceMarked = markedStudentIds.size
    }
  }

  let sectionAttendanceStats: { sectionId: string; sectionName: string; className: string; totalStudents: number; todayMarked: number; todayPresent: number; todayAbsent: number }[] = []

  if (sectionIds.length > 0) {
    sectionAttendanceStats = await Promise.all(
      sectionIds.map(async (sid) => {
        const sectionInfo = timetable?.find(t => t.section_id === sid)
        const { count: total } = await supabase
          .from('students')
          .select('id', { count: 'exact', head: true })
          .eq('school_id', schoolId)
          .eq('section_id', sid)
          .eq('is_active', true)

        const { data: todayAtt } = await supabase
          .from('attendance')
          .select('status')
          .eq('school_id', schoolId)
          .eq('section_id', sid)
          .eq('date', today)

        return {
          sectionId: sid,
          sectionName: sectionInfo?.sections?.name ?? '',
          className: sectionInfo?.sections?.classes
            ? `${sectionInfo.sections.classes.name} ${sectionInfo.sections.classes.level ?? ''}`.trim()
            : '',
          totalStudents: total ?? 0,
          todayMarked: todayAtt?.length ?? 0,
          todayPresent: todayAtt?.filter(a => a.status === 'present').length ?? 0,
          todayAbsent: todayAtt?.filter(a => a.status === 'absent').length ?? 0,
        }
      })
    )
  }

  // ── New students enrolled in last 7 days ──
  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

  const { data: newStudents } = sectionIds.length > 0 ? await supabase
    .from('students')
    .select(`
      id, admission_number, enrollment_date,
      sections!inner(name, classes!inner(name)),
      profiles!inner(first_name, last_name, avatar_url, gender)
    `)
    .eq('school_id', schoolId)
    .in('section_id', sectionIds)
    .eq('is_active', true)
    .gte('enrollment_date', sevenDaysAgo.toISOString().split('T')[0])
    .order('enrollment_date', { ascending: false }) : { data: [] }

  // ── My classes summary for dashboard ──
  const { data: sectionInfo } = sectionIds.length > 0 ? await supabase
    .from('sections')
    .select(`
      id, name, capacity,
      classes!inner(id, name, level, academic_years!inner(name, is_current))
    `)
    .in('id', sectionIds)
    .eq('school_id', schoolId) : { data: [] }

  const { data: studentCounts } = sectionIds.length > 0 ? await supabase
    .from('students')
    .select('section_id')
    .eq('school_id', schoolId)
    .in('section_id', sectionIds)
    .eq('is_active', true) : { data: [] }

  const countBySection = new Map<string, number>()
  studentCounts?.forEach((s: any) => {
    countBySection.set(s.section_id, (countBySection.get(s.section_id) ?? 0) + 1)
  })

  const myClasses = sectionInfo?.map((s: any) => ({
    sectionId: s.id,
    sectionName: s.name,
    capacity: s.capacity,
    classId: s.classes?.id,
    className: s.classes?.name,
    classLevel: s.classes?.level,
    academicYearName: s.classes?.academic_years?.name,
    isCurrent: s.classes?.academic_years?.is_current,
    studentCount: countBySection.get(s.id) ?? 0,
  })) ?? []

  return {
    todayClasses: timetable ?? [],
    pendingAssignments: assignments ?? [],
    unreadMessages: unreadMessages ?? [],
    attendanceMarked,
    totalStudents,
    sectionAttendanceStats,
    newStudents: newStudents ?? [],
    myClasses,
  }
}

// ── Classes ──────────────────────────────────────────────────

export async function getTeacherClasses(): Promise<any> {
  const supabase = await createClient()
  const { userId, schoolId } = await getTeacherInfo()

  // 1. Sections from teacher_subjects (teacher teaches a subject there)
  const { data: subjectData } = await supabase
    .from('teacher_subjects')
    .select('*, subjects(name, code), sections(id, name, room, classes(id, name, level))')
    .eq('school_id', schoolId)
    .eq('teacher_id', userId)

  // 2. Sections where teacher is the class teacher
  const { data: ctSections } = await supabase
    .from('sections')
    .select('id, name, room, class_teacher_id, classes!inner(id, name, level)')
    .eq('school_id', schoolId)
    .eq('class_teacher_id', userId)

  // Merge all section IDs
  const subjectSectionIds = [...new Set(subjectData?.map(d => d.section_id).filter(Boolean) ?? [])]
  const ctSectionIds = ctSections?.map(s => s.id) ?? []
  const allSectionIds = [...new Set([...subjectSectionIds, ...ctSectionIds])]

  // Student counts across all sections (by section_id)
  const { data: studentCounts } = allSectionIds.length > 0 ? await supabase
    .from('students')
    .select('section_id', { count: 'exact', head: false })
    .in('section_id', allSectionIds)
    .eq('school_id', schoolId)
    .eq('is_active', true) : { data: [] }

  const countMap = new Map<string, number>()
  studentCounts?.forEach((s: any) => {
    countMap.set(s.section_id, (countMap.get(s.section_id) ?? 0) + 1)
  })

  // ALSO count orphan students (class_id set but no section_id) per class
  // Build set of class IDs from all sections
  const classIdSet = new Set<string>()
  subjectData?.forEach((ts: any) => {
    if (ts.sections?.classes?.id) classIdSet.add(ts.sections.classes.id)
  })
  ctSections?.forEach((s: any) => {
    if (s.classes?.id) classIdSet.add(s.classes.id)
  })
  const allClassIds = [...classIdSet]

  const { data: orphanCounts } = allClassIds.length > 0 ? await supabase
    .from('students')
    .select('class_id')
    .is('section_id', null)
    .in('class_id', allClassIds)
    .eq('school_id', schoolId)
    .eq('is_active', true) : { data: [] }

  const orphanMap = new Map<string, number>()
  orphanCounts?.forEach((s: any) => {
    orphanMap.set(s.class_id, (orphanMap.get(s.class_id) ?? 0) + 1)
  })

  const classMap = new Map()

  // Add entries from teacher_subjects
  subjectData?.forEach((ts: any) => {
    if (!ts.sections?.classes) return
    const cls = ts.sections.classes
    const key = cls.id
    if (!classMap.has(key)) {
      classMap.set(key, { ...cls, sections: [], subjects: [] })
    }
    const entry = classMap.get(key)
    const sectionEntry = entry.sections.find((s: any) => s.id === ts.sections.id)
    if (sectionEntry) {
      if (!sectionEntry.subjects.includes(ts.subjects?.name)) {
        sectionEntry.subjects.push(ts.subjects?.name)
      }
    } else {
      const sectionCount = (countMap.get(ts.sections.id) ?? 0) + (orphanMap.get(cls.id) ?? 0)
      entry.sections.push({
        ...ts.sections,
        subjects: [ts.subjects?.name],
        studentCount: sectionCount,
      })
    }
  })

  // Add entries from class_teacher assignments
  ctSections?.forEach((section: any) => {
    if (!section.classes) return
    const cls = section.classes
    const key = cls.id
    if (!classMap.has(key)) {
      classMap.set(key, { ...cls, sections: [], subjects: [] })
    }
    const entry = classMap.get(key)
    const exists = entry.sections.find((s: any) => s.id === section.id)
    if (!exists) {
      const sectionCount = (countMap.get(section.id) ?? 0) + (orphanMap.get(cls.id) ?? 0)
      entry.sections.push({
        id: section.id,
        name: section.name,
        room: section.room,
        subjects: [],
        studentCount: sectionCount,
        is_class_teacher: true,
      })
    }
  })

  return Array.from(classMap.values())
}

export async function getTeacherSections(): Promise<any> {
  const supabase = await createClient()
  const { userId, schoolId } = await getTeacherInfo()

  // Sections from teacher_subjects
  const { data: subjectData } = await supabase
    .from('teacher_subjects')
    .select('section_id, sections!inner(id, name, room, classes!inner(id, name, level))')
    .eq('school_id', schoolId)
    .eq('teacher_id', userId)

  // Sections where teacher is class teacher
  const { data: ctData } = await supabase
    .from('sections')
    .select('id, name, room, classes!inner(id, name, level)')
    .eq('school_id', schoolId)
    .eq('class_teacher_id', userId)

  const unique = new Map()
  subjectData?.forEach((ts: any) => {
    const section = ts.sections
    if (section && !unique.has(section.id)) {
      unique.set(section.id, {
        id: section.id,
        name: section.name,
        room: section.room,
        class_id: section.classes.id,
        class_name: section.classes.name,
        class_level: section.classes.level,
      })
    }
  })
  ctData?.forEach((section: any) => {
    if (!unique.has(section.id)) {
      unique.set(section.id, {
        id: section.id,
        name: section.name,
        room: section.room,
        class_id: section.classes.id,
        class_name: section.classes.name,
        class_level: section.classes.level,
      })
    }
  })
  return Array.from(unique.values())
}

// ── Timetable ────────────────────────────────────────────────

export async function getTeacherTimetable(): Promise<any> {
  const supabase = await createClient()
  const { userId, schoolId } = await getTeacherInfo()

  const { data } = await supabase
    .from('timetable')
    .select('*, subjects(name, code), sections(name, classes(name, level)), classes(name, level)')
    .eq('school_id', schoolId)
    .eq('teacher_id', userId)
    .order('day_of_week')
    .order('start_time')

  return data ?? []
}

// ── Attendance ───────────────────────────────────────────────

export async function getSectionStudents(sectionId: string): Promise<any> {
  const supabase = await createClient()
  const { schoolId } = await getTeacherInfo()

  const { data: section } = await supabase
    .from('sections')
    .select('class_id')
    .eq('id', sectionId)
    .single()

  const classId = section?.class_id

  const { data: sectionStudents } = await supabase
    .from('students')
    .select('id, admission_number, section_id, profiles!inner(id, first_name, last_name, avatar_url, gender)')
    .eq('school_id', schoolId)
    .eq('section_id', sectionId)
    .eq('is_active', true)
    .order('admission_number')

  const { data: classOnlyStudents } = classId
    ? await supabase
        .from('students')
        .select('id, admission_number, section_id, profiles!inner(id, first_name, last_name, avatar_url, gender)')
        .eq('school_id', schoolId)
        .eq('class_id', classId)
        .is('section_id', null)
        .eq('is_active', true)
        .order('admission_number')
    : { data: [] }

  const all = [
    ...(sectionStudents ?? []),
    ...(classOnlyStudents ?? []),
  ]
  return Array.from(new Map(all.map(s => [s.id, s])).values())
}

export async function getAttendanceForDate(sectionId: string, date: string): Promise<any> {
  const supabase = await createClient()
  const { schoolId } = await getTeacherInfo()
  const { data } = await supabase
    .from('attendance')
    .select('student_id, status, notes')
    .eq('school_id', schoolId)
    .eq('section_id', sectionId)
    .eq('date', date)
  return data ?? []
}

export async function markAttendance(data: {
  sectionId: string
  classId: string
  date: string
  records: { student_id: string; status: string; notes?: string }[]
}) {
  const supabase = await createClient()
  const { userId, schoolId } = await getTeacherInfo()

  const rows = data.records.map(r => ({
    school_id: schoolId,
    student_id: r.student_id,
    class_id: data.classId,
    section_id: data.sectionId,
    date: data.date,
    status: r.status,
    marked_by: userId,
    notes: r.notes ?? null,
  }))

  const { error } = await supabase
    .from('attendance')
    .upsert(rows, { onConflict: 'student_id,date' })

  if (error) throw new Error(error.message)
  revalidatePath('/teacher/attendance')
}

export async function getSectionAttendanceStats(sectionId: string): Promise<any> {
  const supabase = await createClient()
  const { schoolId } = await getTeacherInfo()
  const today = new Date().toISOString().split('T')[0]
  const startOfWeek = new Date(Date.now() - new Date().getDay() * 86400000).toISOString().split('T')[0]

  const [studentsResult, todayResult, weekResult, allResult] = await Promise.all([
    supabase
      .from('students')
      .select('id', { count: 'exact', head: true })
      .eq('school_id', schoolId)
      .eq('section_id', sectionId)
      .eq('is_active', true),
    supabase
      .from('attendance')
      .select('status')
      .eq('school_id', schoolId)
      .eq('section_id', sectionId)
      .eq('date', today),
    supabase
      .from('attendance')
      .select('status, date')
      .eq('school_id', schoolId)
      .eq('section_id', sectionId)
      .gte('date', startOfWeek)
      .lte('date', today),
    supabase
      .from('attendance')
      .select('status')
      .eq('school_id', schoolId)
      .eq('section_id', sectionId),
  ])

  const totalStudents = studentsResult.count ?? 0
  const todayRecords = todayResult.data ?? []
  const weekRecords = weekResult.data ?? []
  const allRecords = allResult.data ?? []

  const todayPresent = todayRecords.filter(r => r.status === 'present').length
  const todayAbsent = todayRecords.filter(r => r.status === 'absent').length
  const todayLate = todayRecords.filter(r => r.status === 'late').length
  const todayMarked = todayRecords.length

  const weekPresent = weekRecords.filter(r => r.status === 'present').length
  const weekTotal = weekRecords.length

  const allPresent = allRecords.filter(r => r.status === 'present').length
  const allTotal = allRecords.length
  const overallPercentage = allTotal > 0 ? Math.round((allPresent / allTotal) * 100) : 0

  return {
    totalStudents,
    todayMarked,
    todayPresent,
    todayAbsent,
    todayLate,
    weekPresent,
    weekTotal,
    overallPercentage,
    todayPercentage: todayMarked > 0 ? Math.round((todayPresent / todayMarked) * 100) : 0,
  }
}

export async function getSectionAllAttendance(sectionId: string): Promise<any> {
  const supabase = await createClient()
  const { schoolId } = await getTeacherInfo()

  const { data, error } = await supabase
    .from('attendance')
    .select('date, status, student_id')
    .eq('school_id', schoolId)
    .eq('section_id', sectionId)
    .order('date', { ascending: false })
    .limit(500)

  if (error) throw new Error(error.message)

  const perStudent: Record<string, { date: string; status: 'present' | 'absent' | 'late' | 'excused' }[]> = {}
  for (const r of data ?? []) {
    if (!perStudent[r.student_id]) perStudent[r.student_id] = []
    perStudent[r.student_id].push({
      date: r.date,
      status: r.status as 'present' | 'absent' | 'late' | 'excused',
    })
  }

  return { records: data ?? [], perStudent }
}

// ── Assignments ──────────────────────────────────────────────

export async function getAssignments(): Promise<any> {
  const supabase = await createClient()
  const { userId, schoolId } = await getTeacherInfo()
  const { data } = await supabase
    .from('assignments')
    .select('*, classes(name, level), subjects(name), sections(name)')
    .eq('school_id', schoolId)
    .eq('teacher_id', userId)
    .order('created_at', { ascending: false })
  return data ?? []
}

export async function getAssignment(id: string): Promise<any> {
  const supabase = await createClient()
  const { userId, schoolId } = await getTeacherInfo()
  const { data } = await supabase
    .from('assignments')
    .select('*, classes(name, level), subjects(name), sections(name)')
    .eq('id', id)
    .eq('school_id', schoolId)
    .eq('teacher_id', userId)
    .single()
  return data
}

export async function getSubmissions(assignmentId: string): Promise<any> {
  const supabase = await createClient()
  const { schoolId } = await getTeacherInfo()
  const { data } = await supabase
    .from('submissions')
    .select('*, students!inner(id, admission_number, profiles!inner(first_name, last_name, avatar_url))')
    .eq('school_id', schoolId)
    .eq('assignment_id', assignmentId)
    .order('submitted_at', { ascending: false })
  return data ?? []
}

export async function createAssignment(data: {
  title: string
  description?: string
  class_id: string
  section_id?: string
  subject_id: string
  due_date: string
  max_marks: number
  attachments?: { name: string; url: string; type: string }[]
}) {
  const supabase = await createClient()
  const { userId, schoolId } = await getTeacherInfo()
  const { error } = await supabase.from('assignments').insert({
    school_id: schoolId,
    teacher_id: userId,
    title: data.title,
    description: data.description ?? null,
    class_id: data.class_id,
    section_id: data.section_id ?? null,
    subject_id: data.subject_id,
    due_date: data.due_date,
    max_marks: data.max_marks,
    attachments: data.attachments ?? [],
  })
  if (error) throw new Error(error.message)
  revalidatePath('/teacher/assignments')
}

export async function gradeSubmission(submissionId: string, marks: number, feedback: string) {
  const supabase = await createClient()
  const { schoolId } = await getTeacherInfo()
  const { error } = await supabase
    .from('submissions')
    .update({ marks, feedback, status: 'graded', graded_by: (await supabase.auth.getUser()).data.user?.id, graded_at: new Date().toISOString() })
    .eq('id', submissionId)
    .eq('school_id', schoolId)
  if (error) throw new Error(error.message)
  revalidatePath('/teacher/assignments')
}

// ── Exams ────────────────────────────────────────────────────

export async function createTeacherExam(data: {
  name: string
  exam_type: 'midterm' | 'final' | 'quiz' | 'assignment' | 'cat'
  class_id: string
  term_id: string
  start_date?: string
  end_date?: string
  total_marks: number
  pass_marks: number
  is_online?: boolean
  instructions?: string
  subjects: { subject_id: string; max_marks: number; pass_marks: number; exam_date?: string; duration_minutes?: number }[]
}) {
  const supabase = await createClient()
  const { userId, schoolId } = await getTeacherInfo()

  const { data: exam, error: examError } = await supabase
    .from('exams')
    .insert({
      school_id: schoolId,
      name: data.name,
      exam_type: data.exam_type,
      class_id: data.class_id,
      term_id: data.term_id,
      start_date: data.start_date ?? null,
      end_date: data.end_date ?? null,
      total_marks: data.total_marks,
      pass_marks: data.pass_marks,
      is_online: data.is_online ?? false,
      instructions: data.instructions ?? null,
      created_by: userId,
    })
    .select('id')
    .single()

  if (examError) throw new Error(examError.message)

  const subjectRows = data.subjects.map(s => ({
    exam_id: exam.id,
    subject_id: s.subject_id,
    school_id: schoolId,
    max_marks: s.max_marks,
    pass_marks: s.pass_marks,
    exam_date: s.exam_date ?? null,
    duration_minutes: s.duration_minutes ?? 120,
  }))

  const { error: subjError } = await supabase.from('exam_subjects').insert(subjectRows)
  if (subjError) throw new Error(subjError.message)

  revalidatePath('/teacher/exams')
  return exam
}

export async function getTeacherExams(): Promise<any> {
  const supabase = await createClient()
  const { userId, schoolId } = await getTeacherInfo()

  const { data: subjects } = await supabase
    .from('teacher_subjects')
    .select('subject_id')
    .eq('school_id', schoolId)
    .eq('teacher_id', userId)

  const subjectIds = subjects?.map(s => s.subject_id) ?? []

  if (!subjectIds.length) return []

  const { data: exams } = await supabase
    .from('exams')
    .select('*, classes(name, level), terms(name), exam_subjects(*, subjects(name, code))')
    .eq('school_id', schoolId)
    .in('id', (
      await supabase
        .from('exam_subjects')
        .select('exam_id')
        .in('subject_id', subjectIds)
    ).data?.map(es => es.exam_id) ?? [])
    .order('start_date', { ascending: false })

  return exams?.filter(e =>
    e.exam_subjects?.some((es: any) => subjectIds.includes(es.subject_id))
  ) ?? []
}

export async function getStudentsForMarks(examId: string, subjectId: string): Promise<any> {
  const supabase = await createClient()
  const { schoolId } = await getTeacherInfo()

  const { data: exam } = await supabase
    .from('exams')
    .select('class_id, exam_subjects!inner(max_marks, pass_marks)')
    .eq('id', examId)
    .eq('exam_subjects.subject_id', subjectId)
    .single()

  if (!exam) throw new Error('Exam not found')

  const { data: students } = await supabase
    .from('students')
    .select('id, admission_number, profiles!inner(first_name, last_name)')
    .eq('school_id', schoolId)
    .eq('class_id', exam.class_id)
    .eq('is_active', true)
    .order('admission_number')

  const { data: existingResults } = await supabase
    .from('results')
    .select('student_id, marks_obtained, grade, remarks')
    .eq('exam_id', examId)
    .eq('subject_id', subjectId)

  return {
    students: students ?? [],
    results: existingResults ?? [],
    maxMarks: exam.exam_subjects[0].max_marks,
    passMarks: exam.exam_subjects[0].pass_marks,
  }
}

export async function saveMarks(data: {
  examId: string
  subjectId: string
  marks: { student_id: string; marks_obtained: number }[]
}) {
  const supabase = await createClient()
  const { userId, schoolId } = await getTeacherInfo()

  for (const mark of data.marks) {
    const percentage = mark.marks_obtained
    let grade = 'F'
    if (percentage >= 80) grade = 'A'
    else if (percentage >= 65) grade = 'B'
    else if (percentage >= 50) grade = 'C'
    else if (percentage >= 40) grade = 'D'

    const existing = await supabase
      .from('results')
      .select('id')
      .eq('exam_id', data.examId)
      .eq('subject_id', data.subjectId)
      .eq('student_id', mark.student_id)
      .single()

    if (existing.data) {
      await supabase
        .from('results')
        .update({
          marks_obtained: mark.marks_obtained,
          percentage,
          grade,
          entered_by: userId,
        })
        .eq('id', existing.data.id)
    } else {
      await supabase
        .from('results')
        .insert({
          school_id: schoolId,
          exam_id: data.examId,
          subject_id: data.subjectId,
          student_id: mark.student_id,
          marks_obtained: mark.marks_obtained,
          percentage,
          grade,
          entered_by: userId,
        })
    }
  }

  revalidatePath(`/teacher/exams/${data.examId}/marks`)
}

export async function publishResults(examId: string, subjectId: string) {
  const supabase = await createClient()
  const { schoolId } = await getTeacherInfo()
  const { error } = await supabase
    .from('results')
    .update({ is_published: true })
    .eq('exam_id', examId)
    .eq('subject_id', subjectId)
    .eq('school_id', schoolId)
  if (error) throw new Error(error.message)
  revalidatePath(`/teacher/exams/${examId}/marks`)
}

// ── Materials ────────────────────────────────────────────────

export async function getTeachersSubjects(): Promise<any> {
  const supabase = await createClient()
  const { userId, schoolId } = await getTeacherInfo()

  const { data } = await supabase
    .from('teacher_subjects')
    .select('subject_id, subjects!inner(id, name, code)')
    .eq('school_id', schoolId)
    .eq('teacher_id', userId)

  return data?.map((ts: any) => ts.subjects) ?? []
}

export async function getSubjectsByClass(classId: string): Promise<any> {
  const supabase = await createClient()
  const { schoolId } = await getTeacherInfo()
  const { data } = await supabase
    .from('subjects')
    .select('id, name, code')
    .eq('class_id', classId)
    .eq('school_id', schoolId)
    .eq('is_active', true)
    .order('name')
  return data ?? []
}

export async function getMaterials(): Promise<any> {
  const supabase = await createClient()
  const { userId, schoolId } = await getTeacherInfo()

  const { data: courses } = await supabase
    .from('courses')
    .select('id, title, subject_id, subjects!inner(name, code), class_id, classes(name, level)')
    .eq('school_id', schoolId)
    .eq('teacher_id', userId)
    .order('created_at', { ascending: false })

  const courseIds = courses?.map(c => c.id) ?? []

  if (!courseIds.length) return []

  const { data: materials } = await supabase
    .from('course_materials')
    .select('*')
    .in('course_id', courseIds)
    .order('created_at', { ascending: false })

  return { courses, materials }
}

export async function createCourse(data: { title: string; subject_id: string; class_id: string }) {
  const supabase = await createClient()
  const { userId, schoolId } = await getTeacherInfo()
  const { error } = await supabase.from('courses').insert({
    school_id: schoolId,
    teacher_id: userId,
    title: data.title,
    subject_id: data.subject_id,
    class_id: data.class_id,
    is_published: true,
  })
  if (error) throw new Error(error.message)
  revalidatePath('/teacher/materials')
}

export async function createMaterial(data: {
  course_id: string
  title: string
  type: string
  content_url?: string
  content?: string
}) {
  const supabase = await createClient()
  const { schoolId } = await getTeacherInfo()
  const { error } = await supabase.from('course_materials').insert({
    course_id: data.course_id,
    school_id: schoolId,
    title: data.title,
    type: data.type as any,
    content_url: data.content_url ?? null,
    content: data.content ?? null,
  })
  if (error) throw new Error(error.message)
  revalidatePath('/teacher/materials')
}

// ── Messages ─────────────────────────────────────────────────

export async function getMessages(): Promise<any> {
  const supabase = await createClient()
  const { userId, schoolId } = await getTeacherInfo()

  const { data: sent } = await supabase
    .from('messages')
    .select('*, profiles!messages_sender_id_fkey(first_name, last_name, avatar_url), profiles!messages_recipient_id_fkey(first_name, last_name, avatar_url)')
    .eq('school_id', schoolId)
    .eq('sender_id', userId)
    .order('created_at', { ascending: false })
    .limit(50)

  const { data: received } = await supabase
    .from('messages')
    .select('*, profiles!messages_sender_id_fkey(first_name, last_name, avatar_url), profiles!messages_recipient_id_fkey(first_name, last_name, avatar_url)')
    .eq('school_id', schoolId)
    .eq('recipient_id', userId)
    .order('created_at', { ascending: false })
    .limit(50)

  return {
    sent: sent ?? [],
    received: received ?? [],
  }
}

export async function getParents(): Promise<any> {
  const supabase = await createClient()
  const { schoolId } = await getTeacherInfo()

  const { data } = await supabase
    .from('parents')
    .select('id, profiles!inner(first_name, last_name, email)')
    .eq('school_id', schoolId)

  return data ?? []
}

export async function getStudentsWithParents(): Promise<any> {
  const supabase = await createClient()
  const { userId, schoolId } = await getTeacherInfo()

  const { data: sections } = await supabase
    .from('teacher_subjects')
    .select('section_id')
    .eq('school_id', schoolId)
    .eq('teacher_id', userId)

  const sectionIds = sections?.map(s => s.section_id).filter(Boolean) ?? []

  if (!sectionIds.length) return []

  const { data } = await supabase
    .from('students')
    .select('id, admission_number, section_id, sections!inner(id, name, classes!inner(id, name, level)), profiles!inner(first_name, last_name), parent_student!inner(parent_id, profiles!parent_student_parent_id_fkey(first_name, last_name))')
    .eq('school_id', schoolId)
    .in('section_id', sectionIds)
    .eq('is_active', true)

  return data ?? []
}

export async function sendMessage(data: {
  recipient_id: string
  subject?: string
  content: string
}) {
  const supabase = await createClient()
  const { userId, schoolId } = await getTeacherInfo()
  const { error } = await supabase.from('messages').insert({
    school_id: schoolId,
    sender_id: userId,
    recipient_id: data.recipient_id,
    subject: data.subject ?? null,
    content: data.content,
  })
  if (error) throw new Error(error.message)
  revalidatePath('/teacher/messages')
}

export async function markMessageRead(messageId: string) {
  const supabase = await createClient()
  const { userId } = await getTeacherInfo()
  await supabase
    .from('messages')
    .update({ is_read: true, read_at: new Date().toISOString() })
    .eq('id', messageId)
    .eq('recipient_id', userId)
}

export async function getUnreadMessageCount(): Promise<any> {
  const supabase = await createClient()
  const { userId } = await getTeacherInfo()
  const { count } = await supabase
    .from('messages')
    .select('*', { count: 'exact', head: true })
    .eq('recipient_id', userId)
    .eq('is_read', false)
  return count ?? 0
}

// ── Profile ─────────────────────────────────────────────────

export async function getTeacherProfile(): Promise<any> {
  const supabase = await createClient()
  const { userId, schoolId } = await getTeacherInfo()

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()

  const { data: teacher } = await supabase
    .from('teachers')
    .select('*')
    .eq('id', userId)
    .single()

  return { profile, teacher }
}

export async function updateTeacherProfile(data: {
  first_name: string
  last_name: string
  phone?: string
  avatar_url?: string
}) {
  const supabase = await createClient()
  const { userId } = await getTeacherInfo()

  const { error } = await supabase
    .from('profiles')
    .update({
      first_name: data.first_name,
      last_name: data.last_name,
      phone: data.phone ?? null,
      avatar_url: data.avatar_url ?? null,
    })
    .eq('id', userId)

  if (error) throw new Error(error.message)
  revalidatePath('/teacher/profile')
}
