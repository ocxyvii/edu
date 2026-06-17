'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard, Users, GraduationCap, BookOpen, Calendar, DollarSign,
  Settings, LogOut, Building2, ClipboardCheck, TrendingUp, ChevronDown,
  CalendarCheck, ClipboardList, UserPlus, UserCheck, Library, Briefcase, BarChart3,
  Bell, Users2, Menu, X, GraduationCap as EduIcon, FileEdit, Upload,
  MessageSquare, User, Shield, CreditCard, Receipt, FileText,
  PanelLeftClose, PanelLeft,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { EduCoreAvatar } from '@/components/ui/EduCoreAvatar'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import type { UserRole } from '@/types'

interface MenuItem {
  href?: string
  label: string
  icon?: React.ElementType
  children?: { href: string; label: string }[]
}

type MenuRecord = Record<UserRole, MenuItem[]>

const menuItems: MenuRecord = {
  super_admin: [
    { href: '/super-admin', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/super-admin/schools', label: 'Schools', icon: Building2 },
    { href: '/super-admin/users', label: 'Users', icon: Users },
    { href: '/super-admin/subscriptions', label: 'Subscriptions', icon: CreditCard },
    { href: '/super-admin/revenue', label: 'Revenue', icon: TrendingUp },
    { href: '/super-admin/finance', label: 'Finance', icon: Receipt },
    { href: '/super-admin/audit-logs', label: 'Audit Logs', icon: FileText },
    { href: '/super-admin/settings', label: 'Settings', icon: Settings },
  ],
  school_admin: [
    { href: '/school-admin', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/school-admin/admissions', label: 'Admissions', icon: UserPlus },
    { href: '/school-admin/pending-students', label: 'Pending Students', icon: UserCheck },
    {
      label: 'Academic',
      icon: BookOpen,
      children: [
        { href: '/school-admin/academic', label: 'Academic Setup' },
        { href: '/school-admin/classes', label: 'Classes & Sections' },
        { href: '/school-admin/subjects', label: 'Subjects' },
      ],
    },
    { href: '/school-admin/students', label: 'Students', icon: GraduationCap },
    { href: '/school-admin/teachers', label: 'Teachers', icon: Users },
    { href: '/school-admin/parents', label: 'Parents', icon: Users2 },
    { href: '/school-admin/attendance', label: 'Attendance', icon: CalendarCheck },
    { href: '/school-admin/exams', label: 'Exams', icon: ClipboardList },
    { href: '/school-admin/fees', label: 'Fees', icon: DollarSign },
    { href: '/school-admin/timetable', label: 'Timetable', icon: Calendar },
    { href: '/school-admin/library', label: 'Library', icon: Library },
    { href: '/school-admin/hr', label: 'HR', icon: Briefcase },
    { href: '/school-admin/reports', label: 'Reports', icon: BarChart3 },
    { href: '/school-admin/notifications', label: 'Notifications', icon: Bell },
    { href: '/school-admin/settings', label: 'Settings', icon: Settings },
  ],
  teacher: [
    { href: '/teacher', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/teacher/attendance', label: 'Attendance', icon: CalendarCheck },
    {
      label: 'Assignments',
      icon: ClipboardList,
      children: [
        { href: '/teacher/assignments', label: 'All Assignments' },
        { href: '/teacher/assignments/new', label: 'Create Assignment' },
      ],
    },
    { href: '/teacher/exams', label: 'Exams & Marks', icon: FileEdit },
    { href: '/teacher/timetable', label: 'Timetable', icon: Calendar },
    { href: '/teacher/materials', label: 'Materials', icon: Upload },
    { href: '/teacher/messages', label: 'Messages', icon: MessageSquare },
    { href: '/teacher/my-classes', label: 'My Classes', icon: GraduationCap },
    { href: '/teacher/profile', label: 'Profile', icon: User },
  ],
  student: [
    { href: '/student', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/student/timetable', label: 'Timetable', icon: Calendar },
    { href: '/student/attendance', label: 'Attendance', icon: CalendarCheck },
    { href: '/student/exams', label: 'Exams', icon: FileEdit },
    { href: '/student/results', label: 'Results', icon: TrendingUp },
    { href: '/student/assignments', label: 'Assignments', icon: ClipboardCheck },
    { href: '/student/materials', label: 'Materials', icon: Upload },
    { href: '/student/courses', label: 'Courses', icon: BookOpen },
    { href: '/student/fees', label: 'Fees', icon: DollarSign },
    { href: '/student/messages', label: 'Messages', icon: MessageSquare },
    { href: '/student/profile', label: 'Profile', icon: User },
  ],
  parent: [
    { href: '/parent', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/parent/children', label: 'My Children', icon: GraduationCap },
    { href: '/parent/attendance', label: 'Attendance', icon: CalendarCheck },
    { href: '/parent/results', label: 'Results', icon: TrendingUp },
    { href: '/parent/fees', label: 'Fees', icon: DollarSign },
    { href: '/parent/messages', label: 'Messages', icon: MessageSquare },
    { href: '/parent/notifications', label: 'Notifications', icon: Bell },
    { href: '/parent/notification-preferences', label: 'Notification Prefs', icon: Settings },
  ],
}

const mobileNavItems: Partial<Record<UserRole, string[]>> = {
  school_admin: ['Dashboard', 'Students', 'Attendance', 'Fees', 'Reports'],
  super_admin: ['Dashboard', 'Schools', 'Users', 'Revenue', 'Settings'],
  teacher: ['Dashboard', 'Attendance', 'Exams & Marks', 'Timetable', 'Messages'],
  student: ['Dashboard', 'Timetable', 'Attendance', 'Exams', 'Results'],
  parent: ['Dashboard', 'My Children', 'Attendance', 'Results', 'Fees'],
}

interface SidebarProps {
  role: UserRole
  schoolName?: string
  schoolLogo?: string | null
  userName?: string
  userAvatar?: string | null
  userEmail?: string
  badge?: string
}

export function Sidebar({ role, schoolName, schoolLogo, userName, userAvatar, userEmail, badge }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [expanded, setExpanded] = useState<string | null>(null)

  useEffect(() => {
    const saved = localStorage.getItem('educore-sidebar-collapsed')
    if (saved) setCollapsed(saved === 'true')
  }, [])

  useEffect(() => {
    localStorage.setItem('educore-sidebar-collapsed', String(collapsed))
  }, [collapsed])

  useEffect(() => {
    if (!collapsed && menuItems[role].some((i: any) => i.children?.some((c: any) => pathname.startsWith(c.href)))) {
      const parent = menuItems[role].find((i: any) => i.children?.some((c: any) => pathname.startsWith(c.href)))
      if (parent) setExpanded(parent.label)
    }
  }, [pathname, collapsed, role])

  useEffect(() => {
    setMobileOpen(false)
  }, [pathname])

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/')
  const isAnyChildActive = (item: MenuItem) => item.children?.some((c: any) => isActive(c.href)) ?? false

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    toast.success('Logged out successfully')
    router.push('/login')
  }

  const menuForRole = menuItems[role]
  const mobileItems = mobileNavItems[role] || []

  const menuItemsForMobile = menuForRole
    .filter((item: any) => mobileItems.includes(item.label))
    .map((item: any) => {
      if (item.children && item.children.length > 0) {
        const firstChild = item.children[0]
        return { label: item.label, href: firstChild.href, icon: item.icon }
      }
      return { label: item.label, href: item.href!, icon: item.icon }
    })
    .slice(0, 5)

  const width = collapsed ? 'w-16' : 'w-64'

  return (
    <>
      {/* Mobile overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/50 lg:hidden"
            onClick={() => setMobileOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Desktop sidebar */}
      <aside
        className={cn(
          'hidden lg:flex flex-col bg-white border-r border-gray-200 h-screen transition-all duration-300 ease-in-out',
          width,
          'relative',
        )}
      >
        {/* Logo area */}
        <div className={cn(
          'flex items-center border-b border-gray-200 h-16 shrink-0',
          collapsed ? 'justify-center px-2' : 'gap-3 px-5',
        )}>
          <Link href="/" className="flex items-center gap-3 min-w-0">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-edu-blue-600 shrink-0 overflow-hidden">
              {schoolLogo ? (
                <img src={schoolLogo} alt="" className="h-full w-full object-cover" />
              ) : (
                <EduIcon className="h-5 w-5 text-white" />
              )}
            </div>
            {!collapsed && (
              <span className="text-base font-bold text-gray-900 truncate">{schoolName || 'EduCore'}</span>
            )}
          </Link>
        </div>

        {/* Collapse toggle */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="absolute -right-3 top-14 z-10 flex h-6 w-6 items-center justify-center rounded-full border bg-white shadow-sm hover:bg-gray-50 transition-colors"
        >
          {collapsed ? <PanelLeft className="h-3 w-3" /> : <PanelLeftClose className="h-3 w-3" />}
        </button>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 overflow-y-auto p-3 scrollbar-thin">
          {menuForRole.map((item: any) => {
            if (item.children) {
              const isExpanded = collapsed ? false : (expanded === item.label || isAnyChildActive(item))
              const Icon = item.icon
              const childActive = isAnyChildActive(item)
              return (
                <div key={item.label}>
                  <button
                    onClick={() => {
                      if (collapsed) return
                      setExpanded(isExpanded ? null : item.label)
                    }}
                    className={cn(
                      'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                      collapsed ? 'justify-center' : '',
                      childActive
                        ? 'bg-edu-blue-50 text-edu-blue-700'
                        : 'text-gray-700 hover:bg-gray-100',
                    )}
                    title={collapsed ? item.label : undefined}
                  >
                    {Icon && <Icon className="h-5 w-5 shrink-0" />}
                    {!collapsed && (
                      <>
                        <span className="flex-1 text-left truncate">{item.label}</span>
                        <ChevronDown className={cn('h-4 w-4 shrink-0 transition-transform', isExpanded && 'rotate-180')} />
                      </>
                    )}
                  </button>
                  {!collapsed && (
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="ml-4 mt-1 space-y-1 border-l border-gray-200 pl-3 overflow-hidden"
                        >
                          {item.children.map((child: any) => (
                            <Link
                              key={child.href}
                              href={child.href}
                              className={cn(
                                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                                isActive(child.href)
                                  ? 'bg-edu-blue-50 text-edu-blue-700'
                                  : 'text-gray-600 hover:bg-gray-100',
                              )}
                            >
                              {child.label}
                            </Link>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  )}
                </div>
              )
            }

            const Icon = item.icon!
            return (
              <Link
                key={item.href}
                href={item.href!}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                  collapsed ? 'justify-center' : '',
                  isActive(item.href!)
                    ? 'bg-edu-blue-50 text-edu-blue-700'
                    : 'text-gray-700 hover:bg-gray-100',
                )}
                title={collapsed ? item.label : undefined}
              >
                <Icon className="h-5 w-5 shrink-0" />
                {!collapsed && <span className="truncate">{item.label}</span>}
              </Link>
            )
          })}
        </nav>

        {/* Bottom: user info + logout */}
        <div className={cn(
          'border-t border-gray-200 p-3',
          collapsed ? 'flex flex-col items-center gap-3' : 'space-y-3',
        )}>
          {!collapsed && userName && (
            <div className="flex items-center gap-3 px-1">
              <EduCoreAvatar name={userName} avatarUrl={userAvatar} size="sm" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-gray-900">{userName}</p>
                {userEmail && <p className="truncate text-xs text-gray-500">{userEmail}</p>}
              </div>
              {badge && <Badge variant="secondary" className="text-[10px]">{badge}</Badge>}
            </div>
          )}
          {collapsed && userName && (
            <EduCoreAvatar name={userName} avatarUrl={userAvatar} size="sm" />
          )}
          <button
            onClick={handleLogout}
            className={cn(
              'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100',
              collapsed ? 'justify-center w-full' : 'w-full',
            )}
            title="Logout"
          >
            <LogOut className="h-5 w-5 shrink-0" />
            {!collapsed && 'Logout'}
          </button>
        </div>
      </aside>

      {/* Mobile bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-30 flex items-center justify-around border-t border-gray-200 bg-white px-2 py-1 lg:hidden safe-area-bottom">
        <button
          onClick={() => setMobileOpen(true)}
          className="flex flex-col items-center gap-0.5 px-3 py-2 text-[10px] font-medium text-gray-500"
        >
          <Menu className="h-5 w-5" />
          <span>Menu</span>
        </button>
        {menuItemsForMobile.map((item: any) => {
          const Icon = item.icon
          const active = item.href ? isActive(item.href) : false
          return (
            <Link
              key={item.label}
              href={item.href || '/'}
              className={cn(
                'flex flex-col items-center gap-0.5 px-3 py-2 text-[10px] font-medium transition-colors',
                active ? 'text-edu-blue-600' : 'text-gray-500 hover:text-gray-700',
              )}
            >
              {Icon && <Icon className="h-5 w-5" />}
              <span className="truncate max-w-14 text-center leading-tight">{item.label}</span>
            </Link>
          )
        })}
      </nav>

      {/* Mobile slide-out sidebar */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.aside
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className={cn(
              'fixed left-0 top-0 z-50 flex h-full w-72 flex-col bg-white shadow-2xl lg:hidden',
            )}
          >
            <div className="flex h-16 items-center justify-between border-b border-gray-200 px-5">
              <Link href="/" className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-edu-blue-600">
                  <EduIcon className="h-5 w-5 text-white" />
                </div>
                <span className="text-base font-bold text-gray-900">{schoolName || 'EduCore'}</span>
              </Link>
              <button onClick={() => setMobileOpen(false)}>
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>

            <nav className="flex-1 space-y-1 overflow-y-auto p-4">
              {menuForRole.map((item: any) => {
                if (item.children) {
                  const isExpanded = expanded === item.label || isAnyChildActive(item)
                  const Icon = item.icon
                  return (
                    <div key={item.label}>
                      <button
                        onClick={() => setExpanded(isExpanded ? null : item.label)}
                        className={cn(
                          'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                          isAnyChildActive(item)
                            ? 'bg-edu-blue-50 text-edu-blue-700'
                            : 'text-gray-700 hover:bg-gray-100',
                        )}
                      >
                        {Icon && <Icon className="h-5 w-5 shrink-0" />}
                        <span className="flex-1 text-left truncate">{item.label}</span>
                        <ChevronDown className={cn('h-4 w-4 shrink-0 transition-transform', isExpanded && 'rotate-180')} />
                      </button>
                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="ml-4 mt-1 space-y-1 border-l border-gray-200 pl-3 overflow-hidden"
                          >
                            {item.children.map((child: any) => (
                              <Link
                                key={child.href}
                                href={child.href}
                                className={cn(
                                  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                                  isActive(child.href)
                                    ? 'bg-edu-blue-50 text-edu-blue-700'
                                    : 'text-gray-600 hover:bg-gray-100',
                                )}
                              >
                                {child.label}
                              </Link>
                            ))}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  )
                }

                const Icon = item.icon!
                return (
                  <Link
                    key={item.href}
                    href={item.href!}
                    className={cn(
                      'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                      isActive(item.href!)
                        ? 'bg-edu-blue-50 text-edu-blue-700'
                        : 'text-gray-700 hover:bg-gray-100',
                    )}
                  >
                    <Icon className="h-5 w-5 shrink-0" />
                    <span className="truncate">{item.label}</span>
                  </Link>
                )
              })}
            </nav>

            <div className="border-t border-gray-200 p-4 space-y-3">
              {userName && (
                <div className="flex items-center gap-3">
                  <EduCoreAvatar name={userName} avatarUrl={userAvatar} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-gray-900">{userName}</p>
                    {userEmail && <p className="truncate text-xs text-gray-500">{userEmail}</p>}
                  </div>
                </div>
              )}
              <button
                onClick={handleLogout}
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100"
              >
                <LogOut className="h-5 w-5" /> Logout
              </button>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>
    </>
  )
}
