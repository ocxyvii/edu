'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getSchoolOverviewReport } from '@/lib/actions/reports.actions'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  BarChart3, CalendarCheck, TrendingUp, DollarSign, Users, GraduationCap,
  ArrowRight, Download, FileBarChart, Clock,
} from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'

const reportCards = [
  {
    title: 'Attendance Report',
    description: 'Daily attendance rates, per-class breakdown, at-risk students below 75%. Export CSV & PDF.',
    icon: CalendarCheck,
    color: 'text-blue-600',
    bg: 'bg-blue-50',
    href: '/school-admin/reports/attendance',
  },
  {
    title: 'Academic Performance',
    description: 'Exam results, grade distribution, subject averages, student rankings with full marks table.',
    icon: TrendingUp,
    color: 'text-emerald-600',
    bg: 'bg-emerald-50',
    href: '/school-admin/reports/academic',
  },
  {
    title: 'Fee Collection',
    description: 'Monthly collection trends, fee type breakdown, top defaulters with outstanding amounts.',
    icon: DollarSign,
    color: 'text-amber-600',
    bg: 'bg-amber-50',
    href: '/school-admin/reports/finance',
  },
  {
    title: 'School Overview',
    description: 'All KPIs: total students, teachers, classes, attendance rate, fee collection rate.',
    icon: BarChart3,
    color: 'text-purple-600',
    bg: 'bg-purple-50',
    href: '/school-admin/reports/overview',
  },
]

const quickFilters = [
  { label: 'This Term', value: 'this_term' },
  { label: 'Last Term', value: 'last_term' },
  { label: 'This Year', value: 'this_year' },
  { label: 'Last Year', value: 'last_year' },
]

export default function ReportsHubPage() {
  const [selectedFilter, setSelectedFilter] = useState('this_term')

  const { data: overview, isLoading } = useQuery({
    queryKey: ['reports-hub-overview'],
    queryFn: () => getSchoolOverviewReport(),
  })

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Reports & Analytics</h1>
          <p className="text-muted-foreground mt-1">Generate and export comprehensive school reports</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Quick filter:</span>
          <Select value={selectedFilter} onValueChange={setSelectedFilter}>
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {quickFilters.map(f => (
                <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* KPI Strip */}
      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
        </div>
      ) : overview ? (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
          <Card>
            <CardContent className="pt-6 text-center">
              <Users className="h-6 w-6 text-blue-600 mx-auto mb-2" />
              <p className="text-2xl font-bold">{overview.kpis.totalStudents}</p>
              <p className="text-xs text-muted-foreground">Active Students</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 text-center">
              <GraduationCap className="h-6 w-6 text-emerald-600 mx-auto mb-2" />
              <p className="text-2xl font-bold">{overview.kpis.totalTeachers}</p>
              <p className="text-xs text-muted-foreground">Teachers</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 text-center">
              <CalendarCheck className="h-6 w-6 text-purple-600 mx-auto mb-2" />
              <p className="text-2xl font-bold">{overview.kpis.attendanceRate}%</p>
              <p className="text-xs text-muted-foreground">Attendance Rate</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 text-center">
              <DollarSign className="h-6 w-6 text-amber-600 mx-auto mb-2" />
              <p className="text-2xl font-bold">{overview.kpis.collectionRate}%</p>
              <p className="text-xs text-muted-foreground">Fee Collection</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 text-center">
              <Clock className="h-6 w-6 text-rose-600 mx-auto mb-2" />
              <p className="text-2xl font-bold">{overview.kpis.totalClasses}</p>
              <p className="text-xs text-muted-foreground">Classes</p>
            </CardContent>
          </Card>
        </div>
      ) : null}

      {/* Report Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {reportCards.map(card => {
          const Icon = card.icon
          return (
            <Link key={card.href} href={card.href}>
              <Card className="group cursor-pointer hover:shadow-md transition-all duration-200 h-full">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className={cn('p-2.5 rounded-lg', card.bg)}>
                      <Icon className={cn('h-6 w-6', card.color)} />
                    </div>
                    <ArrowRight className="h-5 w-5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <CardTitle className="text-lg mt-3">{card.title}</CardTitle>
                  <CardDescription>{card.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-3 text-sm text-muted-foreground">
                    <FileBarChart className="h-4 w-4" />
                    <span>Interactive charts & export</span>
                    <Download className="h-3 w-3 ml-auto" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
