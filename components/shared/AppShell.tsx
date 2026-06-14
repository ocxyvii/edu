'use client'

import { useState, useEffect } from 'react'
import { Sidebar } from '@/components/shared/Sidebar'
import { TopNav } from '@/components/shared/TopNav'
import { CommandPalette } from '@/components/shared/CommandPalette'
import { MobileNav } from '@/components/shared/MobileNav'
import { OfflineBanner } from '@/components/shared/OfflineBanner'
import { InstallPrompt } from '@/components/shared/InstallPrompt'
import { createClient } from '@/lib/supabase/client'
import type { UserRole } from '@/types'

interface ShellProps {
  children: React.ReactNode
  role: UserRole
  schoolName?: string
  schoolLogo?: string | null
  userName?: string
  userAvatar?: string | null
  userEmail?: string
  unreadCount?: number
  badge?: string
}

export function AppShell({
  children,
  role,
  schoolName,
  schoolLogo,
  userName,
  userAvatar,
  userEmail,
  unreadCount = 0,
  badge,
}: ShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [liveUnread, setLiveUnread] = useState(unreadCount)
  const [showMobileNav, setShowMobileNav] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    const channel = supabase
      .channel('notifications')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${supabase.auth.getUser().then(({ data }) => data.user?.id)}`,
      }, () => {
        setLiveUnread(c => c + 1)
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [supabase])

  // Hide mobile nav when keyboard is open
  useEffect(() => {
    const handleFocusIn = (e: FocusEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        if (window.innerWidth < 768) {
          setShowMobileNav(false)
        }
      }
    }
    const handleFocusOut = (e: FocusEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        setTimeout(() => setShowMobileNav(true), 300)
      }
    }

    document.addEventListener('focusin', handleFocusIn)
    document.addEventListener('focusout', handleFocusOut)

    // Also handle resize
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setShowMobileNav(false)
      } else {
        setShowMobileNav(true)
      }
    }
    window.addEventListener('resize', handleResize)
    handleResize()

    return () => {
      document.removeEventListener('focusin', handleFocusIn)
      document.removeEventListener('focusout', handleFocusOut)
      window.removeEventListener('resize', handleResize)
    }
  }, [])

  return (
    <div className="flex h-screen bg-gray-50">
      <OfflineBanner />
      <Sidebar
        role={role}
        schoolName={schoolName}
        schoolLogo={schoolLogo}
        userName={userName}
        userAvatar={userAvatar}
        userEmail={userEmail}
        badge={badge}
      />

      <div className="flex flex-1 flex-col overflow-hidden lg:ml-0">
        <TopNav
          schoolName={schoolName}
          userName={userName}
          userAvatar={userAvatar}
          userEmail={userEmail}
          unreadCount={liveUnread}
          notificationsHref={`/${role}/notifications`}
          profileHref={`/${role}/profile`}
          settingsHref={`/${role}/settings`}
          onMenuToggle={() => setMobileOpen(!mobileOpen)}
          showMobileMenu={mobileOpen}
        />

        <main className="flex-1 overflow-auto pb-16 md:pb-0">
          <div className="container mx-auto p-4 lg:p-8">
            {children}
          </div>
        </main>
      </div>

      <MobileNav role={role} unreadCount={liveUnread} visible={showMobileNav} />
      <InstallPrompt />
      <CommandPalette />
    </div>
  )
}
