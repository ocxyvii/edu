'use client'

import { useState, useCallback, useMemo } from 'react'
import {
  DndContext,
  DragOverlay,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  useDraggable,
  useDroppable,
} from '@dnd-kit/core'
import { Badge } from '@/components/ui/badge'
import { Clock, Trash2, GripVertical } from 'lucide-react'

const DAYS: ('monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday')[] = [
  'monday', 'tuesday', 'wednesday', 'thursday', 'friday',
]
const DAY_LABELS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']

const PERIODS = [
  { start: '07:00', end: '07:45' },
  { start: '07:50', end: '08:35' },
  { start: '08:40', end: '09:25' },
  { start: '09:30', end: '10:15' },
  { start: '10:20', end: '11:05' },
  { start: '11:10', end: '11:55' },
  { start: '12:00', end: '12:45' },
  { start: '12:50', end: '13:35' },
  { start: '13:40', end: '14:25' },
  { start: '14:30', end: '15:15' },
  { start: '15:20', end: '16:05' },
  { start: '16:10', end: '16:55' },
  { start: '17:00', end: '17:45' },
]

const SUBJECT_COLORS = [
  'from-blue-50 to-blue-100 border-blue-200 text-blue-800',
  'from-emerald-50 to-emerald-100 border-emerald-200 text-emerald-800',
  'from-violet-50 to-violet-100 border-violet-200 text-violet-800',
  'from-orange-50 to-orange-100 border-orange-200 text-orange-800',
  'from-pink-50 to-pink-100 border-pink-200 text-pink-800',
  'from-teal-50 to-teal-100 border-teal-200 text-teal-800',
  'from-indigo-50 to-indigo-100 border-indigo-200 text-indigo-800',
  'from-rose-50 to-rose-100 border-rose-200 text-rose-800',
  'from-amber-50 to-amber-100 border-amber-200 text-amber-800',
  'from-cyan-50 to-cyan-100 border-cyan-200 text-cyan-800',
  'from-lime-50 to-lime-100 border-lime-200 text-lime-800',
  'from-fuchsia-50 to-fuchsia-100 border-fuchsia-200 text-fuchsia-800',
]

function getSubjectColor(subjectId: string): string {
  let hash = 0
  for (let i = 0; i < subjectId.length; i++) {
    hash = ((hash << 5) - hash) + subjectId.charCodeAt(i)
    hash |= 0
  }
  return SUBJECT_COLORS[Math.abs(hash) % SUBJECT_COLORS.length]
}

function getCurrentDayIndex(): number {
  const day = new Date().getDay()
  return day >= 1 && day <= 5 ? day - 1 : -1
}

function getCurrentPeriodIndex(): number {
  const now = new Date()
  const minutes = now.getHours() * 60 + now.getMinutes()
  for (let i = 0; i < PERIODS.length; i++) {
    const [sH, sM] = PERIODS[i].start.split(':').map(Number)
    const [eH, eM] = PERIODS[i].end.split(':').map(Number)
    const startMin = sH * 60 + sM
    const endMin = eH * 60 + eM
    if (minutes >= startMin && minutes < endMin) return i
  }
  return -1
}

function DroppableCell({
  dayIndex,
  periodIndex,
  isToday,
}: {
  dayIndex: number
  periodIndex: number
  isToday: boolean
}) {
  const id = `cell-${dayIndex}-${periodIndex}`
  const { setNodeRef, isOver } = useDroppable({ id })

  return (
    <td
      ref={setNodeRef}
      className={`border border-gray-100 p-0.5 min-h-[60px] w-[120px] transition-colors ${
        isOver ? 'bg-edu-blue-50 ring-2 ring-edu-blue-400' : ''
      } ${isToday ? 'bg-blue-50/30' : ''}`}
    />
  )
}

