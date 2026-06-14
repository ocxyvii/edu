'use client'

import { useQuery } from '@tanstack/react-query'
import { getStudentMaterials } from '@/lib/actions/student'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { BookOpen, FileText, Video, Link as LinkIcon } from 'lucide-react'
import { format } from 'date-fns'

export default function StudentMaterialsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['student-materials'],
    queryFn: () => getStudentMaterials(),
  })

  const courses = data?.courses ?? []
  const materials = data?.materials ?? []

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Course Materials</h1>
        <p className="text-gray-600 mt-1">Access your course materials and resources</p>
      </div>

      {isLoading ? (
        <div className="space-y-4">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-32 w-full" />)}</div>
      ) : courses.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">No course materials available yet.</CardContent></Card>
      ) : (
        <div className="space-y-6">
          {courses.map(course => {
            const courseMaterials = materials.filter(m => m.course_id === course.id)
            return (
              <Card key={course.id}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <BookOpen className="h-5 w-5 text-edu-blue-600" />
                      <div>
                        <p className="font-semibold text-lg">{course.title}</p>
                        <p className="text-sm text-muted-foreground">{course.classes?.name} · {course.subjects?.name}</p>
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground">{courseMaterials.length} items</span>
                  </div>
                  {courseMaterials.length > 0 && (
                    <div className="space-y-2">
                      {courseMaterials.map(m => (
                        <div key={m.id} className="flex items-center gap-3 p-3 rounded-lg border border-gray-100 hover:bg-gray-50">
                          {m.type === 'video' ? <Video className="h-4 w-4 text-blue-500" /> :
                           m.type === 'link' ? <LinkIcon className="h-4 w-4 text-purple-500" /> :
                           <FileText className="h-4 w-4 text-gray-500" />}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{m.title}</p>
                            <p className="text-xs text-muted-foreground">{format(new Date(m.created_at), 'MMM d, yyyy')}</p>
                          </div>
                          {m.content_url && (
                            <a href={m.content_url} target="_blank" rel="noopener noreferrer" className="text-xs text-edu-blue-600 hover:underline flex-shrink-0">Open</a>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
