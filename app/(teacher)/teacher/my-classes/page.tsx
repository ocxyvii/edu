'use client'

import { useQuery } from '@tanstack/react-query'
import { getTeacherClasses } from '@/lib/actions/teacher'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { BookOpen, Users, MapPin, ArrowRight, GraduationCap, MessageSquare, AlertCircle, ClipboardList } from 'lucide-react'
import Link from 'next/link'

export default function MyClassesPage() {
  const { data: classes, isLoading, error } = useQuery({
    queryKey: ['teacher-classes'],
    queryFn: () => getTeacherClasses(),
  })

  if (isLoading) {
    return (
      <div className="space-y-8">
        <div>
          <Skeleton className="h-9 w-48" />
          <Skeleton className="h-5 w-72 mt-1" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[...Array(4)].map((_: any, i: any) => <Skeleton key={i} className="h-52 w-full" />)}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-16 space-y-4">
        <AlertCircle className="h-12 w-12 text-red-400 mx-auto" />
        <h2 className="text-xl font-semibold text-gray-900">Something went wrong</h2>
        <p className="text-muted-foreground text-sm">{error.message}</p>
        <Button variant="outline" onClick={() => window.location.reload()}>Try Again</Button>
      </div>
    )
  }

  if (!classes?.length) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">My Classes</h1>
          <p className="text-gray-600 mt-1">View all classes and sections you teach</p>
        </div>
        <Card>
          <CardContent className="py-16 text-center space-y-4">
            <div className="mx-auto w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center">
              <BookOpen className="h-8 w-8 text-gray-400" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900">No Classes Assigned Yet</h2>
            <p className="text-sm text-muted-foreground max-w-sm mx-auto">
              You have not been assigned to any class yet. Contact your school administrator to:
            </p>
            <ul className="text-sm text-muted-foreground text-left max-w-xs mx-auto space-y-1">
              <li className="flex items-center gap-2">
                <GraduationCap className="h-4 w-4 text-edu-blue-600 flex-shrink-0" />
                Be assigned as a class teacher
              </li>
              <li className="flex items-center gap-2">
                <ClipboardList className="h-4 w-4 text-edu-blue-600 flex-shrink-0" />
                Be added as a subject teacher
              </li>
            </ul>
            <Button variant="outline" className="mt-2 gap-2" asChild>
              <Link href="/teacher/messages">
                <MessageSquare className="h-4 w-4" /> Contact Admin via Messages
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">My Classes</h1>
        <p className="text-gray-600 mt-1">View all classes and sections you teach</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {classes.map((cls: any) => {
          const sectionCount = cls.sections?.length ?? 0
          const totalStudents = cls.sections?.reduce((sum: number, s: any) => sum + (s.studentCount ?? 0), 0) ?? 0

          return (
            <Card key={cls.id}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">{cls.name}</CardTitle>
                    <CardDescription>Level {cls.level}</CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      {sectionCount} section{sectionCount !== 1 ? 's' : ''}
                    </Badge>
                    <Badge className="bg-edu-blue-100 text-edu-blue-700 border-edu-blue-200 text-xs">
                      <Users className="h-3 w-3 mr-1" /> {totalStudents} students
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {cls.sections.map((section: any) => {
                    const isClassTeacher = section.is_class_teacher || section.class_teacher_id
                    return (
                      <div key={section.id} className="rounded-lg border border-gray-100 p-3 hover:bg-gray-50 transition-colors">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <BookOpen className="h-4 w-4 text-edu-blue-600" />
                            <span className="font-medium text-sm">Section {section.name}</span>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Users className="h-3.5 w-3.5" />
                            <span>{section.studentCount ?? 0} / {section.capacity ?? '—'}</span>
                          </div>
                        </div>
                        {(section.subjects?.length > 0) && (
                          <div className="flex flex-wrap gap-1.5 mb-2">
                            {section.subjects.map((sub: string) => (
                              <Badge key={sub} variant="secondary" className="text-xs">{sub}</Badge>
                            ))}
                          </div>
                        )}
                        <div className="flex items-center justify-between mt-2">
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            {section.room && (
                              <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> Room {section.room}</span>
                            )}
                            {isClassTeacher && (
                              <Badge variant="outline" className="text-[10px] bg-amber-50 text-amber-700 border-amber-200">Class Teacher</Badge>
                            )}
                          </div>
                          <Button variant="ghost" size="sm" className="text-xs h-7 px-2 text-edu-blue-600" asChild>
                            <Link href={`/teacher/my-classes/${section.id}`}>
                              View Roster <ArrowRight className="h-3 w-3 ml-1" />
                            </Link>
                          </Button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
