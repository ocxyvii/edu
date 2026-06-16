'use client'

import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getParentDashboard } from '@/lib/actions/parent'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Users, GraduationCap, TrendingUp, CalendarCheck, MessageSquare, DollarSign, BookOpen, Megaphone, ChevronRight, AlertCircle, CheckCircle2, XCircle, Clock, Send } from 'lucide-react'
import Link from 'next/link'

const CHILD_STORAGE_KEY = 'educore-selected-child'

export default function ParentDashboard() {
  const [selectedChildId, setSelectedChildId] = useState<string>('')

  // Restore selected child from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(CHILD_STORAGE_KEY)
      if (saved) setSelectedChildId(saved)
    } catch {}
  }, [])

  // Persist selected child
  useEffect(() => {
    if (selectedChildId) {
      try { localStorage.setItem(CHILD_STORAGE_KEY, selectedChildId) } catch {}
    }
  }, [selectedChildId])

  const { data, isLoading } = useQuery({
    queryKey: ['parent-dashboard'],
    queryFn: () => getParentDashboard(),
    refetchInterval: 30000,
  })

  const children = data?.children ?? []
  const selectedChild = children.find((c: any) => c.id === selectedChildId) ?? children[0]

  // Set default selection when children load
  useEffect(() => {
    if (children.length > 0 && !selectedChildId) {
      setSelectedChildId(children[0].id)
    }
  }, [children, selectedChildId])

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_: any, i: any) => <Skeleton key={i} className="h-28" />)}
        </div>
        <Skeleton className="h-64" />
      </div>
    )
  }

  if (!data?.hasChildren) {
    return (
      <div className="max-w-lg mx-auto py-16 text-center">
        <div className="w-20 h-20 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-6">
          <Users className="h-10 w-10 text-amber-600" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">No Children Linked</h1>
        <p className="text-gray-500 mb-6">
          No children are linked to your parent account yet. Your child&apos;s school admin
          needs to enroll your child and link them to your account.
        </p>
        <p className="text-sm text-muted-foreground">
          Please contact the school administration for assistance.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header with child switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Parent Dashboard</h1>
          <p className="text-gray-500 mt-1">Monitor your children&apos;s progress</p>
        </div>
        {children.length > 1 && (
          <div className="flex gap-2 overflow-x-auto pb-2">
            {children.map((child: any) => (
              <button
                key={child.id}
                onClick={() => setSelectedChildId(child.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-full border text-sm font-medium transition-colors whitespace-nowrap ${
                  selectedChildId === child.id
                    ? 'bg-edu-blue-600 text-white border-edu-blue-600'
                    : 'bg-white text-gray-700 border-gray-200 hover:border-edu-blue-300'
                }`}
              >
                <Avatar className="h-6 w-6">
                  <AvatarImage src={child.profiles?.avatar_url ?? ''} />
                  <AvatarFallback className="text-[10px]">
                    {child.profiles?.first_name?.[0]}{child.profiles?.last_name?.[0]}
                  </AvatarFallback>
                </Avatar>
                <span>{child.profiles?.first_name}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {selectedChild && (
        <>
          {/* Child header */}
          <Card className="border-edu-blue-100 bg-gradient-to-r from-edu-blue-50 to-white">
            <CardContent className="p-5">
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16 ring-2 ring-edu-blue-200">
                  <AvatarImage src={selectedChild.profiles?.avatar_url ?? ''} />
                  <AvatarFallback className="text-lg bg-edu-blue-100 text-edu-blue-700">
                    {selectedChild.profiles?.first_name?.[0]}{selectedChild.profiles?.last_name?.[0]}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-xl font-bold text-gray-900">
                      {selectedChild.profiles?.first_name} {selectedChild.profiles?.last_name}
                    </h2>
                    {selectedChild.is_active ? (
                      <Badge className="bg-green-100 text-green-700 border-green-200">Active</Badge>
                    ) : (
                      <Badge variant="destructive">Inactive</Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {selectedChild.classes?.name} · Section {selectedChild.sections?.name} · Admission: {selectedChild.admission_number}
                  </p>
                  {selectedChild.classes?.academic_years && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Academic Year: {selectedChild.classes.academic_years.name}
                      {selectedChild.classes.academic_years.is_current && (
                        <Badge variant="outline" className="ml-1.5 text-[10px] bg-green-50 text-green-700 border-green-200">Current</Badge>
                      )}
                    </p>
                  )}
                </div>
                <Button variant="outline" size="sm" className="shrink-0" asChild>
                  <Link href={`/parent/children/${selectedChild.id}`}>
                    Full Profile <ChevronRight className="h-4 w-4 ml-1" />
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Top row: 4 stat cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-medium text-muted-foreground">Today&apos;s Attendance</p>
                  <CalendarCheck className="h-4 w-4 text-edu-blue-600" />
                </div>
                <div className="flex items-center gap-2">
                  {selectedChild.attendanceStats?.todayStatus === 'present' ? (
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                  ) : selectedChild.attendanceStats?.todayStatus === 'absent' ? (
                    <XCircle className="h-5 w-5 text-red-500" />
                  ) : selectedChild.attendanceStats?.todayStatus === 'late' ? (
                    <Clock className="h-5 w-5 text-amber-500" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-gray-400" />
                  )}
                  <span className="text-lg font-bold capitalize">{selectedChild.attendanceStats?.todayStatus?.replace('_', ' ') ?? 'Not Marked'}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-medium text-muted-foreground">Attendance Rate</p>
                  <TrendingUp className="h-4 w-4 text-green-600" />
                </div>
                <p className="text-lg font-bold text-green-600">{selectedChild.attendanceStats?.percentage ?? 0}%</p>
                <p className="text-xs text-muted-foreground">{selectedChild.attendanceStats?.present ?? 0}/{selectedChild.attendanceStats?.total ?? 0} days present</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-medium text-muted-foreground">Fee Balance</p>
                  <DollarSign className="h-4 w-4 text-red-600" />
                </div>
                <p className={`text-lg font-bold ${selectedChild.feeBalance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                  KES {(selectedChild.feeBalance ?? 0).toLocaleString()}
                </p>
                <p className="text-xs text-muted-foreground">{selectedChild.feeBalance > 0 ? 'Outstanding' : 'Fully paid'}</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-medium text-muted-foreground">Exam Results</p>
                  <GraduationCap className="h-4 w-4 text-purple-600" />
                </div>
                <p className="text-lg font-bold">{selectedChild.resultCount ?? 0}</p>
                <p className="text-xs text-muted-foreground">Published results</p>
              </CardContent>
            </Card>
          </div>

          {/* Middle row: Recent Results + Fee Summary */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <GraduationCap className="h-4 w-4" /> Recent Results
                </CardTitle>
              </CardHeader>
              <CardContent>
                {!data?.results?.filter((r: any) => r.student_id === selectedChild.id).length ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">No results published yet.</p>
                ) : (
                  <div className="space-y-2">
                    {data.results
                      .filter((r: any) => r.student_id === selectedChild.id)
                      .slice(0, 4)
                      .map((r: any) => (
                        <div key={r.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                          <div>
                            <p className="text-sm font-medium">{r.subjects?.name}</p>
                            <p className="text-xs text-muted-foreground">{r.exams?.name}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`text-sm font-bold ${Number(r.marks_obtained) >= 80 ? 'text-green-600' : Number(r.marks_obtained) >= 50 ? 'text-amber-600' : 'text-red-600'}`}>
                              {r.marks_obtained}
                            </span>
                            <Badge variant="outline" className="text-xs">{r.grade || '—'}</Badge>
                          </div>
                        </div>
                      ))}
                    <Button variant="link" size="sm" className="w-full mt-1" asChild>
                      <Link href={`/parent/children/${selectedChild.id}?tab=results`}>View All Results →</Link>
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <DollarSign className="h-4 w-4" /> Fee Summary
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between items-center py-2">
                    <span className="text-sm text-muted-foreground">Total Billed</span>
                    <span className="text-sm font-medium">KES {data?.invoices?.filter((i: any) => i.student_id === selectedChild.id).reduce((s: number, i: any) => s + Number(i.amount), 0).toLocaleString() ?? 0}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-t border-gray-50">
                    <span className="text-sm text-muted-foreground">Total Paid</span>
                    <span className="text-sm font-medium text-green-600">KES {data?.invoices?.filter((i: any) => i.student_id === selectedChild.id).reduce((s: number, i: any) => s + Number(i.paid_amount), 0).toLocaleString() ?? 0}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-t border-gray-50">
                    <span className="text-sm text-muted-foreground">Outstanding Balance</span>
                    <span className={`text-sm font-bold ${(selectedChild.feeBalance ?? 0) > 0 ? 'text-red-600' : 'text-green-600'}`}>
                      KES {(selectedChild.feeBalance ?? 0).toLocaleString()}
                    </span>
                  </div>
                  <Button variant="link" size="sm" className="w-full mt-1" asChild>
                    <Link href={`/parent/children/${selectedChild.id}?tab=fees`}>View Fee Details →</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Bottom row: Announcements + Messages */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Megaphone className="h-4 w-4" /> Announcements
                </CardTitle>
              </CardHeader>
              <CardContent>
                {!data?.announcements?.length ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">No recent announcements.</p>
                ) : (
                  <div className="space-y-2">
                    {data.announcements.slice(0, 3).map((a: any) => (
                      <div key={a.id} className="p-3 rounded-lg bg-gray-50 border border-gray-100">
                        <div className="flex items-start gap-2">
                          <Megaphone className="h-4 w-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                          <div>
                            <p className="text-sm font-medium">{a.title}</p>
                            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{a.content}</p>
                            <p className="text-xs text-gray-400 mt-1">{new Date(a.created_at).toLocaleDateString()}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" /> Messages
                  {data?.unreadMessages?.length > 0 && (
                    <Badge className="ml-auto bg-edu-blue-100 text-edu-blue-700 border-edu-blue-200">{data.unreadMessages.length} unread</Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {!data?.unreadMessages?.length ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">No unread messages.</p>
                ) : (
                  <div className="space-y-2">
                    {data.unreadMessages.slice(0, 3).map((m: any) => (
                      <div key={m.id} className="flex items-start gap-3 p-3 rounded-lg bg-gray-50 border border-gray-100">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={m.profiles?.avatar_url} />
                          <AvatarFallback className="text-xs">{m.profiles?.first_name?.[0]}{m.profiles?.last_name?.[0]}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium">{m.profiles?.first_name} {m.profiles?.last_name}</p>
                          <p className="text-xs text-muted-foreground line-clamp-1">{m.content}</p>
                        </div>
                      </div>
                    ))}
                    <Button variant="link" size="sm" className="w-full mt-1" asChild>
                      <Link href="/parent/messages">Go to Messages →</Link>
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  )
}
