'use client'

import { useQuery } from '@tanstack/react-query'
import { getStudentCourses } from '@/lib/actions/lms.actions'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { BookOpen, FileText, PlayCircle, CheckCircle2 } from 'lucide-react'
import Link from 'next/link'

export default function StudentCoursesPage() {
  const { data: courses, isLoading } = useQuery({
    queryKey: ['student-courses'],
    queryFn: () => getStudentCourses(),
  })

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-36 w-full" />)}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">My Courses</h1>
        <p className="text-muted-foreground mt-1">Access your learning materials and track progress</p>
      </div>

      {courses && courses.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {courses.map((course: any) => (
            <Link key={course.id} href={`/student/courses/${course.id}`}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-base">{course.title}</CardTitle>
                    <Badge variant="secondary" className="text-xs">{course.subjects?.code || course.subjects?.name}</Badge>
                  </div>
                  <CardDescription>{course.description || `${course.materials_count || 0} learning materials`}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground flex items-center gap-1">
                        <FileText className="h-3.5 w-3.5" />
                        {course.materials_count || 0} material{(course.materials_count || 0) !== 1 ? 's' : ''}
                      </span>
                      <span className="flex items-center gap-1 text-green-600">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        {course.completed_count || 0} completed
                      </span>
                    </div>
                    <div>
                      <Progress value={course.progress || 0} className="h-2" />
                      <p className="text-xs text-right text-muted-foreground mt-1">{Math.round(course.progress || 0)}% complete</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <p className="font-medium">No courses available</p>
            <p className="text-sm text-muted-foreground mt-1">Courses will appear here once your teachers publish them</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
