'use client'

import { AppShell } from '@/components/shared/AppShell'

export function ParentShell({ children, parentName, parentAvatar, unreadCount }: {
  children: React.ReactNode
  parentName: string
  parentAvatar: string | null
  unreadCount: number
}) {
  return (
    <AppShell
      role="parent"
      schoolName="Parent Portal"
      userName={parentName}
      userAvatar={parentAvatar}
      unreadCount={unreadCount}
    >
      {children}
    </AppShell>
  )
}
