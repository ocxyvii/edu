'use client'

import { use, useState, useEffect } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { useSearchParams, useRouter } from 'next/navigation'
import { getChildDetail } from '@/lib/actions/parent'
import { getChildAttendance, getChildResults, getChildFees, getChildAssignments, getChildTeachers, sendParentMessage } from '@/lib/actions/parent'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import {
  CalendarCheck, TrendingUp, DollarSign, BookOpen, CheckCircle2, XCircle,
  Clock, Mail, Phone, MapPin, GraduationCap, ChevronLeft, ChevronRight,
  User, Send, MessageSquare, AlertCircle, Eye, EyeOff, Download,
} from 'lucide-react'
import Link from 'next/link'

const statusColors: Record<string, string> = {
  present: 'bg-green-500', absent: 'bg-red-500', late: 'bg-amber-400', excused: 'bg-blue-400',
}

const attendanceLabels: Record<string, string> = {
  present: 'Present', absent: 'Absent', late: 'Late', excused: 'Excused',
}

const invoiceStatusStyles: Record<string, string> = {
  paid: 'bg-green-100 text-green-800 border-green-200',
  partial: 'bg-amber-100 text-amber-800 border-amber-200',
  pending: 'bg-gray-100 text-gray-600 border-gray-200',
  overdue: 'bg-red-100 text-red-800 border-red-200',
  cancelled: 'bg-gray-100 text-gray-400 border-gray-200',
}

