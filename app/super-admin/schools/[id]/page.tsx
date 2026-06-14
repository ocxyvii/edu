'use client'

import { useParams, useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import {
  Building2,
  MapPin,
  Phone,
  Mail,
  Calendar,
  ArrowLeft,
  Users,
  GraduationCap,
  BookOpen,
  Globe,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { formatDate, formatDateTime } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

const supabase = createClient()

async function fetchSchoolDetail(id: string) {
  const [schoolRes, studentsRes, teachersRes, auditRes] = await Promise.all([
    supabase.from('schools').select('*').eq('id', id).single(),
    supabase
      .from('students')
      .select('id', { count: 'exact', head: true })
      .eq('school_id', id),
    supabase
      .from('teachers')
      .select('id', { count: 'exact', head: true })
      .eq('school_id', id),
    supabase
      .from('audit_logs')
      .select('*')
      .eq('school_id', id)
      .order('created_at', { ascending: false })
      .limit(10),
  ])

  if (schoolRes.error) throw schoolRes.error

  return {
    school: schoolRes.data as any,
    studentCount: studentsRes.count ?? 0,
    teacherCount: teachersRes.count ?? 0,
    auditLogs: (auditRes.data ?? []) as any[],
  }
}

export default function SchoolDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string

  const { data, isLoading } = useQuery({
    queryKey: ['school-detail', id],
    queryFn: () => fetchSchoolDetail(id),
    enabled: !!id,
  })

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-4 md:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
        <Skeleton className="h-64" />
      </div>
    )
  }

  if (!data) {
    return (
      <div className="py-12 text-center text-gray-500">
        School not found
      </div>
    )
  }

  const { school, studentCount, teacherCount, auditLogs } = data

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="rounded-lg bg-edu-blue-600 p-2">
          <Building2 className="h-6 w-6 text-white" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-gray-900">
              {school.name}
            </h1>
            <Badge variant={school.is_active ? 'default' : 'destructive'}>
              {school.is_active ? 'Active' : 'Inactive'}
            </Badge>
          </div>
          <p className="text-sm text-gray-500">
            <Badge variant="secondary" className="capitalize">
              {school.subscription_plan}
            </Badge>{' '}
            plan · Created {formatDate(school.created_at)}
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Students
            </CardTitle>
            <Users className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{studentCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Teachers
            </CardTitle>
            <GraduationCap className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{teacherCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Plan
            </CardTitle>
            <BookOpen className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold capitalize">
              {school.subscription_plan}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">School Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex items-start gap-3">
              <MapPin className="mt-0.5 h-5 w-5 text-gray-400" />
              <div>
                <p className="text-sm font-medium text-gray-900">Address</p>
                <p className="text-sm text-gray-500">
                  {school.address || '—'}
                  {school.city ? `, ${school.city}` : ''}
                  {school.state ? `, ${school.state}` : ''}
                  {school.country ? `, ${school.country}` : ''}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Phone className="mt-0.5 h-5 w-5 text-gray-400" />
              <div>
                <p className="text-sm font-medium text-gray-900">Phone</p>
                <p className="text-sm text-gray-500">
                  {school.phone || '—'}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Mail className="mt-0.5 h-5 w-5 text-gray-400" />
              <div>
                <p className="text-sm font-medium text-gray-900">Email</p>
                <p className="text-sm text-gray-500">
                  {school.email || '—'}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Calendar className="mt-0.5 h-5 w-5 text-gray-400" />
              <div>
                <p className="text-sm font-medium text-gray-900">Created</p>
                <p className="text-sm text-gray-500">
                  {formatDateTime(school.created_at)}
                </p>
              </div>
            </div>
            {school.website && (
              <div className="flex items-start gap-3">
                <Globe className="mt-0.5 h-5 w-5 text-gray-400" />
                <div>
                  <p className="text-sm font-medium text-gray-900">Website</p>
                  <p className="text-sm text-gray-500">{school.website}</p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Audit History</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Action</TableHead>
                <TableHead>Table</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {auditLogs.length ? (
                auditLogs.map((log: any) => (
                  <TableRow key={log.id}>
                    <TableCell>
                      <Badge
                        variant={
                          log.action === 'INSERT'
                            ? 'default'
                            : log.action === 'UPDATE'
                              ? 'secondary'
                              : 'destructive'
                        }
                      >
                        {log.action}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-gray-600">
                      {log.table_name}
                    </TableCell>
                    <TableCell className="text-gray-500">
                      {formatDateTime(log.created_at)}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={3}
                    className="py-8 text-center text-gray-500"
                  >
                    No audit history
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
