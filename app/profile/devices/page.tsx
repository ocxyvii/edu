'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'
import { Smartphone, Monitor, Globe, Clock, LogOut, ShieldAlert, Trash2, Loader2 } from 'lucide-react'
import { formatDateTime } from '@/lib/utils'

const supabase = createClient()

interface DeviceSession {
  id: string
  user_id: string
  session_token: string
  verified_at: string
  expires_at: string
  device_info?: {
    browser?: string
    os?: string
    device?: string
    ip?: string
    last_active?: string
  }
  is_current?: boolean
}

export default function DevicesPage() {
  const router = useRouter()
  const [sessions, setSessions] = useState<DeviceSession[]>([])
  const [loading, setLoading] = useState(true)
  const [loggingOut, setLoggingOut] = useState<string | null>(null)
  const [loggingOutAll, setLoggingOutAll] = useState(false)

  const fetchSessions = useCallback(async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const { data } = await supabase
      .from('user_sessions')
      .select('*')
      .eq('user_id', user.id)
      .order('verified_at', { ascending: false })

    setSessions((data ?? []).map((s: any, i: number) => ({
      ...s,
      is_current: i === 0,
      device_info: s.device_info || { browser: 'Unknown', os: 'Unknown' },
    })))
    setLoading(false)
  }, [router])

  useEffect(() => { fetchSessions() }, [fetchSessions])

  const logoutDevice = async (sessionToken: string) => {
    setLoggingOut(sessionToken)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { error } = await supabase
        .from('user_sessions')
        .delete()
        .eq('user_id', user.id)
        .eq('session_token', sessionToken)

      if (error) throw error
      toast.success('Device logged out')
      fetchSessions()
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setLoggingOut(null)
    }
  }

  const logoutAllDevices = async () => {
    setLoggingOutAll(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      await supabase.from('user_sessions').delete().eq('user_id', user.id)

      await supabase.auth.signOut()
      toast.success('Logged out of all devices')
      router.push('/login')
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setLoggingOutAll(false)
    }
  }

  const getDeviceIcon = (info: any) => {
    const os = (info?.os ?? '').toLowerCase()
    const device = (info?.device ?? '').toLowerCase()
    if (device.includes('iphone') || device.includes('android') || os.includes('ios') || os.includes('android')) return Smartphone
    return Monitor
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Session Management</h1>
        <p className="text-sm text-gray-500">Manage your active sessions and logged-in devices</p>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-lg">Active Sessions</CardTitle>
            <CardDescription>{sessions.length} active session{sessions.length !== 1 ? 's' : ''}</CardDescription>
          </div>
          <Button variant="destructive" size="sm" onClick={logoutAllDevices} disabled={loggingOutAll || sessions.length <= 1}>
            {loggingOutAll ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <LogOut className="mr-2 h-4 w-4" />}
            Logout All
          </Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-4">{[...Array(3)].map((_: any, i: any) => <div key={i} className="h-20 bg-muted animate-pulse rounded-lg" />)}</div>
          ) : !sessions.length ? (
            <p className="text-sm text-muted-foreground text-center py-8">No active sessions</p>
          ) : (
            <div className="space-y-3">
              {sessions.map((session: any) => {
                const Icon = getDeviceIcon(session.device_info)
                const isExpired = new Date(session.expires_at) < new Date()
                return (
                  <div key={session.id} className="flex items-start justify-between p-4 border rounded-lg">
                    <div className="flex items-start gap-3">
                      <div className="mt-1">
                        <Icon className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium">
                            {session.device_info?.browser ?? 'Unknown browser'} — {session.device_info?.os ?? 'Unknown OS'}
                          </p>
                          {session.is_current && <Badge className="text-[10px]">Current</Badge>}
                          {isExpired && <Badge variant="destructive" className="text-[10px]">Expired</Badge>}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1 space-y-0.5">
                          {session.device_info?.ip && <p>IP: {session.device_info.ip}</p>}
                          <p className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            Verified: {formatDateTime(session.verified_at)}
                          </p>
                          <p>Expires: {formatDateTime(session.expires_at)}</p>
                        </div>
                      </div>
                    </div>
                    {!session.is_current && !isExpired && (
                      <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => logoutDevice(session.session_token)} disabled={loggingOut === session.session_token}>
                        {loggingOut === session.session_token ? <Loader2 className="h-3 w-3 animate-spin" /> : <LogOut className="h-3 w-3" />}
                      </Button>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-amber-500" />
            Security Actions
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Logout all other devices</p>
              <p className="text-xs text-muted-foreground">Keep current session active, log out all others</p>
            </div>
            <Button variant="outline" size="sm" onClick={logoutAllDevices} disabled={loggingOutAll || sessions.length <= 1}>
              {loggingOutAll ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Logout Others
            </Button>
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Idle Timeout Protection</p>
              <p className="text-xs text-muted-foreground">Auto-logout after 30 minutes of inactivity</p>
            </div>
            <Badge variant="secondary" className="text-xs">Enabled</Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
