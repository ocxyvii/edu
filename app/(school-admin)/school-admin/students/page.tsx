'use client'

import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getStudents, getClasses, updateStudent, deleteStudent } from '@/lib/actions/school-admin'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import { Search, Plus, Eye, Download, Upload, ArrowUpDown } from 'lucide-react'
import Link from 'next/link'

const statusColors: Record<string, string> = {
  enrolled: 'bg-green-100 text-green-800',
  graduated: 'bg-blue-100 text-blue-800',
  transferred: 'bg-yellow-100 text-yellow-800',
  suspended: 'bg-red-100 text-red-800',
  withdrawn: 'bg-gray-100 text-gray-800',
}

export default function StudentsPage() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [filterClass, setFilterClass] = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterGender, setFilterGender] = useState('all')
  const [sortField, setSortField] = useState<'name' | 'admission_number' | 'created_at'>('created_at')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const [editingStudent, setEditingStudent] = useState<string | null>(null)
  const [transferForm, setTransferForm] = useState({ class_id: '', section_id: '' })
  const [page, setPage] = useState(0)
  const pageSize = 20

  const { data: students, isLoading } = useQuery({
    queryKey: ['students'],
    queryFn: () => getStudents(),
  })

  const { data: classes } = useQuery({
    queryKey: ['classes'],
    queryFn: () => getClasses(),
  })

  const updateMutation = useMutation({
    mutationFn: () => updateStudent(editingStudent!, transferForm),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students'] })
      setEditingStudent(null)
      toast.success('Student updated')
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteStudent(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students'] })
      toast.success('Student deactivated')
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const filtered = useMemo(() => {
    if (!students) return []
    let result = [...students]
    if (search) {
      const q = search.toLowerCase()
      result = result.filter((s: any) =>
        s.profiles?.first_name?.toLowerCase().includes(q) ||
        s.profiles?.last_name?.toLowerCase().includes(q) ||
        s.admission_number?.toLowerCase().includes(q)
      )
    }
    if (filterClass !== 'all') result = result.filter((s: any) => s.class_id === filterClass)
    if (filterStatus !== 'all') result = result.filter((s: any) => s.status === filterStatus)
    if (filterGender !== 'all') result = result.filter((s: any) => s.profiles?.gender === filterGender)
    result.sort((a, b) => {
      const aVal = sortField === 'name' ? `${a.profiles?.first_name} ${a.profiles?.last_name}` : a[sortField]
      const bVal = sortField === 'name' ? `${b.profiles?.first_name} ${b.profiles?.last_name}` : b[sortField]
      return sortDir === 'asc' ? String(aVal).localeCompare(String(bVal)) : String(bVal).localeCompare(String(aVal))
    })
    return result
  }, [students, search, filterClass, filterStatus, filterGender, sortField, sortDir])

  const paginated = filtered.slice(page * pageSize, (page + 1) * pageSize)
  const totalPages = Math.ceil(filtered.length / pageSize)

  function exportCSV() {
    const headers = ['Admission No', 'First Name', 'Last Name', 'Gender', 'Class', 'Section', 'Status']
    const rows = filtered.map((s: any) => [
      s.admission_number,
      s.profiles?.first_name ?? '',
      s.profiles?.last_name ?? '',
      s.profiles?.gender ?? '',
      s.classes?.name ?? '',
      s.sections?.name ?? '',
      s.status,
    ])
    const csv = [headers, ...rows].map((r: any) => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = 'students.csv'; a.click()
    URL.revokeObjectURL(url)
  }

  const toggleSort = (field: typeof sortField) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortField(field); setSortDir('asc') }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Students</h1>
          <p className="text-gray-600 mt-1">{filtered.length} students enrolled</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportCSV}><Download className="h-4 w-4 mr-2" /> Export</Button>
          <Button variant="outline" onClick={() => document.getElementById('csv-upload')?.click()}>
            <Upload className="h-4 w-4 mr-2" /> Import CSV
          </Button>
          <Button asChild>
            <Link href="/school-admin/students/new"><Plus className="h-4 w-4 mr-2" /> Add Student</Link>
          </Button>
          <input id="csv-upload" type="file" accept=".csv" className="hidden" onChange={(e) => {
            toast.info('CSV import coming soon')
            e.target.value = ''
          }} />
        </div>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-3 mb-4">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input placeholder="Search by name or admission no..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
            </div>
            <Select value={filterClass} onValueChange={setFilterClass}>
              <SelectTrigger className="w-[150px]"><SelectValue placeholder="Class" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Classes</SelectItem>
                {classes?.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[140px]"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="enrolled">Enrolled</SelectItem>
                <SelectItem value="graduated">Graduated</SelectItem>
                <SelectItem value="transferred">Transferred</SelectItem>
                <SelectItem value="suspended">Suspended</SelectItem>
                <SelectItem value="withdrawn">Withdrawn</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterGender} onValueChange={setFilterGender}>
              <SelectTrigger className="w-[130px]"><SelectValue placeholder="Gender" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="male">Male</SelectItem>
                <SelectItem value="female">Female</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {isLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
            </div>
          ) : paginated.length === 0 ? (
            <p className="text-center py-12 text-muted-foreground">No students found</p>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-2 text-xs font-medium text-gray-500 uppercase">Student</th>
                      <th className="text-left py-3 px-2 text-xs font-medium text-gray-500 uppercase cursor-pointer" onClick={() => toggleSort('admission_number')}>
                        <span className="inline-flex items-center gap-1">Admission No <ArrowUpDown className="h-3 w-3" /></span>
                      </th>
                      <th className="text-left py-3 px-2 text-xs font-medium text-gray-500 uppercase">Class</th>
                      <th className="text-left py-3 px-2 text-xs font-medium text-gray-500 uppercase">Gender</th>
                      <th className="text-left py-3 px-2 text-xs font-medium text-gray-500 uppercase">Status</th>
                      <th className="text-right py-3 px-2 text-xs font-medium text-gray-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginated.map((student) => (
                      <tr key={student.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-3 px-2">
                          <Link href={`/school-admin/students/${student.id}`} className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={student.profiles?.avatar_url ?? ''} />
                              <AvatarFallback className="text-xs">
                                {student.profiles?.first_name?.[0]}{student.profiles?.last_name?.[0]}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-sm font-medium text-gray-900">
                              {student.profiles?.first_name} {student.profiles?.last_name}
                            </span>
                          </Link>
                        </td>
                        <td className="py-3 px-2 text-sm text-gray-600">{student.admission_number}</td>
                        <td className="py-3 px-2 text-sm text-gray-600">{student.classes?.name ?? '-'}{student.sections?.name ? ` (${student.sections.name})` : ''}</td>
                        <td className="py-3 px-2 text-sm text-gray-600 capitalize">{student.profiles?.gender ?? '-'}</td>
                        <td className="py-3 px-2">
                          <Badge className={`text-xs ${statusColors[student.status] ?? ''}`}>{student.status}</Badge>
                        </td>
                        <td className="py-3 px-2 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button variant="ghost" size="icon" asChild>
                              <Link href={`/school-admin/students/${student.id}`}><Eye className="h-4 w-4" /></Link>
                            </Button>
                            <Dialog open={editingStudent === student.id} onOpenChange={(o) => { if (!o) setEditingStudent(null) }}>
                              <Button variant="ghost" size="icon" onClick={() => {
                                setEditingStudent(student.id)
                                setTransferForm({ class_id: student.class_id ?? '', section_id: '' })
                              }}>
                                <ArrowUpDown className="h-4 w-4" />
                              </Button>
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle>Transfer Class</DialogTitle>
                                  <DialogDescription>Change class/section for {student.profiles?.first_name} {student.profiles?.last_name}</DialogDescription>
                                </DialogHeader>
                                <div className="space-y-4 py-4">
                                  <div>
                                    <Label>New Class</Label>
                                    <Select value={transferForm.class_id} onValueChange={(v) => setTransferForm({ ...transferForm, class_id: v })}>
                                      <SelectTrigger><SelectValue placeholder="Select class" /></SelectTrigger>
                                      <SelectContent>
                                        {classes?.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                                      </SelectContent>
                                    </Select>
                                  </div>
                                </div>
                                <DialogFooter>
                                  <Button variant="outline" onClick={() => setEditingStudent(null)}>Cancel</Button>
                                  <Button onClick={() => updateMutation.mutate()}>Transfer</Button>
                                </DialogFooter>
                              </DialogContent>
                            </Dialog>
                            <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(student.id)}>
                              <svg className="h-4 w-4 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {totalPages > 1 && (
                <div className="flex items-center justify-between pt-4">
                  <p className="text-sm text-gray-500">Page {page + 1} of {totalPages}</p>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>Previous</Button>
                    <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>Next</Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
