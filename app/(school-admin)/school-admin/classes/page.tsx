'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getClasses,
  createClass,
  updateClass,
  deleteClass,
  createSection,
  updateSection,
  deleteSection,
  getTeachers,
} from '@/lib/actions/school-admin'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import { Plus, Pencil, Trash2, Users, DoorOpen } from 'lucide-react'

export default function ClassesPage() {
  const queryClient = useQueryClient()
  const [showClassDialog, setShowClassDialog] = useState(false)
  const [editingClassId, setEditingClassId] = useState<string | null>(null)
  const [classForm, setClassForm] = useState({ name: '', level: 1, description: '' })
  const [showSectionDialog, setShowSectionDialog] = useState(false)
  const [sectionForm, setSectionForm] = useState({ class_id: '', name: '', capacity: 40, room: '' })
  const [editingSectionId, setEditingSectionId] = useState<string | null>(null)
  const [selectedTeacherId, setSelectedTeacherId] = useState<string | null>(null)

  const { data: classes, isLoading } = useQuery({
    queryKey: ['classes'],
    queryFn: () => getClasses(),
  })

  const { data: teachers } = useQuery({
    queryKey: ['teachers'],
    queryFn: () => getTeachers(),
  })

  const createClassMutation = useMutation({
    mutationFn: () => createClass({ name: classForm.name, level: classForm.level, description: classForm.description || undefined }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['classes'] })
      setShowClassDialog(false)
      setClassForm({ name: '', level: 1, description: '' })
      toast.success('Class created')
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const updateClassMutation = useMutation({
    mutationFn: () => updateClass(editingClassId!, { name: classForm.name, level: classForm.level, description: classForm.description || undefined }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['classes'] })
      setEditingClassId(null)
      setShowClassDialog(false)
      toast.success('Class updated')
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const deleteClassMutation = useMutation({
    mutationFn: (id: string) => deleteClass(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['classes'] })
      toast.success('Class deleted')
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const createSectionMutation = useMutation({
    mutationFn: () => createSection(sectionForm),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['classes'] })
      setShowSectionDialog(false)
      setSectionForm({ class_id: '', name: '', capacity: 40, room: '' })
      toast.success('Section created')
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const updateSectionMutation = useMutation({
    mutationFn: () => updateSection(editingSectionId!, { class_teacher_id: selectedTeacherId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['classes'] })
      setEditingSectionId(null)
      setSelectedTeacherId(null)
      toast.success('Class teacher assigned')
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const deleteSectionMutation = useMutation({
    mutationFn: (id: string) => deleteSection(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['classes'] })
      toast.success('Section deleted')
    },
    onError: (err: Error) => toast.error(err.message),
  })

  function openEditClass(cls: { id: string; name: string; level: number; description?: string | null }) {
    setClassForm({ name: cls.name, level: cls.level, description: cls.description ?? '' })
    setEditingClassId(cls.id)
    setShowClassDialog(true)
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Classes & Sections</h1>
          <p className="text-gray-600 mt-1">Manage classes, sections, and class teachers</p>
        </div>
        <Button onClick={() => { setClassForm({ name: '', level: 1, description: '' }); setEditingClassId(null); setShowClassDialog(true) }}>
          <Plus className="h-4 w-4 mr-2" /> Add Class
        </Button>
      </div>

      {isLoading ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-48 w-full" />)}
        </div>
      ) : classes?.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No classes yet. Click &quot;Add Class&quot; to get started.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {classes?.map((cls) => (
            <Card key={cls.id}>
              <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                <div>
              <CardTitle className="text-lg">{cls.name}</CardTitle>
              <CardDescription>Level {cls.level}{cls.academic_years ? ` · ${cls.academic_years.name}` : ''}{cls.academic_years?.is_current ? ' · Current' : ''}</CardDescription>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" onClick={() => openEditClass(cls)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => deleteClassMutation.mutate(cls.id)}>
                    <Trash2 className="h-4 w-4 text-red-600" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {cls.description && <p className="text-sm text-gray-500 mb-3">{cls.description}</p>}
                <div className="space-y-2">
                  {cls.sections?.length ? cls.sections.map((section: any) => (
                    <div key={section.id} className="flex items-center justify-between p-2 rounded-md bg-gray-50">
                      <div className="flex items-center gap-2 min-w-0">
                        <DoorOpen className="h-4 w-4 text-gray-400 shrink-0" />
                        <div className="min-w-0">
                          <span className="text-sm font-medium">{section.name}</span>
                          {section.room && <span className="text-xs text-gray-400 ml-1">Room {section.room}</span>}
                          <span className="text-xs text-muted-foreground ml-2">
                            {section.student_count ?? 0}/{section.capacity ?? '?'} students
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Dialog open={editingSectionId === section.id} onOpenChange={(o) => { if (!o) setEditingSectionId(null) }}>
                          <DialogTrigger asChild>
                            {section.class_teacher_id ? (
                              <button className="flex items-center gap-1.5 hover:bg-gray-200 rounded-md px-1.5 py-1 transition-colors text-xs">
                                <div className="h-6 w-6 rounded-full bg-edu-blue-100 flex items-center justify-center text-[10px] font-bold text-edu-blue-700">
                                  {section.class_teacher?.first_name?.[0]}{section.class_teacher?.last_name?.[0]}
                                </div>
                                <span className="text-muted-foreground hidden sm:inline">
                                  {section.class_teacher?.first_name} {section.class_teacher?.last_name}
                                </span>
                              </button>
                            ) : (
                              <Button variant="ghost" size="sm" className="text-xs text-red-600" onClick={() => { setEditingSectionId(section.id); setSelectedTeacherId(null) }}>
                                No teacher
                              </Button>
                            )}
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>{section.class_teacher_id ? 'Change Class Teacher' : 'Assign Class Teacher'}</DialogTitle>
                              <DialogDescription>Select a teacher for {section.name}</DialogDescription>
                            </DialogHeader>
                            <Select value={selectedTeacherId ?? ''} onValueChange={setSelectedTeacherId}>
                              <SelectTrigger>
                                <SelectValue placeholder="Select teacher" />
                              </SelectTrigger>
                              <SelectContent>
                                {teachers?.map((t) => {
                                  return (
                                    <SelectItem key={t.id} value={t.id}>
                                      <div className="flex items-center gap-2">
                                        <div className="h-6 w-6 rounded-full bg-edu-blue-100 flex items-center justify-center text-[10px] font-bold text-edu-blue-700">
                                          {t.profiles?.first_name?.[0]}{t.profiles?.last_name?.[0]}
                                        </div>
                                        <div>
                                          <span>{t.profiles?.first_name} {t.profiles?.last_name}</span>
                                          <span className="text-xs text-muted-foreground ml-2">
                                            {t.employee_number ? `#${t.employee_number}` : ''}
                                          </span>
                                        </div>
                                      </div>
                                    </SelectItem>
                                  )
                                })}
                              </SelectContent>
                            </Select>
                            {section.class_teacher_id && (
                              <Button variant="outline" size="sm" className="w-full text-xs" onClick={() => { setSelectedTeacherId(null); updateSectionMutation.mutate() }}>
                                Remove teacher
                              </Button>
                            )}
                            <DialogFooter>
                              <Button variant="outline" onClick={() => setEditingSectionId(null)}>Cancel</Button>
                              <Button onClick={() => updateSectionMutation.mutate()} disabled={!selectedTeacherId}>
                                {section.class_teacher_id ? 'Change' : 'Assign'}
                              </Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => deleteSectionMutation.mutate(section.id)}>
                          <Trash2 className="h-3 w-3 text-red-600" />
                        </Button>
                      </div>
                    </div>
                  )) : (
                    <p className="text-xs text-gray-400">No sections</p>
                  )}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3 w-full"
                  onClick={() => { setSectionForm({ class_id: cls.id, name: '', capacity: 40, room: '' }); setShowSectionDialog(true) }}
                >
                  <Plus className="h-3 w-3 mr-2" /> Add Section
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={showClassDialog} onOpenChange={setShowClassDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingClassId ? 'Edit Class' : 'Add Class'}</DialogTitle>
            <DialogDescription>Enter class details</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Name</Label>
              <Input value={classForm.name} onChange={(e) => setClassForm({ ...classForm, name: e.target.value })} placeholder="e.g., Grade 1" />
            </div>
            <div>
              <Label>Level</Label>
              <Input type="number" value={classForm.level} onChange={(e) => setClassForm({ ...classForm, level: parseInt(e.target.value) || 1 })} />
            </div>
            <div>
              <Label>Description (optional)</Label>
              <Input value={classForm.description} onChange={(e) => setClassForm({ ...classForm, description: e.target.value })} placeholder="e.g., Lower Primary" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowClassDialog(false)}>Cancel</Button>
            <Button onClick={() => editingClassId ? updateClassMutation.mutate() : createClassMutation.mutate()}>
              {editingClassId ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showSectionDialog} onOpenChange={setShowSectionDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Section</DialogTitle>
            <DialogDescription>Add a section to this class</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Name</Label>
              <Input value={sectionForm.name} onChange={(e) => setSectionForm({ ...sectionForm, name: e.target.value })} placeholder="e.g., A, B, or East" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Capacity</Label>
                <Input type="number" value={sectionForm.capacity} onChange={(e) => setSectionForm({ ...sectionForm, capacity: parseInt(e.target.value) || 40 })} />
              </div>
              <div>
                <Label>Room (optional)</Label>
                <Input value={sectionForm.room} onChange={(e) => setSectionForm({ ...sectionForm, room: e.target.value })} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSectionDialog(false)}>Cancel</Button>
            <Button onClick={() => createSectionMutation.mutate()}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
