'use server'

import { createClient, createServiceClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

async function getSchoolId() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  const { data } = await supabase
    .from('profiles')
    .select('school_id')
    .eq('id', user.id)
    .single()
  if (!data?.school_id) throw new Error('No school assigned')
  return data.school_id as string
}

// ── Dashboard ────────────────────────────────────────────────

export async function getDashboardStats(): Promise<any> {
  const supabase = await createClient()
  const schoolId = await getSchoolId()
  const today = new Date().toISOString().split('T')[0]

  const [{ count: totalStudents }, { count: totalTeachers }, { count: totalClasses }] =
    await Promise.all([
      supabase.from('students').select('*', { count: 'exact', head: true }).eq('school_id', schoolId).eq('is_active', true),
      supabase.from('teachers').select('*', { count: 'exact', head: true }).eq('school_id', schoolId).eq('is_active', true),
      supabase.from('classes').select('*', { count: 'exact', head: true }).eq('school_id', schoolId),
    ])

  const { data: todayAttendance } = await supabase
    .from('attendance')
    .select('status')
    .eq('school_id', schoolId)
    .eq('date', today)

  const present = todayAttendance?.filter(a => a.status === 'present').length ?? 0
  const absent = todayAttendance?.filter(a => a.status === 'absent').length ?? 0

  const { data: todayPayments } = await supabase
    .from('payments')
    .select('amount')
    .eq('school_id', schoolId)
    .gte('paid_at', today)

  const feesCollected = todayPayments?.reduce((s, p) => s + Number(p.amount), 0) ?? 0

  const { data: pendingInvoices } = await supabase
    .from('fee_invoices')
    .select('balance')
    .eq('school_id', schoolId)
    .in('status', ['pending', 'partial'])

  const pendingFees = pendingInvoices?.reduce((s, i) => s + Number(i.balance), 0) ?? 0

  const { count: recentStudents } = await supabase
    .from('students')
    .select('*', { count: 'exact', head: true })
    .eq('school_id', schoolId)
    .gte('enrollment_date', new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0])

  const { data: currentYear } = await supabase
    .from('academic_years')
    .select('id')
    .eq('school_id', schoolId)
    .eq('is_current', true)
    .single()

  return {
    totalStudents: totalStudents ?? 0,
    totalTeachers: totalTeachers ?? 0,
    totalClasses: totalClasses ?? 0,
    present,
    absent,
    feesCollected,
    pendingFees,
    recentStudents: recentStudents ?? 0,
    currentAcademicYearId: currentYear?.id ?? null,
  }
}

export async function getWeeklyAttendance(): Promise<any> {
  const supabase = await createClient()
  const schoolId = await getSchoolId()
  const days = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000)
    days.push(d.toISOString().split('T')[0])
  }
  const { data } = await supabase
    .from('attendance')
    .select('date, status')
    .eq('school_id', schoolId)
    .in('date', days)

  return days.map(date => ({
    date,
    present: data?.filter(a => a.date === date && a.status === 'present').length ?? 0,
    absent: data?.filter(a => a.date === date && a.status === 'absent').length ?? 0,
  }))
}

export async function getMonthlyFees(): Promise<any> {
  const supabase = await createClient()
  const schoolId = await getSchoolId()
  const months = []
  for (let i = 5; i >= 0; i--) {
    const d = new Date()
    d.setMonth(d.getMonth() - i)
    months.push({ month: d.toLocaleString('default', { month: 'short' }), year: d.getFullYear(), m: d.getMonth() + 1 })
  }
  const year = new Date().getFullYear()
  const { data: payments } = await supabase
    .from('payments')
    .select('amount, paid_at')
    .eq('school_id', schoolId)
    .gte('paid_at', `${year - 1}-01-01`)

  return months.map(({ month, m, year: y }) => ({
    month,
    collected: payments?.filter(p => {
      const d = new Date(p.paid_at)
      return d.getMonth() + 1 === m && d.getFullYear() === y
    }).reduce((s, p) => s + Number(p.amount), 0) ?? 0,
  }))
}

// ── Academic Years ────────────────────────────────────────────

