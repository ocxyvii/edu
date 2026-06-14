'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { toast } from 'sonner'
import { Shield, ArrowLeft, Loader2, KeyRound } from 'lucide-react'

const supabase = createClient()

export default function Verify2FAPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectTo = searchParams.get('redirect') || '/'
  const [code, setCode] = useState('')
  const [useBackup, setUseBackup] = useState(false)
  const [loading, setLoading] = useState(false)
  const [sessionToken, setSessionToken] = useState<string | null>(null)

  useEffect(() => {
    const token = crypto.randomUUID()
    setSessionToken(token)
    sessionStorage.setItem('2fa_session_token', token)
  }, [])

  useEffect(() => {
  }, [])

  const verifyCode = async () => {
    if (!code.trim()) {
      toast.error('Enter a verification code')
      return
    }
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push(`/login?redirect=${encodeURIComponent(redirectTo)}`); return }

      const { data: profile } = await supabase
        .from('profiles')
        .select('two_factor_secret, two_factor_backup_codes')
        .eq('id', user.id)
        .single()

      if (!profile?.two_factor_secret) {
        toast.error('2FA not configured')
        router.push('/login')
        return
      }

      if (useBackup) {
        const codes: string[] = profile.two_factor_backup_codes ?? []
        const inputCode = code.toUpperCase().replace(/\s/g, '').match(/.{4}/g)?.join('-') ?? code.toUpperCase()

        const { verifyBackupCode } = await import('@/lib/security/encryption')
        let matchedIndex = -1

        for (let i = 0; i < codes.length; i++) {
          const valid = await verifyBackupCode(inputCode, codes[i])
          if (valid) { matchedIndex = i; break }
        }

        if (matchedIndex === -1) {
          toast.error('Invalid backup code')
          setLoading(false)
          return
        }

        const remainingCodes = [...codes]
        remainingCodes.splice(matchedIndex, 1)

        const { hashBackupCode } = await import('@/lib/security/encryption')
        const updates: Record<string, any> = { two_factor_backup_codes: remainingCodes }

        if (remainingCodes.length === 0) {
          updates.two_factor_enabled = false
          updates.two_factor_secret = null
          toast.warning('No backup codes remaining. Please set up 2FA again.')
        }

        await supabase.from('profiles').update(updates).eq('id', user.id)
      } else {
        if (code.length !== 6 || !/^\d{6}$/.test(code)) {
          toast.error('Enter a valid 6-digit code')
          setLoading(false)
          return
        }

        const { TOTP, Secret } = await import('otpauth')
        const totp = new TOTP({
          issuer: 'EduCore',
          algorithm: 'SHA1',
          digits: 6,
          period: 30,
          secret: Secret.fromBase32(profile.two_factor_secret),
        })

        const delta = totp.validate({ token: code, window: 1 })
        if (delta === null) {
          toast.error('Invalid code. Try again.')
          setLoading(false)
          return
        }
      }

      const token = sessionToken || crypto.randomUUID()
      await supabase.from('user_sessions').upsert({
        user_id: user.id,
        session_token: token,
        verified_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      }, { onConflict: 'user_id' })

      sessionStorage.setItem('2fa_session_token', token)

      toast.success('Verification successful')
      router.push(redirectTo)
    } catch (err: any) {
      toast.error(err.message ?? 'Verification failed')
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') verifyCode()
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 via-white to-edu-blue-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center shadow-lg">
              <Shield className="h-7 w-7 text-white" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold">Two-Factor Authentication</CardTitle>
          <CardDescription>
            {useBackup
              ? 'Enter one of your backup codes'
              : 'Enter the code from your authenticator app'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Input
              type="text"
              inputMode={useBackup ? 'text' : 'numeric'}
              maxLength={useBackup ? 23 : 6}
              placeholder={useBackup ? 'XXXX-XXXX-XXXX-XXXX' : '000000'}
              value={code}
              onChange={e => {
                const val = useBackup ? e.target.value.toUpperCase() : e.target.value.replace(/\D/g, '').slice(0, 6)
                setCode(val)
              }}
              onKeyDown={handleKeyDown}
              autoFocus
              className="text-center text-lg tracking-widest"
            />
          </div>

          <Button className="w-full" onClick={verifyCode} disabled={loading || !code.trim()}>
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Shield className="mr-2 h-4 w-4" />}
            {useBackup ? 'Verify Backup Code' : 'Verify'}
          </Button>

          <div className="text-center">
            <button
              onClick={() => { setUseBackup(!useBackup); setCode('') }}
              className="text-sm text-primary hover:underline inline-flex items-center gap-1"
            >
              <KeyRound className="h-3 w-3" />
              {useBackup ? 'Use authenticator app instead' : 'Use a backup code'}
            </button>
          </div>

          <p className="text-xs text-center text-muted-foreground">
            Having trouble?{' '}
            <button onClick={() => router.push('/login')} className="text-primary hover:underline">
              Go back to login
            </button>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
