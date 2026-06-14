'use client'

import { AppShell } from '@/components/shared/AppShell'

export function TeacherShell({ children, teacherName, teacherAvatar, unreadCount }: {
  children: React.ReactNode
  teacherName: string
  teacherAvatar: string | null
  unreadCount: number
}) {
  return (
    <AppShell
      role="teacher"
      schoolName="Teacher Portal"
      userName={teacherName}
      userAvatar={teacherAvatar}
      unreadCount={unreadCount}
    >
      {children}
    </AppShell>
  )
}