function DraggableEntry({
  entry,
  dayIndex,
  periodIndex,
  isToday,
  onDelete,
  onEdit,
}: {
  entry: any
  dayIndex: number
  periodIndex: number
  isToday: boolean
  onDelete: (id: string) => void
  onEdit: (entry: any) => void
}) {
  const id = `entry-${entry.id}`
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id, data: { entry, dayIndex, periodIndex } })
  const isCurrent = isToday && getCurrentPeriodIndex() === periodIndex

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
    zIndex: 50,
  } : undefined

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`relative rounded-md border bg-gradient-to-br p-1.5 text-xs cursor-grab active:cursor-grabbing shadow-sm transition-shadow hover:shadow-md ${
        getSubjectColor(entry.subject_id)
      } ${isDragging ? 'opacity-50 ring-2 ring-edu-blue-400' : ''} ${
        isCurrent ? 'ring-2 ring-amber-400 ring-offset-1' : ''
      }`}
      {...attributes}
      {...listeners}
    >
      <div className="flex items-start justify-between gap-1">
        <span className="font-semibold truncate text-[11px] leading-tight">{entry.subjects?.name}</span>
        <GripVertical className="h-3 w-3 shrink-0 opacity-40" />
      </div>
      <p className="opacity-75 truncate text-[10px] leading-tight mt-0.5">
        {entry.teachers?.profiles?.first_name} {entry.teachers?.profiles?.last_name}
      </p>
      <div className="flex items-center justify-between mt-1">
        <span className="text-[9px] opacity-60 font-mono">
          {entry.start_time.slice(0, 5)}–{entry.end_time.slice(0, 5)}
        </span>
        <div className="flex items-center gap-0.5">
          {entry.room && <span className="text-[9px] opacity-60">{entry.room}</span>}
          <button
            onClick={(e) => { e.stopPropagation(); onEdit(entry) }}
            className="text-[9px] opacity-40 hover:opacity-80 hover:text-edu-blue-600"
            title="Edit"
          >
            ✎
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(entry.id) }}
            className="text-[9px] opacity-40 hover:opacity-80 hover:text-red-600"
            title="Delete"
          >
            <Trash2 className="h-2.5 w-2.5" />
          </button>
        </div>
      </div>
    </div>
  )
}

function EntryOverlay({ entry }: { entry: any }) {
  return (
    <div
      className={`rounded-md border bg-gradient-to-br p-2 text-xs shadow-lg ring-2 ring-edu-blue-400 ${
        getSubjectColor(entry.subject_id)
      }`}
    >
      <p className="font-semibold">{entry.subjects?.name}</p>
      <p className="opacity-75">{entry.teachers?.profiles?.first_name} {entry.teachers?.profiles?.last_name}</p>
      <p className="opacity-60 font-mono">{entry.start_time.slice(0, 5)}–{entry.end_time.slice(0, 5)}</p>
    </div>
  )
}

