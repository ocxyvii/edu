'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getLeaveRequests, approveLeaveRequest, rejectLeaveRequest, getUpcomingLeaves, getLeaveBalance } from '@/lib/actions/hr.actions'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import { CheckCircle, XCircle, CalendarDays, User, Loader2, Filter } from 'lucide-react'
import { format, differenceInDays } from 'date-fns'

const STATUS_STYLES: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-800',
  approved: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
  cancelled: 'bg-gray-100 text-gray-600',
}

const LEAVE_COLORS: Record<string, string> = {
  annual: 'bg-blue-500',
  sick: 'bg-red-500',
  maternity: 'bg-purple-500',
  paternity: 'bg-indigo-500',
  unpaid: 'bg-gray-500',
  emergency: 'bg-orange-500',
}

export function LeaveManagement() {
  const queryClient = useQueryClient()
  const [statusFilter, setStatusFilter] = useState('')
  const [rejectId, setRejectId] = useState<string | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [calendarMonth, setCalendarMonth] = useState(new Date().getMonth() + 1)
  const [calendarYear, setCalendarYear] = useState(new Date().getFullYear())
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null)

  const { data: requests, isLoading } = useQuery({
    queryKey: ['leave-requests', statusFilter],
    queryFn: () => getLeaveRequests({ status: statusFilter || undefined }),
    refetchInterval: 30000,
  })

  const { data: upcomingLeaves } = useQuery({
    queryKey: ['upcoming-leaves', calendarMonth, calendarYear],
    queryFn: () => getUpcomingLeaves(calendarMonth, calendarYear),
  })

  const approveMutation = useMutation({
    mutationFn: (id: string) => approveLeaveRequest(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leave-requests'] })
      queryClient.invalidateQueries({ queryKey: ['upcoming-leaves'] })
      toast.success('Leave request approved')
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const rejectMutation = useMutation({
    mutationFn: () => rejectLeaveRequest(rejectId!, rejectReason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leave-requests'] })
      setRejectId(null)
      setRejectReason('')
      toast.success('Leave request rejected')
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const daysInMonth = new Date(calendarYear, calendarMonth, 0).getDate()
  const calendarDays = Array.from({ length: daysInMonth }, (_, i) => i + 1)

  const leaveMap = new Map<string, { name: string; type: string }[]>()
  upcomingLeaves?.forEach((l: any) => {
    const start = new Date(l.start_date)
    const end = new Date(l.end_date)
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
      if (!leaveMap.has(key)) leaveMap.set(key, [])
      leaveMap.get(key)!.push({
        name: `${l.employees?.profiles?.first_name ?? ''} ${l.employees?.profiles?.last_name ?? ''}`,
        type: l.leave_type,
      })
    }
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[140px]">
            <Filter className="h-4 w-4 mr-2" /> <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value=" ">All Requests</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <CalendarDays className="h-4 w-4" />
            Leave Calendar — {format(new Date(calendarYear, calendarMonth - 1), 'MMMM yyyy')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 mb-3">
            <Button variant="outline" size="sm" onClick={() => {
              if (calendarMonth === 1) { setCalendarMonth(12); setCalendarYear(calendarYear - 1) }
              else setCalendarMonth(calendarMonth - 1)
            }}>Previous</Button>
            <Button variant="outline" size="sm" onClick={() => {
              if (calendarMonth === 12) { setCalendarMonth(1); setCalendarYear(calendarYear + 1) }
              else setCalendarMonth(calendarMonth + 1)
            }}>Next</Button>
          </div>
          <div className="grid grid-cols-7 gap-1 text-xs">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
              <div key={d} className="text-center font-medium text-muted-foreground py-1">{d}</div>
            ))}
            {Array.from({ length: new Date(calendarYear, calendarMonth - 1, 1).getDay() }, (_, i) => (
              <div key={`empty-${i}`} />
            ))}
            {calendarDays.map(day => {
              const key = `${calendarYear}-${String(calendarMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`
              const leaves = leaveMap.get(key) ?? []
              const isToday = new Date().toISOString().split('T')[0] === key
              return (
                <div key={day} className={`min-h-16 p-1 rounded border ${isToday ? 'border-blue-400 bg-blue-50' : 'border-gray-100'}`}>
                  <span className={`text-xs ${isToday ? 'font-bold text-blue-600' : ''}`}>{day}</span>
                  {leaves.slice(0, 2).map((l, i) => (
                    <div key={i} className={`${LEAVE_COLORS[l.type] ?? 'bg-gray-400'} text-white text-[10px] px-1 rounded mt-0.5 truncate`} title={l.name}>
                      {l.name.split(' ')[0]}
                    </div>
                  ))}
                  {leaves.length > 2 && <span className="text-[10px] text-muted-foreground">+{leaves.length - 2} more</span>}
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Leave Requests</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}</div>
          ) : requests?.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">No leave requests found.</p>
          ) : (
            <>
              {/* Mobile card list */}
              <div className="sm:hidden space-y-2">
                {requests?.map((r: any) => (
                  <div key={r.id} className="rounded-lg border border-gray-200 p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground shrink-0" />
                        <span className="text-sm font-medium">{r.employees?.profiles?.first_name} {r.employees?.profiles?.last_name}</span>
                      </div>
                      <Badge className={STATUS_STYLES[r.status] ?? ''}>{r.status}</Badge>
                    </div>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span className="capitalize">{r.leave_type}</span>
                      <span>{format(new Date(r.start_date), 'MMM d')} — {format(new Date(r.end_date), 'MMM d')}</span>
                    </div>
                    {r.reason && <p className="text-xs text-gray-500 line-clamp-2">{r.reason}</p>}
                    {r.status === 'pending' && (
                      <div className="flex gap-2 pt-1">
                        <Button size="sm" className="flex-1 bg-green-600 hover:bg-green-700 text-xs h-8" onClick={() => approveMutation.mutate(r.id)}>
                          <CheckCircle className="h-3.5 w-3.5 mr-1" /> Approve
                        </Button>
                        <Button size="sm" variant="outline" className="flex-1 text-red-600 border-red-200 text-xs h-8" onClick={() => setRejectId(r.id)}>
                          <XCircle className="h-3.5 w-3.5 mr-1" /> Reject
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
              {/* Desktop table */}
              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4 font-medium">Employee</th>
                      <th className="text-left py-3 px-4 font-medium">Type</th>
                      <th className="text-left py-3 px-4 font-medium">Dates</th>
                      <th className="text-center py-3 px-4 font-medium">Days</th>
                      <th className="text-left py-3 px-4 font-medium">Reason</th>
                      <th className="text-center py-3 px-4 font-medium">Status</th>
                      <th className="text-right py-3 px-4 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {requests?.map((r: any) => (
                      <tr key={r.id} className="border-t hover:bg-gray-50">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-muted-foreground shrink-0" />
                            <span className="font-medium">{r.employees?.profiles?.first_name} {r.employees?.profiles?.last_name}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4 capitalize">{r.leave_type}</td>
                        <td className="py-3 px-4 text-muted-foreground whitespace-nowrap">
                          {format(new Date(r.start_date), 'MMM d')} — {format(new Date(r.end_date), 'MMM d, yyyy')}
                        </td>
                        <td className="py-3 px-4 text-center font-medium">{r.days}</td>
                        <td className="py-3 px-4 max-w-[200px] truncate">{r.reason}</td>
                        <td className="py-3 px-4 text-center">
                          <Badge className={STATUS_STYLES[r.status] ?? ''}>{r.status}</Badge>
                        </td>
                        <td className="py-3 px-4 text-right">
                          {r.status === 'pending' && (
                            <div className="flex gap-1 justify-end">
                              <Button variant="ghost" size="sm" className="text-green-600 h-8 w-8 p-0" onClick={() => approveMutation.mutate(r.id)} title="Approve">
                                <CheckCircle className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="sm" className="text-red-600 h-8 w-8 p-0" onClick={() => setRejectId(r.id)} title="Reject">
                                <XCircle className="h-4 w-4" />
                              </Button>
                            </div>
                          )}
                          {r.status !== 'pending' && <span className="text-xs text-muted-foreground">{r.approved_at ? format(new Date(r.approved_at), 'MMM d') : ''}</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!rejectId} onOpenChange={(o) => { if (!o) { setRejectId(null); setRejectReason('') } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Leave Request</DialogTitle>
            <DialogDescription>Provide a reason for rejecting this leave request</DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <Input value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} placeholder="Reason for rejection" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setRejectId(null); setRejectReason('') }}>Cancel</Button>
            <Button variant="destructive" onClick={() => rejectMutation.mutate()} disabled={!rejectReason || rejectMutation.isPending}>
              {rejectMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Reject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