export async function getAcademicYears(): Promise<any> {
  const supabase = await createClient()
  const schoolId = await getSchoolId()
  const { data } = await supabase
    .from('academic_years')
    .select('*')
    .eq('school_id', schoolId)
    .order('start_date', { ascending: false })
  return data ?? []
}

export async function createAcademicYear(data: { name: string; start_date: string; end_date: string }) {
  const supabase = await createClient()
  const schoolId = await getSchoolId()

  // Check if this school already has a current year
  const { data: existingCurrent } = await supabase
    .from('academic_years')
    .select('id')
    .eq('school_id', schoolId)
    .eq('is_current', true)
    .maybeSingle()

  const isCurrent = !existingCurrent

  const { error } = await supabase.from('academic_years').insert({
    ...data,
    school_id: schoolId,
    is_current: isCurrent,
  })
  if (error) throw new Error(error.message)
  revalidatePath('/school-admin/academic')
}

export async function updateAcademicYear(id: string, data: { name?: string; start_date?: string; end_date?: string }) {
  const supabase = await createClient()
  const schoolId = await getSchoolId()
  const { error } = await supabase.from('academic_years').update(data).eq('id', id).eq('school_id', schoolId)
  if (error) throw new Error(error.message)
  revalidatePath('/school-admin/academic')
}

export async function deleteAcademicYear(id: string) {
  const supabase = await createClient()
  const schoolId = await getSchoolId()
  const { error } = await supabase.from('academic_years').delete().eq('id', id).eq('school_id', schoolId)
  if (error) throw new Error(error.message)
  revalidatePath('/school-admin/academic')
}

export async function setCurrentAcademicYear(id: string) {
  const supabase = await createClient()
  const schoolId = await getSchoolId()
  await supabase.from('academic_years').update({ is_current: false }).eq('school_id', schoolId)
  const { error } = await supabase.from('academic_years').update({ is_current: true }).eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/school-admin/academic')
}

// ── Terms ────────────────────────────────────────────────────

export async function getTerms(academicYearId: string): Promise<any> {
  const supabase = await createClient()
  const schoolId = await getSchoolId()
  const { data } = await supabase
    .from('terms')
    .select('*')
    .eq('school_id', schoolId)
    .eq('academic_year_id', academicYearId)
    .order('start_date')
  return data ?? []
}

export async function createTerm(data: { name: string; start_date: string; end_date: string; academic_year_id: string }) {
  const supabase = await createClient()
  const schoolId = await getSchoolId()
  const { error } = await supabase.from('terms').insert({ ...data, school_id: schoolId })
  if (error) throw new Error(error.message)
  revalidatePath('/school-admin/academic')
}

export async function updateTerm(id: string, data: { name?: string; start_date?: string; end_date?: string }) {
  const supabase = await createClient()
  const schoolId = await getSchoolId()
  const { error } = await supabase.from('terms').update(data).eq('id', id).eq('school_id', schoolId)
  if (error) throw new Error(error.message)
  revalidatePath('/school-admin/academic')
}

export async function deleteTerm(id: string) {
  const supabase = await createClient()
  const schoolId = await getSchoolId()
  const { error } = await supabase.from('terms').delete().eq('id', id).eq('school_id', schoolId)
  if (error) throw new Error(error.message)
  revalidatePath('/school-admin/academic')
}

export async function setCurrentTerm(id: string) {
  const supabase = await createClient()
  const schoolId = await getSchoolId()
  const { data: term } = await supabase.from('terms').select('academic_year_id').eq('id', id).single()
  if (term) {
    await supabase.from('terms').update({ is_current: false }).eq('school_id', schoolId).eq('academic_year_id', term.academic_year_id)
  }
  const { error } = await supabase.from('terms').update({ is_current: true }).eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/school-admin/academic')
}

export async function getCurrentAcademicYear(): Promise<any> {
  const supabase = await createClient()
  const schoolId = await getSchoolId()
  const { data } = await supabase
    .from('academic_years')
    .select('id, name')
    .eq('school_id', schoolId)
    .eq('is_current', true)
    .single()
  return data ?? null
}

