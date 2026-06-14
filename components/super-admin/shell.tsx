'use client'

import { AppShell } from '@/components/shared/AppShell'

export function SuperAdminShell({ children }: { children: React.ReactNode }) {
  return (
    <AppShell
      role="super_admin"
      schoolName="EduCore"
      userName="Super Admin"
      userEmail="admin@educore.com"
      unreadCount={0}
      badge="Admin"
    >
      {children}
    </AppShell>
  )
}
