'use client'

import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getTimetableForStudent } from '@/lib/actions/timetable.actions'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { Clock, MapPin, ChevronRight, BookOpen } from 'lucide-react'
import TimetableGrid, { getCurrentDayIndex, getCurrentPeriodIndex, DAYS, DAY_LABELS } from '@/components/timetable/TimetableGrid'

export default function StudentTimetablePage() {
  const { data: entries, isLoading } = useQuery({
    queryKey: ['student-timetable'],
    queryFn: () => getTimetableForStudent(),
  })

  const todayIndex = getCurrentDayIndex()
  const currentPeriodIndex = getCurrentPeriodIndex()
  const todayStr = todayIndex >= 0 ? DAYS[todayIndex] : null

  const todayEntries = useMemo(() => {
    if (!todayStr || !entries) return []
    return entries
      .filter((e: any) => e.day_of_week === todayStr)
      .sort((a, b) => a.start_time.localeCompare(b.start_time))
  }, [entries, todayStr])

  const nextClass = useMemo(() => {
    if (!todayEntries.length || currentPeriodIndex < 0) return null
    const nowMin = new Date().getHours() * 60 + new Date().getMinutes()
    const upcoming = todayEntries.filter((e: any) => {
      const [h, m] = e.start_time.split(':').map(Number)
      return h * 60 + m > nowMin
    })
    return upcoming.length > 0 ? upcoming[0] : null
  }, [todayEntries, currentPeriodIndex])

  const currentClass = useMemo(() => {
    if (!todayEntries.length || currentPeriodIndex < 0) return null
    const nowMin = new Date().getHours() * 60 + new Date().getMinutes()
    return todayEntries.find((e: any) => {
      const [sH, sM] = e.start_time.split(':').map(Number)
      const [eH, eM] = e.end_time.split(':').map(Number)
      return nowMin >= sH * 60 + sM && nowMin < eH * 60 + eM
    }) ?? null
  }, [todayEntries, currentPeriodIndex])

  const dayEntries = useMemo(() => {
    const map: Record<string, typeof entries> = {}
    DAYS.forEach((d: any) => { map[d] = [] })
    entries?.forEach((e: any) => {
      if (map[e.day_of_week]) map[e.day_of_week].push(e)
    })
    return map
  }, [entries])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">My Timetable</h1>
        <p className="text-gray-500 mt-1">Your weekly class schedule</p>
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
                      {currentClass.teachers?.profiles?.first_name} {currentClass.teachers?.profiles?.last_name}
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
                      {nextClass.teachers?.profiles?.first_name} {nextClass.teachers?.profiles?.last_name}
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

      {isLoading ? (
        <Skeleton className="h-96 w-full" />
      ) : !entries?.length ? (
        <Card>
          <CardContent className="py-16 text-center text-muted-foreground">
            <BookOpen className="h-10 w-10 mx-auto mb-3 text-gray-300" />
            <p className="font-medium">No timetable published yet</p>
            <p className="text-sm mt-1">Your schedule will appear here once your school publishes the timetable</p>
          </CardContent>
        </Card>
      ) : (
        <TimetableGrid
          entries={entries}
          onDeleteEntry={() => {}}
          readOnly
        />
      )}

      {/* Day-by-day list view */}
      {entries && entries.length > 0 && (
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
                            <p className="text-xs text-muted-foreground truncate">
                              {e.teachers?.profiles?.first_name} {e.teachers?.profiles?.last_name}
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
