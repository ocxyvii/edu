'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { toast } from 'sonner'
import { Users, CheckCircle2, Eye, EyeOff, Loader2, AlertTriangle } from 'lucide-react'

export default function ParentOnboardingPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<{ first_name: string; last_name: string; school_id: string } | null>(null)
  const [children, setChildren] = useState<{ profiles: { first_name: string; last_name: string }; classes?: { name: string }; sections?: { name: string } }[]>([])
  const [schoolName, setSchoolName] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [saving, setSaving] = useState(false)
  const [completed, setCompleted] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { router.push('/parent-login'); return }

      const { data: prof } = await supabase
        .from('profiles')
        .select('first_name, last_name, school_id')
        .eq('id', user.id)
        .single()

      if (!prof) { router.push('/parent-login'); return }

      const { data: school } = await supabase
        .from('schools')
        .select('name')
        .eq('id', prof.school_id)
        .single()

      const { data: childLinks } = await supabase
        .from('parent_student')
        .select(`
          student_id,
          students (
            id,
            class_id,
            section_id,
            profiles!students_id_fkey ( first_name, last_name ),
            classes ( name ),
            sections ( name )
          )
        `)
        .eq('parent_id', user.id)

      const kids = (childLinks ?? [])
        .map((l: any) => l.students)
        .filter(Boolean)
        .map((s: any) => ({
          profiles: s.profiles ?? { first_name: 'Unknown', last_name: '' },
          classes: s.classes ?? null,
          sections: s.sections ?? null,
        }))

      setProfile(prof)
      setChildren(kids)
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
      setTimeout(() => router.push('/parent'), 2000)
    } catch (e: any) {
      toast.error(e.message || 'Failed to set password')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 via-white to-emerald-50 p-4">
      <div className="w-full max-w-md">
        <Card className="border-2 border-gray-100 shadow-sm">
          <CardContent className="p-6 space-y-6">
            <div className="text-center">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center mx-auto mb-3 shadow-lg">
                <Users className="h-7 w-7 text-white" />
              </div>
              <h1 className="text-xl font-bold text-gray-900">
                Welcome to {schoolName || 'School'}!
              </h1>
              <p className="text-muted-foreground mt-1">
                Hi {profile?.first_name || 'Parent'}, you can now track your child&apos;s progress.
              </p>
            </div>

            {children.length > 0 && (
              <div className="bg-emerald-50 rounded-xl p-4 text-sm space-y-2">
                <p className="text-xs font-medium text-emerald-700 uppercase tracking-wide">Your Children</p>
                {children.map((child: any, i: any) => (
                  <div key={i} className="flex justify-between">
                    <span className="font-medium">{child.profiles?.first_name} {child.profiles?.last_name}</span>
                    <span className="text-muted-foreground">
                      {child.classes?.name}{child.sections?.name ? ` — Section ${child.sections.name}` : ''}
                    </span>
                  </div>
                ))}
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
