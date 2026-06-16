'use client'

import { useQuery } from '@tanstack/react-query'
import { getParentDashboard } from '@/lib/actions/parent'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import Link from 'next/link'
import { GraduationCap, Users } from 'lucide-react'

export default function ChildrenListPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['parent-dashboard'],
    queryFn: () => getParentDashboard(),
  })

  const children = data?.children ?? []

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[...Array(2)].map((_: any, i: any) => <Skeleton key={i} className="h-48" />)}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">My Children</h1>
        <p className="text-gray-600 mt-1">View detailed information for each child</p>
      </div>

      {children.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">No children linked to your account.</CardContent></Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {children.map((item: any) => {
            const student = (item as any).students
            const attStats = item.attendanceStats ?? { total: 0, present: 0, absent: 0, late: 0, percentage: 0 }

            return (
              <Link key={student?.id} href={`/parent/children/${student?.id}`}>
                <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
                  <CardHeader>
                    <div className="flex items-center gap-4">
                      <Avatar className="h-16 w-16">
                        <AvatarImage src={student?.profiles?.avatar_url ?? ''} />
                        <AvatarFallback className="text-lg">
                          {student?.profiles?.first_name?.[0]}{student?.profiles?.last_name?.[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <CardTitle className="text-xl">{student?.profiles?.first_name} {student?.profiles?.last_name}</CardTitle>
                        <CardDescription>
                          {student?.classes?.name} (Level {student?.classes?.level}) · {student?.sections?.name}
                        </CardDescription>
                        <p className="text-xs text-muted-foreground mt-1">Admission: {student?.admission_number}</p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="p-3 rounded-lg bg-blue-50 text-center">
                        <p className="text-xs text-blue-600 font-medium">Attendance</p>
                        <p className="text-xl font-bold text-blue-700">{attStats.percentage}%</p>
                      </div>
                      <div className="p-3 rounded-lg bg-green-50 text-center">
                        <p className="text-xs text-green-600 font-medium">Results</p>
                        <p className="text-xl font-bold text-green-700">{data?.results?.filter((r: any) => r.student_id === student?.id).length ?? 0}</p>
                      </div>
                      <div className="p-3 rounded-lg bg-purple-50 text-center">
                        <p className="text-xs text-purple-600 font-medium">Status</p>
                        <p className="text-sm font-bold text-purple-700">{student?.is_active ? 'Active' : 'Inactive'}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
