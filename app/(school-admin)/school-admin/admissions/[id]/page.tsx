'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getApplication, reviewApplication, getClassesForSchool,
} from '@/lib/actions/admissions.actions'
import { EnrollDialog } from '../EnrollDialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import {
  ArrowLeft, CheckCircle, XCircle, Clock, UserPlus, Loader2,
  Phone, Mail, CalendarDays, MapPin, FileText, ImageIcon, ExternalLink,
} from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'
import { format } from 'date-fns'

const statusConfig: Record<string, { label: string; class: string }> = {
  pending: { label: 'Pending', class: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
  reviewing: { label: 'Reviewing', class: 'bg-blue-100 text-blue-800 border-blue-200' },
  approved: { label: 'Approved', class: 'bg-green-100 text-green-800 border-green-200' },
  rejected: { label: 'Rejected', class: 'bg-red-100 text-red-800 border-red-200' },
  waitlisted: { label: 'Waitlisted', class: 'bg-purple-100 text-purple-800 border-purple-200' },
  enrolled: { label: 'Enrolled', class: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
}

export default function ApplicationDetailPage() {
  const params = useParams()
  const router = useRouter()
  const queryClient = useQueryClient()
  const id = params.id as string

  const [notes, setNotes] = useState('')
  const [enrollOpen, setEnrollOpen] = useState(false)
  const [rejectOpen, setRejectOpen] = useState(false)
  const [rejectReason, setRejectReason] = useState('')

  const { data: app, isLoading } = useQuery({
    queryKey: ['application', id],
    queryFn: () => getApplication(id),
  })

  const reviewMutation = useMutation({
    mutationFn: (data: { status: string; notes?: string }) =>
      reviewApplication({ id, status: data.status as any, notes: data.notes }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['application', id] })
      queryClient.invalidateQueries({ queryKey: ['admissions'] })
      queryClient.invalidateQueries({ queryKey: ['application-stats'] })
      toast.success(`Application ${data.status}`)
      setNotes('')
    },
    onError: (err: Error) => toast.error(err.message),
  })

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  if (!app) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-bold">Application not found</h2>
        <Button className="mt-4" asChild><Link href="/school-admin/admissions">Back to Admissions</Link></Button>
      </div>
    )
  }

  const status = statusConfig[app.status] || statusConfig.pending
  const docs = (() => {
    try {
      const d = typeof app.documents === 'string' ? JSON.parse(app.documents) : app.documents
      return Array.isArray(d) ? d : []
    } catch { return [] }
  })()

  const isActionable = ['pending', 'reviewing'].includes(app.status)
  const canEnroll = app.status === 'approved'

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/school-admin/admissions"><ArrowLeft className="h-5 w-5" /></Link>
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">{app.student_name}</h1>
            <Badge variant="outline" className={status.class}>{status.label}</Badge>
          </div>
          <p className="text-muted-foreground mt-1">Applied for {app.applying_for_class}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader><CardTitle className="text-base">Student Information</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-2 gap-4 text-sm">
              <div><p className="text-muted-foreground">Full Name</p><p className="font-medium">{app.student_name}</p></div>
              <div><p className="text-muted-foreground">Date of Birth</p><p className="font-medium">{app.date_of_birth ? format(new Date(app.date_of_birth), 'MMM d, yyyy') : '—'}</p></div>
              <div><p className="text-muted-foreground">Gender</p><p className="font-medium capitalize">{app.gender || '—'}</p></div>
              <div><p className="text-muted-foreground">Applying for Class</p><p className="font-medium">{app.applying_for_class}</p></div>
              <div className="col-span-2"><p className="text-muted-foreground">Previous School</p><p className="font-medium">{app.previous_school || 'None'}</p></div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Parent / Guardian</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-2 gap-4 text-sm">
              <div><p className="text-muted-foreground">Name</p><p className="font-medium">{app.parent_name}</p></div>
              <div><p className="text-muted-foreground">Phone</p><p className="font-medium flex items-center gap-1.5"><Phone className="h-3.5 w-3.5 text-muted-foreground" />{app.parent_phone}</p></div>
              <div><p className="text-muted-foreground">Email</p><p className="font-medium flex items-center gap-1.5"><Mail className="h-3.5 w-3.5 text-muted-foreground" />{app.parent_email || '—'}</p></div>
              <div><p className="text-muted-foreground">Address</p><p className="font-medium flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5 text-muted-foreground" />{app.address || '—'}</p></div>
            </CardContent>
          </Card>

          {docs.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-base">Documents ({docs.length})</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {docs.map((doc: any, i: number) => (
                    <div key={i} className="flex items-center justify-between p-3 rounded-lg border">
                      <div className="flex items-center gap-3 min-w-0">
                        {doc.type?.startsWith('image/') ? <ImageIcon className="h-8 w-8 text-blue-500 flex-shrink-0" /> : <FileText className="h-8 w-8 text-red-500 flex-shrink-0" />}
                        <span className="text-sm truncate">{doc.name}</span>
                      </div>
                      <a href={doc.url} target="_blank" rel="noopener noreferrer">
                        <Button variant="outline" size="sm"><ExternalLink className="h-3.5 w-3.5" /></Button>
                      </a>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader><CardTitle className="text-base">Notes</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                placeholder="Add notes about this application..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={4}
              />
              {app.notes && (
                <div className="bg-gray-50 rounded-lg p-3 text-sm">
                  <p className="text-xs text-muted-foreground mb-1">Previous notes:</p>
                  <p>{app.notes}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Actions</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {app.status === 'enrolled' ? (
                <div className="text-center py-4 text-emerald-600"><UserPlus className="h-10 w-10 mx-auto mb-2" /><p className="font-medium">Already Enrolled</p></div>
              ) : app.status === 'rejected' ? (
                <div className="text-center py-4 text-red-600"><XCircle className="h-10 w-10 mx-auto mb-2" /><p className="font-medium">Application Rejected</p></div>
              ) : (
                <>
                  <Button className="w-full" onClick={() => reviewMutation.mutate({ status: 'approved' })} disabled={reviewMutation.isPending}>
                    {reviewMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle className="h-4 w-4 mr-2" />}
                    Approve
                  </Button>
                  <Button className="w-full" variant="secondary" onClick={() => reviewMutation.mutate({ status: 'reviewing' })} disabled={reviewMutation.isPending}>
                    <Clock className="h-4 w-4 mr-2" /> Mark Reviewing
                  </Button>
                  <Button className="w-full" variant="outline" onClick={() => setRejectOpen(true)}>
                    <XCircle className="h-4 w-4 mr-2" /> Reject
                  </Button>
                  {canEnroll && (
                    <div className="border-t pt-3 mt-3">
                      <Button className="w-full bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => setEnrollOpen(true)}>
                        <UserPlus className="h-4 w-4 mr-2" /> Enroll Student
                      </Button>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Timeline</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-center gap-2"><CalendarDays className="h-4 w-4 text-muted-foreground" /><span>Applied: {format(new Date(app.created_at), 'MMM d, yyyy h:mm a')}</span></div>
              {app.reviewed_at && <div className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-muted-foreground" /><span>Reviewed: {format(new Date(app.reviewed_at), 'MMM d, yyyy h:mm a')}</span></div>}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Reject dialog */}
      {rejectOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setRejectOpen(false)}>
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-semibold text-gray-900">Reject Application</h2>
            <textarea
              className="w-full rounded-lg border border-gray-300 p-3 text-sm min-h-[100px]"
              placeholder="Reason for rejection..."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
            />
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setRejectOpen(false)}>Cancel</Button>
              <Button
                variant="destructive"
                onClick={() => {
                  reviewMutation.mutate({ status: 'rejected', notes: rejectReason || undefined })
                  setRejectOpen(false)
                }}
                disabled={reviewMutation.isPending}
              >
                Confirm Reject
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Enroll dialog */}
      {enrollOpen && (
        <EnrollDialog
          application={app}
          onClose={() => setEnrollOpen(false)}
          onComplete={() => {
            queryClient.invalidateQueries({ queryKey: ['application', id] })
            setEnrollOpen(false)
          }}
        />
      )}
    </div>
  )
}
