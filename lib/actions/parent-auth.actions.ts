'use server'

import { createServiceClient } from '@/lib/supabase/server'

export async function getParentEmailByAdmissionNumber(
  admissionNumber: string
): Promise<{
  found: boolean
  parentEmail?: string
  studentName?: string
  error?: string
}> {
  try {
    const supabase = await createServiceClient()

    const cleanAdmission = admissionNumber.trim().toUpperCase()

    const { data: student, error: studentError } = await supabase
      .from('students')
      .select(`
        id,
        is_active,
        profiles (
          first_name,
          last_name
        )
      `)
      .eq('admission_number', cleanAdmission)
      .eq('is_active', true)
      .maybeSingle()

    if (studentError || !student) {
      return {
        found: false,
        error: 'Student not found. Please check the admission number.',
      }
    }

    const { data: parentLink } = await supabase
      .from('parent_student')
      .select('parent_id')
      .eq('student_id', student.id)
      .eq('is_primary', true)
      .maybeSingle()

    let parentId = parentLink?.parent_id

    if (!parentId) {
      const { data: anyLink } = await supabase
        .from('parent_student')
        .select('parent_id')
        .eq('student_id', student.id)
        .limit(1)
        .maybeSingle()

      if (!anyLink?.parent_id) {
        return {
          found: false,
          error:
            'No parent account linked to this student. Contact your school admin.',
        }
      }

      parentId = anyLink.parent_id
    }

    const { data: parentProfile } = await supabase
      .from('profiles')
      .select('email, is_active')
      .eq('id', parentId ?? '')
      .eq('role', 'parent')
      .maybeSingle()

    if (parentError || !parentProfile?.email) {
      return {
        found: false,
        error:
          'Parent account not configured correctly. Contact your school admin.',
      }
    }

    if (!parentProfile.is_active) {
      return {
        found: false,
        error: 'Parent account is inactive. Contact your school admin.',
      }
    }

    const profile = student.profiles as { first_name?: string; last_name?: string } | null

    return {
      found: true,
      parentEmail: parentProfile.email,
      studentName:
        [profile?.first_name, profile?.last_name].filter(Boolean).join(' ') ||
        undefined,
    }
  } catch {
    return {
      found: false,
      error: 'An unexpected error occurred. Please try again.',
    }
  }
}
