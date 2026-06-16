'use client'

import { useQuery } from '@tanstack/react-query'
import { useParams } from 'next/navigation'
import { getStudent, getClasses, getFeeInvoices, getSubjects } from '@/lib/actions/school-admin'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Calendar, Mail, Phone, BookOpen } from 'lucide-react'
import Link from 'next/link'

const statusColors: Record<string, string> = {
  enrolled: 'bg-green-100 text-green-800',
  graduated: 'bg-blue-100 text-blue-800',
  transferred: 'bg-yellow-100 text-yellow-800',
  suspended: 'bg-red-100 text-red-800',
  withdrawn: 'bg-gray-100 text-gray-800',
}

export default function StudentDetailPage() {
  const params = useParams()
  const id = params.id as string

  const { data: student, isLoading } = useQuery({
    queryKey: ['student', id],
    queryFn: () => getStudent(id),
  })

  const { data: invoices } = useQuery({
    queryKey: ['student-invoices', id],
    queryFn: () => getFeeInvoices(),
    enabled: !!student,
  })

  const profile = student?.profiles

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-48 w-full rounded-lg" />
        <Skeleton className="h-64 w-full rounded-lg" />
      </div>
    )
  }

  if (!student) {
    return <p className="text-center py-12 text-muted-foreground">Student not found</p>
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row items-start gap-6">
            <Avatar className="h-20 w-20">
              <AvatarImage src={profile?.avatar_url ?? ''} />
              <AvatarFallback className="text-xl">{profile?.first_name?.[0]}{profile?.last_name?.[0]}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl font-bold text-gray-900">{profile?.first_name} {profile?.last_name}</h1>
                <Badge className={statusColors[student.status]}>{student.status}</Badge>
              </div>
              <p className="text-gray-500">Admission: {student.admission_number}</p>
              <div className="flex flex-wrap gap-4 mt-3 text-sm text-gray-600">
                {profile?.email && <span className="flex items-center gap-1"><Mail className="h-4 w-4" /> {profile.email}</span>}
                {profile?.phone && <span className="flex items-center gap-1"><Phone className="h-4 w-4" /> {profile.phone}</span>}
                <span className="flex items-center gap-1"><Calendar className="h-4 w-4" /> Enrolled {student.enrollment_date}</span>
                <span className="flex items-center gap-1"><BookOpen className="h-4 w-4" /> {student.classes?.name ?? '-'}{student.sections?.name ? ` (${student.sections.name})` : ''}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="profile">
        <TabsList>
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="attendance">Attendance</TabsTrigger>
          <TabsTrigger value="results">Results</TabsTrigger>
          <TabsTrigger value="fees">Fees</TabsTrigger>
          <TabsTrigger value="assignments">Assignments</TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader><CardTitle>Personal Details</CardTitle></CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex justify-between"><span className="text-gray-500">Gender</span><span className="capitalize">{profile?.gender ?? '-'}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Date of Birth</span><span>{profile?.date_of_birth ?? '-'}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Address</span><span>{profile?.address ?? '-'}</span></div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>Academic Details</CardTitle></CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex justify-between"><span className="text-gray-500">Class</span><span>{student.classes?.name ?? '-'}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Section</span><span>{student.sections?.name ?? '-'}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Admission No</span><span>{student.admission_number}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Enrollment Date</span><span>{student.enrollment_date}</span></div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="fees" className="mt-6">
          <Card>
            <CardHeader><CardTitle>Fee Invoices</CardTitle></CardHeader>
            <CardContent>
              {invoices?.filter((i: any) => i.student_id === id).length === 0 ? (
                <p className="text-muted-foreground text-sm py-8 text-center">No invoices for this student</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-2 px-2 text-xs font-medium text-gray-500 uppercase">Invoice</th>
                        <th className="text-left py-2 px-2 text-xs font-medium text-gray-500 uppercase">Amount</th>
                        <th className="text-left py-2 px-2 text-xs font-medium text-gray-500 uppercase">Paid</th>
                        <th className="text-left py-2 px-2 text-xs font-medium text-gray-500 uppercase">Balance</th>
                        <th className="text-left py-2 px-2 text-xs font-medium text-gray-500 uppercase">Status</th>
                        <th className="text-left py-2 px-2 text-xs font-medium text-gray-500 uppercase">Due</th>
                      </tr>
                    </thead>
                    <tbody>
                      {invoices?.filter((i: any) => i.student_id === id).map((inv: any) => (
                        <tr key={inv.id} className="border-b border-gray-100">
                          <td className="py-2 px-2">{inv.invoice_number}</td>
                          <td className="py-2 px-2">KES {Number(inv.amount).toLocaleString()}</td>
                          <td className="py-2 px-2">KES {Number(inv.paid_amount).toLocaleString()}</td>
                          <td className="py-2 px-2">KES {Number(inv.balance).toLocaleString()}</td>
                          <td className="py-2 px-2">
                            <Badge className={`text-xs ${
                              inv.status === 'paid' ? 'bg-green-100 text-green-800' :
                              inv.status === 'partial' ? 'bg-yellow-100 text-yellow-800' :
                              inv.status === 'overdue' ? 'bg-red-100 text-red-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>{inv.status}</Badge>
                          </td>
                          <td className="py-2 px-2">{inv.due_date ?? '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="attendance" className="mt-6">
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              Attendance data coming soon
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="results" className="mt-6">
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              Results data coming soon
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="assignments" className="mt-6">
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              Assignments data coming soon
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
