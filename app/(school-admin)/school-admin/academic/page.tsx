'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getAcademicYears,
  createAcademicYear,
  updateAcademicYear,
  deleteAcademicYear,
  setCurrentAcademicYear,
  getTerms,
  createTerm,
  deleteTerm,
  setCurrentTerm,
} from '@/lib/actions/school-admin'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import { Plus, Check, Pencil, Trash2, Calendar } from 'lucide-react'

export default function AcademicPage() {
  const queryClient = useQueryClient()
  const [editingYear, setEditingYear] = useState<string | null>(null)
  const [yearForm, setYearForm] = useState({ name: '', start_date: '', end_date: '' })
  const [showYearDialog, setShowYearDialog] = useState(false)
  const [yearDialogMode, setYearDialogMode] = useState<'create' | 'edit'>('create')
  const [selectedYearId, setSelectedYearId] = useState<string | null>(null)
  const [showTermDialog, setShowTermDialog] = useState(false)
  const [termForm, setTermForm] = useState({ name: '', start_date: '', end_date: '' })

  const { data: years, isLoading } = useQuery({
    queryKey: ['academic-years'],
    queryFn: () => getAcademicYears(),
  })

  const { data: terms } = useQuery({
    queryKey: ['terms', selectedYearId],
    queryFn: () => getTerms(selectedYearId!),
    enabled: !!selectedYearId,
  })

  const createYearMutation = useMutation({
    mutationFn: () => createAcademicYear(yearForm),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['academic-years'] })
      setShowYearDialog(false)
      setYearForm({ name: '', start_date: '', end_date: '' })
      toast.success('Academic year created')
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const updateYearMutation = useMutation({
    mutationFn: () => updateAcademicYear(editingYear!, yearForm),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['academic-years'] })
      setEditingYear(null)
      setShowYearDialog(false)
      toast.success('Academic year updated')
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const deleteYearMutation = useMutation({
    mutationFn: (id: string) => deleteAcademicYear(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['academic-years'] })
      toast.success('Academic year deleted')
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const setCurrentYearMutation = useMutation({
    mutationFn: (id: string) => setCurrentAcademicYear(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['academic-years'] })
      toast.success('Current year updated')
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const createTermMutation = useMutation({
    mutationFn: () => createTerm({ ...termForm, academic_year_id: selectedYearId! }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['terms', selectedYearId] })
      setShowTermDialog(false)
      setTermForm({ name: '', start_date: '', end_date: '' })
      toast.success('Term created')
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const deleteTermMutation = useMutation({
    mutationFn: (id: string) => deleteTerm(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['terms', selectedYearId] })
      toast.success('Term deleted')
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const setCurrentTermMutation = useMutation({
    mutationFn: (id: string) => setCurrentTerm(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['terms', selectedYearId] })
      toast.success('Current term updated')
    },
    onError: (err: Error) => toast.error(err.message),
  })

  function openCreateYear() {
    setYearForm({ name: '', start_date: '', end_date: '' })
    setEditingYear(null)
    setYearDialogMode('create')
    setShowYearDialog(true)
  }

  function openEditYear(year: { id: string; name: string; start_date: string; end_date: string }) {
    setYearForm({ name: year.name, start_date: year.start_date, end_date: year.end_date })
    setEditingYear(year.id)
    setYearDialogMode('edit')
    setShowYearDialog(true)
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Academic Setup</h1>
          <p className="text-gray-600 mt-1">Manage academic years and terms</p>
        </div>
        <Button onClick={openCreateYear}>
          <Plus className="h-4 w-4 mr-2" /> Add Year
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Academic Years</CardTitle>
            <CardDescription>All academic years for the school</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
              </div>
            ) : years?.length === 0 ? (
              <p className="text-muted-foreground text-sm py-8 text-center">No academic years yet</p>
            ) : (
              <div className="space-y-3">
                {years?.map((year) => (
                  <div key={year.id} className="flex items-center justify-between p-4 rounded-lg border border-gray-200">
                    <div className="flex items-center gap-3">
                      <Calendar className="h-5 w-5 text-gray-400" />
                      <div>
                        <p className="font-medium text-gray-900">{year.name}</p>
                        <p className="text-xs text-gray-500">{year.start_date} – {year.end_date}</p>
                      </div>
                      {year.is_current && <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Current</Badge>}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="icon" onClick={() => setSelectedYearId(year.id)} title="View terms">
                        <Calendar className="h-4 w-4" />
                      </Button>
                      {!year.is_current && (
                        <>
                          <Button variant="ghost" size="icon" onClick={() => setCurrentYearMutation.mutate(year.id)}>
                            <Check className="h-4 w-4 text-green-600" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => openEditYear(year)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => deleteYearMutation.mutate(year.id)}>
                            <Trash2 className="h-4 w-4 text-red-600" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Terms</CardTitle>
              <CardDescription>
                {selectedYearId
                  ? `Terms for ${years?.find(y => y.id === selectedYearId)?.name ?? 'selected year'}`
                  : 'Select a year to view terms'}
              </CardDescription>
            </div>
            {selectedYearId && (
              <Button size="sm" onClick={() => { setTermForm({ name: '', start_date: '', end_date: '' }); setShowTermDialog(true) }}>
                <Plus className="h-4 w-4 mr-2" /> Add Term
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {!selectedYearId ? (
              <p className="text-muted-foreground text-sm py-8 text-center">Click the calendar icon on a year to view its terms</p>
            ) : terms?.length === 0 ? (
              <p className="text-muted-foreground text-sm py-8 text-center">No terms for this year</p>
            ) : (
              <div className="space-y-3">
                {terms?.map((term) => (
                  <div key={term.id} className="flex items-center justify-between p-4 rounded-lg border border-gray-200">
                    <div>
                      <p className="font-medium text-gray-900">{term.name}</p>
                      <p className="text-xs text-gray-500">{term.start_date} – {term.end_date}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {term.is_current && <Badge className="bg-green-100 text-green-800">Current</Badge>}
                      {!term.is_current && (
                        <Button variant="ghost" size="sm" onClick={() => setCurrentTermMutation.mutate(term.id)}>
                          <Check className="h-4 w-4 text-green-600 mr-1" /> Set Current
                        </Button>
                      )}
                      <Button variant="ghost" size="icon" onClick={() => deleteTermMutation.mutate(term.id)}>
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

      <Dialog open={showYearDialog} onOpenChange={setShowYearDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{yearDialogMode === 'create' ? 'Add Academic Year' : 'Edit Academic Year'}</DialogTitle>
            <DialogDescription>Enter the year details</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Name</Label>
              <Input value={yearForm.name} onChange={(e) => setYearForm({ ...yearForm, name: e.target.value })} placeholder="e.g., 2025" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Start Date</Label>
                <Input type="date" value={yearForm.start_date} onChange={(e) => setYearForm({ ...yearForm, start_date: e.target.value })} />
              </div>
              <div>
                <Label>End Date</Label>
                <Input type="date" value={yearForm.end_date} onChange={(e) => setYearForm({ ...yearForm, end_date: e.target.value })} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowYearDialog(false)}>Cancel</Button>
            <Button onClick={() => yearDialogMode === 'create' ? createYearMutation.mutate() : updateYearMutation.mutate()}>
              {yearDialogMode === 'create' ? 'Create' : 'Update'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showTermDialog} onOpenChange={setShowTermDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Term</DialogTitle>
            <DialogDescription>Add a term for the selected academic year</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Name</Label>
              <Input value={termForm.name} onChange={(e) => setTermForm({ ...termForm, name: e.target.value })} placeholder="e.g., Term 1" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Start Date</Label>
                <Input type="date" value={termForm.start_date} onChange={(e) => setTermForm({ ...termForm, start_date: e.target.value })} />
              </div>
              <div>
                <Label>End Date</Label>
                <Input type="date" value={termForm.end_date} onChange={(e) => setTermForm({ ...termForm, end_date: e.target.value })} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTermDialog(false)}>Cancel</Button>
            <Button onClick={() => createTermMutation.mutate()}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
