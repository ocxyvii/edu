'use client'

import { useQuery } from '@tanstack/react-query'
import { getParentDashboard } from '@/lib/actions/parent'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { TrendingUp } from 'lucide-react'

export default function ParentResultsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['parent-dashboard'],
    queryFn: () => getParentDashboard(),
  })

  const children = data?.children ?? []
  const allResults = data?.results ?? []

  if (isLoading) {
    return <div className="space-y-6">{[...Array(3)].map((_: any, i: any) => <Skeleton key={i} className="h-48 w-full" />)}</div>
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Results</h1>
        <p className="text-gray-600 mt-1">Academic results for your children</p>
      </div>

      {children.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">No children linked to your account.</CardContent></Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {children.map((item: any) => {
            const student = (item as any).students
            const childResults = allResults.filter((r: any) => r.student_id === student?.id) ?? []
            const avg = childResults.length > 0
              ? childResults.reduce((s: any, r: any) => s + Number(r.marks_obtained), 0) / childResults.length
              : 0

            return (
              <Card key={student?.id}>
                <CardHeader className="p-4 sm:p-6">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <Avatar className="h-8 w-8 sm:h-10 sm:w-10">
                      <AvatarImage src={student?.profiles?.avatar_url ?? ''} />
                      <AvatarFallback className="text-xs sm:text-sm">{student?.profiles?.first_name?.[0]}{student?.profiles?.last_name?.[0]}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <CardTitle className="text-sm sm:text-lg">{student?.profiles?.first_name} {student?.profiles?.last_name}</CardTitle>
                      <CardDescription className="text-xs">Average: {Math.round(avg * 10) / 10}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0">
                  {childResults.length === 0 ? (
                    <p className="text-xs sm:text-sm text-muted-foreground text-center py-4">No results published yet.</p>
                  ) : (
                    <div className="space-y-1.5 sm:space-y-2">
                      {childResults.map((r: any) => (
                        <div key={r.id} className="flex items-center justify-between p-2 sm:p-3 rounded-lg border border-gray-100">
                          <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 flex-1">
                            <TrendingUp className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground shrink-0" />
                            <div className="min-w-0">
                              <p className="text-xs sm:text-sm font-medium truncate">{r.subjects?.name}</p>
                              <p className="text-[10px] sm:text-xs text-muted-foreground truncate">{r.exams?.name}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-1 sm:gap-2 shrink-0 ml-2">
                            <span className={`text-xs sm:text-sm font-semibold ${Number(r.marks_obtained) >= 80 ? 'text-green-600' : Number(r.marks_obtained) >= 50 ? 'text-amber-600' : 'text-red-600'}`}>
                              {r.marks_obtained}
                            </span>
                            <Badge className="text-[10px] sm:text-xs">{r.grade || '—'}</Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
