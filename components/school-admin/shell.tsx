'use client'

import { AppShell } from '@/components/shared/AppShell'

export function SchoolAdminShell({ children, schoolName, schoolLogo, unreadCount }: {
  children: React.ReactNode
  schoolName: string
  schoolLogo: string | null
  unreadCount: number
}) {
  return (
    <AppShell
      role="school_admin"
      schoolName={schoolName}
      schoolLogo={schoolLogo}
      userName={schoolName}
      userEmail={undefined}
      unreadCount={unreadCount}
      badge="Admin"
    >
      {children}
    </AppShell>
  )
}
