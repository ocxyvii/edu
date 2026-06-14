import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ParentShell } from '@/components/parent/shell'
import { getUnreadMessageCount } from '@/lib/actions/parent'

export default async function ParentLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/parent-login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, first_name, last_name, avatar_url')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'parent') {
    redirect('/')
  }

  const name = `${profile.first_name ?? ''} ${profile.last_name ?? ''}`.trim() || 'Parent'

  let unreadCount = 0
  try {
    unreadCount = await getUnreadMessageCount()
  } catch {}

  return (
    <ParentShell parentName={name} parentAvatar={profile.avatar_url} unreadCount={unreadCount}>
      {children}
    </ParentShell>
  )
}
