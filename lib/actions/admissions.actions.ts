'use server'

import { z } from 'zod'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

// ─── Helpers ─────────────────────────────────────────────

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

// ─── Public: Upload document (no auth required) ──────────

export async function uploadApplicationDocument(formData: FormData) {
  const file = formData.get('file') as File | null
  const schoolId = formData.get('schoolId') as string | null
  if (!file || !schoolId) throw new Error('File and schoolId are required')

  const maxSize = 20 * 1024 * 1024
  if (file.size > maxSize) throw new Error('File exceeds 20MB limit')

  const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg', 'image/webp']
  if (!allowedTypes.includes(file.type)) throw new Error('Only PDF and image files are allowed')

  const ext = file.name.split('.').pop()?.toLowerCase() || 'bin'
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
  const path = `applications/${schoolId}/${Date.now()}-${safeName}`

  const serviceClient = createServiceClient()

  const { error: uploadError } = await serviceClient.storage
    .from('application-documents')
    .upload(path, file, { contentType: file.type, upsert: false, cacheControl: '3600' })

  if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`)

  const { data: { publicUrl } } = serviceClient.storage
    .from('application-documents')
    .getPublicUrl(path)

  return { name: file.name, url: publicUrl, type: file.type, size: file.size, path }
}

// ─── Public: Submit application (no auth required) ───────

const SubmitApplicationSchema = z.object({
  school_id: z.string().uuid(),
  applying_for_class: z.string().min(1, 'Applying for class is required'),
  student_name: z.string().min(1, 'Student name is required'),
  date_of_birth: z.string().min(1, 'Date of birth is required'),
  gender: z.enum(['male', 'female', 'other']),
  address: z.string().min(1, 'Address is required'),
  previous_school: z.string().optional().default(''),
  parent_name: z.string().min(1, 'Parent name is required'),
  parent_phone: z.string().min(1, 'Parent phone is required'),
  parent_email: z.string().email('Invalid parent email'),
  documents: z.array(z.object({ name: z.string(), url: z.string(), type: z.string(), size: z.number() })),
  notes: z.string().optional(),
})

export async function submitApplication(data: z.infer<typeof SubmitApplicationSchema>) {
  const parsed = SubmitApplicationSchema.parse(data)

  const serviceClient = createServiceClient()

  const { data: school } = await serviceClient
    .from('schools')
    .select('name, slug')
    .eq('id', parsed.school_id)
    .single()

  const year = new Date().getFullYear()
  const rand = String(Math.floor(100000 + Math.random() * 900000))
  const referenceNumber = `APP-${year}-${rand}`

  const { error } = await serviceClient
    .from('applications')
    .insert({
      school_id: parsed.school_id,
      student_name: parsed.student_name,
      date_of_birth: parsed.date_of_birth,
      gender: parsed.gender,
      applying_for_class: parsed.applying_for_class,
      parent_name: parsed.parent_name,
      parent_email: parsed.parent_email,
      parent_phone: parsed.parent_phone,
      address: parsed.address,
      previous_school: parsed.previous_school || null,
      documents: parsed.documents,
      notes: parsed.notes || null,
      status: 'pending',
    })

  if (error) throw new Error(error.message)

  return { success: true, referenceNumber, schoolName: school?.name ?? '', parentEmail: parsed.parent_email }
}

// ─── Authenticated: Get applications ─────────────────────

export async function getApplications(filters?: { status?: string; search?: string }) {
  const { supabase, schoolId } = await getAuthContext()

  let query = supabase
    .from('applications')
    .select('*')
    .eq('school_id', schoolId)
    .order('created_at', { ascending: false })

  if (filters?.status && filters.status !== 'all') {
    query = query.eq('status', filters.status)
  }

  if (filters?.search) {
    query = query.or(
      `student_name.ilike.%${filters.search}%,parent_name.ilike.%${filters.search}%,parent_email.ilike.%${filters.search}%,parent_phone.ilike.%${filters.search}%`
    )
  }

  const { data, error } = await query
  if (error) throw new Error(error.message)
  return data ?? []
}

export async function getApplication(id: string) {
  const { supabase, schoolId } = await getAuthContext()
  const { data, error } = await supabase
    .from('applications')
    .select('*')
    .eq('id', id)
    .eq('school_id', schoolId)
    .single()
  if (error) throw new Error(error.message)
  return data
}

export async function getApplicationStats() {
  const { supabase, schoolId } = await getAuthContext()
  const { data: applications } = await supabase
    .from('applications')
    .select('status')
    .eq('school_id', schoolId)

  if (!applications) {
    return { total: 0, pending: 0, reviewing: 0, approved: 0, rejected: 0, waitlisted: 0, enrolled: 0 }
  }

  return {
    total: applications.length,
    pending: applications.filter(a => a.status === 'pending').length,
    reviewing: applications.filter(a => a.status === 'reviewing').length,
    approved: applications.filter(a => a.status === 'approved').length,
    rejected: applications.filter(a => a.status === 'rejected').length,
    waitlisted: applications.filter(a => a.status === 'waitlisted').length,
    enrolled: applications.filter(a => a.status === 'enrolled').length,
  }
}

// ─── Authenticated: Review application ───────────────────

const ReviewSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(['approved', 'rejected', 'waitlisted', 'reviewing']),
  notes: z.string().optional(),
})

export async function reviewApplication(data: z.infer<typeof ReviewSchema>) {
  const { supabase, schoolId, userId } = await getAuthContext()
  const parsed = ReviewSchema.parse(data)

  const updateData: Record<string, any> = {
    status: parsed.status,
    reviewed_by: userId,
    reviewed_at: new Date().toISOString(),
  }
  if (parsed.notes !== undefined) updateData.notes = parsed.notes

  const { data: app, error } = await supabase
    .from('applications')
    .update(updateData)
    .eq('id', parsed.id)
    .eq('school_id', schoolId)
    .select('id, student_name, parent_email, status')
    .single()

  if (error) throw new Error(error.message)
  revalidatePath('/school-admin/admissions')
  return app
}

// ─── Authenticated: Enroll student (creates auth users) ──

const EnrollSchema = z.object({
  application_id: z.string().uuid(),
  class_id: z.string().uuid(),
  section_id: z.string().uuid().optional().nullable(),
  enrollment_date: z.string().min(1),
  admission_number: z.string().min(1),
  student_password: z.string().min(6),
  parent_password: z.string().min(6),
})

export async function enrollStudent(data: z.infer<typeof EnrollSchema>) {
  const { supabase, schoolId, userId } = await getAuthContext()
  const parsed = EnrollSchema.parse(data)

  const { data: application } = await supabase
    .from('applications')
    .select('*, schools!inner(id, name, slug)')
    .eq('id', parsed.application_id)
    .eq('school_id', schoolId)
    .single()

  if (!application) throw new Error('Application not found')
  if (application.status !== 'approved') throw new Error('Application must be approved before enrollment')

  const schoolSlug = (application as any).schools?.slug || 'school'
  const schoolName = (application as any).schools?.name || 'School'

  const studentFirstName = application.student_name.split(' ')[0] || 'Student'
  const studentLastName = application.student_name.split(' ').slice(1).join(' ') || ''

  const studentEmail = `${parsed.admission_number.toLowerCase()}@${schoolSlug}.edu.local`

  const serviceClient = createServiceClient()

  // ═══════════════════════════════════════════════════════════════
  // PARENT ACCOUNT — CREATE OR LINK
  // ═══════════════════════════════════════════════════════════════

  let parentId: string | null = null
  let parentIsNew = false
  let finalParentPassword = parsed.parent_password
  const parentEmail = application.parent_email

  // 1. Check if a parent profile with this email already exists
  const { data: existingParentProfile } = await serviceClient
    .from('profiles')
    .select('id, email')
    .eq('email', parentEmail)
    .eq('role', 'parent')
    .eq('school_id', schoolId)
    .maybeSingle()

  if (existingParentProfile) {
    parentId = existingParentProfile.id
    parentIsNew = false
    finalParentPassword = '(existing account — use current password)'
  } else {
    // 2. Try to create parent auth user
    const { data: parentAuth, error: parentAuthError } = await serviceClient.auth.admin.createUser({
      id: crypto.randomUUID(),
      email: parentEmail,
      password: parsed.parent_password,
      email_confirm: true,
      user_metadata: { role: 'parent', school_id: schoolId, first_name: application.parent_name, last_name: '' },
    })

    if (!parentAuthError && parentAuth) {
      parentId = parentAuth.user.id
      parentIsNew = true
      finalParentPassword = parsed.parent_password

      // Create parent profile
      await serviceClient
        .from('profiles')
        .upsert({
          id: parentAuth.user.id,
          school_id: schoolId,
          first_name: application.parent_name,
          last_name: '',
          role: 'parent',
          email: parentEmail,
          phone: application.parent_phone || null,
          is_active: true,
          has_completed_onboarding: false,
        }, { onConflict: 'id' })

      // Create parent record
      await serviceClient
        .from('parents')
        .upsert({ id: parentAuth.user.id, school_id: schoolId, occupation: null }, { onConflict: 'id' })
    } else if (parentAuthError?.message?.includes('already registered')) {
      // Email exists in auth but not in profiles — try to find and link
      const { data: authUsers } = await serviceClient.auth.admin.listUsers()
      const foundUser = authUsers?.users?.find(u => u.email === parentEmail)
      if (foundUser) {
        parentId = foundUser.id
        parentIsNew = false
        finalParentPassword = '(existing account — use current password)'

        // Upsert profile just in case it was deleted
        await serviceClient
          .from('profiles')
          .upsert({
            id: foundUser.id,
            school_id: schoolId,
            first_name: application.parent_name,
            last_name: '',
            role: 'parent',
            email: parentEmail,
            phone: application.parent_phone || null,
            is_active: true,
          }, { onConflict: 'id' })

        await serviceClient
          .from('parents')
          .upsert({ id: foundUser.id, school_id: schoolId, occupation: null }, { onConflict: 'id' })
      } else {
        throw new Error(`Parent account already exists but could not be linked: ${parentAuthError.message}`)
      }
    }
    // If parentAuthError and it's NOT "already registered", we silently skip
    // parent creation (parent portal is optional). The student can still be enrolled.
  }

  // ═══════════════════════════════════════════════════════════════
  // STUDENT ACCOUNT
  // ═══════════════════════════════════════════════════════════════

  const studentProfileId = crypto.randomUUID()

  const { error: studentAuthError } = await serviceClient.auth.admin.createUser({
    id: studentProfileId,
    email: studentEmail,
    password: parsed.student_password,
    email_confirm: true,
    user_metadata: { role: 'student', school_id: schoolId, first_name: studentFirstName, last_name: studentLastName },
  })
  if (studentAuthError) {
    throw new Error(`Failed to create student user: ${studentAuthError.message}`)
  }

  // Upsert student profile
  const { error: profileError } = await serviceClient
    .from('profiles')
    .upsert({
      id: studentProfileId,
      school_id: schoolId,
      first_name: studentFirstName,
      last_name: studentLastName,
      role: 'student',
      email: studentEmail,
      phone: application.parent_phone || null,
      has_completed_onboarding: false,
    }, { onConflict: 'id' })

  if (profileError) {
    await serviceClient.auth.admin.deleteUser(studentProfileId).catch(() => {})
    throw new Error(`Failed to create profile: ${profileError.message}`)
  }

  // ── Resolve section_id — never leave it null ──
  let resolvedSectionId = parsed.section_id ?? null
  if (!resolvedSectionId && parsed.class_id) {
    const { data: firstSection } = await serviceClient
      .from('sections')
      .select('id')
      .eq('class_id', parsed.class_id)
      .eq('school_id', schoolId)
      .order('name', { ascending: true })
      .limit(1)
      .maybeSingle()

    if (firstSection) resolvedSectionId = firstSection.id
  }

  // ── Create student record ──
  const { error: studentError } = await serviceClient.from('students').insert({
    id: studentProfileId,
    school_id: schoolId,
    admission_number: parsed.admission_number,
    class_id: parsed.class_id,
    section_id: resolvedSectionId,
    enrollment_date: parsed.enrollment_date,
    is_active: true,
  })
  if (studentError) {
    await serviceClient.auth.admin.deleteUser(studentProfileId).catch(() => {})
    throw new Error(`Failed to create student record: ${studentError.message}`)
  }

  // ═══════════════════════════════════════════════════════════════
  // LINK PARENT TO STUDENT
  // ═══════════════════════════════════════════════════════════════

  if (parentId) {
    await serviceClient
      .from('parent_student')
      .upsert({
        parent_id: parentId,
        student_id: studentProfileId,
        school_id: schoolId,
        relationship: 'parent',
        is_primary: true,
      }, { onConflict: 'parent_id,student_id' })

    // Notify parent
    const { data: sectionInfo } = resolvedSectionId
      ? await serviceClient.from('sections').select('name, classes!inner(name)').eq('id', resolvedSectionId).single()
      : { data: null }
    await serviceClient.from('notifications').insert({
      school_id: schoolId,
      user_id: parentId,
      title: parentIsNew
        ? 'Welcome — Your Child Has Been Enrolled'
        : 'Another Child Has Been Enrolled',
      body: `${application.student_name} has been successfully enrolled at ${schoolName}${sectionInfo ? ` in ${(sectionInfo as any).classes?.name} - ${(sectionInfo as any).name}` : ''}. Admission: ${parsed.admission_number}. You can now view their progress in the Parent Portal.`,
      type: 'success',
      action_url: '/parent',
      metadata: { student_id: studentProfileId, type: 'enrollment_parent' },
    })
  }

  // ═══════════════════════════════════════════════════════════════
  // UPDATE APPLICATION
  // ═══════════════════════════════════════════════════════════════

  await supabase
    .from('applications')
    .update({ status: 'enrolled', enrolled_student_id: studentProfileId, reviewed_by: userId, reviewed_at: new Date().toISOString() })
    .eq('id', parsed.application_id)
    .eq('school_id', schoolId)

  // ═══════════════════════════════════════════════════════════════
  // NOTIFY CLASS TEACHER
  // ═══════════════════════════════════════════════════════════════

  if (resolvedSectionId) {
    const { data: section } = await serviceClient
      .from('sections')
      .select('class_teacher_id')
      .eq('id', resolvedSectionId)
      .single()

    if (section?.class_teacher_id) {
      await serviceClient.from('notifications').insert({
        school_id: schoolId,
        user_id: section.class_teacher_id,
        title: 'New Student Enrolled in Your Class',
        body: `${application.student_name} (${parsed.admission_number}) has been enrolled in your class`,
        type: 'info',
        action_url: `/teacher/my-classes/${resolvedSectionId}`,
        metadata: { section_id: resolvedSectionId, student_id: studentProfileId, type: 'enrollment' },
      })
    }
  }

  revalidatePath('/school-admin/admissions')

  // Get section/class names for the result
  let className: string | null = null
  let sectionName: string | null = null
  if (resolvedSectionId) {
    const { data: sec } = await serviceClient
      .from('sections')
      .select('name, classes(name)')
      .eq('id', resolvedSectionId)
      .single()
    if (sec) {
      sectionName = (sec as any).name
      className = (sec as any).classes?.name ?? null
    }
  }

  return {
    admissionNumber: parsed.admission_number,
    studentEmail,
    studentPassword: parsed.student_password,
    parentEmail,
    parentPassword: finalParentPassword,
    parentIsNew,
    parentAccountNote: parentId
      ? (parentIsNew
        ? 'New parent account created'
        : 'Linked to existing parent account — parent uses their current login')
      : 'No parent account linked (parent portal is optional)',
    studentName: application.student_name,
    sectionName,
    className,
    schoolName,
  }
}

// ─── Authenticated: Get classes for school ───────────────

export async function getClassesForSchool(schoolId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('classes')
    .select('id, name, level, sections(id, name, capacity)')
    .eq('school_id', schoolId)
    .order('level', { ascending: true })
  if (error) throw new Error(error.message)
  return data ?? []
}

// ─── Authenticated: Get signed URL for document ──────────

export async function getSignedDocumentUrl(filePath: string) {
  const { supabase } = await getAuthContext()
  const { data, error } = await supabase.storage
    .from('application-documents')
    .createSignedUrl(filePath, 3600)
  if (error) throw new Error(error.message)
  return data.signedUrl
}

// ─── Public: Resolve login by admission number ───────────

export async function resolveLoginByAdmission(admissionNumber: string) {
  const serviceClient = createServiceClient()

  const { data: student } = await serviceClient
    .from('students')
    .select('id, school_id, admission_number')
    .eq('admission_number', admissionNumber)
    .maybeSingle()

  if (!student) throw new Error('Invalid admission number. Please check and try again.')

  const { data: profile } = await serviceClient
    .from('profiles')
    .select('email')
    .eq('id', student.id)
    .single()

  if (!profile?.email) throw new Error('Student account not found. Contact the school administration.')

  return { email: profile.email, schoolId: student.school_id }
}

// ─── Authenticated: Get school for admin ─────────────────

export async function getSchoolBySlug(slug: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('schools')
    .select('id, name, slug, logo_url, address, phone, email, settings')
    .eq('slug', slug)
    .eq('is_active', true)
    .single()
  if (error) return null
  return data
}
