'use client'

import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getEmployees, getDepartments } from '@/lib/actions/hr.actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Search, Eye, Pencil, XCircle, Plus } from 'lucide-react'

const CONTRACT_COLORS: Record<string, string> = {
  permanent: 'bg-blue-100 text-blue-800',
  contract: 'bg-amber-100 text-amber-800',
  part_time: 'bg-purple-100 text-purple-800',
  intern: 'bg-green-100 text-green-800',
}

interface EmployeeTableProps {
  onAdd: () => void
  onEdit: (employee: any) => void
  onView: (employee: any) => void
}

export function EmployeeTable({ onAdd, onEdit, onView }: EmployeeTableProps) {
  const [search, setSearch] = useState('')
  const [departmentFilter, setDepartmentFilter] = useState('')
  const [contractFilter, setContractFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  const { data: employees, isLoading } = useQuery({
    queryKey: ['employees', departmentFilter, contractFilter, statusFilter, search],
    queryFn: () => getEmployees({
      department: departmentFilter || undefined,
      contract_type: contractFilter || undefined,
      status: statusFilter || undefined,
      search: search || undefined,
    }),
  })

  const { data: departments } = useQuery({
    queryKey: ['employee-departments'],
    queryFn: getDepartments,
  })

  if (isLoading) return <div className="space-y-2">{[...Array(5)].map((_: any, i: any) => <Skeleton key={i} className="h-16 w-full" />)}</div>

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name, employee #, department..." className="pl-9" />
        </div>
        <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
          <SelectTrigger className="w-[150px]"><SelectValue placeholder="Department" /></SelectTrigger>
          <SelectContent>
            <SelectItem value=" ">All Depts</SelectItem>
            {departments?.map((d: any) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={contractFilter} onValueChange={setContractFilter}>
          <SelectTrigger className="w-[130px]"><SelectValue placeholder="Contract" /></SelectTrigger>
          <SelectContent>
            <SelectItem value=" ">All Types</SelectItem>
            <SelectItem value="permanent">Permanent</SelectItem>
            <SelectItem value="contract">Contract</SelectItem>
            <SelectItem value="part_time">Part Time</SelectItem>
            <SelectItem value="intern">Intern</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[120px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value=" ">All</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
        <Button onClick={onAdd} size="sm"><Plus className="h-4 w-4 mr-2" /> Add Employee</Button>
      </div>

      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b">
              <th className="text-left py-3 px-4 font-medium">Employee</th>
              <th className="text-left py-3 px-4 font-medium">Department</th>
              <th className="text-left py-3 px-4 font-medium">Contract</th>
              <th className="text-right py-3 px-4 font-medium">Salary</th>
              <th className="text-left py-3 px-4 font-medium">Joined</th>
              <th className="text-center py-3 px-4 font-medium">Status</th>
              <th className="text-right py-3 px-4 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {employees?.length === 0 ? (
              <tr><td colSpan={7} className="py-12 text-center text-muted-foreground">No employees found</td></tr>
            ) : (
              employees?.map((emp: any) => (
                <tr key={emp.id} className="border-t hover:bg-gray-50">
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="text-xs">
                          {(emp.profiles?.first_name?.[0] ?? '') + (emp.profiles?.last_name?.[0] ?? '')}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{emp.profiles?.first_name} {emp.profiles?.last_name}</p>
                        <p className="text-xs text-muted-foreground">{emp.employee_number || 'No #'} · {emp.position || '—'}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-4">{emp.department || '—'}</td>
                  <td className="py-3 px-4">
                    <Badge className={`text-xs ${CONTRACT_COLORS[emp.contract_type] ?? ''}`}>{emp.contract_type}</Badge>
                  </td>
                  <td className="py-3 px-4 text-right font-medium">KES {Number(emp.basic_salary).toLocaleString()}</td>
                  <td className="py-3 px-4 text-muted-foreground">{emp.joining_date || '—'}</td>
                  <td className="py-3 px-4 text-center">
                    <Badge variant={emp.is_active ? 'default' : 'secondary'} className="text-xs">
                      {emp.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onView(emp)}><Eye className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onEdit(emp)}><Pencil className="h-4 w-4" /></Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
