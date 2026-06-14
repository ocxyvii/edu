'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getBookIssues, returnBook, calculateFine, getOverdueIssues } from '@/lib/actions/library.actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'
import { BookOpen, User, Calendar, Clock, AlertTriangle, CheckCircle, Loader2, Search, Filter } from 'lucide-react'
import { format, differenceInDays } from 'date-fns'

export function ActiveIssues() {
  const queryClient = useQueryClient()
  const [statusFilter, setStatusFilter] = useState('')
  const [search, setSearch] = useState('')
  const [returningIssueId, setReturningIssueId] = useState<string | null>(null)
  const [fineInfo, setFineInfo] = useState<{ fine: number; daysOverdue: number; finePerDay: number } | null>(null)

  const { data: issues, isLoading } = useQuery({
    queryKey: ['library-issues', statusFilter],
    queryFn: () => getBookIssues({ status: statusFilter || undefined }),
    refetchInterval: 30000,
  })

  const returnMutation = useMutation({
    mutationFn: async () => {
      if (fineInfo && fineInfo.fine > 0) {
        await returnBook(returningIssueId!, fineInfo.fine)
      } else {
        await returnBook(returningIssueId!)
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['library-issues'] })
      queryClient.invalidateQueries({ queryKey: ['library-books'] })
      queryClient.invalidateQueries({ queryKey: ['library-stats'] })
      setReturningIssueId(null)
      setFineInfo(null)
      toast.success('Book returned successfully')
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const handleReturnClick = async (issueId: string) => {
    setReturningIssueId(issueId)
    try {
      const fine = await calculateFine(issueId)
      setFineInfo(fine)
    } catch {
      setFineInfo({ fine: 0, daysOverdue: 0, finePerDay: 0 })
    }
  }

  const filtered = search
    ? issues?.filter((i: any) =>
        `${i.profiles?.first_name ?? ''} ${i.profiles?.last_name ?? ''} ${i.books?.title ?? ''}`
          .toLowerCase().includes(search.toLowerCase())
      )
    : issues

  const getDaysInfo = (dueDate: string) => {
    const due = new Date(dueDate)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const diff = differenceInDays(due, today)
    return { days: Math.abs(diff), overdue: diff < 0, dueToday: diff === 0 }
  }

  const getStatusColor = (daysInfo: { days: number; overdue: boolean; dueToday: boolean }) => {
    if (daysInfo.overdue) return 'text-red-600 bg-red-50'
    if (daysInfo.dueToday || daysInfo.days <= 2) return 'text-amber-600 bg-amber-50'
    return 'text-green-600 bg-green-50'
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by member or book..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[140px]">
            <Filter className="h-4 w-4 mr-2" /> <SelectValue placeholder="All Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value=" ">All Issues</SelectItem>
            <SelectItem value="issued">Active</SelectItem>
            <SelectItem value="overdue">Overdue</SelectItem>
            <SelectItem value="returned">Returned</SelectItem>
            <SelectItem value="lost">Lost</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="space-y-2">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
      ) : filtered?.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">No book issues found.</CardContent></Card>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b">
                <th className="text-left py-3 px-4 font-medium">Member</th>
                <th className="text-left py-3 px-4 font-medium">Book</th>
                <th className="text-left py-3 px-4 font-medium">Issued</th>
                <th className="text-left py-3 px-4 font-medium">Due Date</th>
                <th className="text-center py-3 px-4 font-medium">Status</th>
                <th className="text-right py-3 px-4 font-medium">Fine</th>
                <th className="text-right py-3 px-4 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered?.map((issue: any) => {
                const daysInfo = getDaysInfo(issue.due_date)
                const isActive = issue.status === 'issued' || issue.status === 'overdue'
                return (
                  <tr key={issue.id} className={`border-t hover:bg-gray-50 ${daysInfo.overdue && isActive ? 'bg-red-50/50' : ''}`}>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="font-medium">{issue.profiles?.first_name} {issue.profiles?.last_name}</p>
                          <p className="text-xs text-muted-foreground capitalize">{issue.member_type}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <BookOpen className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="font-medium">{issue.books?.title}</p>
                          <p className="text-xs text-muted-foreground">{issue.books?.author}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-muted-foreground">
                      {issue.issue_date ? format(new Date(issue.issue_date), 'MMM d') : '-'}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <Calendar className={`h-4 w-4 ${daysInfo.overdue ? 'text-red-500' : 'text-muted-foreground'}`} />
                        <span className={daysInfo.overdue ? 'text-red-600 font-medium' : ''}>
                          {format(new Date(issue.due_date), 'MMM d, yyyy')}
                        </span>
                      </div>
                      {isActive && (
                        <span className={`text-xs px-1.5 py-0.5 rounded mt-0.5 inline-block ${getStatusColor(daysInfo)}`}>
                          {daysInfo.overdue
                            ? `${daysInfo.days} day${daysInfo.days > 1 ? 's' : ''} overdue`
                            : daysInfo.dueToday
                              ? 'Due today'
                              : `${daysInfo.days} day${daysInfo.days > 1 ? 's' : ''} left`}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <Badge className={
                        issue.status === 'returned' ? 'bg-green-100 text-green-800' :
                        issue.status === 'overdue' ? 'bg-red-100 text-red-800' :
                        issue.status === 'lost' ? 'bg-gray-100 text-gray-800' :
                        'bg-blue-100 text-blue-800'
                      }>{issue.status}</Badge>
                    </td>
                    <td className="py-3 px-4 text-right font-medium">
                      {issue.fine_amount > 0 ? `KES ${Number(issue.fine_amount).toLocaleString()}` : '-'}
                    </td>
                    <td className="py-3 px-4 text-right">
                      {issue.status === 'issued' || issue.status === 'overdue' ? (
                        <Button
                          variant={daysInfo.overdue ? 'destructive' : 'outline'}
                          size="sm"
                          onClick={() => handleReturnClick(issue.id)}
                        >
                          <CheckCircle className="h-4 w-4 mr-1" /> Return
                        </Button>
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          Returned {issue.return_date ? format(new Date(issue.return_date), 'MMM d') : ''}
                        </span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={!!returningIssueId} onOpenChange={(o) => { if (!o) { setReturningIssueId(null); setFineInfo(null) } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Return Book</DialogTitle>
            <DialogDescription>Confirm book return and review any fines</DialogDescription>
          </DialogHeader>
          {fineInfo && (
            <div className="space-y-4 py-2">
              {fineInfo.daysOverdue > 0 ? (
                <div className="p-4 rounded-lg bg-red-50 border border-red-200 space-y-2">
                  <div className="flex items-center gap-2 text-red-700">
                    <AlertTriangle className="h-5 w-5" />
                    <span className="font-medium">Book is overdue</span>
                  </div>
                  <Separator />
                  <div className="space-y-1 text-sm">
                    <p className="flex justify-between"><span>Days overdue</span><span className="font-medium">{fineInfo.daysOverdue}</span></p>
                    <p className="flex justify-between"><span>Fine per day</span><span className="font-medium">KES {fineInfo.finePerDay}</span></p>
                    <Separator />
                    <p className="flex justify-between text-base"><span>Total fine</span><span className="font-bold text-red-600">KES {fineInfo.fine.toLocaleString()}</span></p>
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-lg bg-green-50 border border-green-200 flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <span className="text-green-700 font-medium">Returned on time. No fine.</span>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => { setReturningIssueId(null); setFineInfo(null) }}>Cancel</Button>
            <Button
              onClick={() => returnMutation.mutate()}
              disabled={returnMutation.isPending}
            >
              {returnMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Confirm Return
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
