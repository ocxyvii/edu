'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Command } from 'cmdk'
import { cn } from '@/lib/utils'
import {
  Search, Users, GraduationCap, BookOpen, CalendarCheck, DollarSign,
  Bell, Settings, LayoutDashboard, BarChart3, ClipboardList, UserPlus,
  FileEdit, MessageSquare, Clock, TrendingUp,
} from 'lucide-react'

interface CommandItem {
  id: string
  label: string
  href: string
  icon: React.ElementType
  keywords?: string[]
}

const globalPages: CommandItem[] = [
  { id: 'dashboard', label: 'Dashboard', href: '/school-admin', icon: LayoutDashboard, keywords: ['home', 'overview'] },
  { id: 'students', label: 'Students', href: '/school-admin/students', icon: GraduationCap, keywords: ['pupils', 'learners'] },
  { id: 'teachers', label: 'Teachers', href: '/school-admin/teachers', icon: Users, keywords: ['staff', 'faculty'] },
  { id: 'classes', label: 'Classes', href: '/school-admin/classes', icon: BookOpen, keywords: ['sections', 'rooms'] },
  { id: 'attendance', label: 'Attendance', href: '/school-admin/attendance', icon: CalendarCheck, keywords: ['register', 'present'] },
  { id: 'exams', label: 'Exams', href: '/school-admin/exams', icon: FileEdit, keywords: ['tests', 'assessments'] },
  { id: 'fees', label: 'Fees', href: '/school-admin/fees', icon: DollarSign, keywords: ['payments', 'tuition'] },
  { id: 'reports', label: 'Reports', href: '/school-admin/reports', icon: BarChart3, keywords: ['analytics', 'insights'] },
  { id: 'notifications', label: 'Notifications', href: '/school-admin/notifications', icon: Bell, keywords: ['alerts', 'messages'] },
  { id: 'settings', label: 'Settings', href: '/school-admin/settings', icon: Settings, keywords: ['preferences', 'config'] },
  { id: 'messages', label: 'Messages', href: '/school-admin/messages', icon: MessageSquare, keywords: ['chat', 'inbox'] },
  { id: 'timetable', label: 'Timetable', href: '/school-admin/timetable', icon: Clock, keywords: ['schedule', 'periods'] },
  { id: 'library', label: 'Library', href: '/school-admin/library', icon: BookOpen, keywords: ['books', 'resources'] },
  { id: 'hr', label: 'HR', href: '/school-admin/hr', icon: Users, keywords: ['employees', 'payroll'] },
  { id: 'admissions', label: 'Admissions', href: '/school-admin/admissions', icon: UserPlus, keywords: ['applications', 'enroll'] },
  { id: 'academic', label: 'Academic Setup', href: '/school-admin/academic', icon: BookOpen, keywords: ['subjects', 'curriculum'] },
]

const quickActions: CommandItem[] = [
  { id: 'new-student', label: 'Add New Student', href: '/school-admin/students/new', icon: UserPlus, keywords: ['create', 'register'] },
  { id: 'mark-attendance', label: 'Mark Attendance', href: '/school-admin/attendance', icon: CalendarCheck, keywords: ['register'] },
  { id: 'new-announcement', label: 'New Announcement', href: '/school-admin/notifications', icon: Bell, keywords: ['broadcast'] },
  { id: 'new-exam', label: 'Create Exam', href: '/school-admin/exams/new', icon: FileEdit, keywords: ['test', 'quiz'] },
  { id: 'record-payment', label: 'Record Payment', href: '/school-admin/fees', icon: DollarSign, keywords: ['fee', 'transaction'] },
]

export function CommandPalette() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen(o => !o)
      }
    }
    document.addEventListener('keydown', down)
    return () => document.removeEventListener('keydown', down)
  }, [])

  const runCommand = useCallback((item: CommandItem) => {
    setOpen(false)
    setSearch('')
    router.push(item.href)
  }, [router])

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        />
      )}
      <Command.Dialog
        open={open}
        onOpenChange={setOpen}
        label="Command palette"
        className={cn(
          'fixed top-[20%] left-1/2 -translate-x-1/2 z-50 w-full max-w-lg',
          'rounded-xl border border-gray-200 bg-white shadow-2xl',
          'overflow-hidden',
        )}
      >
        <div className="flex items-center border-b border-gray-200 px-3">
          <Search className="mr-2 h-4 w-4 shrink-0 text-muted-foreground" />
          <Command.Input
            placeholder="Search pages, students, teachers..."
            value={search}
            onValueChange={setSearch}
            className="flex h-12 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
        </div>

        <Command.List className="max-h-72 overflow-y-auto p-2">
          <Command.Empty className="py-6 text-center text-sm text-muted-foreground">
            No results found.
          </Command.Empty>

          <Command.Group heading={
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground px-2 py-1.5">
              Quick Actions
            </span>
          }>
            {quickActions.map(item => (
              <CommandItemRow key={item.id} item={item} onSelect={() => runCommand(item)} icon={item.icon} />
            ))}
          </Command.Group>

          <Command.Group heading={
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground px-2 py-1.5">
              Pages
            </span>
          }>
            {globalPages.map(item => (
              <CommandItemRow key={item.id} item={item} onSelect={() => runCommand(item)} icon={item.icon} />
            ))}
          </Command.Group>

          <Command.Group heading={
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground px-2 py-1.5">
              Recent
            </span>
          }>
            {['/school-admin', '/school-admin/students', '/school-admin/attendance'].map(href => {
              const page = globalPages.find(p => p.href === href)
              if (!page) return null
              return (
                <CommandItemRow
                  key={href}
                  item={page}
                  onSelect={() => runCommand(page)}
                  icon={page.icon}
                />
              )
            })}
          </Command.Group>
        </Command.List>

        <div className="flex items-center gap-4 border-t border-gray-200 px-3 py-2 text-[11px] text-muted-foreground">
          <span><kbd className="rounded border bg-muted px-1 py-0.5 text-[10px]">↑↓</kbd> Navigate</span>
          <span><kbd className="rounded border bg-muted px-1 py-0.5 text-[10px]">↵</kbd> Open</span>
          <span><kbd className="rounded border bg-muted px-1 py-0.5 text-[10px]">Esc</kbd> Close</span>
        </div>
      </Command.Dialog>
    </>
  )
}

function CommandItemRow({ item, onSelect, icon: Icon }: { item: CommandItem; onSelect: () => void; icon: React.ElementType }) {
  return (
    <Command.Item
      value={item.label}
      onSelect={onSelect}
      className={cn(
        'flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-sm',
        'aria-selected:bg-accent aria-selected:text-accent-foreground',
        'data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
      )}
    >
      <Icon className="h-4 w-4 text-muted-foreground" />
      <span>{item.label}</span>
    </Command.Item>
  )
}
