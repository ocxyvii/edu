'use client'

import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTeacherClassesRealtime } from '@/lib/hooks/useTeacherClasses'
import { getTimetableForSection, getTeacherTimetableSubjects, getAvailableSubjectsForSection, addTeacherSubject, removeTeacherSubject, createTimetableEntry, updateTimetableEntry, deleteTimetableEntry } from '@/lib/actions/timetable.actions'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { toast } from 'sonner'
import { Clock, MapPin, ChevronRight, BookOpen, Plus, Loader2, X, BookMarked } from 'lucide-react'
import TimetableGrid, { getCurrentDayIndex, getCurrentPeriodIndex, DAYS, DAY_LABELS } from '@/components/timetable/TimetableGrid'
import AddPeriodModal from '@/components/timetable/AddPeriodModal'

export default function TeacherTimetablePage() {
  const queryClient = useQueryClient()
  const { data: sections, isLoading: classesLoading } = useTeacherClassesRealtime()
  const [selectedSectionId, setSelectedSectionId] = useState('')
  const [showAddModal, setShowAddModal] = useState(false)
  const [editEntry, setEditEntry] = useState<any>(null)
  const [modalDefaults, setModalDefaults] = useState({ day: 'monday' as string, start: '07:00' as string, end: '07:45' as string })

  const { data: timetable, isLoading: timetableLoading } = useQuery({
    queryKey: ['teacher-timetable', selectedSectionId],
    queryFn: () => getTimetableForSection(selectedSectionId),
    enabled: !!selectedSectionId,
  })

  const { data: subjectData } = useQuery({
    queryKey: ['teacher-timetable-subjects', selectedSectionId],
    queryFn: () => getTeacherTimetableSubjects(selectedSectionId),
    enabled: !!selectedSectionId,
  })

  const createMutation = useMutation({
    mutationFn: (data: any) => createTimetableEntry(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teacher-timetable', selectedSectionId] })
      toast.success('Period added')
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => updateTimetableEntry(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teacher-timetable', selectedSectionId] })
      toast.success('Period updated')
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteTimetableEntry(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teacher-timetable', selectedSectionId] })
      toast.success('Period removed')
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const [showSubjectsDialog, setShowSubjectsDialog] = useState(false)

  const { data: availableSubjects } = useQuery({
    queryKey: ['available-subjects', selectedSectionId],
    queryFn: () => getAvailableSubjectsForSection(selectedSectionId),
    enabled: !!selectedSectionId && showSubjectsDialog,
  })

  const addSubjectMutation = useMutation({
    mutationFn: ({ subjectId }: { subjectId: string }) => addTeacherSubject(selectedSectionId, subjectId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teacher-timetable-subjects', selectedSectionId] })
      queryClient.invalidateQueries({ queryKey: ['available-subjects', selectedSectionId] })
      queryClient.invalidateQueries({ queryKey: ['teacher-classes'] })
      toast.success('Subject added')
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const removeSubjectMutation = useMutation({
    mutationFn: ({ subjectId }: { subjectId: string }) => removeTeacherSubject(selectedSectionId, subjectId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teacher-timetable-subjects', selectedSectionId] })
      queryClient.invalidateQueries({ queryKey: ['available-subjects', selectedSectionId] })
      queryClient.invalidateQueries({ queryKey: ['teacher-classes'] })
      toast.success('Subject removed')
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

  const todayIndex = getCurrentDayIndex()
  const currentPeriodIndex = getCurrentPeriodIndex()
  const todayStr = todayIndex >= 0 ? DAYS[todayIndex] : null

  const todayEntries = useMemo(() => {
    if (!todayStr || !timetable) return []
    return timetable
      .filter((e: any) => e.day_of_week === todayStr)
      .sort((a, b) => a.start_time.localeCompare(b.start_time))
  }, [timetable, todayStr])

  const nextClass = useMemo(() => {
    if (!todayEntries.length || currentPeriodIndex < 0) return null
    const now = new Date()
    const nowMin = now.getHours() * 60 + now.getMinutes()
    const upcoming = todayEntries.filter((e: any) => {
      const [h, m] = e.start_time.split(':').map(Number)
      return h * 60 + m > nowMin
    })
    if (upcoming.length === 0) return todayEntries[todayEntries.length - 1]
    return upcoming[0]
  }, [todayEntries, currentPeriodIndex])

  const currentClass = useMemo(() => {
    if (!todayEntries.length || currentPeriodIndex < 0) return null
    const now = new Date()
    const nowMin = now.getHours() * 60 + now.getMinutes()
    return todayEntries.find((e: any) => {
      const [sH, sM] = e.start_time.split(':').map(Number)
      const [eH, eM] = e.end_time.split(':').map(Number)
      return nowMin >= sH * 60 + sM && nowMin < eH * 60 + eM
    }) ?? null
  }, [todayEntries, currentPeriodIndex])

  const dayEntries = useMemo(() => {
    const map: Record<string, typeof timetable> = {}
    DAYS.forEach((d: any) => { map[d] = [] })
    timetable?.forEach((e: any) => {
      if (map[e.day_of_week]) map[e.day_of_week].push(e)
    })
    return map
  }, [timetable])

  const selectedSection = sections?.find((s: any) => s.section_id === selectedSectionId)

  if (classesLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">My Timetable</h1>
          <p className="text-gray-500 mt-1">Manage your weekly teaching schedule</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={selectedSectionId} onValueChange={setSelectedSectionId}>
            <SelectTrigger className="w-[260px]"><SelectValue placeholder="Select your section" /></SelectTrigger>
            <SelectContent>
              {sections.map((s: any) => (
                <SelectItem key={s.section_id} value={s.section_id}>
                  {s.class_name} - {s.section_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectedSectionId && (
            <>
              <Button variant="outline" size="sm" onClick={() => setShowSubjectsDialog(true)}>
                <BookMarked className="h-4 w-4 mr-1.5" /> Subjects
              </Button>
              <Button size="sm" onClick={() => handleCellClick('monday', '07:00', '07:45')}>
                <Plus className="h-4 w-4 mr-1.5" /> Add Period
              </Button>
            </>
          )}
        </div>
      </div>

      {/* What's Next Card */}
      {todayStr && (
        <Card className="bg-gradient-to-br from-edu-blue-600 to-edu-blue-800 text-white border-none shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div className="space-y-3">
                <p className="text-blue-100 text-sm font-medium uppercase tracking-wider">
                  {DAY_LABELS[todayIndex]}
                </p>
                {currentClass ? (
                  <div>
                    <p className="text-blue-200 text-xs font-medium">Current Class</p>
                    <h3 className="text-xl font-bold mt-0.5">{currentClass.subjects?.name}</h3>
                    <p className="text-blue-100 text-sm">
                      {currentClass.sections?.classes?.name} · {currentClass.sections?.name}
                    </p>
                    <div className="flex items-center gap-3 mt-2 text-blue-100 text-xs">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {currentClass.start_time.slice(0, 5)} – {currentClass.end_time.slice(0, 5)}
                      </span>
                      {currentClass.room && (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {currentClass.room}
                        </span>
                      )}
                    </div>
                  </div>
                ) : nextClass ? (
                  <div>
                    <p className="text-blue-200 text-xs font-medium flex items-center gap-1">
                      <ChevronRight className="h-3 w-3" />
                      Up Next
                    </p>
                    <h3 className="text-xl font-bold mt-0.5">{nextClass.subjects?.name}</h3>
                    <p className="text-blue-100 text-sm">
                      {nextClass.sections?.classes?.name} · {nextClass.sections?.name}
                    </p>
                    <div className="flex items-center gap-3 mt-2 text-blue-100 text-xs">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {nextClass.start_time.slice(0, 5)} – {nextClass.end_time.slice(0, 5)}
                      </span>
                      {nextClass.room && (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {nextClass.room}
                        </span>
                      )}
                    </div>
                  </div>
                ) : todayEntries.length === 0 ? (
                  <div>
                    <h3 className="text-xl font-bold">No classes today</h3>
                    <p className="text-blue-100 text-sm mt-1">Enjoy your free day!</p>
                  </div>
                ) : (
                  <div>
                    <h3 className="text-xl font-bold">All done for today</h3>
                    <p className="text-blue-100 text-sm mt-1">{todayEntries.length} class{todayEntries.length > 1 ? 'es' : ''} completed</p>
                  </div>
                )}
              </div>
              <div className="hidden sm:block">
                <BookOpen className="h-12 w-12 text-blue-300/40" />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {!selectedSectionId ? (
        <Card>
          <CardContent className="py-16 text-center text-muted-foreground">
            Select a section to manage its timetable
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

      {/* Manage Subjects Dialog */}
      <Dialog open={showSubjectsDialog} onOpenChange={setShowSubjectsDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>My Subjects — {selectedSection?.class_name} {selectedSection?.section_name}</DialogTitle>
            <DialogDescription>Manage the subjects you teach for this section</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {/* Current subjects */}
            <div>
              <p className="text-sm font-medium mb-2">Assigned Subjects</p>
              {subjectData?.subjects && subjectData.subjects.length > 0 ? (
                <div className="space-y-1.5">
                  {subjectData.subjects.map((s: any) => (
                    <div key={s.id} className="flex items-center justify-between p-2.5 rounded-lg border border-gray-100">
                      <span className="text-sm font-medium">{s.name}{s.code ? ` (${s.code})` : ''}</span>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500 hover:text-red-700"
                        onClick={() => removeSubjectMutation.mutate({ subjectId: s.id })}
                        disabled={removeSubjectMutation.isPending}
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No subjects assigned yet</p>
              )}
            </div>
            {/* Available subjects */}
            <div>
              <p className="text-sm font-medium mb-2">Add More Subjects</p>
              {availableSubjects && availableSubjects.length > 0 ? (
                <div className="space-y-1.5">
                  {availableSubjects.map((s: any) => (
                    <div key={s.id} className="flex items-center justify-between p-2.5 rounded-lg border border-gray-100">
                      <span className="text-sm">{s.name}{s.code ? ` (${s.code})` : ''}</span>
                      <Button size="sm" variant="outline" className="h-7 text-xs"
                        onClick={() => addSubjectMutation.mutate({ subjectId: s.id })}
                        disabled={addSubjectMutation.isPending}
                      >
                        <Plus className="h-3 w-3 mr-1" /> Add
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">All available subjects already assigned</p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSubjectsDialog(false)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AddPeriodModal
        open={showAddModal}
        onOpenChange={setShowAddModal}
        sectionId={selectedSectionId}
        subjects={subjectData?.subjects ?? []}
        teachers={subjectData?.teacher ? [subjectData.teacher] : []}
        defaultDay={modalDefaults.day}
        defaultStart={modalDefaults.start}
        defaultEnd={modalDefaults.end}
        editEntry={editEntry}
        onSave={handleSave}
      />

      {/* Day-by-day list view */}
      {timetable && timetable.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Weekly Overview</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-4">
              {DAYS.map((day: any, di: any) => {
                const dayEntries_list = dayEntries[day] ?? []
                if (!dayEntries_list.length) return null
                return (
                  <div key={day}>
                    <h4 className={`text-sm font-semibold mb-2 ${di === todayIndex ? 'text-edu-blue-700' : 'text-gray-700'}`}>
                      {DAY_LABELS[di]}
                      {di === todayIndex && <Badge variant="outline" className="ml-2 text-[10px]">Today</Badge>}
                    </h4>
                    <div className="space-y-1.5">
                      {dayEntries_list.map((e: any) => (
                        <div key={e.id} className="flex items-center gap-3 p-2.5 rounded-lg border border-gray-100 hover:bg-gray-50 transition-colors">
                          <Badge variant="outline" className="w-16 text-center font-mono text-[10px] shrink-0">
                            {e.start_time.slice(0, 5)}
                          </Badge>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{e.subjects?.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {e.sections?.classes?.name} · {e.sections?.name}
                              {e.room && <> · Room {e.room}</>}
                            </p>
                          </div>
                          <span className="text-xs text-muted-foreground font-mono">{e.start_time.slice(0, 5)}–{e.end_time.slice(0, 5)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
