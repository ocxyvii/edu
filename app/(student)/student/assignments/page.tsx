'use client'

import { useState, useRef, useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { getStudentAssignments, submitAssignment } from '@/lib/actions/student'
import { createClient } from '@/lib/supabase/client'
import { format } from 'date-fns'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

export default function StudentAssignmentsPage() {
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState<'pending' | 'submitted' | 'graded' | 'all'>('pending')
  const [viewingAssignment, setViewingAssignment] = useState<any>(null)
  const [selectedAssignment, setSelectedAssignment] = useState<any>(null)
  const [submissionText, setSubmissionText] = useState('')
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [submitting, setSubmitting] = useState(false)

  const { data: assignments, isLoading, error, refetch } = useQuery({
    queryKey: ['student-assignments'],
    queryFn: () => getStudentAssignments(),
    refetchInterval: 60 * 1000,
    refetchOnWindowFocus: true,
  })

  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel('student-assignments-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'assignments',
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['student-assignments'] })
          toast.info('A new assignment has been posted!')
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [queryClient])

  const filtered = (assignments ?? []).filter((a: any) => {
    if (activeTab === 'pending') return !a.isSubmitted && !a.isOverdue
    if (activeTab === 'submitted') return a.isSubmitted && a.submission?.status !== 'graded'
    if (activeTab === 'graded') return a.submission?.status === 'graded'
    return true
  })

  const counts = {
    pending: assignments?.filter((a: any) => !a.isSubmitted && !a.isOverdue).length ?? 0,
    submitted: assignments?.filter((a: any) => a.isSubmitted && a.submission?.status !== 'graded').length ?? 0,
    graded: assignments?.filter((a: any) => a.submission?.status === 'graded').length ?? 0,
    overdue: assignments?.filter((a: any) => a.isOverdue).length ?? 0,
  }

  const handleSubmit = async (assignmentId: string) => {
    if (!submissionText.trim() && selectedFiles.length === 0) {
      toast.error('Please type an answer or upload a file')
      return
    }
    setSubmitting(true)
    try {
      const supabase = createClient()
      const attachments = []
      for (const file of selectedFiles) {
        const filePath = `submissions/${Date.now()}_${file.name}`
        const { error: uploadError } = await supabase.storage.from('educore-files').upload(filePath, file)
        if (uploadError) throw new Error(`File upload failed: ${uploadError.message}`)
        const { data: { publicUrl } } = supabase.storage.from('educore-files').getPublicUrl(filePath)
        attachments.push({ name: file.name, url: publicUrl, size: file.size, type: file.type })
      }
      await submitAssignment({ assignmentId, content: submissionText, attachments })
      toast.success('Assignment submitted successfully!')
      setSelectedAssignment(null)
      setSubmissionText('')
      setSelectedFiles([])
      queryClient.invalidateQueries({ queryKey: ['student-assignments'] })
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 bg-gray-200 rounded animate-pulse" />
        <div className="grid grid-cols-4 gap-4">
          {[...Array(4)].map((_: any, i: any) => (
            <div key={i} className="h-20 bg-gray-200 rounded-xl animate-pulse" />
          ))}
        </div>
        {[...Array(3)].map((_: any, i: any) => (
          <div key={i} className="h-28 bg-gray-200 rounded-xl animate-pulse" />
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-16">
        <p className="text-red-500 font-medium">Failed to load assignments</p>
        <button onClick={() => refetch()} className="mt-3 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm">Try Again</button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Assignments</h1>
        <p className="text-gray-500 text-sm mt-1">View and submit your assignments</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Pending', count: counts.pending, color: 'blue' },
          { label: 'Submitted', count: counts.submitted, color: 'amber' },
          { label: 'Graded', count: counts.graded, color: 'green' },
          { label: 'Overdue', count: counts.overdue, color: 'red' },
        ].map(stat => (
          <div key={stat.label} className="bg-white rounded-xl border p-4 text-center">
            <div className={`text-2xl font-bold ${stat.color === 'blue' ? 'text-blue-600' : stat.color === 'amber' ? 'text-amber-600' : stat.color === 'green' ? 'text-green-600' : 'text-red-600'}`}>{stat.count}</div>
            <div className="text-xs text-gray-500 mt-1">{stat.label}</div>
          </div>
        ))}
      </div>

      <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit flex-wrap">
        {([
          { key: 'pending' as const, label: `Pending (${counts.pending})` },
          { key: 'submitted' as const, label: `Submitted (${counts.submitted})` },
          { key: 'graded' as const, label: `Graded (${counts.graded})` },
          { key: 'all' as const, label: 'All' },
        ]).map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === tab.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border">
          <div className="text-4xl mb-3">📋</div>
          <p className="text-gray-600 font-medium">
            {activeTab === 'pending' ? 'No pending assignments' :
             activeTab === 'submitted' ? 'No submitted assignments awaiting grading' :
             activeTab === 'graded' ? 'No graded assignments yet' : 'No assignments yet'}
          </p>
          <p className="text-gray-400 text-sm mt-1">
            {activeTab === 'pending' ? 'You are all caught up!' : 'Check back later'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((assignment: any) => (
            <div key={assignment.id} className={`bg-white rounded-xl border p-5 space-y-3 ${
              assignment.isOverdue ? 'border-red-200 bg-red-50' :
              assignment.submission?.status === 'graded' ? 'border-green-200' : ''
            }`}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold text-gray-900">{assignment.title}</h3>
                    {assignment.submission?.status === 'graded' && (
                      <span className="bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded-full font-medium">✓ Graded</span>
                    )}
                    {assignment.isSubmitted && assignment.submission?.status !== 'graded' && (
                      <span className="bg-amber-100 text-amber-700 text-xs px-2 py-0.5 rounded-full font-medium">Submitted</span>
                    )}
                    {assignment.isOverdue && (
                      <span className="bg-red-100 text-red-700 text-xs px-2 py-0.5 rounded-full font-medium">Overdue</span>
                    )}
                    {!assignment.isSubmitted && !assignment.isOverdue && assignment.daysLeft <= 3 && (
                      <span className="bg-orange-100 text-orange-700 text-xs px-2 py-0.5 rounded-full font-medium">Due soon</span>
                    )}
                  </div>
                  <p className="text-sm text-gray-500 mt-1">
                    {assignment.subjects?.name} · Posted by {assignment.teacherName}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-medium text-gray-700">{assignment.max_marks} marks</p>
                  <p className={`text-xs mt-0.5 ${assignment.isOverdue ? 'text-red-600 font-medium' : assignment.daysLeft <= 1 ? 'text-orange-600 font-medium' : 'text-gray-400'}`}>
                    {assignment.isOverdue ? 'Overdue' :
                     assignment.daysLeft === 0 ? 'Due today' :
                     assignment.daysLeft === 1 ? 'Due tomorrow' :
                     `Due in ${assignment.daysLeft} days`}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {format(new Date(assignment.due_date), 'dd MMM yyyy, h:mm a')}
                  </p>
                </div>
              </div>

              <p className="text-sm text-gray-600 line-clamp-2">{assignment.description}</p>

              {assignment.attachments?.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {assignment.attachments.map((att: any, i: number) => (
                    <a key={i} href={att.url} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg text-xs hover:bg-blue-100 transition-colors">
                      📎 {att.name}
                    </a>
                  ))}
                </div>
              )}

              {assignment.submission?.status === 'graded' && (
                <div className="bg-green-50 rounded-lg p-3 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-green-800">Your Score</span>
                    <span className="text-lg font-bold text-green-700">{assignment.submission.marks}/{assignment.max_marks}</span>
                  </div>
                  {assignment.submission.feedback && (
                    <p className="text-sm text-green-700"><span className="font-medium">Feedback: </span>{assignment.submission.feedback}</p>
                  )}
                </div>
              )}

              {assignment.isSubmitted && assignment.submission?.status !== 'graded' && (
                <div className="bg-amber-50 rounded-lg p-3">
                  <p className="text-sm text-amber-800">
                    ✓ Submitted on {format(new Date(assignment.submission.submitted_at), 'dd MMM yyyy, h:mm a')}. Awaiting grading.
                  </p>
                </div>
              )}

              {!assignment.isSubmitted && !assignment.isOverdue && (
                <div className="flex gap-2">
                  <button
                    onClick={() => setViewingAssignment(assignment)}
                    className="flex-1 border border-gray-300 text-gray-700 rounded-lg py-2.5 text-sm font-medium hover:bg-gray-50 transition-colors"
                  >
                    View Details
                  </button>
                  {selectedAssignment?.id === assignment.id ? (
                    <div className="flex-1 space-y-3 border rounded-lg p-4 bg-gray-50">
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Your Submission</p>
                      <textarea
                        value={submissionText}
                        onChange={e => setSubmissionText(e.target.value)}
                        placeholder="Type your answer here (optional if uploading a file)..."
                        rows={3}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none bg-white"
                      />
                      <div>
                        <input
                          ref={fileInputRef}
                          type="file"
                          multiple
                          className="hidden"
                          accept=".pdf,.doc,.docx,.ppt,.pptx,.txt,.jpg,.png,.zip"
                          onChange={e => setSelectedFiles(Array.from(e.target.files ?? []))}
                        />
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="w-full px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg text-sm text-gray-600 hover:border-blue-400 hover:text-blue-600 bg-white transition-colors"
                        >
                          📎 Upload PDF, Word, PowerPoint or other files
                        </button>
                        <p className="text-xs text-gray-400 mt-1">Accepted: PDF, DOC, DOCX, PPT, PPTX, images and more</p>
                        {selectedFiles.length > 0 && (
                          <div className="mt-2 space-y-1">
                            {selectedFiles.map((f, i) => (
                              <div key={i} className="flex items-center gap-2 text-xs text-gray-700 bg-white rounded border px-2.5 py-1.5">
                                <span className="text-base">
                                  {f.name.endsWith('.pdf') ? '📄' : f.name.match(/\.docx?$/) ? '📝' : f.name.match(/\.pptx?$/) ? '📊' : '📎'}
                                </span>
                                <span className="flex-1 truncate">{f.name}</span>
                                <span className="text-gray-400">{(f.size / 1024).toFixed(0)} KB</span>
                                <button onClick={() => setSelectedFiles(prev => prev.filter((_: any, idx: any) => idx !== i))}
                                  className="text-red-400 hover:text-red-600 ml-1">✕</button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="flex gap-2 pt-1">
                        <button onClick={() => { setSelectedAssignment(null); setSubmissionText(''); setSelectedFiles([]) }}
                          className="flex-1 border border-gray-300 text-gray-700 rounded-lg py-2 text-sm hover:bg-gray-100 bg-white">Cancel</button>
                        <button onClick={() => handleSubmit(assignment.id)} disabled={submitting}
                          className="flex-1 bg-blue-600 text-white rounded-lg py-2 text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
                          {submitting ? 'Submitting...' : 'Submit'}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button onClick={() => setSelectedAssignment(assignment)}
                      className="flex-1 bg-blue-600 text-white rounded-lg py-2.5 text-sm font-medium hover:bg-blue-700 transition-colors">
                      Submit
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <Dialog open={!!viewingAssignment} onOpenChange={(o) => { if (!o) setViewingAssignment(null) }}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          {viewingAssignment && (
            <>
              <DialogHeader>
                <DialogTitle className="text-xl">{viewingAssignment.title}</DialogTitle>
                <DialogDescription>
                  {viewingAssignment.subjects?.name}
                  {viewingAssignment.teacherName ? ` · Posted by ${viewingAssignment.teacherName}` : ''}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div className="bg-gray-50 rounded-lg p-3 text-center">
                    <p className="text-xs text-gray-500">Max Marks</p>
                    <p className="font-bold text-gray-900">{viewingAssignment.max_marks}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3 text-center">
                    <p className="text-xs text-gray-500">Due Date</p>
                    <p className="font-bold text-gray-900">{format(new Date(viewingAssignment.due_date), 'dd MMM yyyy')}</p>
                    <p className="text-xs text-gray-400">{format(new Date(viewingAssignment.due_date), 'h:mm a')}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3 text-center">
                    <p className="text-xs text-gray-500">Status</p>
                    <p className={`font-bold ${viewingAssignment.isOverdue ? 'text-red-600' : viewingAssignment.daysLeft <= 1 ? 'text-orange-600' : 'text-green-600'}`}>
                      {viewingAssignment.isOverdue ? 'Overdue' :
                       viewingAssignment.daysLeft === 0 ? 'Due Today' :
                       viewingAssignment.daysLeft === 1 ? 'Due Tomorrow' :
                       `${viewingAssignment.daysLeft} days left`}
                    </p>
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-medium text-gray-900 mb-1">Description</h4>
                  <div className="text-sm text-gray-700 whitespace-pre-wrap bg-gray-50 rounded-lg p-4">
                    {viewingAssignment.description || 'No description provided.'}
                  </div>
                </div>

                {viewingAssignment.attachments?.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-900 mb-1">Attachments ({viewingAssignment.attachments.length})</h4>
                    <div className="space-y-1.5">
                      {viewingAssignment.attachments.map((att: any, i: number) => (
                        <a key={i} href={att.url} target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-2 p-2.5 rounded-lg border border-gray-200 hover:bg-gray-50 text-sm">
                          <span className="text-base">📎</span>
                          <span className="flex-1 truncate text-gray-700">{att.name}</span>
                          <span className="text-xs text-gray-400">
                            {att.size ? `${(att.size / 1024).toFixed(0)} KB` : ''}
                          </span>
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {viewingAssignment.submission?.status === 'graded' && (
                  <div className="bg-green-50 rounded-lg p-4 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-green-800">Your Score</span>
                      <span className="text-xl font-bold text-green-700">{viewingAssignment.submission.marks}/{viewingAssignment.max_marks}</span>
                    </div>
                    {viewingAssignment.submission.feedback && (
                      <p className="text-sm text-green-700"><span className="font-medium">Feedback: </span>{viewingAssignment.submission.feedback}</p>
                    )}
                  </div>
                )}

                {viewingAssignment.isSubmitted && viewingAssignment.submission?.status !== 'graded' && (
                  <div className="bg-amber-50 rounded-lg p-4">
                    <p className="text-sm text-amber-800">
                      ✓ Submitted on {format(new Date(viewingAssignment.submission.submitted_at), 'dd MMM yyyy, h:mm a')}. Awaiting grading.
                    </p>
                  </div>
                )}
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setViewingAssignment(null)}>Close</Button>
                {!viewingAssignment.isSubmitted && !viewingAssignment.isOverdue && (
                  <Button onClick={() => {
                    const a = viewingAssignment
                    setViewingAssignment(null)
                    setSelectedAssignment(a)
                  }}>
                    Submit Assignment
                  </Button>
                )}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
