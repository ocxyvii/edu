'use client'

import { useState, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getMaterials, createCourse, createMaterial, getTeachersSubjects } from '@/lib/actions/teacher'
import { createClient } from '@/lib/supabase/client'
import { useTeacherClassesRealtime } from '@/lib/hooks/useTeacherClasses'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { Plus, BookOpen, FileText, Video, Link as LinkIcon, Upload, Paperclip } from 'lucide-react'
import { format } from 'date-fns'

export default function MaterialsPage() {
  const queryClient = useQueryClient()
  const [courseDialog, setCourseDialog] = useState(false)
  const [materialDialog, setMaterialDialog] = useState(false)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [courseForm, setCourseForm] = useState({ title: '', subject_id: '', class_id: '' })
  const [materialForm, setMaterialForm] = useState({ course_id: '', title: '', type: 'document', content_url: '', content: '' })

  const { data, isLoading } = useQuery({
    queryKey: ['teacher-materials'],
    queryFn: () => getMaterials(),
  })

  const { data: subjects } = useQuery({
    queryKey: ['teacher-subjects'],
    queryFn: () => getTeachersSubjects(),
  })

  const { data: sections } = useTeacherClassesRealtime()

  const uniqueClasses = sections?.reduce((acc: any[], s) => {
    if (!acc.find((c: any) => c.id === s.class_id)) acc.push({ id: s.class_id, name: s.class_name })
    return acc
  }, []) ?? []

  const createCourseMutation = useMutation({
    mutationFn: () => createCourse(courseForm),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teacher-materials'] })
      setCourseDialog(false)
      setCourseForm({ title: '', subject_id: '', class_id: '' })
      toast.success('Course created')
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const createMaterialMutation = useMutation({
    mutationFn: () => createMaterial({
      ...materialForm,
      type: materialForm.content_url ? 'link' : materialForm.type,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teacher-materials'] })
      setMaterialDialog(false)
      setMaterialForm({ course_id: '', title: '', type: 'document', content_url: '', content: '' })
      toast.success('Material added')
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const courses = data?.courses ?? []
  const materials = data?.materials ?? []

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Course Materials</h1>
          <p className="text-gray-600 mt-1">Upload and organize learning materials for your classes</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={courseDialog} onOpenChange={setCourseDialog}>
            <DialogTrigger asChild>
              <Button variant="outline"><BookOpen className="h-4 w-4 mr-2" /> New Course</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Create Course</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Course Title</Label>
                  <Input value={courseForm.title} onChange={(e) => setCourseForm(p => ({ ...p, title: e.target.value }))} placeholder="e.g., Algebra I" />
                </div>
                <div>
                  <Label>Class</Label>
                  <Select value={courseForm.class_id} onValueChange={(v) => setCourseForm(p => ({ ...p, class_id: v }))}>
                    <SelectTrigger><SelectValue placeholder="Select class" /></SelectTrigger>
                    <SelectContent>
                      {uniqueClasses.map((c: any) => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Subject</Label>
                  <Select value={courseForm.subject_id} onValueChange={(v) => setCourseForm(p => ({ ...p, subject_id: v }))}>
                    <SelectTrigger><SelectValue placeholder="Select subject" /></SelectTrigger>
                    <SelectContent>
                      {subjects?.map((s: any) => (
                        <SelectItem key={s.id} value={s.id}>{s.name} ({s.code})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={() => createCourseMutation.mutate()} disabled={createCourseMutation.isPending || !courseForm.title || !courseForm.class_id || !courseForm.subject_id}>
                  {createCourseMutation.isPending ? 'Creating...' : 'Create Course'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
          <Dialog open={materialDialog} onOpenChange={setMaterialDialog}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-2" /> Add Material</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Add Material</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Course</Label>
                  <Select value={materialForm.course_id} onValueChange={(v) => setMaterialForm(p => ({ ...p, course_id: v }))}>
                    <SelectTrigger><SelectValue placeholder="Select course" /></SelectTrigger>
                    <SelectContent>
                      {courses.map((c: any) => (
                        <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Title</Label>
                  <Input value={materialForm.title} onChange={(e) => setMaterialForm(p => ({ ...p, title: e.target.value }))} placeholder="e.g., Chapter 3 Notes" />
                </div>
                <div>
                  <Label>Type</Label>
                  <Select value={materialForm.type} onValueChange={(v) => setMaterialForm(p => ({ ...p, type: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="document">Document</SelectItem>
                      <SelectItem value="video">Video</SelectItem>
                      <SelectItem value="link">Link</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Upload File</Label>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={uploading}
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      {uploading ? 'Uploading...' : 'Choose File'}
                    </Button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      className="hidden"
                      onChange={async (e) => {
                        const file = e.target.files?.[0]
                        if (!file) return
                        setUploading(true)
                        try {
                          const supabase = createClient()
                          const fileExt = file.name.split('.').pop()
                          const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`
                          const filePath = `materials/${fileName}`
                          const { error: uploadError } = await supabase.storage
                            .from('teacher-files')
                            .upload(filePath, file)
                          if (uploadError) throw new Error(uploadError.message)
                          const { data: { publicUrl } } = supabase.storage
                            .from('teacher-files')
                            .getPublicUrl(filePath)
                          setMaterialForm(p => ({ ...p, content_url: publicUrl }))
                          toast.success('File uploaded')
                        } catch (err: any) {
                          toast.error(err.message)
                        } finally {
                          setUploading(false)
                          if (fileInputRef.current) fileInputRef.current.value = ''
                        }
                      }}
                    />
                    {materialForm.content_url && (
                      <span className="text-xs text-green-600 flex items-center gap-1">
                        <Paperclip className="h-3 w-3" /> File attached
                      </span>
                    )}
                  </div>
                </div>
                <div>
                  <Label>Or URL (optional)</Label>
                  <Input value={materialForm.content_url} onChange={(e) => setMaterialForm(p => ({ ...p, content_url: e.target.value }))} placeholder="https://..." />
                </div>
                <div>
                  <Label>Content (optional)</Label>
                  <textarea
                    value={materialForm.content}
                    onChange={(e) => setMaterialForm(p => ({ ...p, content: e.target.value }))}
                    className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    placeholder="Type or paste content..."
                  />
                </div>
                <Button onClick={() => createMaterialMutation.mutate()} disabled={createMaterialMutation.isPending || !materialForm.title || !materialForm.course_id}>
                  {createMaterialMutation.isPending ? 'Adding...' : 'Add Material'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-4">{[...Array(3)].map((_: any, i: any) => <Skeleton key={i} className="h-32 w-full" />)}</div>
      ) : courses.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">
          No courses yet. Create your first course to start adding materials.
        </CardContent></Card>
      ) : (
        <div className="space-y-6">
          {courses.map((course: any) => {
            const courseMaterials = materials.filter((m: any) => m.course_id === course.id)
            return (
              <Card key={course.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg">{course.title}</CardTitle>
                      <CardDescription>
                        {course.classes?.name} · {course.subjects?.name} ({course.subjects?.code})
                      </CardDescription>
                    </div>
                    <Badge variant="outline">{courseMaterials.length} materials</Badge>
                  </div>
                </CardHeader>
                {courseMaterials.length > 0 && (
                  <CardContent>
                    <div className="space-y-2">
                      {courseMaterials.map((m: any) => (
                        <div key={m.id} className="flex items-center gap-3 p-3 rounded-lg border border-gray-100 hover:bg-gray-50">
                          {m.type === 'video' ? <Video className="h-4 w-4 text-blue-500" /> :
                           m.type === 'link' ? <LinkIcon className="h-4 w-4 text-purple-500" /> :
                           <FileText className="h-4 w-4 text-gray-500" />}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{m.title}</p>
                            <p className="text-xs text-muted-foreground">
                              {format(new Date(m.created_at), 'MMM d, yyyy')} · {m.type}
                            </p>
                          </div>
                          {m.content_url && (
                            <a href={m.content_url} target="_blank" rel="noopener noreferrer" className="text-xs text-edu-blue-600 hover:underline">
                              Open
                            </a>
                          )}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                )}
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
