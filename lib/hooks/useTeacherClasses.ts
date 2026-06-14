'use client'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useEffect, useState } from 'react'

export interface TeacherSection {
  section_id: string
  section_name: string
  class_id: string
  class_name: string
  class_level: number | null
  academic_year_id: string
  academic_year_name: string
  is_current_year: boolean
  capacity: number
  room: string | null
  is_class_teacher: boolean
  student_count: number
  subjects_taught: {
    id: string
    name: string
    code: string | null
  }[]
}

export function useTeacherClasses() {
  const [userId, setUserId] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUserId(data.user?.id ?? null)
    })
  }, [])

  return useQuery<TeacherSection[]>({
    queryKey: ['teacher-classes', userId],
    enabled: !!userId,
    staleTime: 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
    queryFn: async () => {
      if (!userId) return []
      const supabase = createClient()

      const { data: profile } = await supabase
        .from('profiles')
        .select('school_id')
        .eq('id', userId)
        .single()

      if (!profile?.school_id) return []

      // Strategy 1: sections where class_teacher_id matches
      const { data: ctSections } = await supabase
        .from('sections')
        .select(`
          id,
          name,
          capacity,
          room,
          class_teacher_id,
          classes (
            id,
            name,
            level,
            academic_years ( id, name, is_current )
          )
        `)
        .eq('school_id', profile.school_id)
        .eq('class_teacher_id', userId)

      // Strategy 2: sections linked via teacher_subjects
      const { data: subjectLinks } = await supabase
        .from('teacher_subjects')
        .select('section_id')
        .eq('teacher_id', userId)
        .not('section_id', 'is', null)

      const subjectSectionIds: string[] = [
        ...new Set((subjectLinks ?? []).map((ts: any) => ts.section_id).filter(Boolean)),
      ]

      let tsSections: any[] = []
      if (subjectSectionIds.length > 0) {
        const { data: secs } = await supabase
          .from('sections')
          .select(`
            id,
            name,
            capacity,
            room,
            class_teacher_id,
            classes (
              id,
              name,
              level,
              academic_years ( id, name, is_current )
            )
          `)
          .eq('school_id', profile.school_id)
          .in('id', subjectSectionIds)

        tsSections = secs ?? []
      }

      // Merge & deduplicate by section id
      const merged = new Map<string, any>()
      ctSections?.forEach((sec: any) => merged.set(sec.id, { ...sec, is_class_teacher: true }))
      tsSections.forEach((sec: any) => {
        if (merged.has(sec.id)) return
        merged.set(sec.id, { ...sec, is_class_teacher: sec.class_teacher_id === userId })
      })

      const sections = Array.from(merged.values())
      if (sections.length === 0) return []

      const result = await Promise.all(
        sections.map(async (sec: any) => {
          const classId = sec.classes?.id

          const { count: bySection } = await supabase
            .from('students')
            .select('id', { count: 'exact', head: true })
            .eq('section_id', sec.id)
            .eq('is_active', true)

          const { count: byClass } = classId
            ? await supabase
                .from('students')
                .select('id', { count: 'exact', head: true })
                .eq('class_id', classId)
                .is('section_id', null)
                .eq('is_active', true)
            : { count: 0 }

          const { data: subjects } = await supabase
            .from('teacher_subjects')
            .select('subjects(id, name, code)')
            .eq('teacher_id', userId)
            .eq('section_id', sec.id)

          return {
            section_id: sec.id,
            section_name: sec.name,
            class_id: classId ?? '',
            class_name: sec.classes?.name ?? 'Unknown Class',
            class_level: sec.classes?.level ?? null,
            academic_year_id: sec.classes?.academic_years?.id ?? '',
            academic_year_name: sec.classes?.academic_years?.name ?? '',
            is_current_year: sec.classes?.academic_years?.is_current ?? false,
            capacity: sec.capacity ?? 40,
            room: sec.room ?? null,
            is_class_teacher: sec.class_teacher_id === userId,
            student_count: (bySection ?? 0) + (byClass ?? 0),
            subjects_taught: (subjects ?? [])
              .map((ts: any) => ts.subjects)
              .filter(Boolean),
          } as TeacherSection
        })
      )

      return result
    },
  })
}

export function useTeacherClassesRealtime() {
  const queryClient = useQueryClient()
  const result = useTeacherClasses()

  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel('teacher-classes-realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'students' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['teacher-classes'] })
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'sections' },
        (payload) => {
          if ('class_teacher_id' in (payload.new ?? {})) {
            queryClient.invalidateQueries({ queryKey: ['teacher-classes'] })
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [queryClient])

  return result
}
