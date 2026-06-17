'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getSubjects, createSubject, updateSubject, deleteSubject, getClasses } from '@/lib/actions/school-admin'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import { Plus, Pencil, Trash2, BookOpen } from 'lucide-react'

export default function SubjectsPage() {
  const queryClient = useQueryClient()
  const [showDialog, setShowDialog] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState({ name: '', code: '', class_id: '', credit_hours: 1, description: '' })

  const { data: subjects, isLoading } = useQuery({
    queryKey: ['subjects'],
    queryFn: () => getSubjects(),
  })

  const { data: classes } = useQuery({
    queryKey: ['classes'],
    queryFn: () => getClasses(),
  })

  const createMutation = useMutation({
    mutationFn: () => createSubject({ name: form.name, code: form.code || undefined, class_id: form.class_id, description: form.description || undefined, credit_hours: form.credit_hours }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subjects'] })
      resetAndClose()
      toast.success('Subject created')
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const updateMutation = useMutation({
    mutationFn: () => updateSubject(editingId!, { name: form.name, code: form.code || undefined, class_id: form.class_id, credit_hours: form.credit_hours, description: form.description || undefined }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subjects'] })
      resetAndClose()
      toast.success('Subject updated')
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteSubject(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subjects'] })
      toast.success('Subject deleted')
    },
    onError: (err: Error) => toast.error(err.message),
  })

  function resetAndClose() {
    setShowDialog(false)
    setEditingId(null)
    setForm({ name: '', code: '', class_id: '', credit_hours: 1, description: '' })
  }

  function openEdit(subject: any) {
    setForm({
      name: subject.name,
      code: subject.code ?? '',
      class_id: subject.class_id ?? '',
      credit_hours: subject.credit_hours ?? 1,
      description: subject.description ?? '',
    })
    setEditingId(subject.id)
    setShowDialog(true)
  }

  const grouped = subjects?.reduce((acc: any, s: any) => {
    const key = s.classes?.name ?? 'Uncategorized'
    if (!acc[key]) acc[key] = []
    acc[key].push(s)
    return acc
  }, {} as Record<string, any[]>)

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Subjects</h1>
          <p className="text-gray-600 mt-1">Manage subjects grouped by class</p>
        </div>
        <Button onClick={() => { setForm({ name: '', code: '', class_id: '', credit_hours: 1, description: '' }); setEditingId(null); setShowDialog(true) }}>
          <Plus className="h-4 w-4 mr-2" /> Add Subject
        </Button>
      </div>

      {isLoading ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_: any, i: any) => <Skeleton key={i} className="h-40 w-full" />)}
        </div>
      ) : subjects?.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No subjects yet. Click &quot;Add Subject&quot; to get started.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {Object.entries(grouped ?? {}).map(([className, classSubjects]: any) => (
            <Card key={className}>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <BookOpen className="h-5 w-5 text-edu-blue-600" />
                  {className}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {classSubjects.map((subject: any) => (
                  <div key={subject.id} className="flex items-center justify-between p-3 rounded-lg bg-gray-50">
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">{subject.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {subject.code && <span className="mr-2">{subject.code}</span>}
                        <span>{subject.credit_hours ?? 1} credit{subject.credit_hours !== 1 ? 's' : ''}</span>
                      </p>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(subject)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => {
                        if (confirm(`Delete "${subject.name}"?`)) deleteMutation.mutate(subject.id)
                      }}>
                        <Trash2 className="h-3.5 w-3.5 text-red-600" />
                      </Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={showDialog} onOpenChange={(o) => { if (!o) resetAndClose() }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit Subject' : 'Add Subject'}</DialogTitle>
            <DialogDescription>Enter subject details</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Subject Name *</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g., Mathematics" />
            </div>
            <div>
              <Label>Subject Code (optional)</Label>
              <Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="e.g., MATH101" />
            </div>
            <div>
              <Label>Class *</Label>
              <Select value={form.class_id} onValueChange={(v) => setForm({ ...form, class_id: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select class" />
                </SelectTrigger>
                <SelectContent>
                  {classes?.map((c: any) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Credit Hours</Label>
              <Input type="number" value={form.credit_hours} onChange={(e) => setForm({ ...form, credit_hours: parseInt(e.target.value) || 1 })} min={1} />
            </div>
            <div>
              <Label>Description (optional)</Label>
              <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Brief description" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={resetAndClose}>Cancel</Button>
            <Button
              onClick={() => editingId ? updateMutation.mutate() : createMutation.mutate()}
              disabled={!form.name || !form.class_id}
            >
              {editingId ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
