'use client'

import { useState, useRef, useCallback, useEffect, useMemo } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { saveMarks } from '@/lib/actions/marks.actions'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { Save, Loader2, Check, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Student {
  id: string
  admission_number: string
  profiles: {
    first_name: string
    last_name: string
  }
}

interface ExistingResult {
  student_id: string
  marks_obtained: number
  grade: string
}

interface SubjectColumn {
  subject_id: string
  subject_name: string
  subject_code: string
  max_marks: number
  pass_marks: number
}

interface MarksEntryTableProps {
  examId: string
  students: Student[]
  subjects: SubjectColumn[]
  existingResults: ExistingResult[]
  onPublish?: () => void
  isPublishing?: boolean
}

export function MarksEntryTable({
  examId,
  students,
  subjects,
  existingResults,
  onPublish,
  isPublishing,
}: MarksEntryTableProps) {
  const queryClient = useQueryClient()
  const resultMap = useMemo(() => {
    const map = new Map<string, ExistingResult>()
    existingResults.forEach((r: any) => map.set(r.student_id, r))
    return map
  }, [existingResults])

  const [marks, setMarks] = useState<Record<string, Record<string, string>>>(() => {
    const initial: Record<string, Record<string, string>> = {}
    students.forEach((s: any) => {
      initial[s.id] = {}
      subjects.forEach((sub: any) => {
        const existing = resultMap.get(s.id)
        if (existing && existing.marks_obtained !== undefined) {
          initial[s.id][sub.subject_id] = String(existing.marks_obtained)
        } else {
          initial[s.id][sub.subject_id] = ''
        }
      })
    })
    return initial
  })

  const [dirtyCells, setDirtyCells] = useState<Set<string>>(new Set())
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const inputRefs = useRef<Map<string, HTMLInputElement | null>>(new Map())
  const autoSaveTimer = useRef<NodeJS.Timeout | null>(null)

  const subjectKeys = subjects.map((s: any) => s.subject_id)

  function getCellKey(studentId: string, subjectId: string) {
    return `${studentId}:${subjectId}`
  }

  function getNextCell(studentId: string, subjectIdx: number): { id: string; studentId: string; subjectIdx: number } | null {
    const studentIdx = students.findIndex(s => s.id === studentId)
    if (subjectIdx < subjectKeys.length - 1) {
      return { id: getCellKey(studentId, subjectKeys[subjectIdx + 1]), studentId, subjectIdx: subjectIdx + 1 }
    }
    if (studentIdx < students.length - 1) {
      return { id: getCellKey(students[studentIdx + 1].id, subjectKeys[0]), studentId: students[studentIdx + 1].id, subjectIdx: 0 }
    }
    return null
  }

  const saveMutation = useMutation({
    mutationFn: async () => {
      setSaveStatus('saving')
      const entries: { student_id: string; subject_id: string; marks_obtained: number }[] = []
      for (const studentId of Object.keys(marks)) {
        for (const subjectId of subjectKeys) {
          const val = marks[studentId]?.[subjectId]
          if (val !== undefined && val !== '') {
            entries.push({ student_id: studentId, subject_id: subjectId, marks_obtained: parseFloat(val) })
          }
        }
      }
      if (entries.length === 0) {
        toast.error('No marks to save')
        return
      }

      const result = await saveMarks({
        examId,
        entries,
      })
      return result
    },
    onSuccess: () => {
      setDirtyCells(new Set())
      setLastSaved(new Date())
      setSaveStatus('saved')
      queryClient.invalidateQueries({ queryKey: ['exam-marks', examId] })
      setTimeout(() => {
        if (saveStatus === 'saved') setSaveStatus('idle')
      }, 2000)
    },
    onError: (err: Error) => {
      setSaveStatus('error')
      toast.error(err.message)
    },
  })

  const debouncedSave = useCallback(() => {
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current)
    autoSaveTimer.current = setTimeout(() => {
      if (dirtyCells.size > 0) {
        saveMutation.mutate()
      }
    }, 30000)
  }, [dirtyCells, saveMutation])

  useEffect(() => {
    if (dirtyCells.size > 0) {
      debouncedSave()
    }
    return () => {
      if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current)
    }
  }, [dirtyCells, debouncedSave])

  function handleMarksChange(studentId: string, subjectId: string, value: string) {
    setMarks(prev => ({
      ...prev,
      [studentId]: { ...prev[studentId], [subjectId]: value },
    }))
    setDirtyCells(prev => new Set(prev).add(getCellKey(studentId, subjectId)))
    setSaveStatus('idle')
  }

  function handleKeyDown(e: React.KeyboardEvent, studentId: string, subjectIdx: number) {
    if (e.key === 'Tab' || e.key === 'Enter') {
      e.preventDefault()
      const next = e.shiftKey
        ? (subjectIdx > 0
          ? { id: getCellKey(studentId, subjectKeys[subjectIdx - 1]), studentId, subjectIdx: subjectIdx - 1 }
          : null)
        : getNextCell(studentId, subjectIdx)

      if (next) {
        const key = next.id
        const el = inputRefs.current.get(key)
        if (el) {
          el.focus()
          el.select()
        }
      }
    }
  }

  function getGrade(marksVal: string, maxMarks: number): string {
    const num = parseFloat(marksVal)
    if (isNaN(num)) return '-'
    const percentage = (num / maxMarks) * 100
    if (percentage >= 80) return 'A'
    if (percentage >= 65) return 'B'
    if (percentage >= 50) return 'C'
    if (percentage >= 40) return 'D'
    return 'F'
  }

  const allSaved = useMemo(() => {
    return students.every((s: any) => {
      return subjects.every((sub: any) => {
        const key = getCellKey(s.id, sub.subject_id)
        return !dirtyCells.has(key)
      })
    }) && students.length > 0
  }, [students, subjects, dirtyCells])

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending || dirtyCells.size === 0}
          >
            {saveMutation.isPending ? (
              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-1" />
            )}
            Save Marks
          </Button>
          {saveStatus === 'saving' && (
            <Badge variant="outline" className="text-yellow-600 border-yellow-300">
              <Loader2 className="h-3 w-3 mr-1 animate-spin" /> Saving...
            </Badge>
          )}
          {saveStatus === 'saved' && (
            <Badge className="bg-green-100 text-green-800">
              <Check className="h-3 w-3 mr-1" /> Saved
            </Badge>
          )}
          {saveStatus === 'error' && (
            <Badge className="bg-red-100 text-red-800">
              <AlertCircle className="h-3 w-3 mr-1" /> Save Failed
            </Badge>
          )}
          {dirtyCells.size > 0 && (
            <span className="text-xs text-yellow-600">{dirtyCells.size} unsaved change{dirtyCells.size > 1 ? 's' : ''}</span>
          )}
          {lastSaved && saveStatus !== 'saving' && (
            <span className="text-xs text-muted-foreground">Last saved: {lastSaved.toLocaleTimeString()}</span>
          )}
        </div>

        {onPublish && (
          <Button size="sm" onClick={onPublish} disabled={isPublishing || !allSaved}>
            {isPublishing && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
            Publish Results
          </Button>
        )}
      </div>

      <div className="overflow-x-auto border rounded-lg">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase sticky left-0 bg-gray-50 z-10 w-10">#</th>
              <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase sticky left-10 bg-gray-50 z-10 min-w-[180px]">Student</th>
              <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase sticky left-[190px] bg-gray-50 z-10 w-24">Admission</th>
              {subjects.map((sub: any) => (
                <th key={sub.subject_id} className="text-center py-3 px-2 text-xs font-medium text-gray-500 uppercase min-w-[120px]">
                  {sub.subject_code}<br />
                  <span className="text-[10px] font-normal">Max {sub.max_marks}</span>
                </th>
              ))}
              <th className="text-center py-3 px-4 text-xs font-medium text-gray-500 uppercase w-20">Total</th>
              <th className="text-center py-3 px-4 text-xs font-medium text-gray-500 uppercase w-16">Avg</th>
              <th className="text-center py-3 px-4 text-xs font-medium text-gray-500 uppercase w-16">Grade</th>
            </tr>
          </thead>
          <tbody>
            {students.map((student, studentIdx) => {
              let studentTotal = 0
              let studentMax = 0
              let studentCount = 0

              return (
                <tr key={student.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-2 px-4 text-sm text-gray-500 text-center sticky left-0 bg-white hover:bg-gray-50">{studentIdx + 1}</td>
                  <td className="py-2 px-4 text-sm font-medium sticky left-10 bg-white hover:bg-gray-50">
                    {student.profiles.first_name} {student.profiles.last_name}
                  </td>
                  <td className="py-2 px-4 text-sm text-gray-500 sticky left-[190px] bg-white hover:bg-gray-50">
                    {student.admission_number}
                  </td>
                  {subjects.map((sub, subIdx) => {
                    const val = marks[student.id]?.[sub.subject_id] ?? ''
                    const numVal = parseFloat(val)
                    const isOverMax = !isNaN(numVal) && numVal > sub.max_marks
                    const marksValid = !isNaN(numVal) && numVal >= 0

                    if (marksValid) {
                      studentTotal += numVal
                      studentMax += sub.max_marks
                      studentCount++
                    }

                    const grade = getGrade(val, sub.max_marks)

                    return (
                      <td key={sub.subject_id} className="py-2 px-2 text-center">
                        <div className="relative flex items-center justify-center gap-1">
                          <Input
                            ref={el => { inputRefs.current.set(getCellKey(student.id, sub.subject_id), el) }}
                            type="number"
                            step="0.5"
                            min={0}
                            max={sub.max_marks}
                            value={val}
                            onChange={e => handleMarksChange(student.id, sub.subject_id, e.target.value)}
                            onKeyDown={e => handleKeyDown(e, student.id, subIdx)}
                            className={cn(
                              'w-20 h-8 text-center text-sm',
                              isOverMax && 'border-red-500 bg-red-50 text-red-700 focus-visible:ring-red-500'
                            )}
                          />
                          <span className={cn(
                            'text-[10px] font-semibold w-5',
                            grade === 'A' ? 'text-green-600' :
                            grade === 'B' ? 'text-blue-600' :
                            grade === 'C' ? 'text-yellow-600' :
                            grade === 'D' ? 'text-orange-600' :
                            grade === 'F' ? 'text-red-600' : 'text-gray-300'
                          )}>
                            {grade}
                          </span>
                        </div>
                      </td>
                    )
                  })}
                  <td className="py-2 px-4 text-sm text-center font-medium">{studentTotal}</td>
                  <td className="py-2 px-4 text-sm text-center">
                    {studentCount > 0 ? (studentTotal / studentCount).toFixed(1) : '-'}
                  </td>
                  <td className="py-2 px-4 text-center">
                    <Badge className={cn(
                      studentCount > 0 && studentTotal / studentCount >= 80 ? 'bg-green-100 text-green-800' :
                      studentCount > 0 && studentTotal / studentCount >= 65 ? 'bg-blue-100 text-blue-800' :
                      studentCount > 0 && studentTotal / studentCount >= 50 ? 'bg-yellow-100 text-yellow-800' :
                      studentCount > 0 && studentTotal / studentCount >= 40 ? 'bg-orange-100 text-orange-800' :
                      studentCount > 0 ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-400'
                    )}>
                      {studentCount > 0 ? getGrade(String(studentTotal / studentCount * 100), 100) : '-'}
                    </Badge>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
