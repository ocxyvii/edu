'use client'

import { useQuery } from '@tanstack/react-query'
import { getParentDashboard } from '@/lib/actions/parent'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

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
        <div className="space-y-4">{[...Array(2)].map((_: any, i: any) => <Skeleton key={i} className="h-48 w-full" />)}</div>
      ) : children.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">No children linked to your account.</CardContent></Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {children.map((item: any) => {
            const student = (item as any).students
            const stats = item.attendanceStats ?? { present: 0, absent: 0, late: 0, total: 0, percentage: 0 }

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
                      <p className="text-xl font-bold text-blue-700">{stats.percentage}%</p>
                      <p className="text-xs text-blue-600">Rate</p>
                    </div>
                    <div className="p-3 rounded-lg bg-green-50 text-center">
                      <p className="text-xl font-bold text-green-700">{stats.present}</p>
                      <p className="text-xs text-green-600">Present</p>
                    </div>
                    <div className="p-3 rounded-lg bg-red-50 text-center">
                      <p className="text-xl font-bold text-red-700">{stats.absent}</p>
                      <p className="text-xs text-red-600">Absent</p>
                    </div>
                    <div className="p-3 rounded-lg bg-yellow-50 text-center">
                      <p className="text-xl font-bold text-yellow-700">{stats.late}</p>
                      <p className="text-xs text-yellow-600">Late</p>
                    </div>
                  </div>
                  <div className="space-y-1">
                    {stats.total > 0 && (
                      <p className="text-sm text-muted-foreground">{stats.total} total records</p>
                    )}
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
