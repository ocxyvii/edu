'use client'

import { useQuery } from '@tanstack/react-query'
import { getParentDashboard } from '@/lib/actions/parent'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'

export default function ParentAttendancePage() {
  const { data, isLoading } = useQuery({
    queryKey: ['parent-dashboard'],
    queryFn: () => getParentDashboard(),
  })

  const children = data?.children ?? []

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Attendance</h1>
        <p className="text-gray-600 mt-1">Attendance records for your children</p>
      </div>

      {isLoading ? (
        <div className="space-y-4">{[...Array(2)].map((_, i) => <Skeleton key={i} className="h-48 w-full" />)}</div>
      ) : children.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">No children linked to your account.</CardContent></Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {children.map((item: any) => {
            const student = (item as any).students
            const childAttendance = data?.attendanceData?.filter(a => a.student_id === student?.id) ?? []
            const present = childAttendance.filter(a => a.status === 'present').length
            const absent = childAttendance.filter(a => a.status === 'absent').length
            const late = childAttendance.filter(a => a.status === 'late').length
            const pct = childAttendance.length > 0 ? Math.round((present / childAttendance.length) * 100) : 0

            return (
              <Card key={student?.id}>
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={student?.profiles?.avatar_url ?? ''} />
                      <AvatarFallback>{student?.profiles?.first_name?.[0]}{student?.profiles?.last_name?.[0]}</AvatarFallback>
                    </Avatar>
                    <div>
                      <CardTitle className="text-lg">{student?.profiles?.first_name} {student?.profiles?.last_name}</CardTitle>
                      <p className="text-sm text-muted-foreground">{student?.classes?.name} · {student?.sections?.name}</p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-4 gap-3 mb-4">
                    <div className="p-3 rounded-lg bg-blue-50 text-center">
                      <p className="text-xl font-bold text-blue-700">{pct}%</p>
                      <p className="text-xs text-blue-600">Rate</p>
                    </div>
                    <div className="p-3 rounded-lg bg-green-50 text-center">
                      <p className="text-xl font-bold text-green-700">{present}</p>
                      <p className="text-xs text-green-600">Present</p>
                    </div>
                    <div className="p-3 rounded-lg bg-red-50 text-center">
                      <p className="text-xl font-bold text-red-700">{absent}</p>
                      <p className="text-xs text-red-600">Absent</p>
                    </div>
                    <div className="p-3 rounded-lg bg-yellow-50 text-center">
                      <p className="text-xl font-bold text-yellow-700">{late}</p>
                      <p className="text-xs text-yellow-600">Late</p>
                    </div>
                  </div>
                  <div className="space-y-1">
                    {childAttendance.slice(0, 15).map(a => (
                      <div key={`${a.date}`} className="flex items-center justify-between text-sm p-1.5 rounded border border-gray-100">
                        <span>{a.date}</span>
                        <Badge className={
                          a.status === 'present' ? 'bg-green-100 text-green-800' :
                          a.status === 'absent' ? 'bg-red-100 text-red-800' :
                          a.status === 'late' ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'
                        }>{a.status}</Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
