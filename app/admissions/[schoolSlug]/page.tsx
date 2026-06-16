'use client'

import { useState, useRef } from 'react'
import { useParams } from 'next/navigation'
import { useQuery, useMutation } from '@tanstack/react-query'
import { getSchoolBySlug, submitApplication, uploadApplicationDocument } from '@/lib/actions/admissions.actions'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import { Send, Upload, CheckCircle, Loader2, School, Phone, Mail, MapPin } from 'lucide-react'

const GRADES = [
  'Pre-Primary 1', 'Pre-Primary 2',
  'Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6',
  'Grade 7', 'Grade 8', 'Grade 9',
  'Form 1', 'Form 2', 'Form 3', 'Form 4',
]

export default function PublicAdmissionsPage() {
  const params = useParams()
  const slug = params.schoolSlug as string
  const supabase = createClient()
  const formRef = useRef<HTMLFormElement>(null)

  const [formData, setFormData] = useState({
    student_name: '',
    date_of_birth: '',
    gender: '',
    applying_for_class: '',
    parent_name: '',
    parent_email: '',
    parent_phone: '',
    address: '',
    previous_school: '',
  })

  const [files, setFiles] = useState<File[]>([])
  const [uploading, setUploading] = useState(false)

  const { data: school, isLoading } = useQuery({
    queryKey: ['school-slug', slug],
    queryFn: () => getSchoolBySlug(slug),
  })

  const submitMutation = useMutation({
    mutationFn: async () => {
      setUploading(true)
      const documents: { name: string; url: string; type: string; size: number }[] = []

      for (const file of files) {
        const ext = file.name.split('.').pop()?.toLowerCase() || 'bin'
        const fileName = `applications/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

        const { error: uploadError } = await supabase.storage
          .from('application-documents')
          .upload(fileName, file, { contentType: file.type })

        if (uploadError) throw new Error(`Failed to upload ${file.name}: ${uploadError.message}`)

        const { data: { publicUrl } } = supabase.storage
          .from('application-documents')
          .getPublicUrl(fileName)

        documents.push({ name: file.name, url: publicUrl, type: file.type, size: file.size })
      }

      setUploading(false)

      return submitApplication({
        school_id: school!.id,
        ...formData,
        documents,
      } as any)
    },
    onSuccess: () => {
      toast.success('Application submitted successfully! We will contact you soon.')
      formRef.current?.reset()
      setFormData({
        student_name: '', date_of_birth: '', gender: '', applying_for_class: '',
        parent_name: '', parent_email: '', parent_phone: '', address: '', previous_school: '',
      })
      setFiles([])
    },
    onError: (err: Error) => toast.error(err.message),
  })

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50">
        <Card className="w-full max-w-2xl mx-4">
          <CardContent className="py-12">
            <div className="space-y-4">
              <Skeleton className="h-8 w-48 mx-auto" />
              <Skeleton className="h-4 w-64 mx-auto" />
              {[...Array(6)].map((_: any, i: any) => <Skeleton key={i} className="h-10 w-full" />)}
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!school) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50">
        <Card className="w-full max-w-md mx-4">
          <CardContent className="py-12 text-center">
            <School className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-900">School Not Found</h2>
            <p className="text-muted-foreground mt-2">The school you are looking for does not exist or is not accepting applications.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50">
      <div className="max-w-4xl mx-auto px-4 py-12">
        <Card className="mb-8 overflow-hidden border-0 shadow-lg">
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-8 py-10 text-white">
            <div className="flex items-center gap-4 mb-4">
              {school.logo_url && (
                <img src={school.logo_url} alt="" className="h-16 w-16 rounded-full border-2 border-white/30 object-cover" />
              )}
              <div>
                <h1 className="text-3xl font-bold">{school.name}</h1>
                <p className="text-blue-100 mt-1">Admissions Application</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-4 text-sm text-blue-100">
              {school.address && (
                <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {school.address}</span>
              )}
              {school.phone && (
                <span className="flex items-center gap-1"><Phone className="h-3.5 w-3.5" /> {school.phone}</span>
              )}
              {school.email && (
                <span className="flex items-center gap-1"><Mail className="h-3.5 w-3.5" /> {school.email}</span>
              )}
            </div>
          </div>
        </Card>

        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="text-xl">Apply for Admission</CardTitle>
            <CardDescription>Fill in the details below to apply. A parent/guardian must complete this form.</CardDescription>
          </CardHeader>
          <CardContent>
            <form ref={formRef} onSubmit={(e) => { e.preventDefault(); submitMutation.mutate() }} className="space-y-6">
              <div className="border-b pb-4">
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Student Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="student_name">Full Name *</Label>
                    <Input id="student_name" required value={formData.student_name}
                      onChange={(e) => setFormData(f => ({ ...f, student_name: e.target.value }))}
                      placeholder="e.g. John Kamau" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="date_of_birth">Date of Birth</Label>
                    <Input id="date_of_birth" type="date" value={formData.date_of_birth}
                      onChange={(e) => setFormData(f => ({ ...f, date_of_birth: e.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="gender">Gender</Label>
                    <Select value={formData.gender} onValueChange={(v) => setFormData(f => ({ ...f, gender: v }))}>
                      <SelectTrigger id="gender"><SelectValue placeholder="Select gender" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="male">Male</SelectItem>
                        <SelectItem value="female">Female</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="applying_for_class">Applying for Class *</Label>
                    <Select value={formData.applying_for_class} onValueChange={(v) => setFormData(f => ({ ...f, applying_for_class: v }))}>
                      <SelectTrigger id="applying_for_class"><SelectValue placeholder="Select class" /></SelectTrigger>
                      <SelectContent>
                        {GRADES.map((g: any) => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <div className="border-b pb-4">
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Parent / Guardian Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="parent_name">Full Name *</Label>
                    <Input id="parent_name" required value={formData.parent_name}
                      onChange={(e) => setFormData(f => ({ ...f, parent_name: e.target.value }))}
                      placeholder="e.g. Jane Kamau" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="parent_email">Email</Label>
                    <Input id="parent_email" type="email" value={formData.parent_email}
                      onChange={(e) => setFormData(f => ({ ...f, parent_email: e.target.value }))}
                      placeholder="jane@example.com" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="parent_phone">Phone Number *</Label>
                    <Input id="parent_phone" required value={formData.parent_phone}
                      onChange={(e) => setFormData(f => ({ ...f, parent_phone: e.target.value }))}
                      placeholder="e.g. +254 712 345 678" />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="address">Home Address</Label>
                    <Input id="address" value={formData.address}
                      onChange={(e) => setFormData(f => ({ ...f, address: e.target.value }))}
                      placeholder="Physical address" />
                  </div>
                </div>
              </div>

              <div className="border-b pb-4">
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Previous Education</h3>
                <div className="space-y-2">
                  <Label htmlFor="previous_school">Previous School (if any)</Label>
                  <Input id="previous_school" value={formData.previous_school}
                    onChange={(e) => setFormData(f => ({ ...f, previous_school: e.target.value }))}
                    placeholder="Name of previous school" />
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Supporting Documents</h3>
                <div className="space-y-3">
                  <Label>Upload birth certificate, previous report cards, or passport photo</Label>
                  <div className="flex items-center gap-3">
                    <Button type="button" variant="outline" onClick={() => {
                      const input = document.createElement('input')
                      input.type = 'file'
                      input.multiple = true
                      input.accept = '.pdf,.jpg,.jpeg,.png,.doc,.docx'
                      input.onchange = () => {
                        const selected = Array.from(input.files || [])
                        setFiles(prev => [...prev, ...selected])
                      }
                      input.click()
                    }}>
                      <Upload className="h-4 w-4 mr-2" /> Choose Files
                    </Button>
                    <span className="text-sm text-muted-foreground">
                      {files.length > 0 ? `${files.length} file(s) selected` : 'PDF, Images or Documents'}
                    </span>
                  </div>
                  {files.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {files.map((f: any, i: any) => (
                        <div key={i} className="flex items-center gap-2 bg-gray-50 rounded-full px-3 py-1 text-sm border">
                          <span className="truncate max-w-[200px]">{f.name}</span>
                          <button type="button" className="text-gray-400 hover:text-red-500" onClick={() => setFiles(prev => prev.filter((_: any, j: any) => j !== i))}>
                            &times;
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <Button type="submit" className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg" disabled={submitMutation.isPending || uploading} size="lg">
                {submitMutation.isPending || uploading ? (
                  <><Loader2 className="h-5 w-5 mr-2 animate-spin" /> {uploading ? 'Uploading documents...' : 'Submitting...'}</>
                ) : (
                  <><Send className="h-5 w-5 mr-2" /> Submit Application</>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="text-center text-sm text-muted-foreground mt-6">
          By submitting this form, you agree to the school&apos;s terms and conditions.
          A confirmation will be sent to the email address provided.
        </p>
      </div>
    </div>
  )
}