export async function getCurrentTerm(): Promise<any> {
  const supabase = await createClient()
  const schoolId = await getSchoolId()
  const { data } = await supabase
    .from('terms')
    .select('id, name')
    .eq('school_id', schoolId)
    .eq('is_current', true)
    .single()
  return data ?? null
}

// ── Classes ──────────────────────────────────────────────────

export async function getClasses(): Promise<any> {
  const supabase = await createClient()
  const schoolId = await getSchoolId()

  // Get all classes with sections
  const { data: classes } = await supabase
    .from('classes')
    .select('*, academic_years(name, is_current), sections(*)')
    .eq('school_id', schoolId)
    .order('level')

  // Get student counts per section
  const { data: studentCounts } = await supabase
    .from('students')
    .select('section_id', { count: 'exact', head: false })
    .eq('school_id', schoolId)
    .eq('is_active', true)

  const countMap = new Map<string, number>()
  studentCounts?.forEach((s: any) => {
    countMap.set(s.section_id, (countMap.get(s.section_id) ?? 0) + 1)
  })

  // Get teacher names for class_teacher_id references
  const { data: teachers } = await supabase
    .from('profiles')
    .select('id, first_name, last_name, avatar_url')
    .eq('school_id', schoolId)
    .in('role', ['teacher'])

  const teacherMap = new Map<string, any>()
  teachers?.forEach((t: any) => {
    teacherMap.set(t.id, t)
  })

  // Enrich sections with student count and teacher name
  const enriched = classes?.map((cls: any) => ({
    ...cls,
    sections: cls.sections?.map((sec: any) => ({
      ...sec,
      student_count: countMap.get(sec.id) ?? 0,
      class_teacher: sec.class_teacher_id ? teacherMap.get(sec.class_teacher_id) ?? null : null,
    })) ?? [],
  })) ?? []

  return enriched
}

export async function createClass(data: { name: string; level: number; description?: string }) {
  const supabase = await createClient()
  const schoolId = await getSchoolId()
  const { data: year } = await supabase
    .from('academic_years')
    .select('id')
    .eq('school_id', schoolId)
    .eq('is_current', true)
    .single()
  if (!year) throw new Error('No current academic year set')
  const { error } = await supabase.from('classes').insert({
    ...data,
    school_id: schoolId,
    academic_year_id: year.id,
  })
  if (error) throw new Error(error.message)
  revalidatePath('/school-admin/classes')
}

export async function updateClass(id: string, data: { name?: string; level?: number; description?: string }) {
  const supabase = await createClient()
  const schoolId = await getSchoolId()
  const { error } = await supabase.from('classes').update(data).eq('id', id).eq('school_id', schoolId)
  if (error) throw new Error(error.message)
  revalidatePath('/school-admin/classes')
}

export async function deleteClass(id: string) {
  const supabase = await createClient()
  const schoolId = await getSchoolId()
  const { error } = await supabase.from('classes').delete().eq('id', id).eq('school_id', schoolId)
  if (error) throw new Error(error.message)
  revalidatePath('/school-admin/classes')
}

// ── Sections ─────────────────────────────────────────────────

export async function createSection(data: { class_id: string; name: string; capacity?: number; room?: string }) {
  const supabase = await createClient()
  const schoolId = await getSchoolId()
  const { error } = await supabase.from('sections').insert({
    ...data,
    school_id: schoolId,
    capacity: data.capacity ?? 40,
  })
  if (error) throw new Error(error.message)
  revalidatePath('/school-admin/classes')
}

