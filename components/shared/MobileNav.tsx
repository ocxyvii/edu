'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard,
  CalendarCheck,
  MessageSquare,
  Bell,
  User,
  GraduationCap,
  BookOpen,
  DollarSign,
  Users,
  Building2,
  ClipboardList,
  FileText,
  Home,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { UserRole } from '@/types'

interface MobileNavProps {
  role: UserRole
  unreadCount?: number
  visible: boolean
}

const roleNavItems: Record<UserRole, { href: string; label: string; icon: React.ElementType; badge?: 'unread' }[]> = {
  super_admin: [
    { href: '/super-admin', label: 'Dashboard', icon: Home },
    { href: '/super-admin/schools', label: 'Schools', icon: Building2 },
    { href: '/super-admin/revenue', label: 'Revenue', icon: DollarSign },
    { href: '/super-admin/users', label: 'Users', icon: Users },
    { href: '/super-admin/settings', label: 'Settings', icon: User },
  ],
  school_admin: [
    { href: '/school-admin', label: 'Dashboard', icon: Home },
    { href: '/school-admin/attendance', label: 'Attendance', icon: CalendarCheck },
    { href: '/school-admin/exams', label: 'Exams', icon: ClipboardList },
    { href: '/school-admin/fees', label: 'Fees', icon: DollarSign },
    { href: '/school-admin/students', label: 'Students', icon: GraduationCap },
  ],
  teacher: [
    { href: '/teacher', label: 'Dashboard', icon: Home },
    { href: '/teacher/attendance', label: 'Attendance', icon: CalendarCheck },
    { href: '/teacher/messages', label: 'Messages', icon: MessageSquare },
    { href: '/teacher/notifications', label: 'Alerts', icon: Bell, badge: 'unread' },
    { href: '/teacher/profile', label: 'Profile', icon: User },
  ],
  student: [
    { href: '/student', label: 'Dashboard', icon: Home },
    { href: '/student/timetable', label: 'Classes', icon: BookOpen },
    { href: '/student/exams', label: 'Exams', icon: ClipboardList },
    { href: '/student/assignments', label: 'Work', icon: FileText },
    { href: '/student/profile', label: 'Profile', icon: User },
  ],
  parent: [
    { href: '/parent', label: 'Dashboard', icon: Home },
    { href: '/parent/children', label: 'Children', icon: GraduationCap },
    { href: '/parent/fees', label: 'Fees', icon: DollarSign },
    { href: '/parent/notifications', label: 'Alerts', icon: Bell, badge: 'unread' },
    { href: '/parent/profile', label: 'Profile', icon: User },
  ],
}

export function MobileNav({ role, unreadCount = 0, visible }: MobileNavProps) {
  const pathname = usePathname()
  const items = roleNavItems[role] ?? roleNavItems.student

  return (
    <AnimatePresence>
      {visible && (
        <motion.nav
          initial={{ y: 60 }}
          animate={{ y: 0 }}
          exit={{ y: 60 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className="fixed bottom-0 left-0 right-0 z-50 border-t border-gray-200 bg-white/95 backdrop-blur-lg safe-area-bottom md:hidden"
          style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
        >
          <div className="flex items-center justify-around h-16">
            {items.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
              const Icon = item.icon

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'relative flex flex-col items-center justify-center gap-0.5 px-2 py-1 min-w-[56px] rounded-lg transition-colors',
                    isActive
                      ? 'text-edu-blue-600'
                      : 'text-gray-400 hover:text-gray-600'
                  )}
                >
                  <div className="relative">
                    <Icon className="h-5 w-5" />
                    {item.badge === 'unread' && unreadCount > 0 && (
                      <span className="absolute -right-1.5 -top-1.5 flex min-w-[14px] h-[14px] items-center justify-center rounded-full bg-red-500 text-[8px] font-bold text-white px-0.5">
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] font-medium leading-tight">{item.label}</span>
                  {isActive && (
                    <motion.div
                      layoutId="mobile-nav-indicator"
                      className="absolute -top-0.5 left-1/2 -translate-x-1/2 w-6 h-0.5 rounded-full bg-edu-blue-600"
                      transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                    />
                  )}
                </Link>
              )
            })}
          </div>
        </motion.nav>
      )}
    </AnimatePresence>
  )
}
