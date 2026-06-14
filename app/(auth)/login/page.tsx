'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'
import { resolveLoginByAdmission } from '@/lib/actions/admissions.actions'
import { GraduationCap, Users, BookOpen, Shield, ArrowLeft, Eye, EyeOff, BadgeCheck } from 'lucide-react'

const roleConfig: Record<string, { title: string; description: string; icon: any; gradient: string; accent: string }> = {
  student: {
    title: 'Student Portal',
    description: 'Access your classes, assignments, and grades',
    icon: GraduationCap,
    gradient: 'from-blue-500 to-blue-600',
    accent: 'blue',
  },
  parent: {
    title: 'Parent Portal',
    description: 'Monitor your child\'s academic journey',
    icon: Users,
    gradient: 'from-emerald-500 to-emerald-600',
    accent: 'emerald',
  },
  teacher: {
    title: 'Teacher Portal',
    description: 'Manage your classes and students',
    icon: BookOpen,
    gradient: 'from-purple-500 to-purple-600',
    accent: 'purple',
  },
}

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const role = searchParams.get('role') || ''

  useEffect(() => {
    if (role === 'parent') {
      router.replace('/parent-login')
    }
  }, [role, router])

  const [email, setEmail] = useState('')
  const [admissionNumber, setAdmissionNumber] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)

  const config = roleConfig[role]

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const supabase = createClient()

      // Resolve email from admission number for students
      let loginEmail = email
      if (role === 'student' && admissionNumber) {
        const resolved = await resolveLoginByAdmission(admissionNumber)
        loginEmail = resolved.email
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email: loginEmail,
        password,
      })

      if (error) throw error

      // Check 2FA
      const { data: userData } = await supabase
        .from('profiles')
        .select('role, two_factor_enabled')
        .eq('id', data.user.id)
        .single()

      if ((userData as any)?.two_factor_enabled) {
        const { data: session } = await supabase
          .from('user_sessions')
          .select('session_token, expires_at')
          .eq('user_id', data.user.id)
          .single()

        if (!session || new Date(session.expires_at) < new Date()) {
          router.push(`/verify-2fa?redirect=/${(userData as any)?.role}`)
          return
        }
      }

      if (userData) {
        // Verify the logged-in user's role matches the portal they tried
        if (userData.role !== role && !['super_admin', 'school_admin'].includes(userData.role)) {
          await supabase.auth.signOut()
          toast.error(`This account is not a ${role} account`)
          return
        }

        switch (userData.role) {
          case 'super_admin':
            router.push('/super-admin')
            break
          case 'school_admin':
            router.push('/school-admin')
            break
          case 'teacher':
            router.push('/teacher')
            break
          case 'student':
            router.push('/student')
            break
          case 'parent':
            router.push('/parent')
            break
          default:
            router.push('/')
        }
      }
    } catch (error: any) {
      toast.error(error.message || 'Invalid credentials')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 via-white to-edu-blue-50 p-4">
      <div className="w-full max-w-md">
        {/* Back link */}
        <div className="mb-6">
          <button
            onClick={() => router.push('/')}
            className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to home
          </button>
        </div>

        <Card className="w-full border-2 border-gray-100 shadow-sm">
          <CardHeader className="space-y-1 text-center pb-6">
            {/* Role icon */}
            {config && (
              <div className="flex justify-center mb-4">
                <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${config.gradient} flex items-center justify-center shadow-lg`}>
                  <config.icon className="h-7 w-7 text-white" />
                </div>
              </div>
            )}

            <CardTitle className="text-2xl font-bold text-gray-900">
              {config ? config.title : 'Welcome to EduCore'}
            </CardTitle>
            <CardDescription className="text-base">
              {config
                ? config.description
                : 'Sign in to your account to continue'}
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              {role === 'student' ? (
                <div className="space-y-2">
                  <Label htmlFor="admissionNumber">Admission Number</Label>
                  <div className="relative">
                    <BadgeCheck className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="admissionNumber"
                      className="pl-9 font-mono"
                      placeholder="e.g. STU-123456"
                      value={admissionNumber}
                      onChange={(e) => setAdmissionNumber(e.target.value)}
                      required
                      autoFocus
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="parent@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoFocus
                  />
                </div>
              )}

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-xs text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </button>
                </div>
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>

              <Button type="submit" className="w-full" disabled={loading} size="lg">
                {loading ? 'Signing in...' : 'Sign In'}
              </Button>
            </form>


          </CardContent>

          <CardFooter className="flex flex-col gap-3">
            {role === 'student' && (
              <p className="text-xs text-center w-full text-muted-foreground">
                New student applicant?{' '}
                <Link href="/register" className="text-primary hover:underline font-medium">
                  Apply for admission
                </Link>
              </p>
            )}
            {role !== 'student' && (
              <p className="text-xs text-center text-gray-400 max-w-sm">
                Use the login credentials provided by your school. Contact your school admin if you don't have login details.
              </p>
            )}
            <p className="text-xs text-center text-gray-400">
              <Link href="/" className="text-gray-500 hover:text-gray-700 underline">
                Return to portal selection
              </Link>
            </p>
          </CardFooter>
        </Card>

        <p className="text-center text-xs text-gray-400 mt-6">
          EduCore School Management System &copy; {new Date().getFullYear()}
        </p>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-gray-400">Loading...</div>
      </div>
    }>
      <LoginForm />
    </Suspense>
  )
}