export async function updateSection(id: string, data: { name?: string; capacity?: number; room?: string; class_teacher_id?: string | null }) {
  const supabase = await createClient()
  const serviceClient = createServiceClient()
  const schoolId = await getSchoolId()

  const { data: existing } = await supabase
    .from('sections')
    .select('class_teacher_id')
    .eq('id', id)
    .eq('school_id', schoolId)
    .single()

  if (!existing) throw new Error('Section not found')

  const { error } = await supabase.from('sections').update(data).eq('id', id).eq('school_id', schoolId)
  if (error) throw new Error(error.message)

  // Verify the update took effect
  if ('class_teacher_id' in data) {
    const { data: updated } = await supabase
      .from('sections')
      .select('class_teacher_id')
      .eq('id', id)
      .single()

    if (updated?.class_teacher_id !== data.class_teacher_id) {
      throw new Error('Failed to update class teacher — DB write did not persist')
    }

    // Notify newly assigned teacher
    if (data.class_teacher_id && data.class_teacher_id !== existing.class_teacher_id) {
      const { data: section } = await supabase
        .from('sections')
        .select('name, classes!inner(name)')
        .eq('id', id)
        .single()

      if (section) {
        await serviceClient.from('notifications').insert({
          school_id: schoolId,
          user_id: data.class_teacher_id,
          title: 'Class Teacher Assignment',
          body: `You have been assigned as class teacher for ${section.classes?.name} - Section ${section.name}`,
          type: 'info',
          action_url: `/teacher/my-classes/${id}`,
          metadata: { section_id: id, type: 'class_teacher_assignment' },
        })
      }
    }
  }

  revalidatePath('/school-admin/classes')
  revalidatePath('/teacher/my-classes')
  revalidatePath('/teacher/attendance')
}

export async function deleteSection(id: string) {
  const supabase = await createClient()
  const schoolId = await getSchoolId()
  const { error } = await supabase.from('sections').delete().eq('id', id).eq('school_id', schoolId)
  if (error) throw new Error(error.message)
  revalidatePath('/school-admin/classes')
}

// ── Students ─────────────────────────────────────────────────

export async function getStudents(): Promise<any> {
  const supabase = await createClient()
  const schoolId = await getSchoolId()
  const { data } = await supabase
    .from('students')
    .select('*, profiles!inner(*), classes!inner(name, level), sections!inner(name)')
    .eq('school_id', schoolId)
    .order('created_at', { ascending: false })
  return data ?? []
}

export async function getStudent(id: string): Promise<any> {
  const supabase = await createClient()
  const schoolId = await getSchoolId()
  const { data } = await supabase
    .from('students')
    .select('*, profiles!inner(*), classes!inner(name, level), sections!inner(name)')
    .eq('id', id)
    .eq('school_id', schoolId)
    .single()
  return data
}

export async function getStudentsByClass(classId: string): Promise<any> {
  const supabase = await createClient()
  const schoolId = await getSchoolId()
  const { data } = await supabase
    .from('students')
    .select('*, profiles!inner(*)')
    .eq('school_id', schoolId)
    .eq('class_id', classId)
    .order('created_at', { ascending: false })
  return data ?? []
}

export async function createStudent(data: {
  email: string
  password: string
  first_name: string
  last_name: string
  phone?: string
  gender?: string
  date_of_birth?: string
  admission_number: string
  class_id: string
  section_id?: string
  parent_first_name?: string
  parent_last_name?: string
  parent_email?: string
  parent_phone?: string
}) {
  const supabase = await createClient()
  const serviceClient = createServiceClient()
  const schoolId = await getSchoolId()

  const { data: authData, error: authError } = await serviceClient.auth.admin.createUser({
    email: data.email,
    password: data.password,
    email_confirm: true,
    user_metadata: { first_name: data.first_name, last_name: data.last_name, role: 'student' },
  })
  if (authError) throw new Error(authError.message)

  const { error: profileError } = await serviceClient.from('profiles').upsert({
    id: authData.user.id,
    first_name: data.first_name,
    last_name: data.last_name,
    phone: data.phone ?? null,
    email: data.email,
    gender: data.gender as any ?? null,
    date_of_birth: data.date_of_birth ?? null,
    school_id: schoolId,
    role: 'student',
  }, { onConflict: 'id' })

  if (profileError) {
    await serviceClient.auth.admin.deleteUser(authData.user.id)
    throw new Error(profileError.message)
  }

  let resolvedSectionId = data.section_id ?? null
  if (!resolvedSectionId && data.class_id) {
    const { data: firstSection } = await supabase
      .from('sections')
      .select('id')
      .eq('class_id', data.class_id)
      .eq('school_id', schoolId)
      .order('name', { ascending: true })
      .limit(1)
      .maybeSingle()
    if (firstSection) resolvedSectionId = firstSection.id
  }

  const { error: studentError } = await supabase.from('students').insert({
    id: authData.user.id,
    school_id: schoolId,
    admission_number: data.admission_number,
    class_id: data.class_id,
    section_id: resolvedSectionId,
    enrollment_date: new Date().toISOString().split('T')[0],
  })
  if (studentError) {
    await serviceClient.auth.admin.deleteUser(authData.user.id)
    throw new Error(studentError.message)
  }

  if (data.parent_email && data.parent_first_name && data.parent_last_name) {
    const { data: parentAuth, error: parentAuthError } = await serviceClient.auth.admin.createUser({
      email: data.parent_email,
      password: data.password,
      email_confirm: true,
      user_metadata: { first_name: data.parent_first_name, last_name: data.parent_last_name, role: 'parent' },
    })
    if (!parentAuthError && parentAuth) {
      await serviceClient.from('profiles').upsert({
        id: parentAuth.user.id,
        first_name: data.parent_first_name,
        last_name: data.parent_last_name,
        phone: data.parent_phone ?? null,
        email: data.parent_email,
        school_id: schoolId,
        role: 'parent',
      }, { onConflict: 'id' })

      await supabase.from('parents').insert({ id: parentAuth.user.id, school_id: schoolId })
      await supabase.from('parent_student').insert({
        parent_id: parentAuth.user.id,
        student_id: authData.user.id,
        school_id: schoolId,
        is_primary: true,
      })
    }
  }

  revalidatePath('/school-admin/students')
  return authData.user.id
}

