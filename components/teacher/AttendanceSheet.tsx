'use client'

import { useState, useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

interface AttendanceSheetProps {
  students: any[]
  sectionId: string
  classId: string
  onSuccess?: () => void
}

export function AttendanceSheet({ students, sectionId, classId, onSuccess }: AttendanceSheetProps) {
  const queryClient = useQueryClient()
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [attendance, setAttendance] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [isEditing, setIsEditing] = useState(false)

  const { data: existingRecords } = useQuery({
    queryKey: ['section-attendance', sectionId, selectedDate],
    queryFn: async () => {
      const supabase = createClient()
      const { data } = await supabase
        .from('attendance')
        .select('student_id, status')
        .eq('section_id', sectionId)
        .eq('date', selectedDate)
      return (data ?? []) as { student_id: string; status: string }[]
    },
    enabled: !!sectionId && !!selectedDate,
  })

  useEffect(() => {
    if (existingRecords && existingRecords.length > 0) {
      const state: Record<string, string> = {}
      existingRecords.forEach(r => { state[r.student_id] = r.status })
      setAttendance(state)
      setIsEditing(true)
    } else {
      const state: Record<string, string> = {}
      students.forEach(s => { state[s.id] = '' })
      setAttendance(state)
      setIsEditing(false)
    }
  }, [existingRecords, students])

  const toggleStatus = (studentId: string, status: string) => {
    setAttendance(prev => ({
      ...prev,
      [studentId]: prev[studentId] === status ? '' : status,
    }))
  }

  const markAllPresent = () => {
    const state: Record<string, string> = {}
    students.forEach(s => { state[s.id] = 'present' })
    setAttendance(state)
  }

  const clearAll = () => {
    const state: Record<string, string> = {}
    students.forEach(s => { state[s.id] = '' })
    setAttendance(state)
  }

  const allMarked = students.every(s => attendance[s.id])
  const presentCount = Object.values(attendance).filter(v => v === 'present').length
  const absentCount = Object.values(attendance).filter(v => v === 'absent').length
  const lateCount = Object.values(attendance).filter(v => v === 'late').length
  const excusedCount = Object.values(attendance).filter(v => v === 'excused').length
  const unmarkedCount = students.length - Object.values(attendance).filter(Boolean).length

  const handleSubmit = async () => {
    if (!allMarked) {
      toast.error('Mark attendance for all students before submitting')
      return
    }
    setSubmitting(true)
    try {
      const supabase = createClient()
      const records = students.map(s => ({
        student_id: s.id,
        status: attendance[s.id] || 'present',
      }))

      for (const r of records) {
        const { data: existing } = await supabase
          .from('attendance')
          .select('id')
          .eq('student_id', r.student_id)
          .eq('section_id', sectionId)
          .eq('date', selectedDate)
          .maybeSingle()

        if (existing) {
          await supabase.from('attendance').update({ status: r.status }).eq('id', existing.id)
        } else {
          await supabase.from('attendance').insert({
            student_id: r.student_id,
            section_id: sectionId,
            class_id: classId,
            date: selectedDate,
            status: r.status,
          })
        }
      }

      queryClient.invalidateQueries({ queryKey: ['section-attendance', sectionId] })
      toast.success(`Attendance recorded for ${records.length} students`)
      onSuccess?.()
    } catch (e: any) {
      toast.error(e.message || 'Failed to save attendance')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Date picker */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-700">Date:</label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <button
          onClick={markAllPresent}
          className="px-3 py-2 bg-green-100 text-green-700 rounded-lg text-sm font-medium hover:bg-green-200"
        >
          ✓ Mark All Present
        </button>
        <button
          onClick={clearAll}
          className="px-3 py-2 bg-gray-100 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-200"
        >
          ✕ Clear All
        </button>
      </div>

      {isEditing && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
          Editing attendance for {new Date(selectedDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </div>
      )}

      {/* Live counter */}
      <div className="flex gap-4 text-sm">
        <span>Present: <strong className="text-green-600">{presentCount}</strong></span>
        <span>Absent: <strong className="text-red-600">{absentCount}</strong></span>
        <span>Late: <strong className="text-amber-600">{lateCount}</strong></span>
        <span>Excused: <strong className="text-gray-500">{excusedCount}</strong></span>
        <span>Unmarked: <strong className="text-gray-400">{unmarkedCount}</strong></span>
      </div>

      {/* Student list */}
      <div className="bg-white rounded-xl border overflow-hidden">
        <div className="divide-y divide-gray-100">
          {students.map((student) => {
            const status = attendance[student.id] || ''
            return (
              <div key={student.id} className="flex items-center justify-between px-4 py-3 hover:bg-gray-50">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-blue-600 flex items-center justify-center text-white font-semibold text-sm">
                    {student.full_name?.charAt(0) || student.first_name?.charAt(0) || '?'}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {student.full_name || `${student.first_name} ${student.last_name}`}
                    </p>
                    <p className="text-xs text-gray-500">{student.admission_number}</p>
                  </div>
                </div>
                <div className="flex gap-1.5">
                  {(['present', 'absent', 'late', 'excused'] as const).map((s) => (
                    <button
                      key={s}
                      onClick={() => toggleStatus(student.id, s)}
                      className={`w-10 h-10 rounded-lg text-sm font-semibold transition-all ${
                        status === s
                          ? s === 'present'
                            ? 'bg-green-500 text-white shadow-sm'
                            : s === 'absent'
                            ? 'bg-red-500 text-white shadow-sm'
                            : s === 'late'
                            ? 'bg-amber-500 text-white shadow-sm'
                            : 'bg-gray-400 text-white shadow-sm'
                          : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                      }`}
                    >
                      {s === 'present' ? 'P' : s === 'absent' ? 'A' : s === 'late' ? 'L' : 'E'}
                    </button>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {students.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          No students in this section to mark attendance for.
        </div>
      )}

      {/* Submit button */}
      {students.length > 0 && (
        <button
          onClick={handleSubmit}
          disabled={submitting || !allMarked}
          className="w-full py-3 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed bg-blue-600 text-white hover:bg-blue-700"
        >
          {submitting
            ? 'Saving...'
            : isEditing
            ? `Update Attendance (${students.length} students)`
            : `Submit Attendance (${students.length} students)`}
        </button>
      )}
    </div>
  )
}
