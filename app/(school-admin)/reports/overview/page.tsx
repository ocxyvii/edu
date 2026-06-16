'use client'

import { useQuery } from '@tanstack/react-query'
import { getSchoolOverviewReport } from '@/lib/actions/reports.actions'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Users, GraduationCap, CalendarCheck, DollarSign, Clock, BookOpen } from 'lucide-react'

export default function SchoolOverviewPage() {
  const { data: overview, isLoading } = useQuery({
    queryKey: ['school-overview-report'],
    queryFn: () => getSchoolOverviewReport(),
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">School Overview</h1>
        <p className="text-muted-foreground mt-1">High-level KPIs across all departments</p>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {[...Array(6)].map((_: any, i: any) => <Skeleton key={i} className="h-28 rounded-xl" />)}
        </div>
      ) : overview ? (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6 text-center">
              <Users className="h-8 w-8 text-blue-600 mx-auto mb-2" />
              <p className="text-3xl font-bold">{overview.kpis.totalStudents}</p>
              <p className="text-sm text-muted-foreground">Active Students</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 text-center">
              <GraduationCap className="h-8 w-8 text-emerald-600 mx-auto mb-2" />
              <p className="text-3xl font-bold">{overview.kpis.totalTeachers}</p>
              <p className="text-sm text-muted-foreground">Teachers</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 text-center">
              <Clock className="h-8 w-8 text-purple-600 mx-auto mb-2" />
              <p className="text-3xl font-bold">{overview.kpis.totalClasses}</p>
              <p className="text-sm text-muted-foreground">Classes</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 text-center">
              <CalendarCheck className="h-8 w-8 text-amber-600 mx-auto mb-2" />
              <p className="text-3xl font-bold">{overview.kpis.attendanceRate}%</p>
              <p className="text-sm text-muted-foreground">Attendance Rate (30d)</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 text-center">
              <DollarSign className="h-8 w-8 text-green-600 mx-auto mb-2" />
              <p className="text-3xl font-bold">{overview.kpis.collectionRate}%</p>
              <p className="text-sm text-muted-foreground">Fee Collection Rate</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 text-center">
              <BookOpen className="h-8 w-8 text-rose-600 mx-auto mb-2" />
              <p className="text-3xl font-bold">{overview.kpis.totalStudents}</p>
              <p className="text-sm text-muted-foreground">Student-to-Teacher Ratio</p>
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="text-center py-12 text-muted-foreground">
          Unable to load overview data.
        </div>
      )}
    </div>
  )
}
