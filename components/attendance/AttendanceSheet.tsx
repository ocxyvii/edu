'use client'

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { bulkMarkAttendance } from '@/lib/actions/attendance.actions'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import { Check, X, Clock, AlertCircle, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface AttendanceSheetStudent {
  id: string
  admission_number: string
  profiles: {
    id: string
    first_name: string
    last_name: string
    avatar_url: string | null
  }
}

export interface AttendanceRecord {
  student_id: string
  status: 'present' | 'absent' | 'late' | 'excused'
  notes?: string | null
}

const STATUS_CONFIG = {
  present: {
    label: 'Present',
    icon: Check,
    color: 'bg-green-100 text-green-800 border-green-300 hover:bg-green-200',
    activeColor: 'bg-green-500 text-white border-green-600',
  },
  absent: {
    label: 'Absent',
    icon: X,
    color: 'bg-red-100 text-red-800 border-red-300 hover:bg-red-200',
    activeColor: 'bg-red-500 text-white border-red-600',
  },
  late: {
    label: 'Late',
    icon: Clock,
    color: 'bg-yellow-100 text-yellow-800 border-yellow-300 hover:bg-yellow-200',
    activeColor: 'bg-yellow-500 text-white border-yellow-600',
  },
  excused: {
    label: 'Excused',
    icon: AlertCircle,
    color: 'bg-blue-100 text-blue-800 border-blue-300 hover:bg-blue-200',
    activeColor: 'bg-blue-500 text-white border-blue-600',
  },
} as const

type AttendanceStatus = keyof typeof STATUS_CONFIG
const STATUS_ORDER: AttendanceStatus[] = ['present', 'absent', 'late', 'excused']

interface AttendanceSheetProps {
  students: AttendanceSheetStudent[]
  date: string
  classId: string
  sectionId?: string
  existingAttendance: AttendanceRecord[]
  isLoading?: boolean
}

export function AttendanceSheet({
  students,
  date,
  classId,
  sectionId,
  existingAttendance,
  isLoading,
}: AttendanceSheetProps) {
  const queryClient = useQueryClient()
  const supabase = useMemo(() => createClient(), [])
  const [records, setRecords] = useState<Record<string, AttendanceStatus>>({})
  const [dirty, setDirty] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const submittedRef = useRef(false)

  const existingMap = new Map(existingAttendance.map(r => [r.student_id, r.status]))

  useEffect(() => {
    const initial: Record<string, AttendanceStatus> = {}
    students.forEach(s => {
      initial[s.id] = (existingMap.get(s.id) as AttendanceStatus) ?? 'present'
    })
    setRecords(initial)
    setDirty(false)
    submittedRef.current = existingAttendance.length > 0
  }, [students, existingAttendance])

  useEffect(() => {
    const channel = supabase
      .channel(`attendance-${classId}-${date}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'attendance',
          filter: `class_id=eq.${classId}`,
        },
        (payload) => {
          const newRecord = payload.new as any
          if (!newRecord || newRecord.date !== date) return
          const status = newRecord.status as AttendanceStatus
          if (STATUS_CONFIG[status]) {
            setRecords(prev => ({
              ...prev,
              [newRecord.student_id]: status,
            }))
          }
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [classId, date, supabase])

  const mutation = useMutation({
    mutationFn: () => {
      setSubmitting(true)
      return bulkMarkAttendance({
        classId,
        sectionId,
        date,
        records: Object.entries(records).map(([studentId, status]) => ({
          studentId,
          status,
        })),
      })
    },
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ['attendance', sectionId ?? classId, date] })
      const previous = queryClient.getQueryData(['attendance', sectionId ?? classId, date])
      queryClient.setQueryData(['attendance', sectionId ?? classId, date], () =>
        Object.entries(records).map(([student_id, status]) => ({ student_id, status }))
      )
      return { previous }
    },
    onSuccess: () => {
      submittedRef.current = true
      setDirty(false)
      toast.success('Attendance recorded')
      queryClient.invalidateQueries({ queryKey: ['attendance'] })
    },
    onError: (err: Error, _, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['attendance', sectionId ?? classId, date], context.previous)
      }
      toast.error(err.message)
    },
    onSettled: () => {
      setSubmitting(false)
    },
  })

  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (dirty) {
        e.preventDefault()
        e.returnValue = ''
      }
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [dirty])

  const cycleStatus = useCallback((studentId: string) => {
    setRecords(prev => {
      const current = prev[studentId] ?? 'present'
      const idx = STATUS_ORDER.indexOf(current)
      const next = STATUS_ORDER[(idx + 1) % STATUS_ORDER.length]
      return { ...prev, [studentId]: next }
    })
    setDirty(true)
  }, [])

  const handleKeyDown = useCallback((e: React.KeyboardEvent, studentId: string) => {
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault()
      cycleStatus(studentId)
    }
    if (e.key === 'Tab') {
      const rows = document.querySelectorAll<HTMLDivElement>('[data-attendance-row]')
      const currentIdx = Array.from(rows).findIndex(r => r.dataset.attendanceRow === studentId)
      if (e.shiftKey && currentIdx > 0) {
        e.preventDefault()
        rows[currentIdx - 1]?.focus()
      } else if (!e.shiftKey && currentIdx < rows.length - 1) {
        e.preventDefault()
        rows[currentIdx + 1]?.focus()
      }
    }
  }, [cycleStatus])

  const markAllPresent = useCallback(() => {
    const allPresent: Record<string, AttendanceStatus> = {}
    students.forEach(s => { allPresent[s.id] = 'present' })
    setRecords(allPresent)
    setDirty(true)
  }, [students])

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(8)].map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
      </div>
    )
  }

  const changedCount = students.filter(s => {
    const current = records[s.id]
    const original = existingMap.get(s.id) ?? 'present'
    return current && current !== original
  }).length

  return (
    <div className="space-y-3 sm:space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div className="flex items-center gap-2 sm:gap-3">
          <p className="text-xs sm:text-sm text-muted-foreground">
            {students.length} student{students.length !== 1 ? 's' : ''}
          </p>
          {dirty && (
            <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-[10px] sm:text-xs">
              {changedCount} unsaved
            </Badge>
          )}
        </div>
        <div className="flex gap-1.5 sm:gap-2 w-full sm:w-auto">
          <Button variant="outline" size="sm" onClick={markAllPresent} disabled={submitting} className="flex-1 sm:flex-none text-xs sm:text-sm h-9 sm:h-auto">
            <Check className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1" /> All Present
          </Button>
          <Button
            size="sm"
            onClick={() => mutation.mutate()}
            disabled={submitting || !dirty}
            className="flex-1 sm:flex-none text-xs sm:text-sm h-9 sm:h-auto"
          >
            {submitting ? (
              <><Loader2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1 animate-spin" /> Save</>
            ) : submittedRef.current ? (
              'Update'
            ) : (
              'Save'
            )}
          </Button>
        </div>
      </div>

      <div className="space-y-1">
        {students.map((student) => {
          const status = records[student.id] ?? 'present'
          const config = STATUS_CONFIG[status]
          const Icon = config.icon
          const isChanged = status !== (existingMap.get(student.id) ?? 'present')

          return (
            <div
              key={student.id}
              data-attendance-row={student.id}
              tabIndex={0}
              role="button"
              aria-label={`${student.profiles.first_name} ${student.profiles.last_name} - ${status}`}
              className={cn(
                'flex items-center justify-between p-2 sm:p-3 rounded-lg border transition-colors outline-none',
                'focus-visible:ring-2 focus-visible:ring-edu-blue-500 focus-visible:ring-offset-2',
                'cursor-pointer hover:bg-gray-50',
                isChanged ? 'border-amber-300 bg-amber-50/30' : 'border-gray-200',
                'min-h-[40px] sm:min-h-[52px]'
              )}
              onClick={() => cycleStatus(student.id)}
              onKeyDown={(e) => handleKeyDown(e, student.id)}
            >
              <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                <Avatar className="h-6 w-6 sm:h-8 sm:w-8 shrink-0">
                  <AvatarImage src={student.profiles?.avatar_url ?? ''} />
                  <AvatarFallback className="text-[10px] sm:text-xs">
                    {student.profiles?.first_name?.[0]}{student.profiles?.last_name?.[0]}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {student.profiles?.first_name} {student.profiles?.last_name}
                  </p>
                  <p className="text-[11px] sm:text-xs text-muted-foreground truncate hidden sm:block">{student.admission_number}</p>
                </div>
              </div>

              <Badge className={cn('border shrink-0 text-[11px] sm:text-xs px-1.5 sm:px-2 py-0 sm:py-0.5', status === 'present' ? config.activeColor : config.color)}>
                <Icon className="h-3 w-3 sm:h-3.5 sm:w-3.5 mr-0.5 sm:mr-1" />
                <span className="hidden xs:inline sm:inline">{config.label}</span>
              </Badge>
            </div>
          )
        })}
      </div>

      {existingAttendance.length > 0 && (
        <div className="flex flex-wrap gap-2 text-sm pt-2">
          <span className="text-xs text-muted-foreground mr-1">Previously recorded:</span>
          <Badge variant="secondary" className="bg-green-50 text-green-700">
            Present: {existingAttendance.filter(a => a.status === 'present').length}
          </Badge>
          <Badge variant="secondary" className="bg-red-50 text-red-700">
            Absent: {existingAttendance.filter(a => a.status === 'absent').length}
          </Badge>
          <Badge variant="secondary" className="bg-yellow-50 text-yellow-700">
            Late: {existingAttendance.filter(a => a.status === 'late').length}
          </Badge>
          <Badge variant="secondary" className="bg-blue-50 text-blue-700">
            Excused: {existingAttendance.filter(a => a.status === 'excused').length}
          </Badge>
        </div>
      )}
    </div>
  )
}
