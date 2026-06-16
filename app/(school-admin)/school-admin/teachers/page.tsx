'use client'

import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getTeachers, updateTeacher, deleteTeacher } from '@/lib/actions/school-admin'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import { Search, Plus, Pencil, Trash2, BookOpen } from 'lucide-react'
import Link from 'next/link'

export default function TeachersPage() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [editingTeacher, setEditingTeacher] = useState<string | null>(null)
  const [editForm, setEditForm] = useState({ department: '', qualification: '', specialization: '', salary: 0 })

  const { data: teachers, isLoading } = useQuery({
    queryKey: ['teachers'],
    queryFn: () => getTeachers(),
  })

  const updateMutation = useMutation({
    mutationFn: () => updateTeacher(editingTeacher!, editForm),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teachers'] })
      setEditingTeacher(null)
      toast.success('Teacher updated')
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteTeacher(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teachers'] })
      toast.success('Teacher deactivated')
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const toggleActiveMutation = useMutation({
    mutationFn: ({ id, is_active }: { id: string; is_active: boolean }) => updateTeacher(id, { is_active }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teachers'] })
      toast.success('Status updated')
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const filtered = useMemo(() => {
    if (!teachers) return []
    let result = [...teachers]
    if (search) {
      const q = search.toLowerCase()
      result = result.filter((t: any) =>
        t.profiles?.first_name?.toLowerCase().includes(q) ||
        t.profiles?.last_name?.toLowerCase().includes(q) ||
        t.employee_number?.toLowerCase().includes(q) ||
        t.department?.toLowerCase().includes(q)
      )
    }
    return result
  }, [teachers, search])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Teachers</h1>
          <p className="text-gray-600 mt-1">{filtered.length} teachers</p>
        </div>
        <Button asChild>
          <Link href="/school-admin/teachers/new"><Plus className="h-4 w-4 mr-2" /> Add Teacher</Link>
        </Button>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="relative mb-4 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input placeholder="Search teachers..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>

          {isLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-center py-12 text-muted-foreground">No teachers found</p>
          ) : (
            <div className="space-y-3">
              {filtered.map((teacher) => (
                <div key={teacher.id} className="flex items-center justify-between p-4 rounded-lg border border-gray-200 hover:bg-gray-50">
                  <div className="flex items-center gap-4 min-w-0">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={teacher.profiles?.avatar_url ?? ''} />
                      <AvatarFallback>{teacher.profiles?.first_name?.[0]}{teacher.profiles?.last_name?.[0]}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="font-medium text-gray-900 truncate">{teacher.profiles?.first_name} {teacher.profiles?.last_name}</p>
                      <p className="text-xs text-gray-500">{teacher.department ?? 'No department'} · {teacher.employee_number ?? 'No ID'}</p>
                      {teacher.teacher_subjects?.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {teacher.teacher_subjects.map((ts: any) => (
                            <Badge key={ts.id} variant="secondary" className="text-xs">
                              {ts.subjects?.name}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={teacher.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                      {teacher.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                    <Dialog open={editingTeacher === teacher.id} onOpenChange={(o) => { if (!o) setEditingTeacher(null) }}>
                      <Button variant="ghost" size="icon" onClick={() => {
                        setEditingTeacher(teacher.id)
                        setEditForm({
                          department: teacher.department ?? '',
                          qualification: teacher.qualification ?? '',
                          specialization: teacher.specialization ?? '',
                          salary: Number(teacher.salary) || 0,
                        })
                      }}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Edit Teacher</DialogTitle>
                          <DialogDescription>Update {teacher.profiles?.first_name} {teacher.profiles?.last_name}&apos;s details</DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                          <div>
                            <label className="text-sm font-medium">Department</label>
                            <Input value={editForm.department} onChange={(e) => setEditForm({ ...editForm, department: e.target.value })} />
                          </div>
                          <div>
                            <label className="text-sm font-medium">Qualification</label>
                            <Input value={editForm.qualification} onChange={(e) => setEditForm({ ...editForm, qualification: e.target.value })} />
                          </div>
                          <div>
                            <label className="text-sm font-medium">Specialization</label>
                            <Input value={editForm.specialization} onChange={(e) => setEditForm({ ...editForm, specialization: e.target.value })} />
                          </div>
                          <div>
                            <label className="text-sm font-medium">Salary</label>
                            <Input type="number" value={editForm.salary} onChange={(e) => setEditForm({ ...editForm, salary: parseInt(e.target.value) || 0 })} />
                          </div>
                        </div>
                        <DialogFooter>
                          <Button variant="outline" onClick={() => setEditingTeacher(null)}>Cancel</Button>
                          <Button onClick={() => updateMutation.mutate()}>Update</Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                    <Button variant="ghost" size="icon" onClick={() => toggleActiveMutation.mutate({ id: teacher.id, is_active: !teacher.is_active })}>
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={teacher.is_active ? 'M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636' : 'M15 12a3 3 0 11-6 0 3 3 0 016 0z'} />
                      </svg>
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(teacher.id)}>
                      <Trash2 className="h-4 w-4 text-red-600" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
