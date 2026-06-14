'use client'

import { useState, useEffect } from 'react'
import { useMutation } from '@tanstack/react-query'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { DAYS, DAY_LABELS, PERIODS } from './TimetableGrid'
import { AlertTriangle } from 'lucide-react'

interface AddPeriodModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  sectionId: string
  subjects: { id: string; name: string; code: string }[]
  teachers: { id: string; profiles: { first_name: string; last_name: string } }[]
  defaultDay?: string
  defaultStart?: string
  defaultEnd?: string
  editEntry?: any
  onSave: (data: any) => Promise<any>
}

export default function AddPeriodModal({
  open,
  onOpenChange,
  sectionId,
  subjects,
  teachers,
  defaultDay = 'monday',
  defaultStart = '07:00',
  defaultEnd = '07:45',
  editEntry,
  onSave,
}: AddPeriodModalProps) {
  const [subjectId, setSubjectId] = useState(editEntry?.subject_id ?? '')
  const [teacherId, setTeacherId] = useState(editEntry?.teacher_id ?? '')
  const [dayOfWeek, setDayOfWeek] = useState(editEntry?.day_of_week ?? defaultDay)
  const [startTime, setStartTime] = useState(editEntry?.start_time ?? defaultStart)
  const [endTime, setEndTime] = useState(editEntry?.end_time ?? defaultEnd)
  const [room, setRoom] = useState(editEntry?.room ?? '')
  const [conflictMsg, setConflictMsg] = useState('')
  const [duration, setDuration] = useState('45')

  useEffect(() => {
    if (editEntry) {
      setSubjectId(editEntry.subject_id)
      setTeacherId(editEntry.teacher_id)
      setDayOfWeek(editEntry.day_of_week)
      setStartTime(editEntry.start_time)
      setEndTime(editEntry.end_time)
      setRoom(editEntry.room ?? '')
      setConflictMsg('')
    } else {
      setSubjectId('')
      setTeacherId('')
      setDayOfWeek(defaultDay)
      setStartTime(defaultStart)
      setEndTime(defaultEnd)
      setRoom('')
      setConflictMsg('')
    }
  }, [editEntry, defaultDay, defaultStart, defaultEnd, open])

  function calcEndTime(start: string, mins: number): string {
    const [h, m] = start.split(':').map(Number)
    const total = h * 60 + m + mins
    return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
  }

  function handleDurationChange(val: string) {
    setDuration(val)
    setEndTime(calcEndTime(startTime, parseInt(val)))
  }

  function handleStartChange(val: string) {
    setStartTime(val)
    setEndTime(calcEndTime(val, parseInt(duration)))
  }

  const saveMutation = useMutation({
    mutationFn: async () => {
      const data = {
        section_id: sectionId,
        subject_id: subjectId,
        teacher_id: teacherId,
        day_of_week: dayOfWeek,
        start_time: startTime,
        end_time: endTime,
        room: room || undefined,
      }
      if (editEntry) {
        return await onSave({ ...data, id: editEntry.id })
      }
      return await onSave(data)
    },
    onSuccess: () => {
      onOpenChange(false)
    },
    onError: (err: Error) => {
      setConflictMsg(err.message)
    },
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{editEntry ? 'Edit Period' : 'Add Period'}</DialogTitle>
          <DialogDescription>
            {editEntry ? 'Update the subject, teacher, or time for this period' : 'Assign a subject and teacher to this time slot'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {conflictMsg && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Conflict Detected</AlertTitle>
              <AlertDescription className="text-sm">{conflictMsg}</AlertDescription>
            </Alert>
          )}

          <div>
            <Label>Subject</Label>
            <Select value={subjectId} onValueChange={setSubjectId}>
              <SelectTrigger><SelectValue placeholder="Select subject" /></SelectTrigger>
              <SelectContent>
                {subjects.map(s => (
                  <SelectItem key={s.id} value={s.id}>{s.name} ({s.code})</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Teacher</Label>
            <Select value={teacherId} onValueChange={setTeacherId}>
              <SelectTrigger><SelectValue placeholder="Select teacher" /></SelectTrigger>
              <SelectContent>
                {teachers.map(t => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.profiles?.first_name} {t.profiles?.last_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Day</Label>
            <Select value={dayOfWeek} onValueChange={setDayOfWeek}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {DAYS.map((d, i) => (
                  <SelectItem key={d} value={d}>{DAY_LABELS[i]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label>Start Time</Label>
              <Input type="time" value={startTime} onChange={(e) => handleStartChange(e.target.value)} />
            </div>
            <div>
              <Label>Duration</Label>
              <Select value={duration} onValueChange={handleDurationChange}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="45">45 min</SelectItem>
                  <SelectItem value="60">60 min</SelectItem>
                  <SelectItem value="90">90 min</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>End Time</Label>
              <Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
            </div>
          </div>

          <div>
            <Label>Room (optional)</Label>
            <Input
              value={room}
              onChange={(e) => setRoom(e.target.value)}
              placeholder="e.g., Room 101, Lab A"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            onClick={() => saveMutation.mutate()}
            disabled={!subjectId || !teacherId || saveMutation.isPending}
          >
            {saveMutation.isPending ? 'Saving...' : editEntry ? 'Update' : 'Add Period'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