export async function updateStudent(id: string, data: {
  class_id?: string
  section_id?: string | null
  is_active?: boolean
  status?: string
}) {
  const supabase = await createClient()
  const schoolId = await getSchoolId()
  const { error } = await supabase.from('students').update(data).eq('id', id).eq('school_id', schoolId)
  if (error) throw new Error(error.message)
  revalidatePath('/school-admin/students')
}

export async function deleteStudent(id: string) {
  const supabase = await createClient()
  const schoolId = await getSchoolId()
  const { error } = await supabase.from('students').delete().eq('id', id).eq('school_id', schoolId)
  if (error) throw new Error(error.message)
  revalidatePath('/school-admin/students')
}

// ── Teachers ─────────────────────────────────────────────────

export async function getTeachers(): Promise<any> {
  const supabase = await createClient()
  const schoolId = await getSchoolId()
  const { data } = await supabase
    .from('teachers')
    .select('*, profiles!inner(*), teacher_subjects(*, subjects(*))')
    .eq('school_id', schoolId)
    .order('created_at', { ascending: false })
  return data ?? []
}

export async function getTeacher(id: string): Promise<any> {
  const supabase = await createClient()
  const schoolId = await getSchoolId()
  const { data } = await supabase
    .from('teachers')
    .select('*, profiles!inner(*), teacher_subjects(*, subjects(*))')
    .eq('id', id)
    .eq('school_id', schoolId)
    .single()
  return data
}

