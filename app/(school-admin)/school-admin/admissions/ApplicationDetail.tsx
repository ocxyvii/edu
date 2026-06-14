'use client'

import { useState, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import {
  X, User, Phone, Mail, CalendarDays, MapPin, FileText, ImageIcon,
  CheckCircle2, XCircle, UserPlus, Download, ExternalLink, Loader2,
} from 'lucide-react'
import { format } from 'date-fns'
import type { Application } from '@/types/admissions.types'

const statusConfig: Record<string, { label: string; class: string }> = {
  pending: { label: 'Pending', class: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
  reviewing: { label: 'Reviewing', class: 'bg-blue-100 text-blue-800 border-blue-200' },
  approved: { label: 'Approved', class: 'bg-green-100 text-green-800 border-green-200' },
  rejected: { label: 'Rejected', class: 'bg-red-100 text-red-800 border-red-200' },
  waitlisted: { label: 'Waitlisted', class: 'bg-purple-100 text-purple-800 border-purple-200' },
  enrolled: { label: 'Enrolled', class: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
}

interface Props {
  application: Application
  onClose: () => void
  onApprove: (id: string) => void
  onReject: (app: Application) => void
  onEnroll: (app: Application) => void
}

export function ApplicationDetail({ application: app, onClose, onApprove, onReject, onEnroll }: Props) {
  const status = statusConfig[app.status] || statusConfig.pending

  // Parse notes for academic year / class info
  const applicationNotes = useMemo(() => {
    try {
      if (!app.notes) return null
      return JSON.parse(app.notes) as {
        academic_year_id?: string
        academic_year_name?: string
        class_id?: string
        class_name?: string
      }
    } catch { return null }
  }, [app.notes])

  const docs = (() => {
    try {
      const d = typeof app.documents === 'string' ? JSON.parse(app.documents) : app.documents
      return Array.isArray(d) ? d : []
    } catch { return [] }
  })()

  const isActionable = app.status === 'pending' || app.status === 'reviewing'
  const canEnroll = app.status === 'approved'

  return (
    <div className="fixed inset-0 bg-black/50 z-40" onClick={onClose}>
      <div
        className="fixed inset-y-0 right-0 w-full max-w-xl bg-white shadow-2xl z-50 overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-white border-b z-10 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">{app.student_name}</h2>
            <p className="text-sm text-muted-foreground">{app.applying_for_class}</p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className={status.class}>{status.label}</Badge>
            <Button variant="ghost" size="icon" onClick={onClose}><X className="h-5 w-5" /></Button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Student Info */}
          <section>
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <User className="h-3.5 w-3.5" /> Student Information
            </h3>
            <div className="grid grid-cols-2 gap-3 text-sm bg-gray-50 rounded-xl p-4">
              <div><span className="text-muted-foreground">Full Name</span><p className="font-medium">{app.student_name}</p></div>
              <div><span className="text-muted-foreground">Date of Birth</span><p className="font-medium">{app.date_of_birth ? format(new Date(app.date_of_birth), 'MMM d, yyyy') : '—'}</p></div>
              <div><span className="text-muted-foreground">Gender</span><p className="font-medium capitalize">{app.gender || '—'}</p></div>
              <div className="col-span-2"><span className="text-muted-foreground">Applying for</span>
                <p className="font-medium">{app.applying_for_class}</p>
                {applicationNotes?.academic_year_name && (
                  <p className="text-xs text-muted-foreground mt-0.5">Academic Year: {applicationNotes.academic_year_name}</p>
                )}
              </div>
              <div className="col-span-2"><span className="text-muted-foreground">Address</span><p className="font-medium">{app.address || '—'}</p></div>
              <div className="col-span-2"><span className="text-muted-foreground">Previous School</span><p className="font-medium">{app.previous_school || 'None'}</p></div>
            </div>
          </section>

          {/* Parent Info */}
          <section>
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <Mail className="h-3.5 w-3.5" /> Parent / Guardian
            </h3>
            <div className="grid grid-cols-2 gap-3 text-sm bg-gray-50 rounded-xl p-4">
              <div><span className="text-muted-foreground">Name</span><p className="font-medium">{app.parent_name}</p></div>
              <div><span className="text-muted-foreground">Phone</span><p className="font-medium flex items-center gap-1"><Phone className="h-3.5 w-3.5 text-muted-foreground" />{app.parent_phone}</p></div>
              <div><span className="text-muted-foreground">Email</span><p className="font-medium flex items-center gap-1"><Mail className="h-3.5 w-3.5 text-muted-foreground" />{app.parent_email || '—'}</p></div>
              <div><span className="text-muted-foreground">Submitted</span><p className="font-medium flex items-center gap-1"><CalendarDays className="h-3.5 w-3.5 text-muted-foreground" />{format(new Date(app.created_at), 'MMM d, yyyy')}</p></div>
            </div>
          </section>

          {/* Documents */}
          {docs.length > 0 && (
            <section>
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <FileText className="h-3.5 w-3.5" /> Documents ({docs.length})
              </h3>
              <div className="space-y-2">
                {docs.map((doc: any, i: number) => (
                  <div key={i} className="flex items-center justify-between p-3 rounded-lg border bg-white">
                    <div className="flex items-center gap-3 min-w-0">
                      {doc.type?.startsWith('image/') ? (
                        <ImageIcon className="h-8 w-8 text-blue-500 flex-shrink-0" />
                      ) : (
                        <FileText className="h-8 w-8 text-red-500 flex-shrink-0" />
                      )}
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{doc.name}</p>
                        <p className="text-xs text-muted-foreground capitalize">{doc.type?.replace('_', ' ') || 'Document'}</p>
                      </div>
                    </div>
                    <a
                      href={doc.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-sm text-edu-blue-600 hover:text-edu-blue-800 shrink-0"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      View
                    </a>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Notes */}
          <section>
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Notes</h3>
            <Textarea
              placeholder="Add internal notes..."
              defaultValue={app.notes || ''}
              rows={3}
              className="text-sm"
            />
          </section>

          {/* Actions */}
          <section className="border-t pt-4 space-y-3">
            {app.status === 'enrolled' ? (
              <div className="text-center py-4 text-emerald-600 bg-emerald-50 rounded-xl">
                <UserPlus className="h-8 w-8 mx-auto mb-2" />
                <p className="font-medium">Enrolled Successfully</p>
              </div>
            ) : app.status === 'rejected' ? (
              <div className="text-center py-4 text-red-600 bg-red-50 rounded-xl">
                <XCircle className="h-8 w-8 mx-auto mb-2" />
                <p className="font-medium">Application Rejected</p>
              </div>
            ) : (
              <>
                <Button className="w-full" onClick={() => onApprove(app.id)}>
                  <CheckCircle2 className="h-4 w-4 mr-2" /> Approve Application
                </Button>
                {canEnroll && (
                  <Button className="w-full bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => onEnroll(app)}>
                    <UserPlus className="h-4 w-4 mr-2" /> Enroll Student
                  </Button>
                )}
                <Button variant="outline" className="w-full text-red-600 border-red-200 hover:bg-red-50" onClick={() => onReject(app)}>
                  <XCircle className="h-4 w-4 mr-2" /> Reject Application
                </Button>
              </>
            )}
          </section>
        </div>
      </div>
    </div>
  )
}
