'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getStudentDetail, getTeacherNotes, addTeacherNote, deleteTeacherNote, getStudentAttendanceHistory } from '@/lib/actions/teacher-student'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { ArrowLeft, CalendarCheck, GraduationCap, DollarSign, StickyNote, Trash2, Plus, Clock } from 'lucide-react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { useState } from 'react'
import { cn } from '@/lib/utils'

export default function StudentProfilePage() {
  const params = useParams()
  const router = useRouter()
  const sectionId = params.sectionId as string
  const studentId = params.studentId as string
  const queryClient = useQueryClient()
  const [newNote, setNewNote] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['student-detail', studentId],
    queryFn: () => getStudentDetail(studentId),
  })

  const { data: notes, isLoading: notesLoading } = useQuery({
    queryKey: ['teacher-notes', studentId],
    queryFn: () => getTeacherNotes(studentId),
  })

  const { data: attendanceHistory } = useQuery({
    queryKey: ['student-attendance-history', studentId],
    queryFn: () => getStudentAttendanceHistory(studentId, 3),
  })

  const addNoteMutation = useMutation({
    mutationFn: (content: string) => addTeacherNote({ studentId, content, is_private: true }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teacher-notes', studentId] })
      setNewNote('')
    },
  })

  const deleteNoteMutation = useMutation({
    mutationFn: (noteId: string) => deleteTeacherNote(noteId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teacher-notes', studentId] })
    },
  })

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Skeleton className="h-40 col-span-1" />
          <Skeleton className="h-40 col-span-2" />
        </div>
      </div>
    )
  }

  if (!data?.student) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Student not found</p>
        <Button variant="outline" className="mt-4" onClick={() => router.back()}>Go Back</Button>
      </div>
    )
  }

  const { student, attendance: att, results, fees } = data
  const profile = student.profiles

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <Avatar className="h-12 w-12">
          <AvatarFallback className="bg-gradient-to-br from-edu-blue-400 to-edu-blue-600 text-white text-sm">
            {profile?.first_name?.[0]}{profile?.last_name?.[0]}
          </AvatarFallback>
        </Avatar>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{profile?.first_name} {profile?.last_name}</h1>
          <p className="text-sm text-muted-foreground">
            {student.admission_number} · {student.classes?.name} · Section {student.sections?.name}
          </p>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-full bg-green-100"><CalendarCheck className="h-5 w-5 text-green-600" /></div>
            <div>
              <p className="text-2xl font-bold">{att.percentage}%</p>
              <p className="text-xs text-muted-foreground">Attendance ({att.present}/{att.totalMarked} days)</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-full bg-red-100"><Clock className="h-5 w-5 text-red-600" /></div>
            <div>
              <p className="text-2xl font-bold">{att.absent}</p>
              <p className="text-xs text-muted-foreground">Absences this month</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-full bg-amber-100"><GraduationCap className="h-5 w-5 text-amber-600" /></div>
            <div>
              <p className="text-2xl font-bold">{results.length}</p>
              <p className="text-xs text-muted-foreground">Exam results recorded</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-full bg-purple-100"><DollarSign className="h-5 w-5 text-purple-600" /></div>
            <div>
              <p className="text-lg font-bold">
                {fees.outstandingFees > 0 ? (
                  <span className="text-red-600">KES {fees.outstandingFees.toLocaleString()}</span>
                ) : (
                  <span className="text-green-600">KES {fees.paidFees.toLocaleString()}</span>
                )}
              </p>
              <p className="text-xs text-muted-foreground">Outstanding fees</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column */}
        <div className="space-y-6">
          {/* Student info */}
          <Card>
            <CardHeader><CardTitle className="text-base">Student Information</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Admission No.</span><span>{student.admission_number}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Gender</span><span className="capitalize">{profile?.gender ?? '—'}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">DOB</span><span>{profile?.date_of_birth ? new Date(profile.date_of_birth).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : '—'}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Email</span><span>{profile?.email ?? '—'}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Phone</span><span>{profile?.phone ?? '—'}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Enrolled</span><span>{student.enrollment_date ? new Date(student.enrollment_date).toLocaleDateString() : '—'}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Status</span>
                <Badge variant="outline" className={student.is_active ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'}>
                  {student.is_active ? 'Active' : 'Inactive'}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <Card>
            <CardHeader><CardTitle className="text-base">Quick Actions</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              <Button variant="outline" size="sm" className="w-full justify-start" asChild>
                <Link href={`/teacher/attendance?sectionId=${sectionId}&studentId=${studentId}`}>
                  <CalendarCheck className="h-4 w-4 mr-2" /> View Attendance
                </Link>
              </Button>
              <Button variant="outline" size="sm" className="w-full justify-start" asChild>
                <Link href={`/teacher/materials`}>
                  <GraduationCap className="h-4 w-4 mr-2" /> Assign Material
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Middle + Right columns */}
        <div className="lg:col-span-2 space-y-6">
          {/* Attendance trend */}
          <Card>
            <CardHeader><CardTitle className="text-base">Attendance History (3 months)</CardTitle></CardHeader>
            <CardContent>
              {!attendanceHistory?.length ? (
                <p className="text-sm text-muted-foreground py-4 text-center">No attendance records found</p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {attendanceHistory.map((record: any) => (
                    <div
                      key={record.date}
                      className={cn(
                        'w-3 h-3 rounded-sm',
                        record.status === 'present' ? 'bg-green-500' :
                        record.status === 'absent' ? 'bg-red-500' :
                        record.status === 'late' ? 'bg-amber-400' :
                        'bg-gray-300'
                      )}
                      title={`${record.date}: ${record.status}`}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Results */}
          <Card>
            <CardHeader><CardTitle className="text-base">Recent Exam Results</CardTitle></CardHeader>
            <CardContent>
              {!results.length ? (
                <p className="text-sm text-muted-foreground py-4 text-center">No results recorded yet</p>
              ) : (
                <div className="space-y-2">
                  {results.map((r: any) => (
                    <div key={r.id} className="flex items-center justify-between p-3 rounded-lg border border-gray-100">
                      <div>
                        <p className="text-sm font-medium">{r.exams?.name}</p>
                        <p className="text-xs text-muted-foreground">{r.subjects?.name} · {r.exams?.exam_type}</p>
                      </div>
                      <div className="text-right">
                        <Badge variant={r.grade === 'A' ? 'default' : r.grade === 'F' ? 'destructive' : 'secondary'} className="text-xs">
                          {r.grade}
                        </Badge>
                        <p className="text-xs text-muted-foreground mt-0.5">{r.marks_obtained} marks</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Teacher Notes */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center justify-between">
                <span className="flex items-center gap-2"><StickyNote className="h-4 w-4" /> Private Notes</span>
              </CardTitle>
              <CardDescription>Notes only visible to you</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Add a private note..."
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  onKeyDown={(e) => { if (e.key === 'Enter') addNoteMutation.mutate(newNote) }}
                />
                <Button
                  size="sm"
                  onClick={() => addNoteMutation.mutate(newNote)}
                  disabled={!newNote.trim() || addNoteMutation.isPending}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              {notesLoading ? (
                <div className="space-y-2">{[...Array(2)].map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
              ) : !notes?.length ? (
                <p className="text-sm text-muted-foreground text-center py-4">No notes yet</p>
              ) : (
                <div className="space-y-2 max-h-80 overflow-y-auto">
                  {notes.map((note: any) => (
                    <div key={note.id} className="p-3 rounded-lg bg-gray-50 border border-gray-100">
                      <div className="flex justify-between items-start gap-2">
                        <p className="text-sm text-gray-700 whitespace-pre-wrap">{note.content}</p>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 flex-shrink-0 text-muted-foreground hover:text-red-600"
                          onClick={() => deleteNoteMutation.mutate(note.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(note.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