export async function createTeacher(data: {
  email: string
  password: string
  first_name: string
  last_name: string
  phone?: string
  employee_number?: string
  department?: string
  qualification?: string
  specialization?: string
  joining_date?: string
  salary?: number
  subject_ids?: string[]
}) {
  const supabase = await createClient()
  const serviceClient = createServiceClient()
  const schoolId = await getSchoolId()

  const { data: authData, error: authError } = await serviceClient.auth.admin.createUser({
    email: data.email,
    password: data.password,
    email_confirm: true,
    user_metadata: { first_name: data.first_name, last_name: data.last_name, role: 'teacher' },
  })
  if (authError) throw new Error(authError.message)

  const { error: profileError } = await serviceClient.from('profiles').upsert({
    id: authData.user.id,
    first_name: data.first_name,
    last_name: data.last_name,
    phone: data.phone ?? null,
    email: data.email,
    school_id: schoolId,
    role: 'teacher',
  }, { onConflict: 'id' })

  if (profileError) {
    await serviceClient.auth.admin.deleteUser(authData.user.id)
    throw new Error(profileError.message)
  }

  const { error: teacherError } = await supabase.from('teachers').insert({
    id: authData.user.id,
    school_id: schoolId,
    employee_number: data.employee_number ?? null,
    department: data.department ?? null,
    qualification: data.qualification ?? null,
    specialization: data.specialization ?? null,
    joining_date: data.joining_date ?? null,
    salary: data.salary ?? null,
  })
  if (teacherError) {
    await serviceClient.auth.admin.deleteUser(authData.user.id)
    throw new Error(teacherError.message)
  }

  if (data.subject_ids?.length) {
    const subjectRows = data.subject_ids.flatMap(subject_id => {
      return [{ teacher_id: authData.user.id, subject_id, school_id: schoolId }]
    })
    const { error: subjError } = await supabase.from('teacher_subjects').insert(subjectRows)
    if (subjError) throw new Error(subjError.message)

    // Also link teacher to sections for each subject
    const { data: subjectsWithClasses } = await supabase
      .from('subjects')
      .select('id, class_id')
      .in('id', data.subject_ids)
      .not('class_id', 'is', null)

    const classIds = [...new Set(subjectsWithClasses?.map(s => s.class_id).filter(Boolean) ?? [])]
    if (classIds.length > 0) {
      const { data: sections } = await supabase
        .from('sections')
        .select('id')
        .in('class_id', classIds)
        .eq('school_id', schoolId)

      const sectionLinks = sections?.flatMap(sec =>
        data.subject_ids!.map(subject_id => ({
          teacher_id: authData.user.id,
          subject_id,
          section_id: sec.id,
          school_id: schoolId,
        }))
      ) ?? []

      if (sectionLinks.length > 0) {
        await supabase.from('teacher_subjects').upsert(sectionLinks, {
          onConflict: 'teacher_id, subject_id, section_id',
          ignoreDuplicates: true,
        })
      }
    }
  }

  revalidatePath('/school-admin/teachers')
  return authData.user.id
}

export async function updateTeacher(id: string, data: {
  department?: string
  qualification?: string
  specialization?: string
  salary?: number
  is_active?: boolean
  subject_ids?: string[]
}) {
  const supabase = await createClient()
  const schoolId = await getSchoolId()
  const { error } = await supabase.from('teachers').update({
    department: data.department,
    qualification: data.qualification,
    specialization: data.specialization,
    salary: data.salary,
    is_active: data.is_active,
  }).eq('id', id).eq('school_id', schoolId)
  if (error) throw new Error(error.message)

  if (data.subject_ids) {
    await supabase.from('teacher_subjects').delete().eq('teacher_id', id)
    if (data.subject_ids.length) {
      const rows = data.subject_ids.map(subject_id => ({ teacher_id: id, subject_id, school_id: schoolId }))
      await supabase.from('teacher_subjects').insert(rows)

      const { data: subjectsWithClasses } = await supabase
        .from('subjects')
        .select('id, class_id')
        .in('id', data.subject_ids)
        .not('class_id', 'is', null)

      const classIds = [...new Set(subjectsWithClasses?.map(s => s.class_id).filter(Boolean) ?? [])]
      if (classIds.length > 0) {
        const { data: sections } = await supabase
          .from('sections')
          .select('id')
          .in('class_id', classIds)
          .eq('school_id', schoolId)

        const sectionLinks = sections?.flatMap(sec =>
          data.subject_ids!.map(subject_id => ({
            teacher_id: id,
            subject_id,
            section_id: sec.id,
            school_id: schoolId,
          }))
        ) ?? []

        if (sectionLinks.length > 0) {
          await supabase.from('teacher_subjects').upsert(sectionLinks, {
            onConflict: 'teacher_id, subject_id, section_id',
            ignoreDuplicates: true,
          })
        }
      }
    }
  }

  revalidatePath('/school-admin/teachers')
}

export async function deleteTeacher(id: string) {
  const supabase = await createClient()
  const schoolId = await getSchoolId()
  await supabase.from('teacher_subjects').delete().eq('teacher_id', id)
  const { error } = await supabase.from('teachers').delete().eq('id', id).eq('school_id', schoolId)
  if (error) throw new Error(error.message)
  revalidatePath('/school-admin/teachers')
}

// ── Subjects ─────────────────────────────────────────────────

