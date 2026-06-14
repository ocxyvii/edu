'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getClasses, getTimetable, getSubjects, getTeachers } from '@/lib/actions/school-admin'
import {
  createTimetableEntry,
  updateTimetableEntry,
  deleteTimetableEntry,
  autoGenerateTimetable,
} from '@/lib/actions/timetable.actions'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { Loader2, Plus, Sparkles, Printer } from 'lucide-react'
import TimetableGrid, { DAYS, PERIODS } from '@/components/timetable/TimetableGrid'
import AddPeriodModal from '@/components/timetable/AddPeriodModal'
import { Alert, AlertDescription } from '@/components/ui/alert'

export default function TimetablePage() {
  const queryClient = useQueryClient()
  const [selectedSectionId, setSelectedSectionId] = useState('')
  const [showAddModal, setShowAddModal] = useState(false)
  const [editEntry, setEditEntry] = useState<any>(null)
  const [modalDefaults, setModalDefaults] = useState({ day: 'monday' as string, start: '07:00' as string, end: '07:45' as string })

  const { data: classes } = useQuery({
    queryKey: ['classes'],
    queryFn: () => getClasses(),
  })

  const sections = classes?.flatMap((c: any) =>
    (c.sections ?? []).map((s: any) => ({ ...s, className: c.name, classId: c.id }))
  ) ?? []

  const { data: timetable, isLoading: timetableLoading } = useQuery({
    queryKey: ['timetable', selectedSectionId],
    queryFn: () => getTimetable(selectedSectionId),
    enabled: !!selectedSectionId,
  })

  const { data: subjects } = useQuery({
    queryKey: ['subjects'],
    queryFn: () => getSubjects(),
  })

  const { data: teachers } = useQuery({
    queryKey: ['teachers'],
    queryFn: () => getTeachers(),
  })

  const createMutation = useMutation({
    mutationFn: (data: any) => createTimetableEntry(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['timetable', selectedSectionId] })
      toast.success('Period added')
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => updateTimetableEntry(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['timetable', selectedSectionId] })
      toast.success('Period updated')
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteTimetableEntry(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['timetable', selectedSectionId] })
      toast.success('Period removed')
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const autoGenMutation = useMutation({
    mutationFn: () => autoGenerateTimetable(selectedSectionId),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['timetable', selectedSectionId] })
      if (result.created > 0) {
        toast.success(`Auto-generated ${result.created} periods`)
      }
      if (result.errors.length > 0) {
        result.errors.forEach(e => toast.error(e))
      }
    },
    onError: (err: Error) => toast.error(err.message),
  })

  function handleCellClick(day: string, startTime: string, endTime: string) {
    setEditEntry(null)
    setModalDefaults({ day, start: startTime, end: endTime })
    setShowAddModal(true)
  }

  function handleEditEntry(entry: any) {
    setEditEntry(entry)
    setModalDefaults({ day: entry.day_of_week, start: entry.start_time, end: entry.end_time })
    setShowAddModal(true)
  }

  async function handleSave(data: any) {
    if (data.id) {
      return updateMutation.mutateAsync({ id: data.id, data })
    }
    return createMutation.mutateAsync(data)
  }

  function handleDragUpdate(id: string, data: any) {
    updateMutation.mutate({ id, data })
  }

  function handlePrint() {
    window.print()
  }

  const currentSection = sections.find(s => s.id === selectedSectionId)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4 print:hidden">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Timetable</h1>
          <p className="text-gray-500 mt-1">Manage weekly class schedules with drag-and-drop</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={selectedSectionId} onValueChange={setSelectedSectionId}>
            <SelectTrigger className="w-[260px]"><SelectValue placeholder="Select class & section" /></SelectTrigger>
            <SelectContent>
              {sections.map((s: any) => (
                <SelectItem key={s.id} value={s.id}>{s.className} - {s.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectedSectionId && (
            <>
              <Button variant="outline" size="sm" onClick={handlePrint}>
                <Printer className="h-4 w-4 mr-1.5" /> Print
              </Button>
              <Button variant="outline" size="sm" onClick={() => autoGenMutation.mutate()} disabled={autoGenMutation.isPending}>
                {autoGenMutation.isPending ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Sparkles className="h-4 w-4 mr-1.5" />}
                Auto-generate
              </Button>
              <Button size="sm" onClick={() => handleCellClick('monday', '07:00', '07:45')}>
                <Plus className="h-4 w-4 mr-1.5" /> Add Period
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Print-only header */}
      <div className="hidden print:block mb-4">
        <h1 className="text-2xl font-bold text-center">
          Timetable — {currentSection?.className} {currentSection?.name}
        </h1>
        <p className="text-center text-sm text-gray-500">Academic Year {new Date().getFullYear()}</p>
      </div>

      {!selectedSectionId ? (
        <Card>
          <CardContent className="py-16 text-center text-muted-foreground">
            Select a class and section to view its timetable
          </CardContent>
        </Card>
      ) : timetableLoading ? (
        <Card>
          <CardContent className="py-16 text-center text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
            Loading timetable...
          </CardContent>
        </Card>
      ) : (
        <TimetableGrid
          entries={timetable ?? []}
          onUpdateEntry={handleDragUpdate}
          onDeleteEntry={(id) => deleteMutation.mutate(id)}
          onCellClick={handleCellClick}
          onAddEntry={(day, start, end) => handleCellClick(day, start, end)}
        />
      )}

      <AddPeriodModal
        open={showAddModal}
        onOpenChange={setShowAddModal}
        sectionId={selectedSectionId}
        subjects={subjects ?? []}
        teachers={teachers ?? []}
        defaultDay={modalDefaults.day}
        defaultStart={modalDefaults.start}
        defaultEnd={modalDefaults.end}
        editEntry={editEntry}
        onSave={handleSave}
      />

      {/* Print styles */}
      <style jsx global>{`
        @media print {
          @page { size: landscape; margin: 0.5in; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .print\\:hidden { display: none !important; }
          .hidden.print\\:block { display: block !important; }
        }
      `}</style>
    </div>
  )
}
