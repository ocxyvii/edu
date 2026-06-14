'use client'

import { useState, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getStudentAssignments, submitAssignment } from '@/lib/actions/student'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { BookOpen, Clock, Upload, FileText, CheckCircle2, X, Paperclip } from 'lucide-react'
import { format } from 'date-fns'

export default function StudentAssignmentsPage() {
  const queryClient = useQueryClient()
  const [selectedAssignment, setSelectedAssignment] = useState<any>(null)
  const [submitContent, setSubmitContent] = useState('')
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [attachments, setAttachments] = useState<{ name: string; url: string; type: string }[]>([])

  const { data: assignments, isLoading } = useQuery({
    queryKey: ['student-assignments'],
    queryFn: () => getStudentAssignments(),
  })

  const submitMutation = useMutation({
    mutationFn: () => submitAssignment({
      assignmentId: selectedAssignment?.id,
      content: submitContent,
      attachments,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['student-assignments'] })
      setSelectedAssignment(null)
      setSubmitContent('')
      setAttachments([])
      toast.success('Assignment submitted')
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const supabase = createClient()
      const fileExt = file.name.split('.').pop()
      const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`
      const { error: uploadError } = await supabase.storage.from('teacher-files').upload(`submissions/${fileName}`, file)
      if (uploadError) throw new Error(uploadError.message)
      const { data: { publicUrl } } = supabase.storage.from('teacher-files').getPublicUrl(`submissions/${fileName}`)
      setAttachments(prev => [...prev, { name: file.name, url: publicUrl, type: file.type }])
      toast.success('File uploaded')
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const pending = assignments?.filter(a => !a.isSubmitted) ?? []
  const submitted = assignments?.filter(a => a.isSubmitted) ?? []

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Assignments</h1>
        <p className="text-gray-600 mt-1">View and submit your assignments</p>
      </div>

      {isLoading ? (
        <div className="space-y-4">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}</div>
      ) : !assignments?.length ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">No assignments posted yet.</CardContent></Card>
      ) : (
        <>
          <div>
            <h2 className="text-xl font-semibold mb-4">Pending ({pending.length})</h2>
            <div className="space-y-3">
              {pending.length === 0 ? (
                <Card><CardContent className="py-6 text-center text-muted-foreground">All assignments submitted!</CardContent></Card>
              ) : pending.map((a: any) => {
                const due = new Date(a.due_date)
                const daysLeft = Math.ceil((due.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
                return (
                  <Card key={a.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="flex items-center justify-between py-4">
                      <div className="flex items-center gap-3">
                        <BookOpen className="h-5 w-5 text-edu-blue-600" />
                        <div>
                          <p className="font-medium">{a.title}</p>
                          <p className="text-xs text-muted-foreground">{a.subjects?.name} · Max marks: {a.max_marks}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge className={daysLeft <= 1 ? 'bg-red-100 text-red-800' : daysLeft <= 3 ? 'bg-amber-100 text-amber-800' : 'bg-green-100 text-green-800'}>
                          {daysLeft <= 0 ? 'Overdue' : `${daysLeft}d left`}
                        </Badge>
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button size="sm" onClick={() => { setSelectedAssignment(a); setSubmitContent(''); setAttachments([]) }}>Submit</Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-lg sm:max-h-[80vh] overflow-y-auto">
                              <DialogHeader>
                                <DialogTitle className="text-base sm:text-lg">Submit: {a.title}</DialogTitle>
                                <DialogDescription className="text-xs sm:text-sm">{a.subjects?.name} · Due {format(new Date(a.due_date), 'MMM d, yyyy h:mm a')}</DialogDescription>
                              </DialogHeader>
                              <div className="space-y-4">
                                <div>
                                  <Label className="text-sm">Your Answer</Label>
                                  <textarea
                                    value={submitContent}
                                    onChange={(e) => setSubmitContent(e.target.value)}
                                    className="flex min-h-[150px] sm:min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                    placeholder="Type your answer or add notes..."
                                  />
                                </div>
                                <div>
                                  <Label className="text-sm">Attachments</Label>
                                  <div className="flex items-center gap-2 mt-1">
                                    <Button type="button" variant="outline" size="sm" disabled={uploading} onClick={() => fileInputRef.current?.click()} className="text-xs sm:text-sm h-9 sm:h-auto">
                                      <Upload className="h-4 w-4 mr-1.5" />
                                      {uploading ? 'Uploading...' : 'Upload File'}
                                    </Button>
                                    <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileUpload} accept=".pdf,.doc,.docx,.txt,.jpg,.png,.zip" />
                                  </div>
                                  {attachments.length > 0 && (
                                    <div className="mt-2 space-y-1">
                                      {attachments.map((att, i) => (
                                        <div key={i} className="flex items-center gap-2 text-sm p-2.5 rounded border border-gray-200 bg-gray-50">
                                          <Paperclip className="h-4 w-4 text-gray-400 shrink-0" />
                                          <span className="flex-1 truncate text-xs sm:text-sm">{att.name}</span>
                                          <button onClick={() => setAttachments(prev => prev.filter((_, j) => j !== i))} className="text-gray-400 hover:text-red-500 p-1">
                                            <X className="h-4 w-4" />
                                          </button>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                                <Button
                                  onClick={() => submitMutation.mutate()}
                                  disabled={submitMutation.isPending || (!submitContent && attachments.length === 0)}
                                  className="w-full h-10 sm:h-11 text-sm"
                                >
                                  {submitMutation.isPending ? 'Submitting...' : 'Submit Assignment'}
                                </Button>
                              </div>
                            </DialogContent>
                          </Dialog>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </div>

          <div>
            <h2 className="text-xl font-semibold mb-4">Submitted ({submitted.length})</h2>
            <div className="space-y-3">
              {submitted.map((a: any) => (
                <Card key={a.id}>
                  <CardContent className="flex items-center justify-between py-4">
                    <div className="flex items-center gap-3">
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                      <div>
                        <p className="font-medium">{a.title}</p>
                        <p className="text-xs text-muted-foreground">{a.subjects?.name}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      {a.submission?.marks != null ? (
                        <div>
                          <span className="font-bold text-lg">{a.submission.marks}</span>
                          <span className="text-muted-foreground">/{a.max_marks}</span>
                          {a.submission.feedback && (
                            <p className="text-xs text-muted-foreground mt-1 max-w-xs truncate">{a.submission.feedback}</p>
                          )}
                        </div>
                      ) : (
                        <Badge variant="outline" className="text-amber-600">Awaiting grading</Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