export async function getSubjects(): Promise<any> {
  const supabase = await createClient()
  const schoolId = await getSchoolId()
  const { data } = await supabase.from('subjects').select('*').eq('school_id', schoolId).order('name')
  return data ?? []
}

export async function createSubject(data: { name: string; code: string; description?: string; credit_hours?: number }) {
  const supabase = await createClient()
  const schoolId = await getSchoolId()
  const { error } = await supabase.from('subjects').insert({
    ...data,
    school_id: schoolId,
    credit_hours: data.credit_hours ?? 1,
  })
  if (error) throw new Error(error.message)
  revalidatePath('/school-admin/classes')
}

// ── Fees ─────────────────────────────────────────────────────

export async function getFeeStructures(): Promise<any> {
  const supabase = await createClient()
  const schoolId = await getSchoolId()
  const { data } = await supabase
    .from('fee_structures')
    .select('*, classes(name, level), terms(name), academic_years(name)')
    .eq('school_id', schoolId)
    .order('created_at', { ascending: false })
  return data ?? []
}

export async function createFeeStructure(data: {
  name: string
  fee_type: string
  amount: number
  academic_year_id: string
  term_id?: string
  class_id?: string
  due_date?: string
  description?: string
}) {
  const supabase = await createClient()
  const schoolId = await getSchoolId()
  const { error } = await supabase.from('fee_structures').insert({
    ...data,
    school_id: schoolId,
    fee_type: data.fee_type as any,
    due_date: data.due_date ?? null,
  })
  if (error) throw new Error(error.message)
  revalidatePath('/school-admin/fees')
}

export async function updateFeeStructure(id: string, data: {
  name?: string
  amount?: number
  due_date?: string
  is_active?: boolean
}) {
  const supabase = await createClient()
  const schoolId = await getSchoolId()
  const { error } = await supabase.from('fee_structures').update(data).eq('id', id).eq('school_id', schoolId)
  if (error) throw new Error(error.message)
  revalidatePath('/school-admin/fees')
}

export async function deleteFeeStructure(id: string) {
  const supabase = await createClient()
  const schoolId = await getSchoolId()
  const { error } = await supabase.from('fee_structures').delete().eq('id', id).eq('school_id', schoolId)
  if (error) throw new Error(error.message)
  revalidatePath('/school-admin/fees')
}

export async function generateInvoices(data: {
  fee_structure_id: string
  class_id: string
  due_date: string
  description?: string
}) {
  const supabase = await createClient()
  const schoolId = await getSchoolId()

  const { data: fee } = await supabase.from('fee_structures').select('*').eq('id', data.fee_structure_id).single()
  if (!fee) throw new Error('Fee structure not found')

  const { data: students } = await supabase
    .from('students')
    .select('id')
    .eq('school_id', schoolId)
    .eq('class_id', data.class_id)
    .eq('is_active', true)

  if (!students?.length) throw new Error('No students found in this class')

  const invoiceNumber = `INV-${Date.now()}`
  const invoices = students.map((s, i) => ({
    school_id: schoolId,
    student_id: s.id,
    fee_structure_id: data.fee_structure_id,
    invoice_number: `${invoiceNumber}-${i + 1}`,
    amount: Number(fee.amount),
    due_date: data.due_date,
    description: data.description ?? fee.name,
    status: 'pending' as const,
  }))

  const { error } = await supabase.from('fee_invoices').insert(invoices)
  if (error) throw new Error(error.message)
  revalidatePath('/school-admin/fees')
}

export async function getFeeInvoices(): Promise<any> {
  const supabase = await createClient()
  const schoolId = await getSchoolId()
  const { data } = await supabase
    .from('fee_invoices')
    .select('*, students!inner(admission_number, profiles!inner(first_name, last_name)), fee_structures(name)')
    .eq('school_id', schoolId)
    .order('created_at', { ascending: false })
    .limit(100)
  return data ?? []
}

export async function getFeeInvoicesByClass(classId: string): Promise<any> {
  const supabase = await createClient()
  const schoolId = await getSchoolId()
  const { data } = await supabase
    .from('fee_invoices')
    .select('*, fee_structures(name)')
    .eq('school_id', schoolId)
    .eq('students.class_id', classId)
    .order('created_at', { ascending: false })
  return data ?? []
}

