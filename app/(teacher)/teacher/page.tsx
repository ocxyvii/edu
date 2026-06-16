'use client'

import { useQuery } from '@tanstack/react-query'
import { getTeacherDashboard } from '@/lib/actions/teacher'
import { useTeacherClassesRealtime } from '@/lib/hooks/useTeacherClasses'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { BookOpen, Clock, CalendarCheck, ClipboardList, MessageSquare, Plus, CheckCircle2, Users, BarChart3, History } from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'

export default function TeacherDashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ['teacher-dashboard'],
    queryFn: () => getTeacherDashboard(),
    refetchInterval: 30000,
  })

  const { data: myClasses } = useTeacherClassesRealtime()

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Teacher Dashboard</h1>
        <p className="text-gray-600 mt-1">Manage your classes, students, and assignments.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Today&apos;s Classes</CardTitle></CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-8 w-12" /> : (
              <>
                <div className="text-2xl font-bold">{data?.todayClasses.length ?? 0}</div>
                <p className="text-xs text-muted-foreground">Scheduled today</p>
              </>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Pending Assignments</CardTitle></CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-8 w-12" /> : (
              <>
                <div className="text-2xl font-bold">{data?.pendingAssignments.length ?? 0}</div>
                <p className="text-xs text-muted-foreground">Due for review</p>
              </>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Attendance Marked</CardTitle></CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-8 w-12" /> : (
              <>
                <div className="text-2xl font-bold">{data?.attendanceMarked ?? 0}<span className="text-sm text-muted-foreground font-normal"> / {data?.totalStudents ?? 0}</span></div>
                <p className="text-xs text-muted-foreground">Students marked today</p>
              </>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Unread Messages</CardTitle></CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-8 w-12" /> : (
              <>
                <div className="text-2xl font-bold">{data?.unreadMessages.length ?? 0}</div>
                <p className="text-xs text-muted-foreground">From parents & admin</p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── New Student Enrollments ── */}
      {data?.newStudents && data.newStudents.length > 0 && (
        <Card className="border-2 border-teal-200 bg-gradient-to-r from-teal-50 to-cyan-50">
          <CardContent className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="p-2 rounded-full bg-teal-100">
                <Users className="h-5 w-5 text-teal-600" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-teal-800">New Students Enrolled in Your Classes</h2>
                <p className="text-xs text-teal-600">{data.newStudents.length} new student{data.newStudents.length !== 1 ? 's' : ''} this week</p>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {data.newStudents.slice(0, 6).map((student: any) => (
                <div key={student.id} className="flex items-center gap-3 p-3 rounded-lg bg-white/70 border border-teal-100">
                  <div className="h-10 w-10 rounded-full bg-teal-100 flex items-center justify-center text-sm font-bold text-teal-700 flex-shrink-0">
                    {student.profiles?.first_name?.[0]}{student.profiles?.last_name?.[0]}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {student.profiles?.first_name} {student.profiles?.last_name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {student.sections?.classes?.name} · {student.sections?.name}
                    </p>
                    <p className="text-xs text-teal-600">
                      Admission: {student.admission_number} · Enrolled {new Date(student.enrollment_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            {data.newStudents.length > 6 && (
              <div className="mt-3 text-center">
                <Button variant="link" size="sm" className="text-teal-700" asChild>
                  <Link href="/teacher/my-classes">View all {data.newStudents.length} new students →</Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {data?.sectionAttendanceStats && data.sectionAttendanceStats.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <BarChart3 className="h-5 w-5" /> Today&apos;s Attendance by Section
            </CardTitle>
            <CardDescription>Real-time attendance status for your sections</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {data.sectionAttendanceStats.map((section: any) => {
                const pct = section.totalStudents > 0
                  ? Math.round((section.todayPresent / section.totalStudents) * 100)
                  : 0
                return (
                  <Link
                    key={section.sectionId}
                    href={`/teacher/attendance?sectionId=${section.sectionId}`}
                    className="block p-4 rounded-lg border border-gray-200 hover:border-edu-blue-300 hover:shadow-sm transition-all"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <p className="font-medium text-sm">{section.className}</p>
                      <Badge variant="outline" className="text-xs">{section.sectionName}</Badge>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
                      <Users className="h-3 w-3" />
                      <span>{section.todayMarked}/{section.totalStudents} marked</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex-1 bg-gray-100 rounded-full h-2">
                        <div
                          className={cn(
                            'h-2 rounded-full transition-all',
                            pct >= 90 ? 'bg-green-500' : pct >= 75 ? 'bg-yellow-500' : 'bg-red-500'
                          )}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className={cn(
                        'text-sm font-bold',
                        pct >= 90 ? 'text-green-600' : pct >= 75 ? 'text-yellow-600' : 'text-red-600'
                      )}>
                        {pct}%
                      </span>
                    </div>
                    {section.todayMarked > 0 && (
                      <div className="flex gap-2 mt-2 text-xs text-muted-foreground">
                        <span className="text-green-600">+{section.todayPresent}</span>
                        <span className="text-red-600">-{section.todayAbsent}</span>
                      </div>
                    )}
                  </Link>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-3 gap-3">
        <Link href="/teacher/attendance">
          <Card className="cursor-pointer hover:shadow-md transition-shadow">
            <CardContent className="flex items-center gap-4 py-4">
              <div className="p-3 rounded-full bg-blue-100"><CalendarCheck className="h-5 w-5 text-blue-600" /></div>
              <div><p className="font-medium">Mark Attendance</p><p className="text-xs text-muted-foreground">Record today&apos;s attendance</p></div>
            </CardContent>
          </Card>
        </Link>
        <Link href="/teacher/attendance?view=history">
          <Card className="cursor-pointer hover:shadow-md transition-shadow">
            <CardContent className="flex items-center gap-4 py-4">
              <div className="p-3 rounded-full bg-purple-100"><History className="h-5 w-5 text-purple-600" /></div>
              <div><p className="font-medium">Attendance History</p><p className="text-xs text-muted-foreground">View trends & calendars</p></div>
            </CardContent>
          </Card>
        </Link>
        <Link href="/teacher/assignments/new">
          <Card className="cursor-pointer hover:shadow-md transition-shadow">
            <CardContent className="flex items-center gap-4 py-4">
              <div className="p-3 rounded-full bg-green-100"><Plus className="h-5 w-5 text-green-600" /></div>
              <div><p className="font-medium">Create Assignment</p><p className="text-xs text-muted-foreground">New task for students</p></div>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* ── My Classes Grid ── */}
      {myClasses && myClasses.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-edu-blue-600" /> My Classes
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {myClasses.map((cls: any) => (
              <Link key={cls.section_id} href={`/teacher/my-classes/${cls.section_id}`} className="block">
                <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <p className="font-semibold text-gray-900">{cls.class_name}</p>
                        <p className="text-sm text-muted-foreground">Section {cls.section_name}</p>
                      </div>
                      {cls.is_current_year && (
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-[10px]">Current</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Users className="h-3.5 w-3.5" />
                        <span>{cls.student_count} / {cls.capacity || '—'} students</span>
                      </div>
                    </div>
                    <div className="mt-3 flex gap-2">
                      <Button size="sm" variant="outline" className="text-xs h-7 px-2" asChild>
                        <Link href={`/teacher/attendance?sectionId=${cls.section_id}`}>Attendance</Link>
                      </Button>
                      <Button size="sm" variant="outline" className="text-xs h-7 px-2" asChild>
                        <Link href={`/teacher/materials`}>Materials</Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Clock className="h-5 w-5" /> Today&apos;s Schedule</CardTitle>
            <CardDescription>Your classes for today</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">{[...Array(3)].map((_: any, i: any) => <Skeleton key={i} className="h-16 w-full" />)}</div>
            ) : data?.todayClasses.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">No classes scheduled for today</p>
            ) : (
              <div className="space-y-3">
                {data?.todayClasses.map((entry: any, i: number) => (
                  <div key={i} className="flex items-center justify-between p-3 rounded-lg border border-gray-200">
                    <div className="flex items-center gap-3">
                      <BookOpen className="h-4 w-4 text-edu-blue-600" />
                      <div>
                        <p className="font-medium">{entry.subjects?.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {entry.sections?.classes?.name} - {entry.sections?.name}
                          {entry.room && ` · Room ${entry.room}`}
                        </p>
                      </div>
                    </div>
                    <span className="text-sm font-medium text-muted-foreground whitespace-nowrap">
                      {entry.start_time?.slice(0, 5)} – {entry.end_time?.slice(0, 5)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><MessageSquare className="h-5 w-5" /> Recent Messages</CardTitle>
            <CardDescription>Unread messages from parents</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">{[...Array(3)].map((_: any, i: any) => <Skeleton key={i} className="h-16 w-full" />)}</div>
            ) : data?.unreadMessages.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">No unread messages</p>
            ) : (
              <div className="space-y-3">
                {data?.unreadMessages.map((msg: any) => (
                  <div key={msg.id} className="p-3 rounded-lg border border-gray-200">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium">{msg.profiles?.first_name} {msg.profiles?.last_name}</span>
                      <span className="text-xs text-muted-foreground">{new Date(msg.created_at).toLocaleDateString()}</span>
                    </div>
                    <p className="text-sm text-gray-600 line-clamp-1">{msg.subject ?? msg.content}</p>
                  </div>
                ))}
                <Button variant="outline" size="sm" className="w-full" asChild>
                  <Link href="/teacher/messages">View All Messages</Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><ClipboardList className="h-5 w-5" /> Pending Assignments</CardTitle>
          <CardDescription>Assignments needing your attention</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">{[...Array(3)].map((_: any, i: any) => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : data?.pendingAssignments.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">No pending assignments</p>
          ) : (
            <div className="space-y-2">
              {data?.pendingAssignments.map((a: any) => (
                <Link key={a.id} href={`/teacher/assignments/${a.id}`} className="flex items-center justify-between p-3 rounded-lg border border-gray-200 hover:bg-gray-50">
                  <div>
                    <p className="font-medium text-sm">{a.title}</p>
                    <p className="text-xs text-muted-foreground">{a.classes?.name} · {a.subjects?.name}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-medium">Due {new Date(a.due_date).toLocaleDateString()}</p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
