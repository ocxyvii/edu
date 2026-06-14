import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { SchoolAdminShell } from '@/components/school-admin/shell'
import { getUnreadNotificationCount, getSchool } from '@/lib/actions/school-admin'

export default async function SchoolAdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, school_id')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'school_admin') redirect('/')

  const school = await getSchool()
  const unreadCount = await getUnreadNotificationCount()

  return (
    <SchoolAdminShell
      schoolName={school?.name ?? 'School'}
      schoolLogo={school?.logo_url ?? null}
      unreadCount={unreadCount}
    >
      {children}
    </SchoolAdminShell>
  )
}
