'use client'

import { useQuery } from '@tanstack/react-query'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useState } from 'react'
import { format } from 'date-fns'
import { AttendanceSheet } from '@/components/teacher/AttendanceSheet'

async function fetchRoster(sectionId: string) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data: section } = await supabase
    .from('sections')
    .select(`
      id, name, capacity, room, class_teacher_id,
      classes (
        id, name, level,
        academic_years ( name, is_current )
      )
    `)
    .eq('id', sectionId)
    .single()

  if (!section) throw new Error('Section not found')

  const classId = (section.classes as any)?.id

  const { data: bySection } = await supabase
    .from('students')
    .select(`
      id,
      admission_number,
      enrollment_date,
      class_id,
      section_id,
      blood_group,
      profiles (
        id,
        first_name,
        last_name,
        avatar_url,
        gender,
        date_of_birth,
        email,
        phone
      )
    `)
    .eq('section_id', sectionId)
    .eq('is_active', true)
    .order('enrollment_date', { ascending: false })

  const { data: byClass } = classId
    ? await supabase
        .from('students')
        .select(`
          id,
          admission_number,
          enrollment_date,
          class_id,
          section_id,
          blood_group,
          profiles (
            id,
            first_name,
            last_name,
            avatar_url,
            gender,
            date_of_birth,
            email,
            phone
          )
        `)
        .eq('class_id', classId)
        .is('section_id', null)
        .eq('is_active', true)
    : { data: [] }

  const all = [...(bySection ?? []), ...(byClass ?? [])]
  const unique = Array.from(new Map(all.map((s: any) => [s.id, s])).values())

  const today = new Date().toISOString().split('T')[0]
  const { data: todayAtt } = await supabase
    .from('attendance')
    .select('student_id, status')
    .eq('date', today)
    .in('student_id', unique.map((s: any) => s.id))

  const attMap = new Map((todayAtt ?? []).map((a: any) => [a.student_id, a.status]))

  const students = unique.map((s: any) => {
    const profile = s.profiles
    const enrolledDaysAgo = Math.floor(
      (Date.now() - new Date(s.enrollment_date).getTime()) /
      (1000 * 60 * 60 * 24)
    )
    const initials = profile
      ? `${profile.first_name?.[0] ?? ''}${profile.last_name?.[0] ?? ''}`
      : '??'

    return {
      id: s.id,
      admission_number: s.admission_number,
      enrollment_date: s.enrollment_date,
      blood_group: s.blood_group,
      first_name: profile?.first_name ?? 'Unknown',
      last_name: profile?.last_name ?? '',
      full_name: profile
        ? `${profile.first_name} ${profile.last_name}`
        : 'Unknown Student',
      avatar_url: profile?.avatar_url ?? null,
      gender: profile?.gender ?? null,
      date_of_birth: profile?.date_of_birth ?? null,
      email: profile?.email ?? null,
      phone: profile?.phone ?? null,
      initials,
      today_status: attMap.get(s.id) ?? 'not_marked',
      is_new: enrolledDaysAgo <= 7,
      enrolled_days_ago: enrolledDaysAgo,
    }
  })

  return { section, students, classId }
}

