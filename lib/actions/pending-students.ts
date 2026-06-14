'use server'

import { createClient, createServiceClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

const SchoolSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  city: z.string().nullable(),
  country: z.string().nullable(),
})

export async function getSchools() {
  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('schools')
    .select('id, name, city, country')
    .eq('is_active', true)
    .order('name')

  if (error) throw new Error('Failed to load schools')
  return data as unknown as z.infer<typeof SchoolSchema>[]
}

export async function getPendingStudents() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data: profile } = await supabase
    .from('profiles')
    .select('school_id')
    .eq('id', user.id)
    .single()

  if (!profile?.school_id) throw new Error('No school assigned to your account')

  const { data, error } = await supabase
    .from('pending_student_registrations')
    .select('*')
    .eq('school_id', profile.school_id)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)
  return data
}

export async function approveStudent(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data: profile } = await supabase
    .from('profiles')
    .select('school_id')
    .eq('id', user.id)
    .single()

  if (!profile?.school_id) throw new Error('No school assigned')

  const { data: pending, error: fetchError } = await supabase
    .from('pending_student_registrations')
    .select('*')
    .eq('id', id)
    .eq('school_id', profile.school_id)
    .single()

  if (fetchError || !pending) throw new Error('Pending registration not found')
  if (pending.status !== 'pending') throw new Error('Already processed')

  const { count } = await supabase
    .from('students')
    .select('*', { count: 'exact', head: true })
    .eq('school_id', profile.school_id)

  const admissionNumber = `STU${String((count ?? 0) + 1).padStart(5, '0')}`

  const serviceClient = createServiceClient()

  const { error: insertError } = await serviceClient
    .from('students')
    .insert({
      id: pending.user_id,
      school_id: profile.school_id,
      admission_number: admissionNumber,
    })

  if (insertError) throw new Error(insertError.message)

  const { error: updateError } = await supabase
    .from('pending_student_registrations')
    .update({ status: 'approved' })
    .eq('id', id)

  if (updateError) throw new Error(updateError.message)

  revalidatePath('/school-admin/pending-students')
}

export async function rejectStudent(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data: profile } = await supabase
    .from('profiles')
    .select('school_id')
    .eq('id', user.id)
    .single()

  if (!profile?.school_id) throw new Error('No school assigned')

  const { error } = await supabase
    .from('pending_student_registrations')
    .update({ status: 'rejected' })
    .eq('id', id)
    .eq('school_id', profile.school_id)

  if (error) throw new Error(error.message)

  revalidatePath('/school-admin/pending-students')
}

export async function getMyPendingStatus() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data, error } = await supabase
    .from('pending_student_registrations')
    .select('status, school_id')
    .eq('user_id', user.id)
    .maybeSingle()

  if (error) return null
  return data
}
