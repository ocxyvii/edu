import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')

  if (code) {
    const cookieStore = await cookies()
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore })
    
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (!error && data.user) {
      // Get user role from profiles table
      const { data: profileData } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', data.user.id)
        .single()

      // Redirect based on role
      const role = (profileData as any)?.role
      if (role) {
        let redirectPath = '/'
        switch (role) {
          case 'super_admin':
            redirectPath = '/super-admin'
            break
          case 'school_admin':
            redirectPath = '/school-admin'
            break
          case 'teacher':
            redirectPath = '/teacher'
            break
          case 'student':
            redirectPath = '/student'
            break
          case 'parent':
            redirectPath = '/parent'
            break
        }
        return NextResponse.redirect(new URL(redirectPath, requestUrl.origin))
      }
    }
  }

  // Fallback redirect
  return NextResponse.redirect(new URL('/', requestUrl.origin))
}