export default function ChildDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const searchParams = useSearchParams()
  const router = useRouter()
  const defaultTab = searchParams.get('tab') || 'overview'
  const [activeTab, setActiveTab] = useState(defaultTab)

  // Attendance month navigation
  const [attMonth, setAttMonth] = useState(new Date().getMonth() + 1)
  const [attYear, setAttYear] = useState(new Date().getFullYear())

  // Compose message modal
  const [composeOpen, setComposeOpen] = useState(false)
  const [messageForm, setMessageForm] = useState({ recipient_id: '', subject: '', content: '' })

  // Assignments filter
  const [assignFilter, setAssignFilter] = useState('all')

  // Update URL when tab changes
  useEffect(() => {
    const newUrl = `/parent/children/${id}?tab=${activeTab}`
    router.replace(newUrl, { scroll: false })
  }, [activeTab, id, router])

  // Student basic info
  const { data: basic, isLoading: basicLoading } = useQuery({
    queryKey: ['child-detail', id],
    queryFn: () => getChildDetail(id),
  })

  // Attendance
  const { data: attendanceData, isLoading: attLoading } = useQuery({
    queryKey: ['child-attendance', id, attMonth, attYear],
    queryFn: () => getChildAttendance(id, attMonth, attYear),
    enabled: activeTab === 'attendance',
  })

  // Results
  const { data: results, isLoading: resultsLoading } = useQuery({
    queryKey: ['child-results', id],
    queryFn: () => getChildResults(id),
    enabled: activeTab === 'results',
  })

  // Fees
  const { data: feesData, isLoading: feesLoading } = useQuery({
    queryKey: ['child-fees', id],
    queryFn: () => getChildFees(id),
    enabled: activeTab === 'fees',
  })

  // Assignments
  const { data: assignments, isLoading: assignmentsLoading } = useQuery({
    queryKey: ['child-assignments', id, assignFilter],
    queryFn: () => getChildAssignments(id, assignFilter === 'all' ? undefined : assignFilter),
    enabled: activeTab === 'assignments',
  })

  // Teachers
  const { data: teachers, isLoading: teachersLoading } = useQuery({
    queryKey: ['child-teachers', id],
    queryFn: () => getChildTeachers(id),
    enabled: activeTab === 'teachers',
  })

  // Send message mutation
  const sendMsgMutation = useMutation({
    mutationFn: () => sendParentMessage(messageForm),
    onSuccess: () => {
      toast.success('Message sent to teacher')
      setComposeOpen(false)
      setMessageForm({ recipient_id: '', subject: '', content: '' })
    },
    onError: (e: Error) => toast.error(e.message),
  })

  if (basicLoading) {
    return <div className="space-y-6">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-48 w-full" />)}</div>
  }

  if (!basic?.student) {
    return <Card><CardContent className="py-12 text-center text-muted-foreground">Student not found or access denied.</CardContent></Card>
  }

  const student = basic.student as any
  const stats = basic.attendanceStats

  const daysInMonth = new Date(attYear, attMonth, 0).getDate()
  const monthDays = Array.from({ length: daysInMonth }, (_, i) => {
    const d = i + 1
    const dateStr = `${attYear}-${String(attMonth).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    const record = attendanceData?.attendance?.find((a: any) => a.date === dateStr)
    return { date: dateStr, day: d, status: record?.status ?? null }
  })

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Avatar className="h-16 w-16 ring-2 ring-edu-blue-200">
          <AvatarImage src={student.profiles?.avatar_url ?? ''} />
          <AvatarFallback className="text-lg bg-edu-blue-100 text-edu-blue-700">
            {student.profiles?.first_name?.[0]}{student.profiles?.last_name?.[0]}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold text-gray-900">{student.profiles?.first_name} {student.profiles?.last_name}</h1>
          <p className="text-sm text-muted-foreground">
            {student.classes?.name} · Section {student.sections?.name} · Admission: {student.admission_number}
          </p>
          <p className="text-xs text-muted-foreground">
            Enrolled: {student.enrollment_date ? new Date(student.enrollment_date).toLocaleDateString() : '—'}
          </p>
        </div>
        <Button variant="outline" size="sm" asChild>
          <Link href="/parent/children">All Children</Link>
        </Button>
      </div>

      {/* 6 Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-3 lg:grid-cols-6 w-full">
          <TabsTrigger value="overview"><User className="h-4 w-4 lg:mr-1.5" /> <span className="hidden lg:inline">Overview</span></TabsTrigger>
          <TabsTrigger value="attendance"><CalendarCheck className="h-4 w-4 lg:mr-1.5" /> <span className="hidden lg:inline">Attendance</span></TabsTrigger>
          <TabsTrigger value="results"><TrendingUp className="h-4 w-4 lg:mr-1.5" /> <span className="hidden lg:inline">Results</span></TabsTrigger>
          <TabsTrigger value="fees"><DollarSign className="h-4 w-4 lg:mr-1.5" /> <span className="hidden lg:inline">Fees</span></TabsTrigger>
          <TabsTrigger value="assignments"><BookOpen className="h-4 w-4 lg:mr-1.5" /> <span className="hidden lg:inline">Assignments</span></TabsTrigger>
          <TabsTrigger value="teachers"><GraduationCap className="h-4 w-4 lg:mr-1.5" /> <span className="hidden lg:inline">Teachers</span></TabsTrigger>
        </TabsList>

        {/* ── TAB 1: Overview ── */}
        <TabsContent value="overview" className="space-y-6 mt-6">
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            <Card><CardContent className="py-4 text-center">
              <p className="text-2xl font-bold text-gray-900">{stats.percentage}%</p>
              <p className="text-xs text-muted-foreground">Attendance</p>
            </CardContent></Card>
            <Card><CardContent className="py-4 text-center">
              <p className="text-2xl font-bold text-green-600">{stats.present}</p>
              <p className="text-xs text-muted-foreground">Present</p>
            </CardContent></Card>
            <Card><CardContent className="py-4 text-center">
              <p className="text-2xl font-bold text-red-600">{stats.absent}</p>
              <p className="text-xs text-muted-foreground">Absent</p>
            </CardContent></Card>
            <Card><CardContent className="py-4 text-center">
              <p className="text-2xl font-bold text-amber-600">{stats.late}</p>
              <p className="text-xs text-muted-foreground">Late</p>
            </CardContent></Card>
            <Card><CardContent className="py-4 text-center">
              <p className="text-2xl font-bold">{basic.results?.length ?? 0}</p>
              <p className="text-xs text-muted-foreground">Results</p>
            </CardContent></Card>
          </div>

          <Card>
            <CardHeader><CardTitle className="text-base">Student Information</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div><span className="text-muted-foreground">Full Name:</span> <span className="font-medium ml-2">{student.profiles?.first_name} {student.profiles?.last_name}</span></div>
              <div><span className="text-muted-foreground">Admission No:</span> <span className="font-medium ml-2">{student.admission_number}</span></div>
              <div><span className="text-muted-foreground">Class:</span> <span className="font-medium ml-2">{student.classes?.name}</span></div>
              <div><span className="text-muted-foreground">Section:</span> <span className="font-medium ml-2">{student.sections?.name}</span></div>
              <div><span className="text-muted-foreground">Gender:</span> <span className="font-medium ml-2 capitalize">{student.profiles?.gender ?? '—'}</span></div>
              <div><span className="text-muted-foreground">Date of Birth:</span> <span className="font-medium ml-2">{student.profiles?.date_of_birth ? new Date(student.profiles.date_of_birth).toLocaleDateString() : '—'}</span></div>
              <div><span className="text-muted-foreground">Email:</span> <span className="font-medium ml-2">{student.profiles?.email ?? '—'}</span></div>
              <div><span className="text-muted-foreground">Phone:</span> <span className="font-medium ml-2">{student.profiles?.phone ?? '—'}</span></div>
              <div><span className="text-muted-foreground">Enrollment Date:</span> <span className="font-medium ml-2">{student.enrollment_date ? new Date(student.enrollment_date).toLocaleDateString() : '—'}</span></div>
              <div><span className="text-muted-foreground">Status:</span>
                <Badge className={`ml-2 ${student.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                  {student.is_active ? 'Active' : 'Inactive'}
                </Badge>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── TAB 2: Attendance ── */}
        <TabsContent value="attendance" className="space-y-6 mt-6">
          {/* Stats */}
          {attLoading ? (
            <div className="grid grid-cols-5 gap-4">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-24" />)}</div>
          ) : (
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
              <Card><CardContent className="py-4 text-center">
                <p className="text-2xl font-bold">{attendanceData?.percentage ?? 0}%</p>
                <p className="text-xs text-muted-foreground">Rate</p>
              </CardContent></Card>
              <Card><CardContent className="py-4 text-center">
                <p className="text-2xl font-bold text-gray-900">{attendanceData?.summary?.total ?? 0}</p>
                <p className="text-xs text-muted-foreground">Total</p>
              </CardContent></Card>
              <Card><CardContent className="py-4 text-center">
                <p className="text-2xl font-bold text-green-600">{attendanceData?.summary?.present ?? 0}</p>
                <p className="text-xs text-muted-foreground">Present</p>
              </CardContent></Card>
              <Card><CardContent className="py-4 text-center">
                <p className="text-2xl font-bold text-red-600">{attendanceData?.summary?.absent ?? 0}</p>
                <p className="text-xs text-muted-foreground">Absent</p>
              </CardContent></Card>
              <Card><CardContent className="py-4 text-center">
                <p className="text-2xl font-bold text-amber-600">{attendanceData?.summary?.late ?? 0}</p>
                <p className="text-xs text-muted-foreground">Late</p>
              </CardContent></Card>
            </div>
          )}

          {/* Calendar */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Monthly Calendar</CardTitle>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="icon" className="h-8 w-8"
                    onClick={() => {
                      if (attMonth === 1) { setAttMonth(12); setAttYear(attYear - 1) }
                      else setAttMonth(attMonth - 1)
                    }}
                  ><ChevronLeft className="h-4 w-4" /></Button>
                  <span className="text-sm font-medium min-w-[120px] text-center">
                    {format(new Date(attYear, attMonth - 1, 1), 'MMMM yyyy')}
                  </span>
                  <Button variant="outline" size="icon" className="h-8 w-8"
                    onClick={() => {
                      if (attMonth === 12) { setAttMonth(1); setAttYear(attYear + 1) }
                      else setAttMonth(attMonth + 1)
                    }}
                  ><ChevronRight className="h-4 w-4" /></Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-7 gap-1.5">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                  <div key={d} className="text-center text-xs font-medium text-muted-foreground py-1">{d}</div>
                ))}
                {/* Empty cells for first day offset */}
                {monthDays.length > 0 && Array.from({ length: new Date(attYear, attMonth - 1, 1).getDay() }).map((_, i) => (
                  <div key={`empty-${i}`} />
                ))}
                {monthDays.map(({ date, day, status }) => (
                  <div
                    key={date}
                    className={cn(
                      'aspect-square rounded-lg flex items-center justify-center text-sm',
                      status ? `${statusColors[status]} text-white` : 'bg-gray-50 text-gray-400',
                    )}
                    title={status ? `${date}: ${attendanceLabels[status]}` : date}
                  >
                    {day}
                  </div>
                ))}
              </div>
              {/* Legend */}
              <div className="flex items-center gap-4 mt-4 text-xs text-muted-foreground">
                {Object.entries(attendanceLabels).map(([key, label]) => (
                  <div key={key} className="flex items-center gap-1.5">
                    <div className={cn('w-3 h-3 rounded', statusColors[key])} />
                    <span>{label}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── TAB 3: Results ── */}
        <TabsContent value="results" className="space-y-6 mt-6">
          {resultsLoading ? (
            <div className="space-y-4">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}</div>
          ) : !results?.length ? (
            <Card><CardContent className="py-12 text-center text-muted-foreground">No results published yet.</CardContent></Card>
          ) : (
            <div className="space-y-4">
              {/* Group by exam */}
              {(() => {
                const grouped = results.reduce((acc: any, r: any) => {
                  const key = r.exams?.id || 'unknown'
                  if (!acc[key]) acc[key] = { exam: r.exams, subjects: [] }
                  acc[key].subjects.push(r)
                  return acc
                }, {})
                return Object.values(grouped).map((group: any) => {
                  const avgMarks = group.subjects.reduce((s: number, r: any) => s + Number(r.marks_obtained), 0) / group.subjects.length
                  return (
                    <Card key={group.exam?.id || 'unknown'}>
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <CardTitle className="text-base">{group.exam?.name || 'Unknown Exam'}</CardTitle>
                            <CardDescription>{group.exam?.exam_type} · {group.exam?.terms?.name} · {group.exam?.academic_years?.name}</CardDescription>
                          </div>
                          <div className="text-right">
                            <p className="text-lg font-bold">{avgMarks.toFixed(0)}%</p>
                            <p className="text-xs text-muted-foreground">Average</p>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          {group.subjects.map((r: any) => (
                            <div key={r.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                              <div className="flex items-center gap-2">
                                <div>
                                  <p className="text-sm font-medium">{r.subjects?.name}</p>
                                  <p className="text-xs text-muted-foreground">{r.subjects?.code}</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-3">
                                <div className="text-right">
                                  <p className="text-sm font-medium">{r.marks_obtained} marks</p>
                                  <p className="text-xs text-muted-foreground">{r.percentage ?? '-'}%</p>
                                </div>
                                <Badge className={
                                  r.grade === 'A' ? 'bg-green-100 text-green-800' :
                                  r.grade === 'B' ? 'bg-blue-100 text-blue-800' :
                                  r.grade === 'C' ? 'bg-amber-100 text-amber-800' :
                                  r.grade === 'D' ? 'bg-orange-100 text-orange-800' :
                                  'bg-red-100 text-red-800'
                                }>{r.grade || '—'}</Badge>
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )
                })
              })()}
            </div>
          )}
        </TabsContent>

        {/* ── TAB 4: Fees ── */}
        <TabsContent value="fees" className="space-y-6 mt-6">
          {feesLoading ? (
            <div className="space-y-4">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24" />)}</div>
          ) : !feesData?.invoices?.length ? (
            <Card><CardContent className="py-12 text-center text-muted-foreground">No fee records found.</CardContent></Card>
          ) : (
            <>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <Card><CardContent className="py-4 text-center">
                  <p className="text-lg font-bold">KES {feesData.summary.totalBilled.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">Total Billed</p>
                </CardContent></Card>
                <Card><CardContent className="py-4 text-center">
                  <p className="text-lg font-bold text-green-600">KES {feesData.summary.totalPaid.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">Total Paid</p>
                </CardContent></Card>
                <Card><CardContent className="py-4 text-center">
                  <p className="text-lg font-bold text-red-600">KES {feesData.summary.totalBalance.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">Outstanding</p>
                </CardContent></Card>
                <Card><CardContent className="py-4 text-center">
                  <p className="text-lg font-bold text-red-600">{feesData.summary.overdueCount}</p>
                  <p className="text-xs text-muted-foreground">Overdue Invoices</p>
                </CardContent></Card>
              </div>

              <Card>
                <CardHeader><CardTitle className="text-base">Invoices</CardTitle></CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b text-left text-muted-foreground">
                          <th className="pb-2 font-medium">Description</th>
                          <th className="pb-2 font-medium text-right">Amount</th>
                          <th className="pb-2 font-medium text-right">Paid</th>
                          <th className="pb-2 font-medium text-right">Balance</th>
                          <th className="pb-2 font-medium">Due Date</th>
                          <th className="pb-2 font-medium">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {feesData.invoices.map((inv: any) => (
                          <tr key={inv.id} className="border-b border-gray-50">
                            <td className="py-3">{inv.fee_structures?.name || inv.description || 'Fee'}</td>
                            <td className="py-3 text-right">KES {Number(inv.amount).toLocaleString()}</td>
                            <td className="py-3 text-right">KES {Number(inv.paid_amount).toLocaleString()}</td>
                            <td className="py-3 text-right font-medium">{Number(inv.balance) > 0 ? `KES ${Number(inv.balance).toLocaleString()}` : '—'}</td>
                            <td className="py-3">{inv.due_date ? format(new Date(inv.due_date), 'MMM d, yyyy') : '—'}</td>
                            <td className="py-3"><Badge className={invoiceStatusStyles[inv.status]}>{inv.status}</Badge></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>

              {feesData.payments?.length > 0 && (
                <Card>
                  <CardHeader><CardTitle className="text-base">Payment History</CardTitle></CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b text-left text-muted-foreground">
                            <th className="pb-2 font-medium">Date</th>
                            <th className="pb-2 font-medium">Method</th>
                            <th className="pb-2 font-medium">Reference</th>
                            <th className="pb-2 font-medium text-right">Amount</th>
                            <th className="pb-2 font-medium">Receipt</th>
                          </tr>
                        </thead>
                        <tbody>
                          {feesData.payments.map((p: any) => (
                            <tr key={p.id} className="border-b border-gray-50">
                              <td className="py-3">{p.paid_at ? format(new Date(p.paid_at), 'MMM d, yyyy') : '—'}</td>
                              <td className="py-3 capitalize">{p.payment_method}</td>
                              <td className="py-3 text-xs font-mono">{p.transaction_ref || '—'}</td>
                              <td className="py-3 text-right font-medium">KES {Number(p.amount).toLocaleString()}</td>
                              <td className="py-3">
                                <Button variant="ghost" size="sm" className="h-7 text-xs">
                                  <Download className="h-3 w-3 mr-1" /> Receipt
                                </Button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              )}

              <Link href="/parent/fees" className="block text-center text-sm text-edu-blue-600 hover:underline">
                View all fees & make payment →
              </Link>
            </>
          )}
        </TabsContent>

        {/* ── TAB 5: Assignments ── */}
        <TabsContent value="assignments" className="space-y-6 mt-6">
          <div className="flex gap-2">
            {['all', 'pending', 'submitted', 'graded'].map(f => (
              <Button
                key={f}
                variant={assignFilter === f ? 'default' : 'outline'}
                size="sm"
                onClick={() => setAssignFilter(f)}
                className="capitalize"
              >{f}</Button>
            ))}
          </div>

          {assignmentsLoading ? (
            <div className="space-y-3">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}</div>
          ) : !assignments?.length ? (
            <Card><CardContent className="py-12 text-center text-muted-foreground">No {assignFilter !== 'all' ? assignFilter : ''} assignments found.</CardContent></Card>
          ) : (
            <div className="space-y-3">
              {assignments.map((a: any) => {
                const dueDate = a.due_date ? new Date(a.due_date) : null
                const isOverdue = dueDate && dueDate < new Date()
                const isDueSoon = dueDate && dueDate > new Date() && dueDate < new Date(Date.now() + 3 * 86400000)
                return (
                  <Card key={a.id}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3 min-w-0 flex-1">
                          <BookOpen className="h-5 w-5 text-edu-blue-600 mt-0.5 flex-shrink-0" />
                          <div className="min-w-0">
                            <p className="font-medium">{a.title}</p>
                            <p className="text-xs text-muted-foreground">{a.subjects?.name} · {a.subjects?.code}</p>
                            <div className="flex items-center gap-2 mt-1">
                              {dueDate && (
                                <span className={`text-xs ${isOverdue ? 'text-red-600' : isDueSoon ? 'text-amber-600' : 'text-muted-foreground'}`}>
                                  Due: {format(dueDate, 'MMM d, yyyy')}
                                  {isOverdue && ' (Overdue)'}
                                  {isDueSoon && ' (Soon)'}
                                </span>
                              )}
                              <Badge variant="outline" className="text-[10px]">{a.sections?.name || 'All'}</Badge>
                            </div>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          {a.submission ? (
                            <div>
                              <Badge className={
                                a.submission.status === 'graded' ? 'bg-green-100 text-green-800' :
                                a.submission.status === 'submitted' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-600'
                              }>{a.submission.status}</Badge>
                              {a.submission.marks && (
                                <p className="text-xs mt-1">{a.submission.marks}/{a.max_marks}</p>
                              )}
                            </div>
                          ) : (
                            <Badge variant="outline" className="bg-gray-50">Not Submitted</Badge>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </TabsContent>

        {/* ── TAB 6: Teachers ── */}
        <TabsContent value="teachers" className="space-y-6 mt-6">
          {teachersLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-32" />)}</div>
          ) : !teachers?.length ? (
            <Card><CardContent className="py-12 text-center text-muted-foreground">No teachers assigned to this class yet.</CardContent></Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {teachers.map((t: any) => (
                <Card key={t.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={t.avatarUrl ?? ''} />
                        <AvatarFallback className="bg-edu-blue-100 text-edu-blue-700">
                          {t.firstName?.[0]}{t.lastName?.[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium">{t.firstName} {t.lastName}</p>
                        <p className="text-xs text-muted-foreground">{t.department}</p>
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {t.subjects?.map((s: string) => (
                            <Badge key={s} variant="secondary" className="text-[10px]">{s}</Badge>
                          ))}
                        </div>
                        <div className="flex gap-2 mt-3">
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-xs h-8"
                            onClick={() => {
                              setMessageForm({ recipient_id: t.id, subject: '', content: '' })
                              setComposeOpen(true)
                            }}
                          >
                            <Send className="h-3 w-3 mr-1" /> Message
                          </Button>
                          {t.email && (
                            <Button variant="ghost" size="sm" className="text-xs h-8" asChild>
                              <a href={`mailto:${t.email}`}><Mail className="h-3 w-3 mr-1" /> Email</a>
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Compose Message Modal */}
          {composeOpen && (
            <Card className="border-2 border-edu-blue-200">
              <CardHeader>
                <CardTitle className="text-base">Send Message to Teacher</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Teacher</Label>
                  <Select
                    value={messageForm.recipient_id}
                    onValueChange={(v) => setMessageForm(p => ({ ...p, recipient_id: v }))}
                  >
                    <SelectTrigger><SelectValue placeholder="Select teacher" /></SelectTrigger>
                    <SelectContent>
                      {teachers?.map((t: any) => (
                        <SelectItem key={t.id} value={t.id}>{t.firstName} {t.lastName} ({t.subjects?.join(', ')})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Subject</Label>
                  <Input value={messageForm.subject} onChange={(e) => setMessageForm(p => ({ ...p, subject: e.target.value }))} placeholder="Optional subject" />
                </div>
                <div>
                  <Label>Message *</Label>
                  <textarea
                    value={messageForm.content}
                    onChange={(e) => setMessageForm(p => ({ ...p, content: e.target.value }))}
                    className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    placeholder="Type your message..."
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setComposeOpen(false)}>Cancel</Button>
                  <Button
                    onClick={() => sendMsgMutation.mutate()}
                    disabled={sendMsgMutation.isPending || !messageForm.content || !messageForm.recipient_id}
                  >
                    {sendMsgMutation.isPending ? 'Sending...' : <><Send className="h-4 w-4 mr-1.5" /> Send Message</>}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