export default function TimetableGrid({
  entries,
  onUpdateEntry,
  onDeleteEntry,
  onAddEntry,
  onCellClick,
  readOnly,
}: {
  entries: any[]
  onUpdateEntry?: (id: string, data: any) => void
  onDeleteEntry: (id: string) => void
  onAddEntry?: (day: string, startTime: string, endTime: string) => void
  onCellClick?: (day: string, startTime: string, endTime: string) => void
  readOnly?: boolean
}) {
  const [activeEntry, setActiveEntry] = useState<any>(null)
  const todayIndex = getCurrentDayIndex()

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  )

  const entryMap = useMemo(() => {
    const map = new Map<string, any[]>()
    DAYS.forEach((_, di) => {
      PERIODS.forEach((_, pi) => {
        map.set(`${di}-${pi}`, [])
      })
    })
    entries?.forEach((e) => {
      const di = DAYS.indexOf(e.day_of_week)
      for (let pi = 0; pi < PERIODS.length; pi++) {
        const [sH, sM] = PERIODS[pi].start.split(':').map(Number)
        const [eH, eM] = PERIODS[pi].end.split(':').map(Number)
        const [tH, tM] = e.start_time.split(':').map(Number)
        const [teH, teM] = e.end_time.split(':').map(Number)
        const sMin = sH * 60 + sM
        const eMin = eH * 60 + eM
        const tMin = tH * 60 + tM
        const teMin = teH * 60 + teM
        if (tMin >= sMin && teMin <= eMin) {
          const existing = map.get(`${di}-${pi}`) ?? []
          existing.push(e)
          map.set(`${di}-${pi}`, existing)
          break
        }
      }
    })
    return map
  }, [entries])

  const handleDragStart = useCallback((event: any) => {
    setActiveEntry(event.active.data.current?.entry)
  }, [])

  const handleDragEnd = useCallback(
    (event: any) => {
      setActiveEntry(null)
      if (!event.over || !onUpdateEntry) return

      const entry = event.active.data.current?.entry
      const overId = event.over.id as string

      if (!overId.startsWith('cell-') || !entry) return

      const [_, diStr, piStr] = overId.split('-')
      const targetDayIndex = parseInt(diStr)
      const targetPeriodIndex = parseInt(piStr)

      const dayOfWeek = DAYS[targetDayIndex]
      const period = PERIODS[targetPeriodIndex]

      if (entry.day_of_week !== dayOfWeek || entry.start_time !== period.start) {
        onUpdateEntry(entry.id, {
          day_of_week: dayOfWeek,
          start_time: period.start,
          end_time: period.end,
        })
      }
    },
    [onUpdateEntry]
  )

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
        <table className="w-full min-w-[800px] table-fixed">
          <thead>
            <tr className="bg-gray-50/80">
              <th className="w-16 p-2 text-left text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                <Clock className="h-3 w-3 inline mr-1" />
                Time
              </th>
              {DAY_LABELS.map((label, i) => (
                <th
                  key={label}
                  className={`p-2 text-center text-[11px] font-semibold uppercase tracking-wider ${
                    i === todayIndex ? 'bg-edu-blue-50 text-edu-blue-700' : 'text-gray-500'
                  } border-b-2 ${i === todayIndex ? 'border-edu-blue-400' : 'border-gray-200'}`}
                >
                  {label}
                  {i === todayIndex && <span className="ml-1.5 inline-block w-1.5 h-1.5 rounded-full bg-edu-blue-500 animate-pulse" />}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {PERIODS.map((period, pi) => {
              const rowEntryCount = DAYS.reduce((sum, _, di) => sum + ((entryMap.get(`${di}-${pi}`) ?? []).length), 0)
              return (
                <tr
                  key={`period-${pi}`}
                  className={`border-t border-gray-100 transition-colors ${
                    rowEntryCount === 0 ? 'hover:bg-gray-50/50' : ''
                  }`}
                >
                  <td className="p-1 text-[10px] text-gray-400 text-right align-top pt-2 font-mono whitespace-nowrap">
                    {period.start}
                    <br />
                    <span className="text-[8px] text-gray-300">{period.end}</span>
                  </td>
                  {DAYS.map((day, di) => {
                    const cellEntries = entryMap.get(`${di}-${pi}`) ?? []
                    const isToday = di === todayIndex

                    if (readOnly) {
                      return (
                        <td
                          key={`${di}-${pi}`}
                          className={`border border-gray-100 p-0.5 min-h-[60px] w-[120px] ${
                            isToday ? 'bg-blue-50/30' : ''
                          }`}
                        >
                          {cellEntries.map((entry: any) => (
                            <div
                              key={entry.id}
                              className={`rounded-md border bg-gradient-to-br p-1.5 text-xs shadow-sm ${
                                getSubjectColor(entry.subject_id)
                              } ${isToday && getCurrentPeriodIndex() === pi ? 'ring-2 ring-amber-400 ring-offset-1' : ''}`}
                            >
                              <p className="font-semibold truncate text-[11px]">{entry.subjects?.name}</p>
                              <p className="opacity-75 truncate text-[10px]">
                                {entry.teachers?.profiles?.first_name}
                              </p>
                              <p className="opacity-60 font-mono text-[9px]">
                                {entry.start_time.slice(0, 5)}–{entry.end_time.slice(0, 5)}
                              </p>
                              {entry.room && <p className="opacity-60 text-[9px]">{entry.room}</p>}
                            </div>
                          ))}
                        </td>
                      )
                    }

                    return (
                      <DroppableCell key={`${di}-${pi}`} dayIndex={di} periodIndex={pi} isToday={isToday}>
                        <div className="flex flex-col gap-0.5 min-h-[60px]">
                          {cellEntries.map((entry: any) => (
                            <DraggableEntry
                              key={entry.id}
                              entry={entry}
                              dayIndex={di}
                              periodIndex={pi}
                              isToday={isToday}
                              onDelete={onDeleteEntry}
                              onEdit={onCellClick ? (e) => onCellClick(e.day_of_week, e.start_time, e.end_time) : () => {}}
                            />
                          ))}
                          {!onUpdateEntry || (
                            <button
                              onClick={() => onCellClick?.(day, period.start, period.end)}
                              className="flex-1 min-h-[20px] rounded border border-dashed border-transparent hover:border-gray-300 hover:bg-gray-50 transition-all flex items-center justify-center group"
                            >
                              <span className="text-gray-300 group-hover:text-gray-400 text-[10px]">+</span>
                            </button>
                          )}
                        </div>
                      </DroppableCell>
                    )
                  })}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <DragOverlay>
        {activeEntry ? <EntryOverlay entry={activeEntry} /> : null}
      </DragOverlay>
    </DndContext>
  )
}

export { DAYS, DAY_LABELS, PERIODS, getSubjectColor, getCurrentDayIndex, getCurrentPeriodIndex }
