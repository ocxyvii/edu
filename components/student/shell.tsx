'use client'

import { AppShell } from '@/components/shared/AppShell'

export function StudentShell({ children, studentName, studentAvatar, unreadCount }: {
  children: React.ReactNode
  studentName: string
  studentAvatar: string | null
  unreadCount: number
}) {
  return (
    <AppShell
      role="student"
      schoolName="Student Portal"
      userName={studentName}
      userAvatar={studentAvatar}
      unreadCount={unreadCount}
    >
      {children}
    </AppShell>
  )
}
