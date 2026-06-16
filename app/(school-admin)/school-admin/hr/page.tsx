'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getEmployees, getDepartments } from '@/lib/actions/hr.actions'
import { getPayrollEntries, getPayrollSummary, generatePayroll, processPayroll, markAsPaid, markAllAsPaid } from '@/lib/actions/payroll.actions'
import { getSchool } from '@/lib/actions/school-admin'
import { EmployeeTable } from '@/components/hr/EmployeeTable'
import { EmployeeForm } from '@/components/hr/EmployeeForm'
import { LeaveManagement } from '@/components/hr/LeaveManagement'
import { SalarySlip } from '@/components/hr/SalarySlip'
import { PageHeader } from '@/components/ui/PageHeader'
import { StatCard } from '@/components/ui/StatCard'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toast } from 'sonner'
import { Plus, Briefcase, Users, DollarSign, CalendarCheck, Loader2, Download } from 'lucide-react'

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

export default function HRPage() {
  const queryClient = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [editEmployee, setEditEmployee] = useState<any>(null)
  const [viewEmployee, setViewEmployee] = useState<any>(null)
  const [payrollMonth, setPayrollMonth] = useState(new Date().getMonth() + 1)
  const [payrollYear, setPayrollYear] = useState(new Date().getFullYear())
  const [selectedPayroll, setSelectedPayroll] = useState<any>(null)

  const { data: departments } = useQuery({ queryKey: ['employee-depts'], queryFn: getDepartments })
  const { data: school } = useQuery({ queryKey: ['school'], queryFn: getSchool })

  const { data: payrollEntries, isLoading: payrollLoading } = useQuery({
    queryKey: ['payroll-entries', payrollMonth, payrollYear],
    queryFn: () => getPayrollEntries(payrollMonth, payrollYear),
  })

  const { data: payrollSummary } = useQuery({
    queryKey: ['payroll-summary', payrollMonth, payrollYear],
    queryFn: () => getPayrollSummary(payrollMonth, payrollYear),
  })

  const generateMutation = useMutation({
    mutationFn: () => generatePayroll(payrollMonth, payrollYear),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payroll-entries'] })
      queryClient.invalidateQueries({ queryKey: ['payroll-summary'] })
      toast.success('Payroll generated')
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const processMutation = useMutation({
    mutationFn: () => processPayroll(payrollMonth, payrollYear),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payroll-entries'] })
      queryClient.invalidateQueries({ queryKey: ['payroll-summary'] })
      toast.success('Payroll processed')
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const markPaidMutation = useMutation({
    mutationFn: (id: string) => markAsPaid(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payroll-entries'] })
      queryClient.invalidateQueries({ queryKey: ['payroll-summary'] })
      toast.success('Marked as paid')
    },
  })

  return (
    <div className="space-y-6">
      <PageHeader
        title="HR & Payroll"
        subtitle="Manage employees, leave requests, and payroll processing"
        actions={<Button onClick={() => { setEditEmployee(null); setShowForm(true) }}><Plus className="mr-2 h-4 w-4" /> Add Employee</Button>}
      />

      {payrollSummary && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard icon={Users} label="Total Employees" value={payrollSummary.totalEmployees} variant="primary" />
          <StatCard icon={DollarSign} label="Gross Payroll" value={`KES ${(payrollSummary.totalGross || 0).toLocaleString()}`} />
          <StatCard icon={DollarSign} label="Net Payroll" value={`KES ${(payrollSummary.totalNet || 0).toLocaleString()}`} variant="success" />
          <StatCard icon={CalendarCheck} label="Paid / Pending" value={`${payrollSummary.paidCount}/${payrollSummary.pendingCount}`} variant={payrollSummary.pendingCount > 0 ? 'warning' : 'success'} />
        </div>
      )}

      <Tabs defaultValue="employees">
        <TabsList>
          <TabsTrigger value="employees"><Users className="mr-2 h-4 w-4" /> Employees</TabsTrigger>
          <TabsTrigger value="leave"><CalendarCheck className="mr-2 h-4 w-4" /> Leave</TabsTrigger>
          <TabsTrigger value="payroll"><DollarSign className="mr-2 h-4 w-4" /> Payroll</TabsTrigger>
        </TabsList>

        <TabsContent value="employees">
          <EmployeeTable
            onAdd={() => { setEditEmployee(null); setShowForm(true) }}
            onEdit={(emp) => { setEditEmployee(emp); setShowForm(true) }}
            onView={(emp) => setViewEmployee(emp)}
          />
        </TabsContent>

        <TabsContent value="leave">
          <LeaveManagement />
        </TabsContent>

        <TabsContent value="payroll">
          <Card>
            <CardHeader>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <CardTitle className="text-sm">Payroll Entries</CardTitle>
                <div className="flex items-center gap-2">
                  <Select value={String(payrollMonth)} onValueChange={v => setPayrollMonth(Number(v))}>
                    <SelectTrigger className="w-32 h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {MONTHS.map((m, i) => <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Select value={String(payrollYear)} onValueChange={v => setPayrollYear(Number(v))}>
                    <SelectTrigger className="w-24 h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {[2024, 2025, 2026].map((y: any) => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Button variant="outline" size="sm" onClick={() => generateMutation.mutate()} disabled={generateMutation.isPending}>
                    <Loader2 className={generateMutation.isPending ? 'mr-2 h-4 w-4 animate-spin' : 'mr-2 h-4 w-4'} />
                    Generate
                  </Button>
                  <Button variant="default" size="sm" onClick={() => processMutation.mutate()} disabled={processMutation.isPending}>
                    Process All
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {payrollLoading ? (
                <div className="p-4 space-y-2">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
              ) : !payrollEntries?.length ? (
                <div className="p-8 text-center text-sm text-muted-foreground">
                  No payroll entries for {MONTHS[payrollMonth - 1]} {payrollYear}. Click Generate to create.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="text-left px-4 py-3 font-medium">Employee</th>
                        <th className="text-left px-4 py-3 font-medium">Department</th>
                        <th className="text-right px-4 py-3 font-medium">Basic</th>
                        <th className="text-right px-4 py-3 font-medium">Gross</th>
                        <th className="text-right px-4 py-3 font-medium">Deductions</th>
                        <th className="text-right px-4 py-3 font-medium">Net</th>
                        <th className="text-center px-4 py-3 font-medium">Status</th>
                        <th className="text-center px-4 py-3 font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {payrollEntries.map((entry: any) => {
                        const profile = entry.employees?.profiles
                        return (
                          <tr key={entry.id} className="border-b hover:bg-muted/50">
                            <td className="px-4 py-3 font-medium">{profile?.first_name} {profile?.last_name}</td>
                            <td className="px-4 py-3 text-muted-foreground">{entry.employees?.department ?? '-'}</td>
                            <td className="px-4 py-3 text-right">KES {Number(entry.basic_salary).toLocaleString()}</td>
                            <td className="px-4 py-3 text-right">KES {Number(entry.gross_salary).toLocaleString()}</td>
                            <td className="px-4 py-3 text-right text-red-600">KES {Number(entry.deductions ? Object.values(entry.deductions as Record<string,number>).reduce((a: number,b: number) => a+b, 0) : 0).toLocaleString()}</td>
                            <td className="px-4 py-3 text-right font-semibold">KES {Number(entry.net_salary).toLocaleString()}</td>
                            <td className="px-4 py-3 text-center">
                              <Badge variant={entry.status === 'paid' ? 'default' : entry.status === 'processed' ? 'secondary' : 'outline'}>
                                {entry.status}
                              </Badge>
                            </td>
                            <td className="px-4 py-3 text-center">
                              <div className="flex justify-center gap-1">
                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => setSelectedPayroll(entry)} title="View Slip">
                                  <Download className="h-4 w-4" />
                                </Button>
                                {entry.status !== 'paid' && (
                                  <Button variant="ghost" size="sm" className="h-8 px-2 text-xs" onClick={() => markPaidMutation.mutate(entry.id)}>
                                    Pay
                                  </Button>
                                )}
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          {payrollSummary && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <Card><CardContent className="pt-4 text-center"><p className="text-xs text-muted-foreground">Total Employees</p><p className="text-xl font-bold">{payrollSummary.totalEmployees}</p></CardContent></Card>
              <Card><CardContent className="pt-4 text-center"><p className="text-xs text-muted-foreground">Total Gross</p><p className="text-xl font-bold">KES {payrollSummary.totalGross.toLocaleString()}</p></CardContent></Card>
              <Card><CardContent className="pt-4 text-center"><p className="text-xs text-muted-foreground">Total Deductions</p><p className="text-xl font-bold text-red-600">KES {payrollSummary.totalDeductions.toLocaleString()}</p></CardContent></Card>
              <Card><CardContent className="pt-4 text-center"><p className="text-xs text-muted-foreground">Total Net</p><p className="text-xl font-bold text-green-600">KES {payrollSummary.totalNet.toLocaleString()}</p></CardContent></Card>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {showForm && (
        <EmployeeForm
          open={showForm}
          onOpenChange={setShowForm}
          initialData={editEmployee}
        />
      )}

      {selectedPayroll && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setSelectedPayroll(null)}>
          <div className="max-h-[90vh] overflow-y-auto rounded-xl bg-white p-6 shadow-2xl w-full max-w-3xl mx-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">Salary Slip</h2>
              <Button variant="ghost" size="sm" onClick={() => setSelectedPayroll(null)}>Close</Button>
            </div>
            <SalarySlip entry={selectedPayroll} school={school} />
          </div>
        </div>
      )}
    </div>
  )
}
