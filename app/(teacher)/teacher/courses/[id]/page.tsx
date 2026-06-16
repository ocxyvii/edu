'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getCourse, updateCourse, addMaterial, deleteMaterial,
  updateMaterial, uploadMaterialFile, reorderMaterials, createQuiz,
} from '@/lib/actions/lms.actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import {
  ArrowLeft, Plus, FileText, Film, Link as LinkIcon, BookOpen, Trash2,
  Upload, Video, ExternalLink, Loader2, GripVertical, Pencil, Eye, EyeOff, Check,
} from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'

const materialIcons: Record<string, any> = {
  video: Film,
  document: FileText,
  link: LinkIcon,
  quiz: BookOpen,
  audio: FileText,
}

const materialLabels: Record<string, string> = {
  video: 'Video',
  document: 'Document',
  link: 'Link',
  quiz: 'Quiz',
  audio: 'Audio',
}

export default function TeacherCourseDetailPage() {
  const params = useParams()
  const router = useRouter()
  const queryClient = useQueryClient()
  const id = params.id as string
  const supabase = createClient()

  const [addMaterialOpen, setAddMaterialOpen] = useState(false)
  const [materialForm, setMaterialForm] = useState({
    title: '', type: 'document' as string, content_url: '', content: '',
  })
  const [uploadedFile, setUploadedFile] = useState<{ url: string; name: string } | null>(null)
  const [uploading, setUploading] = useState(false)

  const [quizOpen, setQuizOpen] = useState(false)
  const [quizTitle, setQuizTitle] = useState('')
  const [quizQuestions, setQuizQuestions] = useState<any[]>([])

  const [editingMaterial, setEditingMaterial] = useState<string | null>(null)
  const [editForm, setEditForm] = useState({ title: '', content_url: '', content: '' })

  const { data: course, isLoading } = useQuery({
    queryKey: ['teacher-course', id],
    queryFn: () => getCourse(id),
  })

  const togglePublish = useMutation({
    mutationFn: () => updateCourse(id, { is_published: !course?.is_published }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teacher-course', id] })
      toast.success(course?.is_published ? 'Course unpublished' : 'Course published')
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const addMaterialMutation = useMutation({
    mutationFn: async () => {
      const data: any = {
        course_id: id,
        title: materialForm.title,
        type: materialForm.type as any,
        content_url: materialForm.type === 'link' ? materialForm.content_url : (uploadedFile?.url || materialForm.content_url || undefined),
        content: materialForm.type !== 'link' ? materialForm.content || undefined : undefined,
      }
      return addMaterial(data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teacher-course', id] })
      toast.success('Material added')
      setAddMaterialOpen(false)
      setMaterialForm({ title: '', type: 'document', content_url: '', content: '' })
      setUploadedFile(null)
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const deleteMaterialMutation = useMutation({
    mutationFn: (materialId: string) => deleteMaterial(materialId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teacher-course', id] })
      toast.success('Material deleted')
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const updateMaterialMutation = useMutation({
    mutationFn: () => updateMaterial(editingMaterial!, {
      title: editForm.title,
      content_url: editForm.content_url || undefined,
      content: editForm.content || undefined,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teacher-course', id] })
      toast.success('Material updated')
      setEditingMaterial(null)
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const toggleMaterialVisibility = useMutation({
    mutationFn: (material: any) => updateMaterial(material.id, { is_published: !material.is_published }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teacher-course', id] })
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const createQuizMutation = useMutation({
    mutationFn: () => createQuiz({
      course_id: id,
      title: quizTitle,
      questions: quizQuestions,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teacher-course', id] })
      toast.success('Quiz created')
      setQuizOpen(false)
      setQuizTitle('')
      setQuizQuestions([])
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const ext = file.name.split('.').pop()?.toLowerCase() || 'bin'
      const fileName = `course-materials/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

      const { error } = await supabase.storage
        .from('course-files')
        .upload(fileName, file, { contentType: file.type })

      if (error) throw new Error(error.message)

      const { data: { publicUrl } } = supabase.storage.from('course-files').getPublicUrl(fileName)
      setUploadedFile({ url: publicUrl, name: file.name })
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setUploading(false)
    }
  }

  const addQuizQuestion = () => {
    setQuizQuestions(prev => [...prev, {
      question_text: '',
      question_type: 'mcq',
      options: ['', '', '', ''],
      correct_answer: '',
      marks: 1,
    }])
  }

  const updateQuizQuestion = (index: number, field: string, value: any) => {
    setQuizQuestions(prev => prev.map((q: any, i: any) => i === index ? { ...q, [field]: value } : q))
  }

  if (isLoading) {
    return <div className="space-y-4"><Skeleton className="h-8 w-64" /><Skeleton className="h-64 w-full" /></div>
  }

  if (!course) {
    return <div className="text-center py-12"><p className="font-medium">Course not found</p><Button className="mt-4" asChild><Link href="/teacher/courses">Back</Link></Button></div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/teacher/courses"><ArrowLeft className="h-5 w-5" /></Link>
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">{course.title}</h1>
            <Badge variant={course.is_published ? 'default' : 'secondary'}>
              {course.is_published ? 'Published' : 'Draft'}
            </Badge>
          </div>
          <p className="text-muted-foreground text-sm mt-1">
            {course.subjects?.name} · {course.classes?.name || 'No class'}
          </p>
        </div>
        <Button variant="outline" onClick={() => togglePublish.mutate()} disabled={togglePublish.isPending}>
          {course.is_published ? <EyeOff className="h-4 w-4 mr-2" /> : <Eye className="h-4 w-4 mr-2" />}
          {course.is_published ? 'Unpublish' : 'Publish'}
        </Button>
      </div>

      <div className="flex items-center gap-2">
        <Button size="sm" onClick={() => setAddMaterialOpen(true)}>
          <Plus className="h-4 w-4 mr-1" /> Add Material
        </Button>
        <Button size="sm" variant="outline" onClick={() => setQuizOpen(true)}>
          <BookOpen className="h-4 w-4 mr-1" /> Create Quiz
        </Button>
      </div>

      <div className="space-y-2">
        {course.materials && course.materials.length > 0 ? (
          course.materials.map((material: any, index: number) => {
            const Icon = materialIcons[material.type] || FileText
            return (
              <Card key={material.id} className={cn(material.is_published ? '' : 'opacity-60')}>
                <div className="flex items-center gap-3 p-4">
                  <div className="text-muted-foreground cursor-grab">
                    <GripVertical className="h-4 w-4" />
                  </div>
                  <div className="h-10 w-10 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                    <Icon className="h-5 w-5 text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium truncate">{material.title}</p>
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                        {materialLabels[material.type] || material.type}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Order: {material.order_index}
                      {material.duration && ` · ${material.duration} min`}
                      {material.content_url && ` · ${material.content_url.slice(0, 40)}...`}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost" size="icon" className="h-8 w-8"
                      onClick={() => toggleMaterialVisibility.mutate(material)}
                    >
                      {material.is_published ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                    </Button>
                    <Button
                      variant="ghost" size="icon" className="h-8 w-8"
                      onClick={() => {
                        setEditingMaterial(material.id)
                        setEditForm({ title: material.title, content_url: material.content_url || '', content: material.content || '' })
                      }}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-700"
                      onClick={() => {
                        if (confirm('Delete this material?')) deleteMaterialMutation.mutate(material.id)
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </Card>
            )
          })
        ) : (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <BookOpen className="h-10 w-10 mx-auto mb-3 text-gray-300" />
              <p className="font-medium">No materials yet</p>
              <p className="text-sm mt-1">Add your first learning material or quiz</p>
            </CardContent>
          </Card>
        )}
      </div>

      <Dialog open={addMaterialOpen} onOpenChange={setAddMaterialOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Add Material</DialogTitle>
            <DialogDescription>Add learning content to your course</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="mat-title">Title *</Label>
              <Input id="mat-title" value={materialForm.title} onChange={(e) => setMaterialForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. Introduction to Algebra" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="mat-type">Type *</Label>
              <Select value={materialForm.type} onValueChange={(v) => setMaterialForm(f => ({ ...f, type: v }))}>
                <SelectTrigger id="mat-type"><SelectValue placeholder="Select type" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="document">Document</SelectItem>
                  <SelectItem value="video">Video</SelectItem>
                  <SelectItem value="link">Link / Reference</SelectItem>
                  <SelectItem value="audio">Audio</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {materialForm.type === 'video' && (
              <div className="space-y-2">
                <Label htmlFor="mat-video">Video URL (YouTube or Vimeo)</Label>
                <Input id="mat-video" value={materialForm.content_url} onChange={(e) => setMaterialForm(f => ({ ...f, content_url: e.target.value }))} placeholder="https://youtube.com/watch?v=... or https://vimeo.com/..." />
              </div>
            )}
            {materialForm.type === 'link' && (
              <div className="space-y-2">
                <Label htmlFor="mat-link">URL</Label>
                <Input id="mat-link" value={materialForm.content_url} onChange={(e) => setMaterialForm(f => ({ ...f, content_url: e.target.value }))} placeholder="https://..." />
              </div>
            )}
            {materialForm.type === 'document' && (
              <>
                <div className="space-y-2">
                  <Label>Upload File</Label>
                  <div className="flex items-center gap-3">
                    <Button type="button" variant="outline" size="sm" onClick={() => document.getElementById('file-upload')?.click()} disabled={uploading}>
                      {uploading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
                      {uploading ? 'Uploading...' : 'Choose File'}
                    </Button>
                    <input id="file-upload" type="file" className="hidden" onChange={handleFileUpload} />
                    {uploadedFile && <span className="text-sm text-muted-foreground truncate max-w-[200px]">{uploadedFile.name}</span>}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="mat-content">Or paste content (text/HTML)</Label>
                  <Textarea id="mat-content" value={materialForm.content} onChange={(e) => setMaterialForm(f => ({ ...f, content: e.target.value }))} rows={4} placeholder="Optional: paste text content..." />
                </div>
              </>
            )}
            {(materialForm.type === 'audio') && (
              <div className="space-y-2">
                <Label htmlFor="mat-audio">Audio URL</Label>
                <Input id="mat-audio" value={materialForm.content_url} onChange={(e) => setMaterialForm(f => ({ ...f, content_url: e.target.value }))} placeholder="https://..." />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddMaterialOpen(false)}>Cancel</Button>
            <Button onClick={() => addMaterialMutation.mutate()} disabled={!materialForm.title || addMaterialMutation.isPending}>
              {addMaterialMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
              Add
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editingMaterial} onOpenChange={(o) => { if (!o) setEditingMaterial(null) }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Material</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Title</Label>
              <Input value={editForm.title} onChange={(e) => setEditForm(f => ({ ...f, title: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>URL</Label>
              <Input value={editForm.content_url} onChange={(e) => setEditForm(f => ({ ...f, content_url: e.target.value }))} placeholder="URL (if applicable)" />
            </div>
            <div className="space-y-2">
              <Label>Content</Label>
              <Textarea value={editForm.content} onChange={(e) => setEditForm(f => ({ ...f, content: e.target.value }))} rows={4} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingMaterial(null)}>Cancel</Button>
            <Button onClick={() => updateMaterialMutation.mutate()} disabled={updateMaterialMutation.isPending}>
              <Check className="h-4 w-4 mr-2" /> Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={quizOpen} onOpenChange={setQuizOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Quiz</DialogTitle>
            <DialogDescription>Add questions for a quiz in this course</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Quiz Title *</Label>
              <Input value={quizTitle} onChange={(e) => setQuizTitle(e.target.value)} placeholder="e.g. Algebra Quiz 1" />
            </div>
            {quizQuestions.map((q: any, i: any) => (
              <Card key={i}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center justify-between">
                    <span>Question {i + 1}</span>
                    <Button variant="ghost" size="icon" className="h-6 w-6 text-red-500" onClick={() => setQuizQuestions(prev => prev.filter((_: any, j: any) => j !== i))}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <Input value={q.question_text} onChange={(e) => updateQuizQuestion(i, 'question_text', e.target.value)} placeholder="Question text" />
                  <div className="flex gap-2">
                    <Select value={q.question_type} onValueChange={(v) => updateQuizQuestion(i, 'question_type', v)}>
                      <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="mcq">Multiple Choice</SelectItem>
                        <SelectItem value="true_false">True/False</SelectItem>
                        <SelectItem value="short_answer">Short Answer</SelectItem>
                      </SelectContent>
                    </Select>
                    <Input type="number" min={1} className="w-20" value={q.marks} onChange={(e) => updateQuizQuestion(i, 'marks', parseInt(e.target.value) || 1)} placeholder="Marks" />
                  </div>
                  {q.question_type === 'mcq' && (
                    <div className="space-y-2">
                      {q.options.map((opt: string, oi: number) => (
                        <div key={oi} className="flex items-center gap-2">
                          <span className="text-muted-foreground w-4">{String.fromCharCode(65 + oi)}.</span>
                          <Input value={opt} onChange={(e) => {
                            const newOpts = [...q.options]
                            newOpts[oi] = e.target.value
                            updateQuizQuestion(i, 'options', newOpts)
                          }} placeholder={`Option ${String.fromCharCode(65 + oi)}`} />
                        </div>
                      ))}
                      <Select value={q.correct_answer} onValueChange={(v) => updateQuizQuestion(i, 'correct_answer', v)}>
                        <SelectTrigger><SelectValue placeholder="Correct answer" /></SelectTrigger>
                        <SelectContent>
                          {q.options.filter((o: string) => o.trim()).map((opt: string, oi: number) => (
                            <SelectItem key={oi} value={opt}>{opt}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  {q.question_type === 'true_false' && (
                    <Select value={q.correct_answer} onValueChange={(v) => updateQuizQuestion(i, 'correct_answer', v)}>
                      <SelectTrigger><SelectValue placeholder="Correct answer" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="True">True</SelectItem>
                        <SelectItem value="False">False</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                  {q.question_type === 'short_answer' && (
                    <Input value={q.correct_answer} onChange={(e) => updateQuizQuestion(i, 'correct_answer', e.target.value)} placeholder="Correct answer" />
                  )}
                </CardContent>
              </Card>
            ))}
            <Button variant="outline" onClick={addQuizQuestion} className="w-full">
              <Plus className="h-4 w-4 mr-2" /> Add Question
            </Button>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setQuizOpen(false)}>Cancel</Button>
            <Button onClick={() => createQuizMutation.mutate()} disabled={!quizTitle || quizQuestions.length === 0 || createQuizMutation.isPending}>
              {createQuizMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Check className="h-4 w-4 mr-2" />}
              Create Quiz
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
