'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { toast } from 'sonner'
import { Shield, Copy, CheckCircle, Download, ArrowLeft, Loader2 } from 'lucide-react'

const supabase = createClient()

export default function Setup2FAPage() {
  const router = useRouter()
  const [step, setStep] = useState<'intro' | 'qr' | 'verify' | 'backup'>('intro')
  const [secret, setSecret] = useState('')
  const [qrUrl, setQrUrl] = useState('')
  const [otpUrl, setOtpUrl] = useState('')
  const [verificationCode, setVerificationCode] = useState('')
  const [backupCodes, setBackupCodes] = useState<string[]>([])
  const [savedCodes, setSavedCodes] = useState(false)
  const [loading, setLoading] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [QRCode, setQRCode] = useState<any>(null)

  useEffect(() => {
    import('qrcode.react').then(mod => setQRCode(() => mod.QRCodeSVG))
  }, [])

  const generateSecret = async () => {
    setGenerating(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const { data: profile } = await supabase
        .from('profiles')
        .select('email')
        .eq('id', user.id)
        .single()

      const { Secret, URI } = await import('otpauth')
      const totpSecret = new Secret({ size: 20 })
      const secretBase32 = totpSecret.base32

      const totp = new (await import('otpauth')).TOTP({
        issuer: 'EduCore',
        label: profile?.email ?? user.email ?? 'User',
        algorithm: 'SHA1',
        digits: 6,
        period: 30,
        secret: totpSecret,
      })

      const url = totp.toString()
      const qrData = `otpauth://totp/EduCore:${encodeURIComponent(profile?.email ?? user.email ?? 'User')}?secret=${secretBase32}&issuer=EduCore&algorithm=SHA1&digits=6&period=30`

      setSecret(secretBase32)
      setOtpUrl(url)
      setQrUrl(qrData)
      setStep('qr')
    } catch (err: any) {
      toast.error(err.message ?? 'Failed to generate secret')
    } finally {
      setGenerating(false)
    }
  }

  const verifyAndEnable = async () => {
    if (verificationCode.length !== 6) {
      toast.error('Enter a 6-digit code')
      return
    }
    setLoading(true)
    try {
      const { TOTP, Secret } = await import('otpauth')
      const totp = new TOTP({
        issuer: 'EduCore',
        algorithm: 'SHA1',
        digits: 6,
        period: 30,
        secret: Secret.fromBase32(secret),
      })

      const delta = totp.validate({ token: verificationCode, window: 1 })
      if (delta === null) {
        toast.error('Invalid code. Try again.')
        setLoading(false)
        return
      }

      const codes = Array.from({ length: 10 }, () => {
        const buf = crypto.getRandomValues(new Uint8Array(4))
        return Array.from(buf).map((b: any) => b.toString(16).padStart(2, '0').toUpperCase()).join('').match(/.{4}/g)!.join('-')
      })

      const { hashBackupCode } = await import('@/lib/security/encryption')
      const hashedCodes = await Promise.all(codes.map((c: any) => hashBackupCode(c)))

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { error } = await supabase
        .from('profiles')
        .update({
          two_factor_secret: secret,
          two_factor_enabled: true,
          two_factor_backup_codes: hashedCodes,
        })
        .eq('id', user.id)

      if (error) throw error

      setBackupCodes(codes)
      setStep('backup')
      toast.success('Two-factor authentication enabled')
    } catch (err: any) {
      toast.error(err.message ?? 'Failed to enable 2FA')
    } finally {
      setLoading(false)
    }
  }

  const downloadCodes = () => {
    const text = `EduCore Backup Codes\n\nStore these securely. Each code can only be used once.\n\n${backupCodes.join('\n')}\n\nGenerated: ${new Date().toISOString()}`
    const blob = new Blob([text], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'educore-backup-codes.txt'
    a.click()
    URL.revokeObjectURL(url)
    setSavedCodes(true)
  }

  if (step === 'intro') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 via-white to-edu-blue-50 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center shadow-lg">
                <Shield className="h-7 w-7 text-white" />
              </div>
            </div>
            <CardTitle className="text-2xl font-bold">Set Up Two-Factor Authentication</CardTitle>
            <CardDescription>Add an extra layer of security to your account</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800 space-y-2">
              <p className="font-medium">What is 2FA?</p>
              <p>Two-factor authentication adds a second layer of verification. Even if someone has your password, they won't be able to access your account without a code from your authenticator app.</p>
            </div>
            <ul className="space-y-2 text-sm">
              <li className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-green-600 shrink-0" /> Use Google Authenticator, Authy, or similar app</li>
              <li className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-green-600 shrink-0" /> Scan the QR code to link your account</li>
              <li className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-green-600 shrink-0" /> Save backup codes in case you lose access</li>
            </ul>
            <Button className="w-full" onClick={generateSecret} disabled={generating}>
              {generating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Shield className="mr-2 h-4 w-4" />}
              Get Started
            </Button>
            <Button variant="outline" className="w-full" onClick={() => router.back()}>
              <ArrowLeft className="mr-2 h-4 w-4" /> Cancel
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (step === 'qr') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 via-white to-edu-blue-50 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle>Scan QR Code</CardTitle>
            <CardDescription>Open your authenticator app and scan this code</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-center">
              {QRCode ? (
                <QRCode value={qrUrl} size={200} level="H" includeMargin />
              ) : (
                <div className="w-[200px] h-[200px] bg-muted animate-pulse rounded-lg flex items-center justify-center text-sm text-muted-foreground">Loading QR...</div>
              )}
            </div>
            <div className="bg-muted rounded-lg p-3">
              <p className="text-xs text-muted-foreground text-center mb-1">Can't scan? Enter this code manually:</p>
              <p className="text-sm font-mono text-center select-all">{secret}</p>
            </div>
            <div className="space-y-2">
              <Input
                type="text"
                inputMode="numeric"
                maxLength={6}
                placeholder="Enter 6-digit code"
                value={verificationCode}
                onChange={e => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              />
              <Button className="w-full" onClick={verifyAndEnable} disabled={loading || verificationCode.length !== 6}>
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Verify & Enable
              </Button>
            </div>
            <p className="text-xs text-center text-muted-foreground">The code refreshes every 30 seconds</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (step === 'backup') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 via-white to-edu-blue-50 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-lg">
                <CheckCircle className="h-7 w-7 text-white" />
              </div>
            </div>
            <CardTitle>Backup Codes</CardTitle>
            <CardDescription>Store these in a safe place. Each code can only be used once.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
              <p className="font-medium">⚠️ Important</p>
              <p>If you lose access to your authenticator app, these backup codes are your only way to regain access.</p>
            </div>
            <div className="bg-muted rounded-lg p-4">
              <div className="grid grid-cols-2 gap-2">
                {backupCodes.map((code, i) => (
                  <div key={i} className="font-mono text-sm bg-background rounded px-2 py-1.5 text-center select-all">
                    {code}
                  </div>
                ))}
              </div>
            </div>
            <div className="flex gap-2">
              <Button className="flex-1" onClick={downloadCodes} variant="outline">
                <Download className="mr-2 h-4 w-4" /> Download
              </Button>
              <Button className="flex-1" onClick={() => { navigator.clipboard.writeText(backupCodes.join('\n')); toast.success('Copied to clipboard'); setSavedCodes(true) }}>
                <Copy className="mr-2 h-4 w-4" /> Copy All
              </Button>
            </div>
            <Button className="w-full" disabled={!savedCodes} onClick={() => router.push('/')}>
              Done — Go to Dashboard
            </Button>
            {!savedCodes && <p className="text-xs text-center text-muted-foreground">Please download or copy your backup codes before continuing</p>}
          </CardContent>
        </Card>
      </div>
    )
  }
}