export async function recordPayment(data: {
  invoice_id: string
  student_id: string
  amount: number
  payment_method: string
  transaction_ref?: string
  notes?: string
}) {
  const supabase = await createClient()
  const schoolId = await getSchoolId()
  const { error } = await supabase.from('payments').insert({
    school_id: schoolId,
    invoice_id: data.invoice_id,
    student_id: data.student_id,
    amount: data.amount,
    payment_method: data.payment_method as any,
    transaction_ref: data.transaction_ref ?? null,
    notes: data.notes ?? null,
    receipt_number: `RCP-${Date.now()}`,
  })
  if (error) throw new Error(error.message)
  revalidatePath('/school-admin/fees')
}

export async function getFeeSummary(): Promise<any> {
  const supabase = await createClient()
  const schoolId = await getSchoolId()
  const { data: invoices } = await supabase
    .from('fee_invoices')
    .select('amount, paid_amount, balance, status')
    .eq('school_id', schoolId)

  const total = invoices?.reduce((s, i) => s + Number(i.amount), 0) ?? 0
  const collected = invoices?.reduce((s, i) => s + Number(i.paid_amount), 0) ?? 0
  const outstanding = invoices?.reduce((s, i) => s + Number(i.balance), 0) ?? 0

  return { total, collected, outstanding, count: invoices?.length ?? 0 }
}

// ── Timetable ────────────────────────────────────────────────

export async function getTimetable(sectionId: string): Promise<any> {
  const supabase = await createClient()
  const schoolId = await getSchoolId()
  const { data } = await supabase
    .from('timetable')
    .select('*, subjects(*), teachers!inner(profiles!inner(first_name, last_name))')
    .eq('school_id', schoolId)
    .eq('section_id', sectionId)
    .order('day_of_week')
    .order('start_time')
  return data ?? []
}

export async function createTimetableEntry(data: {
  section_id: string
  subject_id: string
  teacher_id: string
  day_of_week: string
  start_time: string
  end_time: string
  room?: string
}) {
  const supabase = await createClient()
  const schoolId = await getSchoolId()

  const { data: year } = await supabase
    .from('academic_years')
    .select('id')
    .eq('school_id', schoolId)
    .eq('is_current', true)
    .single()
  if (!year) throw new Error('No current academic year')

  const { data: existing } = await supabase
    .from('timetable')
    .select('id')
    .eq('school_id', schoolId)
    .eq('teacher_id', data.teacher_id)
    .eq('day_of_week', data.day_of_week as any)
    .or(`start_time.lte.${data.end_time},end_time.gte.${data.start_time}`)

  if (existing && existing.length > 0) {
    throw new Error('Teacher is already booked during this time slot')
  }

  const { error } = await supabase.from('timetable').insert({
    ...data,
    school_id: schoolId,
    academic_year_id: year.id,
    day_of_week: data.day_of_week as any,
  })
  if (error) throw new Error(error.message)
  revalidatePath('/school-admin/timetable')
}

export async function deleteTimetableEntry(id: string) {
  const supabase = await createClient()
  const schoolId = await getSchoolId()
  const { error } = await supabase.from('timetable').delete().eq('id', id).eq('school_id', schoolId)
  if (error) throw new Error(error.message)
  revalidatePath('/school-admin/timetable')
}

// ── Notifications ────────────────────────────────────────────

export async function getUnreadNotificationCount(): Promise<any> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return 0
  const { count } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('is_read', false)
  return count ?? 0
}

// ── School Info ──────────────────────────────────────────────

export async function getSchool(): Promise<any> {
  const supabase = await createClient()
  const schoolId = await getSchoolId()
  const { data } = await supabase.from('schools').select('*').eq('id', schoolId).single()
  return data
}

export async function updateSchool(data: {
  name?: string
  phone?: string
  email?: string
  address?: string
  city?: string
  website?: string
}) {
  const supabase = await createClient()
  const schoolId = await getSchoolId()
  const { error } = await supabase.from('schools').update(data).eq('id', schoolId)
  if (error) throw new Error(error.message)
  revalidatePath('/school-admin/settings')
}
