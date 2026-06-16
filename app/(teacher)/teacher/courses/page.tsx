'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getTeacherCourses, createCourse, getTeachersSubjects, getClassesForSchool } from '@/lib/actions/lms.actions'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { BookOpen, Plus, FileText, Eye, Loader2, GraduationCap } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'

export default function TeacherCoursesPage() {
  const queryClient = useQueryClient()
  const [createOpen, setCreateOpen] = useState(false)
  const [newCourse, setNewCourse] = useState({ title: '', subject_id: '', class_id: '' })

  const { data: courses, isLoading } = useQuery({
    queryKey: ['teacher-courses'],
    queryFn: () => getTeacherCourses(),
  })

  const { data: subjects } = useQuery({
    queryKey: ['teacher-subjects'],
    queryFn: () => getTeachersSubjects(),
  })

  const { data: classes } = useQuery({
    queryKey: ['teacher-classes'],
    queryFn: () => getClassesForSchool(),
  })

  const createMutation = useMutation({
    mutationFn: () => createCourse(newCourse),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['teacher-courses'] })
      toast.success(`Course "${data.title}" created`)
      setCreateOpen(false)
      setNewCourse({ title: '', subject_id: '', class_id: '' })
    },
    onError: (err: Error) => toast.error(err.message),
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">My Courses</h1>
          <p className="text-muted-foreground mt-1">Create and manage your learning courses</p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4 mr-2" /> Create Course
        </Button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(3)].map((_: any, i: any) => <Skeleton key={i} className="h-40 w-full" />)}
        </div>
      ) : courses && courses.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {courses.map((course: any) => (
            <Link key={course.id} href={`/teacher/courses/${course.id}`}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <CardTitle className="text-base">{course.title}</CardTitle>
                      <CardDescription>
                        {course.subjects?.name} {course.subjects?.code ? `(${course.subjects.code})` : ''}
                      </CardDescription>
                    </div>
                    <Badge variant={course.is_published ? 'default' : 'secondary'}>
                      {course.is_published ? 'Published' : 'Draft'}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <GraduationCap className="h-3.5 w-3.5" />
                      {course.classes?.name || 'No class'}
                    </span>
                    <span className="flex items-center gap-1">
                      <FileText className="h-3.5 w-3.5" />
                      {course.materials_count} material{course.materials_count !== 1 ? 's' : ''}
                    </span>
                    <span className="flex items-center gap-1">
                      <Eye className="h-3.5 w-3.5" />
                      {course.is_published ? 'Visible' : 'Hidden'}
                    </span>
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
            <p className="font-medium">No courses yet</p>
            <p className="text-sm text-muted-foreground mt-1 mb-4">Create your first course to get started</p>
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4 mr-2" /> Create Course
            </Button>
          </CardContent>
        </Card>
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create Course</DialogTitle>
            <DialogDescription>Set up a new course for your students</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="title">Course Title *</Label>
              <Input id="title" value={newCourse.title} onChange={(e) => setNewCourse(c => ({ ...c, title: e.target.value }))} placeholder="e.g. Mathematics Grade 7" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="subject">Subject *</Label>
              <Select value={newCourse.subject_id} onValueChange={(v) => setNewCourse(c => ({ ...c, subject_id: v }))}>
                <SelectTrigger id="subject"><SelectValue placeholder="Select subject" /></SelectTrigger>
                <SelectContent>
                  {subjects?.map((s: any) => (
                    <SelectItem key={s.id} value={s.id}>{s.name} ({s.code})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="class">Class *</Label>
              <Select value={newCourse.class_id} onValueChange={(v) => setNewCourse(c => ({ ...c, class_id: v }))}>
                <SelectTrigger id="class"><SelectValue placeholder="Select class" /></SelectTrigger>
                <SelectContent>
                  {classes?.map((c: any) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}{c.level ? ` - Level ${c.level}` : ''}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={() => createMutation.mutate()} disabled={!newCourse.title || !newCourse.subject_id || !newCourse.class_id || createMutation.isPending}>
              {createMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
