'use client'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { getStudentMaterials } from '@/lib/actions/student'

async function markMaterialComplete(materialId: string, courseId: string) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data: profile } = await supabase
    .from('profiles')
    .select('school_id')
    .eq('id', user.id)
    .single()

  await supabase
    .from('student_progress')
    .upsert({
      student_id: user.id,
      material_id: materialId,
      school_id: profile!.school_id,
      progress: 100,
      completed: true,
      last_accessed_at: new Date().toISOString(),
    }, { onConflict: 'student_id,material_id' })
}

const typeIcon: Record<string, string> = {
  document: '📄', video: '🎥', link: '🔗', audio: '🎵', quiz: '📝',
}

const typeLabel: Record<string, string> = {
  document: 'Document', video: 'Video', link: 'Link', audio: 'Audio', quiz: 'Quiz',
}

export default function StudentMaterialsPage() {
  const queryClient = useQueryClient()
  const [expandedCourse, setExpandedCourse] = useState<string | null>(null)

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['student-materials'],
    queryFn: () => getStudentMaterials(),
    refetchInterval: 60 * 1000,
    refetchOnWindowFocus: true,
  })

  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel('student-materials-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'course_materials',
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['student-materials'] })
          toast.info('New learning material available!')
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [queryClient])

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 bg-gray-200 rounded animate-pulse" />
        {[...Array(3)].map((_: any, i: any) => (
          <div key={i} className="h-32 bg-gray-200 rounded-xl animate-pulse" />
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-16">
        <p className="text-red-500">Failed to load materials</p>
        <button onClick={() => refetch()} className="mt-3 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm">Try Again</button>
      </div>
    )
  }

  const courses = data?.courses ?? []
  const allMaterials = data?.materials ?? []

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Learning Materials</h1>
        <p className="text-gray-500 text-sm mt-1">Access all course materials uploaded by your teachers</p>
      </div>

      {courses.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border">
          <div className="text-4xl mb-3">📚</div>
          <p className="text-gray-600 font-medium">No learning materials yet</p>
          <p className="text-gray-400 text-sm mt-1">Your teachers will upload materials here soon</p>
        </div>
      ) : (
        <div className="space-y-4">
          {courses.map((course: any) => {
            const courseMaterials = allMaterials.filter((m: any) => m.course_id === course.id)
            const completedCount = courseMaterials.filter((m: any) => m.completed).length
            const progress = courseMaterials.length > 0 ? Math.round((completedCount / courseMaterials.length) * 100) : 0

            return (
              <div key={course.id} className="bg-white rounded-xl border overflow-hidden">
                <button
                  onClick={() => setExpandedCourse(expandedCourse === course.id ? null : course.id)}
                  className="w-full p-5 text-left hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-gray-900">{course.title}</h3>
                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                          {course.subjects?.name}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500 mt-0.5">
                        {courseMaterials.length} material{courseMaterials.length !== 1 ? 's' : ''}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-sm font-medium text-gray-700">{completedCount}/{courseMaterials.length}</div>
                      <div className="text-xs text-gray-400">completed</div>
                      <div className="w-16 h-1.5 bg-gray-200 rounded-full mt-1 ml-auto">
                        <div className="h-1.5 bg-green-500 rounded-full" style={{ width: `${progress}%` }} />
                      </div>
                    </div>
                  </div>
                </button>

                {expandedCourse === course.id && (
                  <div className="border-t divide-y divide-gray-50">
                    {courseMaterials.length === 0 ? (
                      <div className="p-4 text-center text-sm text-gray-400">No materials uploaded yet</div>
                    ) : (
                      courseMaterials.map((material: any) => (
                        <div key={material.id} className="flex items-center gap-4 p-4 hover:bg-gray-50">
                          <div className="text-2xl">{typeIcon[material.type] ?? '📄'}</div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm text-gray-900">{material.title}</p>
                            <p className="text-xs text-gray-400 mt-0.5">
                              {typeLabel[material.type] ?? 'Material'}
                              {' · '}Added {new Date(material.created_at).toLocaleDateString('en-KE', { day: 'numeric', month: 'short' })}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            {material.completed && <span className="text-green-500 text-sm">✓</span>}
                            {material.content_url && (
                              <a href={material.content_url} target="_blank" rel="noopener noreferrer"
                                onClick={() => markMaterialComplete(material.id, course.id)}
                                className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700 transition-colors">
                                {material.type === 'video' ? 'Watch' : material.type === 'link' ? 'Open' : 'View'}
                              </a>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
