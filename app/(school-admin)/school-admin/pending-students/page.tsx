import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { PendingStudentsClient } from './client'

export default async function PendingStudentsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login?role=school_admin')

  const { data: profile } = await supabase
    .from('profiles')
    .select('school_id, role')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'school_admin' || !profile.school_id) {
    redirect('/')
  }

  const { data: pending, error } = await supabase
    .from('pending_student_registrations')
    .select('*')
    .eq('school_id', profile.school_id)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })

  const { data: approved } = await supabase
    .from('pending_student_registrations')
    .select('*')
    .eq('school_id', profile.school_id)
    .eq('status', 'approved')
    .order('updated_at', { ascending: false })
    .limit(20)

  return (
    <PendingStudentsClient
      pending={pending ?? []}
      approved={approved ?? []}
      schoolId={profile.school_id}
    />
  )
}
