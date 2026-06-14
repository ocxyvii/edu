import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

const protectedRoutes: Record<string, string[]> = {
  '/super-admin': ['super_admin'],
  '/school-admin': ['school_admin'],
  '/teacher': ['teacher'],
  '/student': ['student'],
  '/parent': ['parent'],
}

const publicRoutes = ['/', '/login', '/parent-login', '/register', '/auth/callback', '/setup-2fa', '/verify-2fa', '/api/webhooks', '/admissions', '/api/auth']
const csrfSafeMethods = ['GET', 'HEAD', 'OPTIONS']
const twoFactorExempt = ['/verify-2fa', '/setup-2fa', '/api/auth', '/api/webhooks']

function addSecurityHeaders(response: NextResponse): NextResponse {
  const csp = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://*.supabase.co https://challenges.cloudflare.com",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https://*.supabase.co https://*.unsplash.com",
    "font-src 'self' data:",
    "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.stripe.com https://api.flutterwave.com https://api.safaricom.co.ke",
    "frame-src 'self' https://challenges.cloudflare.com",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; ')

  const headers: Record<string, string> = {
    'X-Frame-Options': 'DENY',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=(self)',
    'X-XSS-Protection': '1; mode=block',
    'Content-Security-Policy': csp,
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
  }

  for (const [key, value] of Object.entries(headers)) {
    response.headers.set(key, value)
  }

  return response
}

function generateCSRFToken(): string {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('')
}

function validateCSRFToken(request: NextRequest): boolean {
  const token = request.headers.get('x-csrf-token')
  const cookie = request.cookies.get('csrf-token')?.value
  if (!token || !cookie || token.length !== cookie.length) return false
  // Constant-time comparison
  let diff = 0
  for (let i = 0; i < token.length; i++) {
    diff |= token.charCodeAt(i) ^ cookie.charCodeAt(i)
  }
  return diff === 0
}

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname

  let response = NextResponse.next()
  response = addSecurityHeaders(response)

  // CSRF protection for API routes only (server actions have built-in protection)
  if (!csrfSafeMethods.includes(request.method) && path.startsWith('/api/')) {
    if (!validateCSRFToken(request)) {
      return NextResponse.json({ error: 'Invalid CSRF token' }, { status: 403 })
    }
  }

  // Set CSRF token cookie if not present (non-httpOnly so JS can read it)
  if (!request.cookies.get('csrf-token')) {
    const token = generateCSRFToken()
    response.cookies.set('csrf-token', token, {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
    })
  }

  // Allow public routes
  if (publicRoutes.some(route => path === route || path.startsWith(route))) {
    return response
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
          response = addSecurityHeaders(response)
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('redirect', path)
    return NextResponse.redirect(loginUrl)
  }

  // Check 2FA session for protected routes (except 2FA pages themselves)
  if (!twoFactorExempt.some(route => path.startsWith(route))) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('two_factor_enabled, role, has_completed_onboarding')
      .eq('id', user.id)
      .single()

    const profileData = profile as { two_factor_enabled?: boolean; role?: string; has_completed_onboarding?: boolean } | null

    if (profileData?.two_factor_enabled) {
      const { data: session } = await supabase
        .from('user_sessions')
        .select('session_token, expires_at')
        .eq('user_id', user.id)
        .single()

      if (!session || new Date(session.expires_at) < new Date()) {
        const verifyUrl = new URL('/verify-2fa', request.url)
        verifyUrl.searchParams.set('redirect', path)
        return NextResponse.redirect(verifyUrl)
      }
    }

    // Role-based access control
    const userRole = profileData?.role
    for (const [prefix, allowedRoles] of Object.entries(protectedRoutes)) {
      if (path.startsWith(prefix)) {
        if (!userRole || !allowedRoles.includes(userRole)) {
          return NextResponse.redirect(new URL('/', request.url))
        }

        // Student onboarding check
        if (userRole === 'student' && profileData?.has_completed_onboarding === false && !path.startsWith('/student/onboarding')) {
          return NextResponse.redirect(new URL('/student/onboarding', request.url))
        }

        // Parent onboarding check
        if (userRole === 'parent' && profileData?.has_completed_onboarding === false && !path.startsWith('/parent/onboarding')) {
          return NextResponse.redirect(new URL('/parent/onboarding', request.url))
        }

        break
      }
    }
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
