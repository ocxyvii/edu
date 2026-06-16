'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createFeeStructure, getFeeStructures, updateFeeStructure, deleteFeeStructure, toggleFeeStructure } from '@/lib/actions/fees.actions'
import { getClasses, getAcademicYears, getTerms, getCurrentAcademicYear, getCurrentTerm } from '@/lib/actions/school-admin'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { toast } from 'sonner'
import { Plus, Pencil, Trash2, ToggleLeft, ToggleRight, Copy } from 'lucide-react'

const FEE_TYPES = [
  { value: 'tuition', label: 'Tuition' },
  { value: 'transport', label: 'Transport' },
  { value: 'library', label: 'Library' },
  { value: 'lab', label: 'Lab' },
  { value: 'boarding', label: 'Boarding' },
  { value: 'uniform', label: 'Uniform' },
  { value: 'activity', label: 'Activity' },
  { value: 'other', label: 'Other' },
] as const

export function FeeStructureBuilder() {
  const queryClient = useQueryClient()
  const [showDialog, setShowDialog] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState({
    name: '', fee_type: 'tuition', amount: 0, academic_year_id: '',
    term_id: '', class_id: '', due_date: '', description: '', is_optional: false,
  })

  const { data: structures, isLoading } = useQuery({
    queryKey: ['fee-structures'],
    queryFn: getFeeStructures,
  })

  const { data: classes } = useQuery({
    queryKey: ['classes'],
    queryFn: getClasses,
  })

  const { data: currentYear } = useQuery({
    queryKey: ['current-academic-year'],
    queryFn: getCurrentAcademicYear,
  })

  const { data: currentTerm } = useQuery({
    queryKey: ['current-term'],
    queryFn: getCurrentTerm,
  })

  const createMutation = useMutation({
    mutationFn: () => createFeeStructure(form as any),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fee-structures'] })
      resetForm()
      toast.success('Fee structure created')
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const updateMutation = useMutation({
    mutationFn: () => updateFeeStructure(editingId!, form as any),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fee-structures'] })
      resetForm()
      toast.success('Fee structure updated')
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteFeeStructure(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fee-structures'] })
      toast.success('Fee structure deleted')
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const toggleMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) => toggleFeeStructure(id, isActive),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fee-structures'] })
    },
  })

  const resetForm = () => {
    setShowDialog(false)
    setEditingId(null)
    setForm({ name: '', fee_type: 'tuition', amount: 0, academic_year_id: '', term_id: '', class_id: '', due_date: '', description: '', is_optional: false })
  }

  const openEdit = (fee: any) => {
    setEditingId(fee.id)
    setForm({
      name: fee.name, fee_type: fee.fee_type, amount: Number(fee.amount),
      academic_year_id: fee.academic_year_id, term_id: fee.term_id ?? '',
      class_id: fee.class_id ?? '', due_date: fee.due_date ?? '',
      description: fee.description ?? '', is_optional: fee.is_optional ?? false,
    })
    setShowDialog(true)
  }

  const openCreate = () => {
    setForm({
      ...form,
      academic_year_id: currentYear?.id ?? '',
      term_id: currentTerm?.id ?? '',
    })
    setShowDialog(true)
  }

  const handleSubmit = () => {
    if (editingId) updateMutation.mutate()
    else createMutation.mutate()
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">Fee Structures</h3>
          <p className="text-sm text-muted-foreground">Define fee types and amounts</p>
        </div>
        <Button onClick={openCreate} size="sm">
          <Plus className="h-4 w-4 mr-2" /> Add Fee Structure
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-2">{[...Array(3)].map((_: any, i: any) => <div key={i} className="h-16 bg-gray-100 rounded animate-pulse" />)}</div>
      ) : structures?.length === 0 ? (
        <Card><CardContent className="py-8 text-center text-muted-foreground">No fee structures yet. Create your first one.</CardContent></Card>
      ) : (
        <div className="space-y-2">
          {structures?.map((fee: any) => (
            <div key={fee.id} className="flex items-center justify-between p-3 rounded-lg border hover:bg-gray-50 transition-colors">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-gray-900">{fee.name}</span>
                  <Badge variant={fee.is_active ? 'default' : 'secondary'} className="text-xs">
                    {fee.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                  {fee.is_optional && <Badge variant="outline" className="text-xs">Optional</Badge>}
                  <span className="text-xs text-gray-400 capitalize">{fee.fee_type}</span>
                </div>
                <p className="text-xs text-gray-500 mt-0.5">
                  {fee.classes?.name ?? 'All classes'} · {fee.terms?.name ?? 'N/A'} · {fee.academic_years?.name ?? 'N/A'}
                  {fee.due_date ? ` · Due: ${fee.due_date}` : ''}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-semibold text-gray-900">KES {Number(fee.amount).toLocaleString()}</span>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => toggleMutation.mutate({ id: fee.id, isActive: !fee.is_active })}>
                  {fee.is_active ? <ToggleRight className="h-4 w-4 text-green-600" /> : <ToggleLeft className="h-4 w-4 text-gray-400" />}
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(fee)}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => deleteMutation.mutate(fee.id)}>
                  <Trash2 className="h-4 w-4 text-red-500" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={showDialog} onOpenChange={(o) => { if (!o) resetForm() }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit Fee Structure' : 'Create Fee Structure'}</DialogTitle>
            <DialogDescription>Define the fee details below</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Name</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g., Tuition Fee - Term 1" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Fee Type</Label>
                <Select value={form.fee_type} onValueChange={(v) => setForm({ ...form, fee_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {FEE_TYPES.map((t: any) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Amount (KES)</Label>
                <Input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: parseInt(e.target.value) || 0 })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Academic Year</Label>
                <Select value={form.academic_year_id} onValueChange={(v) => setForm({ ...form, academic_year_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    {currentYear && <SelectItem value={currentYear.id}>{currentYear.name}</SelectItem>}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Term (optional)</Label>
                <Select value={form.term_id} onValueChange={(v) => setForm({ ...form, term_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    {currentTerm && <SelectItem value={currentTerm.id}>{currentTerm.name}</SelectItem>}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Class (optional)</Label>
                <Select value={form.class_id} onValueChange={(v) => setForm({ ...form, class_id: v })}>
                  <SelectTrigger><SelectValue placeholder="All classes" /></SelectTrigger>
                  <SelectContent>
                    {classes?.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Due Date</Label>
                <Input type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} />
              </div>
            </div>
            <div>
              <Label>Description (optional)</Label>
              <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Brief description" />
            </div>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={form.is_optional} onChange={(e) => setForm({ ...form, is_optional: e.target.checked })} className="rounded border-gray-300" />
              <span className="text-sm">Optional fee (students can opt out)</span>
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={resetForm}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={!form.name || !form.amount}>
              {editingId ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
