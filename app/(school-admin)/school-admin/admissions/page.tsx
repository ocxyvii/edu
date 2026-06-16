'use client'

import { useState, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getApplications, getApplicationStats, reviewApplication, getClassesForSchool,
} from '@/lib/actions/admissions.actions'
import { ApplicationStats } from '@/components/admissions/ApplicationStats'
import { ApplicationDetail } from './ApplicationDetail'
import { EnrollDialog } from './EnrollDialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Search, User, Phone, CalendarDays, FileText, ExternalLink,
  CheckCircle2, XCircle, Loader2, Download,
} from 'lucide-react'
import { format } from 'date-fns'
import { toast } from 'sonner'
import type { Application } from '@/types/admissions.types'

const statusConfig: Record<string, { label: string; class: string }> = {
  pending: { label: 'Pending', class: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
  reviewing: { label: 'Reviewing', class: 'bg-blue-100 text-blue-800 border-blue-200' },
  approved: { label: 'Approved', class: 'bg-green-100 text-green-800 border-green-200' },
  rejected: { label: 'Rejected', class: 'bg-red-100 text-red-800 border-red-200' },
  waitlisted: { label: 'Waitlisted', class: 'bg-purple-100 text-purple-800 border-purple-200' },
  enrolled: { label: 'Enrolled', class: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
}

const statusTabs = [
  { value: 'all', label: 'All' },
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'enrolled', label: 'Enrolled' },
] as const

export default function AdmissionsPage() {
  const queryClient = useQueryClient()
  const [statusFilter, setStatusFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [selectedApp, setSelectedApp] = useState<Application | null>(null)
  const [enrollApp, setEnrollApp] = useState<Application | null>(null)
  const [rejectApp, setRejectApp] = useState<Application | null>(null)
  const [rejectReason, setRejectReason] = useState('')

  const { data: applications, isLoading } = useQuery({
    queryKey: ['admissions', statusFilter, search],
    queryFn: () => getApplications({ status: statusFilter, search }),
  })

  const reviewMutation = useMutation({
    mutationFn: (data: { id: string; status: string; notes?: string }) =>
      reviewApplication({ id: data.id, status: data.status as any, notes: data.notes }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admissions'] })
      queryClient.invalidateQueries({ queryKey: ['application-stats'] })
      queryClient.invalidateQueries({ queryKey: ['application', selectedApp?.id] })
      toast.success('Application updated')
      setSelectedApp(null)
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const handleApprove = useCallback((id: string) => {
    reviewMutation.mutate({ id, status: 'approved' })
  }, [reviewMutation])

  const handleReject = useCallback(() => {
    if (!rejectApp) return
    reviewMutation.mutate({ id: rejectApp.id, status: 'rejected', notes: rejectReason || undefined })
    setRejectApp(null)
    setRejectReason('')
  }, [rejectApp, rejectReason, reviewMutation])

  const getDocCount = (app: Application) => {
    try {
      const docs = typeof app.documents === 'string' ? JSON.parse(app.documents) : app.documents
      return Array.isArray(docs) ? docs.length : 0
    } catch { return 0 }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Admissions</h1>
        <p className="text-gray-600 mt-1">Manage student applications and enrollment</p>
      </div>

      <ApplicationStats />

      <Card>
        <CardContent className="pt-6">
          {/* Search + Filter tabs */}
          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, parent, email, or phone..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          <div className="flex gap-1 mb-5 overflow-x-auto pb-1">
            {statusTabs.map((tab: any) => (
              <button
                key={tab.value}
                onClick={() => setStatusFilter(tab.value)}
                className={`px-3 py-1.5 text-sm rounded-lg whitespace-nowrap transition-colors ${
                  statusFilter === tab.value
                    ? 'bg-edu-blue-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* List */}
          {isLoading ? (
            <div className="space-y-3">{[...Array(5)].map((_: any, i: any) => <Skeleton key={i} className="h-20 w-full rounded-lg" />)}</div>
          ) : applications && applications.length > 0 ? (
            <div className="space-y-2">
              {applications.map((app: Application) => {
                const status = statusConfig[app.status] || statusConfig.pending
                const docCount = getDocCount(app)
                return (
                  <div
                    key={app.id}
                    className="flex items-center gap-4 p-4 rounded-lg border hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() => setSelectedApp(app)}
                  >
                    <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                      <User className="h-5 w-5 text-blue-600" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-gray-900 truncate">{app.student_name}</p>
                      <p className="text-sm text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-0.5">
                        <span>{app.applying_for_class}</span>
                        <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{app.parent_phone}</span>
                        {docCount > 0 && (
                          <span className="flex items-center gap-1"><FileText className="h-3 w-3" />{docCount} files</span>
                        )}
                      </p>
                    </div>
                    <div className="hidden sm:block text-right text-xs text-muted-foreground shrink-0">
                      <p>{app.parent_name}</p>
                      <p className="flex items-center gap-1 justify-end mt-0.5">
                        <CalendarDays className="h-3 w-3" />
                        {format(new Date(app.created_at), 'MMM d, yyyy')}
                      </p>
                    </div>
                    <Badge variant="outline" className={`shrink-0 ${status.class}`}>
                      {status.label}
                    </Badge>
                    <Button variant="ghost" size="icon" className="shrink-0" onClick={(e) => { e.stopPropagation(); setSelectedApp(app) }}>
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <User className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p className="font-medium">No applications found</p>
              <p className="text-sm mt-1">
                {search || statusFilter !== 'all'
                  ? 'Try adjusting your search or filters'
                  : 'Applications submitted through the public form will appear here'}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detail side panel */}
      {selectedApp && (
        <ApplicationDetail
          application={selectedApp}
          onClose={() => setSelectedApp(null)}
          onApprove={(id) => handleApprove(id)}
          onReject={(app) => { setRejectApp(app); setRejectReason('') }}
          onEnroll={(app) => { setEnrollApp(app); setSelectedApp(null) }}
        />
      )}

      {/* Reject dialog */}
      {rejectApp && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setRejectApp(null)}>
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-semibold text-gray-900">Reject Application</h2>
            <p className="text-sm text-gray-500">Provide a reason for rejecting <strong>{rejectApp.student_name}</strong>&apos;s application.</p>
            <textarea
              className="w-full rounded-lg border border-gray-300 p-3 text-sm min-h-[100px] focus:outline-none focus:ring-2 focus:ring-red-500"
              placeholder="Reason for rejection..."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              required
            />
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setRejectApp(null)}>Cancel</Button>
              <Button
                variant="destructive"
                onClick={handleReject}
                disabled={!rejectReason.trim() || reviewMutation.isPending}
              >
                {reviewMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <XCircle className="h-4 w-4 mr-1.5" />}
                Confirm Reject
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Enroll dialog */}
      {enrollApp && (
        <EnrollDialog
          application={enrollApp}
          onClose={() => setEnrollApp(null)}
          onComplete={() => {
            queryClient.invalidateQueries({ queryKey: ['admissions'] })
            queryClient.invalidateQueries({ queryKey: ['application-stats'] })
          }}
        />
      )}
    </div>
  )
}
