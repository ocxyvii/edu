import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { StudentShell } from '@/components/student/shell'
import { Card, CardContent } from '@/components/ui/card'
import { AlertTriangle, Clock } from 'lucide-react'

export default async function StudentLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login?role=student')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, first_name, last_name, avatar_url')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'student') {
    redirect('/')
  }

  const { data: student } = await supabase
    .from('students')
    .select('id')
    .eq('id', user.id)
    .maybeSingle()

  const name = `${profile.first_name ?? ''} ${profile.last_name ?? ''}`.trim() || 'Student'

  if (!student) {
    // Check if they have a pending registration
    const { data: pending } = await supabase
      .from('pending_student_registrations')
      .select('status')
      .eq('user_id', user.id)
      .maybeSingle()

    if (pending?.status === 'pending') {
      return (
        <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
          <Card className="max-w-md">
            <CardContent className="py-8 text-center">
              <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-4">
                <Clock className="h-8 w-8 text-amber-500" />
              </div>
              <h1 className="text-xl font-bold text-gray-900 mb-2">Pending Approval</h1>
              <p className="text-gray-500 text-sm">
                Your registration is awaiting approval from the school administrator. You will be able to access your dashboard once your account is approved.
              </p>
              <form action="/api/auth/signout" method="post" className="mt-6">
                <button
                  type="submit"
                  className="inline-flex h-10 items-center justify-center rounded-lg border border-gray-300 bg-white px-4 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Sign Out
                </button>
              </form>
            </CardContent>
          </Card>
        </div>
      )
    }

    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
        <Card className="max-w-md">
          <CardContent className="py-8 text-center">
            <AlertTriangle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
            <h1 className="text-xl font-bold text-gray-900 mb-2">Account Not Set Up</h1>
            <p className="text-gray-500 text-sm">
              Your student account hasn&apos;t been fully configured yet. Please contact your school administrator to link your profile to a class.
            </p>
            <form action="/api/auth/signout" method="post" className="mt-6">
              <button
                type="submit"
                className="inline-flex h-10 items-center justify-center rounded-lg border border-gray-300 bg-white px-4 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Sign Out
              </button>
            </form>
          </CardContent>
        </Card>
      </div>
    )
  }

  let unreadCount = 0
  try {
    const { data: messages } = await supabase
      .from('messages')
      .select('id', { count: 'exact', head: true })
      .eq('receiver_id', user.id)
      .eq('is_read', false)
    unreadCount = messages?.length ?? 0
  } catch {}

  return (
    <StudentShell studentName={name} studentAvatar={profile.avatar_url} unreadCount={unreadCount}>
      {children}
    </StudentShell>
  )
}
