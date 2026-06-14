'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { toast } from 'sonner'
import { School, CheckCircle2, Eye, EyeOff, Loader2, AlertTriangle } from 'lucide-react'

export default function StudentOnboardingPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<{ first_name: string; last_name: string } | null>(null)
  const [student, setStudent] = useState<{ admission_number: string; class?: { name: string }; section?: { name: string } } | null>(null)
  const [schoolName, setSchoolName] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [saving, setSaving] = useState(false)
  const [completed, setCompleted] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { router.push('/login?role=student'); return }

      const { data: prof } = await supabase
        .from('profiles')
        .select('first_name, last_name, school_id')
        .eq('id', user.id)
        .single()

      if (!prof) { router.push('/login?role=student'); return }

      // If already completed onboarding, redirect to dashboard
      // (checking via profiles.has_completed_onboarding is already done by middleware)
      const { data: school } = await supabase
        .from('schools')
        .select('name')
        .eq('id', prof.school_id)
        .single()

      const { data: stu } = await supabase
        .from('students')
        .select('admission_number, class_id, section_id')
        .eq('id', user.id)
        .single()

      let classData: { name: string } | null = null
      let sectionData: { name: string } | null = null
      if (stu?.class_id) {
        const { data: c } = await supabase.from('classes').select('name').eq('id', stu.class_id).single()
        classData = c
      }
      if (stu?.section_id) {
        const { data: s } = await supabase.from('sections').select('name').eq('id', stu.section_id).single()
        sectionData = s
      }

      setProfile(prof)
      setStudent(stu ? { admission_number: stu.admission_number, class: classData ?? undefined, section: sectionData ?? undefined } : null)
      setSchoolName(school?.name || '')
      setLoading(false)
    })
  }, [router])

  const handleSubmit = async () => {
    if (newPassword.length < 8) {
      toast.error('Password must be at least 8 characters')
      return
    }
    if (!/[A-Z]/.test(newPassword)) {
      toast.error('Password must include at least one uppercase letter')
      return
    }
    if (!/[0-9]/.test(newPassword)) {
      toast.error('Password must include at least one number')
      return
    }
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match')
      return
    }

    setSaving(true)
    try {
      const supabase = createClient()
      const { error } = await supabase.auth.updateUser({ password: newPassword })
      if (error) throw error

      const { error: profileError } = await supabase
        .from('profiles')
        .update({ has_completed_onboarding: true })
        .eq('id', (await supabase.auth.getUser()).data.user?.id)

      if (profileError) throw profileError

      setCompleted(true)
      toast.success('Password updated successfully!')
      setTimeout(() => router.push('/student'), 2000)
    } catch (e: any) {
      toast.error(e.message || 'Failed to set password')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="h-8 w-8 animate-spin text-edu-blue-600" />
      </div>
    )
  }

  if (completed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-emerald-50 p-4">
        <Card className="max-w-md w-full">
          <CardContent className="py-10 text-center">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="h-8 w-8 text-green-600" />
            </div>
            <h1 className="text-xl font-bold text-gray-900 mb-2">Setup Complete!</h1>
            <p className="text-gray-500 text-sm">Redirecting you to your dashboard...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 via-white to-edu-blue-50 p-4">
      <div className="w-full max-w-md">
        <Card className="border-2 border-gray-100 shadow-sm">
          <CardContent className="p-6 space-y-6">
            <div className="text-center">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-edu-blue-500 to-edu-blue-700 flex items-center justify-center mx-auto mb-3 shadow-lg">
                <School className="h-7 w-7 text-white" />
              </div>
              <h1 className="text-xl font-bold text-gray-900">
                Welcome to {schoolName || 'School'}!
              </h1>
              <p className="text-muted-foreground mt-1">
                Hi {profile?.first_name || 'Student'}, let&apos;s get you set up.
              </p>
            </div>

            {student && (
              <div className="bg-edu-blue-50 rounded-xl p-4 text-sm space-y-1">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Admission Number</span>
                  <span className="font-bold font-mono text-edu-blue-700">{student.admission_number}</span>
                </div>
                {student.class && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Class</span>
                    <span className="font-medium">{student.class.name}</span>
                  </div>
                )}
                {student.section && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Section</span>
                    <span className="font-medium">{student.section.name}</span>
                  </div>
                )}
              </div>
            )}

            <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 flex gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-amber-700">
                For security, please set a new password before accessing your dashboard.
              </p>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="newPassword">New Password</Label>
                <div className="relative">
                  <Input
                    id="newPassword"
                    type={showPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Min 8 chars, 1 uppercase, 1 number"
                    className="pr-10"
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <div className="flex gap-2 text-[10px] text-muted-foreground">
                  <span className={newPassword.length >= 8 ? 'text-green-600' : ''}>✓ 8+ chars</span>
                  <span className={/[A-Z]/.test(newPassword) ? 'text-green-600' : ''}>✓ Uppercase</span>
                  <span className={/[0-9]/.test(newPassword) ? 'text-green-600' : ''}>✓ Number</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter password"
                />
                {confirmPassword && newPassword !== confirmPassword && (
                  <p className="text-xs text-red-500">Passwords do not match</p>
                )}
              </div>

              <Button
                className="w-full"
                size="lg"
                onClick={handleSubmit}
                disabled={saving || !newPassword || !confirmPassword}
              >
                {saving ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving...</>
                ) : (
                  <><CheckCircle2 className="h-4 w-4 mr-2" /> Complete Setup</>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
