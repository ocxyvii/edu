'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const IDLE_TIMEOUT_MS = 30 * 60 * 1000
const CHECK_INTERVAL_MS = 60_000

export function IdleTimeoutProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const lastActivity = useRef(Date.now())
  const checkInterval = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    const resetTimer = () => { lastActivity.current = Date.now() }

    const events = ['mousedown', 'keydown', 'touchstart', 'scroll', 'mousemove']
    events.forEach(event => window.addEventListener(event, resetTimer, { passive: true }))

    checkInterval.current = setInterval(async () => {
      const elapsed = Date.now() - lastActivity.current
      if (elapsed >= IDLE_TIMEOUT_MS) {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('two_factor_enabled')
            .eq('id', user.id)
            .single()

          // Only log out if 2FA is enabled (they can re-verify)
          if ((profile as any)?.two_factor_enabled) {
            await supabase.from('user_sessions').delete().eq('user_id', user.id)
          }

          await supabase.auth.signOut()
          router.push('/login')
        }
      }
    }, CHECK_INTERVAL_MS)

    return () => {
      events.forEach(event => window.removeEventListener(event, resetTimer))
      if (checkInterval.current) clearInterval(checkInterval.current)
    }
  }, [router])

  return <>{children}</>
}
