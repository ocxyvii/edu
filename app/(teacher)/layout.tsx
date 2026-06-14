import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { TeacherShell } from '@/components/teacher/shell'
import { getUnreadMessageCount } from '@/lib/actions/teacher'

export default async function TeacherLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, first_name, last_name, avatar_url')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'teacher') redirect('/')

  const unreadCount = await getUnreadMessageCount()
  const teacherName = `${profile.first_name} ${profile.last_name}`

  return (
    <TeacherShell
      teacherName={teacherName}
      teacherAvatar={profile.avatar_url}
      unreadCount={unreadCount}
    >
      {children}
    </TeacherShell>
  )
}
