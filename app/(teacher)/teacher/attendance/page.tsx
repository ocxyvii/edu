'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useTeacherClassesRealtime } from '@/lib/hooks/useTeacherClasses'
import { AttendanceSheet } from '@/components/teacher/AttendanceSheet'

export default function TeacherAttendancePage() {
  const [selectedSectionId, setSelectedSectionId] = useState('')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])

  const { data: myClasses, isLoading: classesLoading, error } = useTeacherClassesRealtime()

  const selectedClass = myClasses?.find((c: any) => c.section_id === selectedSectionId)

  const { data: students, isLoading: studentsLoading } = useQuery({
    queryKey: ['attendance-students', selectedSectionId],
    enabled: !!selectedSectionId,
    queryFn: async () => {
      const supabase = createClient()

      const { data: sec } = await supabase
        .from('sections')
        .select('class_id')
        .eq('id', selectedSectionId)
        .single()

      const classId = sec?.class_id

      const { data: bySection } = await supabase
        .from('students')
        .select(`
          id, admission_number,
          profiles ( id, first_name, last_name, avatar_url )
        `)
        .eq('section_id', selectedSectionId)
        .eq('is_active', true)

      const { data: byClass } = classId
        ? await supabase
            .from('students')
            .select(`
              id, admission_number,
              profiles ( id, first_name, last_name, avatar_url )
            `)
            .eq('class_id', classId)
            .is('section_id', null)
            .eq('is_active', true)
        : { data: [] }

      const all = [...(bySection ?? []), ...(byClass ?? [])]
      const unique = Array.from(new Map(all.map((s: any) => [s.id, s])).values())

      return unique.map((s: any) => ({
        id: s.id,
        admission_number: s.admission_number,
        first_name: s.profiles?.first_name ?? 'Unknown',
        last_name: s.profiles?.last_name ?? '',
        full_name: s.profiles
          ? `${s.profiles.first_name} ${s.profiles.last_name}`
          : 'Unknown Student',
        avatar_url: s.profiles?.avatar_url ?? null,
      }))
    },
  })

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Attendance</h1>
            <p className="text-sm text-gray-500 mt-1">Mark and manage student attendance</p>
          </div>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center space-y-3">
          <p className="text-red-800 font-medium">Failed to load your classes</p>
          <p className="text-sm text-red-600">{error.message}</p>
          <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
            Try Again
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Attendance</h1>
          <p className="text-sm text-gray-500 mt-1">
            Mark and manage student attendance for your classes
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
          Refresh
        </Button>
      </div>

      {/* Class selector */}
      <div className="bg-white rounded-xl border p-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Select a class to mark attendance
        </label>
        {classesLoading ? (
          <div className="h-12 bg-gray-100 rounded-lg animate-pulse" />
        ) : !myClasses || myClasses.length === 0 ? (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
            No classes assigned to you yet. Contact your school admin.
          </div>
        ) : (
          <select
            value={selectedSectionId}
            onChange={(e) => setSelectedSectionId(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          >
            <option value="">— Select a class —</option>
            {myClasses.map((cls) => (
              <option key={cls.section_id} value={cls.section_id}>
                {cls.class_name} — {cls.section_name} ({cls.student_count} students)
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Date picker */}
      {selectedSectionId && (
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-700">Date:</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      )}

      {/* Attendance sheet */}
      {selectedSectionId && (
        <>
          {studentsLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_: any, i: any) => (
                <div key={i} className="h-16 bg-gray-200 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : (
            <AttendanceSheet
              students={students ?? []}
              sectionId={selectedSectionId}
              classId={selectedClass?.class_id ?? ''}
            />
          )}
        </>
      )}

      {/* No selection state */}
      {!selectedSectionId && (
        <div className="text-center py-16 bg-white rounded-xl border">
          <div className="text-4xl mb-4">📋</div>
          <p className="text-gray-700 font-medium">Select a class to begin</p>
          <p className="text-gray-500 text-sm mt-2">
            Choose a class from the dropdown above to mark attendance.
          </p>
        </div>
      )}
    </div>
  )
}
