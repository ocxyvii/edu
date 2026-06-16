'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getSchoolExams, deleteExam } from '@/lib/actions/exam.actions'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Plus, FileEdit, Trash2, Eye, BarChart3, ExternalLink, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'
import {
  Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose,
} from '@/components/ui/dialog'

export default function AdminExamsPage() {
  const queryClient = useQueryClient()
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const { data: exams, isLoading } = useQuery({
    queryKey: ['school-exams'],
    queryFn: () => getSchoolExams(),
  })

  const deleteMutation = useMutation({
    mutationFn: () => deleteExam(deleteId!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['school-exams'] })
      toast.success('Exam deleted')
      setDeleteId(null)
    },
    onError: (err: Error) => toast.error(err.message),
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Exams</h1>
          <p className="text-gray-600 mt-1">Manage school examinations and results</p>
        </div>
        <Button asChild>
          <Link href="/school-admin/exams/create">
            <Plus className="h-4 w-4 mr-2" /> Create Exam
          </Link>
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">{[...Array(4)].map((_: any, i: any) => <Skeleton key={i} className="h-28 w-full" />)}</div>
      ) : exams?.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center text-muted-foreground">
            <FileEdit className="h-10 w-10 mx-auto mb-3 text-gray-300" />
            <p className="font-medium">No exams created yet</p>
            <p className="text-sm mt-1">Create your first exam to get started</p>
            <Button asChild className="mt-4">
              <Link href="/school-admin/exams/create">Create Exam</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {exams?.map((exam: any) => (
            <Card key={exam.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">{exam.name}</CardTitle>
                    <CardDescription>
                      {exam.classes?.name && `${exam.classes.name}${exam.classes.level ? ` - Level ${exam.classes.level}` : ''}`}
                      {exam.terms?.name && ` · ${exam.terms.name}`}
                      {exam.start_date && ` · ${new Date(exam.start_date).toLocaleDateString()}`}
                      {exam.end_date && ` – ${new Date(exam.end_date).toLocaleDateString()}`}
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={exam.is_published ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}>
                      {exam.is_published ? 'Published' : 'Draft'}
                    </Badge>
                    <Badge variant="outline">{exam.exam_type}</Badge>
                    {exam.is_online && <Badge className="bg-blue-100 text-blue-800">Online</Badge>}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="flex flex-wrap gap-2">
                    {exam.exam_subjects?.map((es: any) => (
                      <Badge key={es.id} variant="secondary" className="text-xs">
                        {es.subjects?.name ?? es.subject_id.slice(0, 6)}
                        <span className="text-muted-foreground ml-1">/{es.max_marks}</span>
                      </Badge>
                    ))}
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" asChild>
                      <Link href={`/school-admin/exams/${exam.id}`}><Eye className="h-4 w-4" /></Link>
                    </Button>
                    <Button variant="ghost" size="icon" asChild>
                      <Link href={`/school-admin/exams/${exam.id}/edit`}><FileEdit className="h-4 w-4" /></Link>
                    </Button>
                    <Button variant="ghost" size="icon" asChild>
                      <Link href={`/school-admin/exams/${exam.id}/results`}><BarChart3 className="h-4 w-4" /></Link>
                    </Button>
                    <Dialog open={deleteId === exam.id} onOpenChange={(o) => { if (!o) setDeleteId(null) }}>
                      <DialogTrigger asChild>
                        <Button variant="ghost" size="icon" onClick={() => setDeleteId(exam.id)}>
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Delete Exam</DialogTitle>
                          <DialogDescription>Are you sure? This will permanently delete this exam and all associated marks.</DialogDescription>
                        </DialogHeader>
                        <DialogFooter>
                          <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
                          <Button variant="destructive" onClick={() => deleteMutation.mutate()} disabled={deleteMutation.isPending}>
                            {deleteMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                            Delete
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