export default function ClassRosterPage() {
  const params = useParams()
  const router = useRouter()
  const sectionId = params.sectionId as string
  const [search, setSearch] = useState('')
  const [activeTab, setActiveTab] = useState<'roster' | 'attendance'>('roster')

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['class-roster', sectionId],
    queryFn: () => fetchRoster(sectionId),
    enabled: !!sectionId,
  })

  const section = data?.section as any
  const students = data?.students ?? []

  const filtered = students.filter((s: any) =>
    s.full_name.toLowerCase().includes(search.toLowerCase()) ||
    s.admission_number?.toLowerCase().includes(search.toLowerCase())
  )

  const presentToday = students.filter((s: any) => s.today_status === 'present').length
  const absentToday = students.filter((s: any) => s.today_status === 'absent').length
  const lateToday = students.filter((s: any) => s.today_status === 'late').length
  const unmarked = students.filter((s: any) => s.today_status === 'not_marked').length

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-64 bg-gray-200 rounded animate-pulse" />
        <div className="grid grid-cols-4 gap-4">
          {[...Array(4)].map((_: any, i: any) => (
            <div key={i} className="h-24 bg-gray-200 rounded-xl animate-pulse" />
          ))}
        </div>
        <div className="space-y-3">
          {[...Array(5)].map((_: any, i: any) => (
            <div key={i} className="h-16 bg-gray-200 rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <p className="text-red-500 font-medium">Failed to load class roster</p>
        <button
          onClick={() => refetch()}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm"
        >
          Try Again
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => router.back()}
          className="text-gray-500 hover:text-gray-700 text-sm flex items-center gap-1"
        >
          ← Back to My Classes
        </button>
      </div>

      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          {section?.classes?.name} — {section?.name}
        </h1>
        <p className="text-gray-500 text-sm mt-1">
          Level {section?.classes?.level}
          {section?.room && ` · Room ${section.room}`}
          · {section?.classes?.academic_years?.name}
          {section?.classes?.academic_years?.is_current && (
            <span className="ml-2 bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded-full">
              Current Year
            </span>
          )}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border p-4 text-center">
          <div className="text-2xl font-bold text-gray-900">{students.length}</div>
          <div className="text-xs text-gray-500 mt-1">Total Students</div>
        </div>
        <div className="bg-white rounded-xl border p-4 text-center">
          <div className="text-2xl font-bold text-green-600">{presentToday}</div>
          <div className="text-xs text-gray-500 mt-1">Present Today</div>
        </div>
        <div className="bg-white rounded-xl border p-4 text-center">
          <div className="text-2xl font-bold text-red-500">{absentToday}</div>
          <div className="text-xs text-gray-500 mt-1">Absent Today</div>
        </div>
        <div className="bg-white rounded-xl border p-4 text-center">
          <div className="text-2xl font-bold text-amber-500">{unmarked + lateToday}</div>
          <div className="text-xs text-gray-500 mt-1">Not Marked</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit">
        {(['roster', 'attendance'] as const).map((tab: any) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === tab
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            {tab === 'roster' ? '👥 Roster' : '✅ Mark Attendance'}
          </button>
        ))}
      </div>

      {/* ROSTER TAB */}
      {activeTab === 'roster' && (
        <div className="space-y-4">
          <div className="relative">
            <input
              type="text"
              placeholder="Search students by name or admission number..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full border border-gray-300 rounded-lg pl-10 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <span className="absolute left-3 top-3.5 text-gray-400 text-sm">🔍</span>
          </div>

          {filtered.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-xl border">
              {students.length === 0 ? (
                <>
                  <div className="text-4xl mb-4">👨‍🎓</div>
                  <p className="text-gray-700 font-medium">No students enrolled yet</p>
                  <p className="text-gray-500 text-sm mt-2 max-w-xs mx-auto">
                    Students will appear here once the school admin
                    enrolls them into this class.
                  </p>
                </>
              ) : (
                <>
                  <p className="text-gray-500">No students match your search</p>
                  <button
                    onClick={() => setSearch('')}
                    className="text-blue-600 text-sm mt-2 hover:underline"
                  >
                    Clear search
                  </button>
                </>
              )}
            </div>
          ) : (
            <div className="bg-white rounded-xl border overflow-hidden">
              <div className="grid grid-cols-12 gap-4 px-4 py-3 bg-gray-50 border-b text-xs font-medium text-gray-500 uppercase tracking-wide">
                <div className="col-span-4">Student</div>
                <div className="col-span-2">Admission No.</div>
                <div className="col-span-2">Gender</div>
                <div className="col-span-2">Enrolled</div>
                <div className="col-span-1">Today</div>
                <div className="col-span-1"></div>
              </div>

              <div className="divide-y divide-gray-100">
                {filtered.map((student: any) => (
                  <div
                    key={student.id}
                    className="grid grid-cols-12 gap-4 px-4 py-4 items-center hover:bg-gray-50 transition-colors"
                  >
                    <div className="col-span-4 flex items-center gap-3">
                      <div className="relative">
                        {student.avatar_url ? (
                          <img
                            src={student.avatar_url}
                            alt={student.full_name}
                            className="w-10 h-10 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-semibold text-sm">
                            {student.initials}
                          </div>
                        )}
                        {student.is_new && (
                          <span className="absolute -top-1 -right-1 bg-green-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                            N
                          </span>
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 text-sm">
                          {student.full_name}
                        </p>
                        {student.is_new && (
                          <span className="text-xs text-green-600 font-medium">
                            New student
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="col-span-2">
                      <span className="text-sm text-gray-600 font-mono">
                        {student.admission_number ?? '—'}
                      </span>
                    </div>

                    <div className="col-span-2">
                      <span className="text-sm text-gray-600 capitalize">
                        {student.gender ?? '—'}
                      </span>
                    </div>

                    <div className="col-span-2">
                      <span className="text-sm text-gray-600">
                        {student.enrollment_date
                          ? format(new Date(student.enrollment_date), 'dd MMM yyyy')
                          : '—'}
                      </span>
                    </div>

                    <div className="col-span-1">
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                        student.today_status === 'present'
                          ? 'bg-green-100 text-green-700'
                          : student.today_status === 'absent'
                          ? 'bg-red-100 text-red-700'
                          : student.today_status === 'late'
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-gray-100 text-gray-500'
                      }`}>
                        {student.today_status === 'not_marked'
                          ? '—'
                          : student.today_status.charAt(0).toUpperCase() +
                            student.today_status.slice(1)}
                      </span>
                    </div>

                    <div className="col-span-1 flex justify-end">
                      <button
                        onClick={() =>
                          router.push(
                            `/teacher/my-classes/${sectionId}/student/${student.id}`
                          )
                        }
                        className="text-blue-600 hover:text-blue-800 text-xs font-medium"
                      >
                        View
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ATTENDANCE TAB */}
      {activeTab === 'attendance' && (
        <AttendanceSheet
          students={students}
          sectionId={sectionId}
          classId={data?.classId ?? ''}
          onSuccess={() => refetch()}
        />
      )}
    </div>
  )
}
