'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { submitApplication, uploadApplicationDocument } from '@/lib/actions/admissions.actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { toast } from 'sonner'
import {
  ArrowLeft, ArrowRight, Check, CheckCircle2, Building2, BookOpen,
  User, Users, FileText, ClipboardList, Loader2, Upload, X, Calendar,
  Phone, Mail, MapPin, CreditCard, GraduationCap, AlertCircle,
} from 'lucide-react'
import type { ApplicationDocument } from '@/types/admissions.types'

const STORAGE_KEY = 'educore-application-draft'
const STORAGE_KEY_STEP1 = 'educore-registration-step1'
const MAX_FILE_SIZE = 20 * 1024 * 1024

const steps = [
  { id: 1, label: 'School', icon: Building2 },
  { id: 2, label: 'Student Info', icon: User },
  { id: 3, label: 'Parent', icon: Users },
  { id: 4, label: 'Documents', icon: FileText },
  { id: 5, label: 'Review', icon: ClipboardList },
]

interface School {
  id: string; name: string; slug: string; logo_url: string | null; city: string | null
}
interface AcademicYear {
  id: string; name: string; start_date: string; end_date: string; is_current: boolean
}
interface ClassOption {
  id: string; name: string; level: number | null; description: string | null
}

export default function RegisterPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [result, setResult] = useState<{ referenceNumber: string; schoolName: string; parentEmail: string } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [form, setForm] = useState({
    schoolId: '', schoolName: '', schoolSlug: '',
    academicYearId: '', academicYearName: '',
    classId: '', className: '',
    firstName: '', lastName: '', dateOfBirth: '', gender: '', nationalId: '',
    phone: '', address: '', previousSchool: '',
    parentName: '', parentRelationship: '', parentPhone: '', parentEmail: '',
    parentNationalId: '', parentOccupation: '',
    documents: [] as ApplicationDocument[],
  })

  const [errors, setErrors] = useState<Record<string, string>>({})

  // ── TanStack Query: Schools ──
  const {
    data: schools = [],
    isLoading: schoolsLoading,
    isError: schoolsError,
  } = useQuery({
    queryKey: ['public-schools'],
    queryFn: async () => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('schools')
        .select('id, name, slug, logo_url, city')
        .eq('is_active', true)
        .order('name')
      if (error) throw error
      return data as School[]
    },
    staleTime: 5 * 60 * 1000,
  })

  // ── TanStack Query: Academic Years (enabled by schoolId) ──
  const {
    data: academicYears = [],
    isLoading: yearsLoading,
    isError: yearsError,
  } = useQuery({
    queryKey: ['public-academic-years', form.schoolId],
    queryFn: async () => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('academic_years')
        .select('id, name, start_date, end_date, is_current')
        .eq('school_id', form.schoolId)
        .gte('end_date', new Date().toISOString().split('T')[0])
        .order('start_date', { ascending: false })
      if (error) throw error
      return data as AcademicYear[]
    },
    enabled: !!form.schoolId,
    staleTime: 5 * 60 * 1000,
  })

  // ── TanStack Query: Classes (enabled by schoolId + academicYearId) ──
  const {
    data: classes = [],
    isLoading: classesLoading,
    isError: classesError,
    error: classesQueryError,
  } = useQuery({
    queryKey: ['public-classes', form.schoolId, form.academicYearId],
    queryFn: async () => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('classes')
        .select('id, name, level, description')
        .eq('school_id', form.schoolId)
        .eq('academic_year_id', form.academicYearId)
        .order('level', { ascending: true, nullsFirst: false })
      if (error) throw error
      return data as ClassOption[]
    },
    enabled: !!form.schoolId && !!form.academicYearId,
    staleTime: 5 * 60 * 1000,
  })

  // ── Load draft from localStorage ──
  useEffect(() => {
    try {
      const step1Saved = localStorage.getItem(STORAGE_KEY_STEP1)
      if (step1Saved) {
        const parsed = JSON.parse(step1Saved)
        setForm(prev => ({ ...prev, ...parsed }))
      }
      const draft = localStorage.getItem(STORAGE_KEY)
      if (draft) {
        const parsed = JSON.parse(draft)
        setForm(prev => ({ ...prev, ...parsed }))
      }
    } catch {}
  }, [])

  // ── Save step 1 fields separately ──
  useEffect(() => {
    try {
      const step1Fields: Record<string, string> = {}
      const keys = ['schoolId', 'schoolName', 'schoolSlug', 'academicYearId', 'academicYearName', 'classId', 'className'] as const
      for (const k of keys) {
        if (form[k]) step1Fields[k] = form[k]
      }
      localStorage.setItem(STORAGE_KEY_STEP1, JSON.stringify(step1Fields))
    } catch {}
  }, [form.schoolId, form.schoolName, form.schoolSlug, form.academicYearId, form.academicYearName, form.classId, form.className])

  // ── Save full draft to localStorage ──
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(form))
    } catch {}
  }, [form])

  // ── Auto-fill school name / slug when school changes ──
  useEffect(() => {
    const school = schools.find((s: any) => s.id === form.schoolId)
    if (school) {
      setForm(prev => ({
        ...prev,
        schoolName: school.name,
        schoolSlug: school.slug,
        academicYearId: '',
        academicYearName: '',
        classId: '',
        className: '',
      }))
    }
  }, [form.schoolId, schools])

  // ── Auto-select current academic year ──
  useEffect(() => {
    if (academicYears.length > 0 && !form.academicYearId) {
      const current = academicYears.find((y: any) => y.is_current)
      if (current) {
        setForm(prev => ({ ...prev, academicYearId: current.id, academicYearName: current.name }))
      }
    }
  }, [academicYears, form.academicYearId])

  // ── Set academic year name when selected ──
  useEffect(() => {
    const ay = academicYears.find((y: any) => y.id === form.academicYearId)
    if (ay) {
      setForm(prev => ({ ...prev, academicYearName: ay.name, classId: '', className: '' }))
    }
  }, [form.academicYearId, academicYears])

  // ── Set class name when selected ──
  useEffect(() => {
    const cls = classes.find((c: any) => c.id === form.classId)
    if (cls) setForm(prev => ({ ...prev, className: cls.name }))
  }, [form.classId, classes])

  const updateForm = useCallback((updates: Partial<typeof form>) => {
    setForm(prev => ({ ...prev, ...updates }))
    setErrors(prev => {
      const next = { ...prev }
      Object.keys(updates).forEach((k: any) => delete next[k])
      return next
    })
  }, [])

  // ── Validation per step ──

  const validateStep = (s: number): boolean => {
    const errs: Record<string, string> = {}
    if (s === 1) {
      if (!form.schoolId) errs.schoolId = 'Please select a school'
      if (!form.academicYearId) errs.academicYearId = 'Please select an academic year'
      if (!form.classId) errs.classId = 'Please select a class'
    }
    if (s === 2) {
      if (!form.firstName.trim()) errs.firstName = 'First name is required'
      if (!form.lastName.trim()) errs.lastName = 'Last name is required'
      if (!form.dateOfBirth) errs.dateOfBirth = 'Date of birth is required'
      if (!form.gender) errs.gender = 'Gender is required'
      if (!form.nationalId.trim()) errs.nationalId = 'National ID or birth certificate is required'
      if (!form.address.trim()) errs.address = 'Address is required'
    }
    if (s === 3) {
      if (!form.parentName.trim()) errs.parentName = 'Parent name is required'
      if (!form.parentRelationship) errs.parentRelationship = 'Relationship is required'
      if (!form.parentPhone.trim()) errs.parentPhone = 'Parent phone is required'
      if (!form.parentEmail.trim()) errs.parentEmail = 'Parent email is required'
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.parentEmail)) errs.parentEmail = 'Invalid email'
    }
    if (s === 4) {
      const hasTranscript = form.documents.some((d: any) => d.type === 'transcript')
      const hasBirthCert = form.documents.some((d: any) => d.type === 'birth_certificate')
      const hasPhoto = form.documents.some((d: any) => d.type === 'passport_photo')
      if (!hasTranscript) errs.transcript = 'Report card / transcript is required'
      if (!hasBirthCert) errs.birthCert = 'Birth certificate is required'
      if (!hasPhoto) errs.photo = 'Passport photo is required'
    }
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleNext = () => {
    if (validateStep(step)) setStep(s => Math.min(s + 1, 5))
  }

  const handleBack = () => setStep(s => Math.max(s - 1, 1))

  const step1Ready = !!(form.schoolId && form.academicYearId && form.classId)

  // ── File upload ──

  const handleFileUpload = async (docType: ApplicationDocument['type']) => {
    const input = document.createElement('input')
    input.type = 'file'
    if (docType === 'passport_photo') {
      input.accept = 'image/*'
    } else {
      input.accept = 'application/pdf,image/*'
    }
    input.onchange = async () => {
      const file = input.files?.[0]
      if (!file) return
      if (file.size > MAX_FILE_SIZE) {
        toast.error('File exceeds 20MB limit')
        return
      }
      setUploading(true)
      setUploadProgress(0)
      try {
        const formData = new FormData()
        formData.append('file', file)
        formData.append('schoolId', form.schoolId)
        const simulatedProgress = setInterval(() => {
          setUploadProgress(prev => Math.min(prev + 15, 90))
        }, 300)
        const result = await uploadApplicationDocument(formData)
        clearInterval(simulatedProgress)
        setUploadProgress(100)
        const doc: ApplicationDocument = {
          type: docType,
          url: result.url,
          name: result.name,
          size: result.size,
        }
        setForm(prev => ({
          ...prev,
          documents: [...prev.documents.filter((d: any) => d.type !== docType), doc],
        }))
        toast.success(`${file.name} uploaded`)
      } catch (e: any) {
        toast.error(e.message || 'Upload failed')
      } finally {
        setUploading(false)
        setUploadProgress(0)
      }
    }
    input.click()
  }

  const removeDocument = (docType: ApplicationDocument['type']) => {
    setForm(prev => ({ ...prev, documents: prev.documents.filter((d: any) => d.type !== docType) }))
  }

  // ── Submit ──

  const handleSubmit = async () => {
    if (!validateStep(5)) return
    setSubmitting(true)
    try {
      const result = await submitApplication({
        school_id: form.schoolId,
        applying_for_class: form.className,
        student_name: `${form.firstName} ${form.lastName}`,
        date_of_birth: form.dateOfBirth,
        gender: form.gender as any,
        address: form.address,
        previous_school: form.previousSchool,
        parent_name: form.parentName,
        parent_phone: form.parentPhone,
        parent_email: form.parentEmail,
        documents: form.documents,
        notes: JSON.stringify({
          academic_year_id: form.academicYearId,
          academic_year_name: form.academicYearName,
          class_id: form.classId,
          class_name: form.className,
        }),
      })
      setResult(result)
      setSubmitted(true)
      localStorage.removeItem(STORAGE_KEY)
      localStorage.removeItem(STORAGE_KEY_STEP1)
    } catch (e: any) {
      toast.error(e.message || 'Failed to submit application')
    } finally {
      setSubmitting(false)
    }
  }

  // ── Helpers ──

  const formatDate = (d: string) => {
    try {
      return new Date(d).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
    } catch { return d }
  }

  // ── Render form step ──

  const renderStep = () => {
    switch (step) {
      case 1: return renderSchoolStep()
      case 2: return renderPersonalStep()
      case 3: return renderParentStep()
      case 4: return renderDocumentsStep()
      case 5: return renderReviewStep()
      default: return null
    }
  }

  // ── STEP 1: School + Academic Year + Class ──

  const renderSchoolStep = () => (
    <div className="space-y-5">

      {schoolsError && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
          <span>Failed to load schools. Please refresh the page.</span>
        </div>
      )}

      {/* ── School Select ── */}
      <div className="space-y-2">
        <Label className="flex items-center gap-1.5 text-base">
          <Building2 className="h-4 w-4 text-edu-blue-600" />
          Select Your School <span className="text-red-500">*</span>
        </Label>
        <Select
          value={form.schoolId}
          onValueChange={(v) => updateForm({ schoolId: v, classId: '', className: '' })}
          disabled={schoolsLoading}
        >
          <SelectTrigger className="h-11">
            {schoolsLoading ? (
              <span className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />Loading schools...
              </span>
            ) : (
              <SelectValue placeholder="Search and select your school" />
            )}
          </SelectTrigger>
          <SelectContent>
            {schools.length === 0 && !schoolsLoading ? (
              <div className="p-3 text-sm text-muted-foreground text-center">No schools available at this time</div>
            ) : (
              schools.map((school: any) => (
                <SelectItem key={school.id} value={school.id} className="py-2.5">
                  <div className="flex items-center gap-3">
                    {school.logo_url ? (
                      <img src={school.logo_url} alt="" className="h-8 w-8 rounded-full object-cover border" />
                    ) : (
                      <div className="h-8 w-8 rounded-full bg-edu-blue-100 flex items-center justify-center text-xs font-bold text-edu-blue-600 border border-edu-blue-200">
                        {school.name.charAt(0)}
                      </div>
                    )}
                    <div>
                      <div className="text-sm font-medium">{school.name}</div>
                      {school.city && <div className="text-xs text-muted-foreground">{school.city}</div>}
                    </div>
                  </div>
                </SelectItem>
              ))
            )}
          </SelectContent>
        </Select>
        {errors.schoolId && <p className="text-xs text-red-500 flex items-center gap-1"><AlertCircle className="h-3 w-3" />{errors.schoolId}</p>}
      </div>

      {/* ── Academic Year Select ── */}
      <div className="space-y-2">
        <Label className="flex items-center gap-1.5 text-base">
          <Calendar className="h-4 w-4 text-edu-blue-600" />
          Select Academic Year <span className="text-red-500">*</span>
        </Label>
        <Select
          value={form.academicYearId}
          onValueChange={(v) => updateForm({ academicYearId: v, classId: '', className: '' })}
          disabled={!form.schoolId || yearsLoading}
        >
          <SelectTrigger className="h-11">
            {!form.schoolId ? (
              <span className="text-muted-foreground">Select a school first</span>
            ) : yearsLoading ? (
              <span className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />Loading academic years...
              </span>
            ) : (
              <SelectValue placeholder="Choose academic year" />
            )}
          </SelectTrigger>
          <SelectContent>
            {academicYears.length === 0 && !yearsLoading ? (
              <div className="p-3 text-sm text-muted-foreground text-center">No active academic years found</div>
            ) : (
              academicYears.map((ay: any) => (
                <SelectItem key={ay.id} value={ay.id} className="py-2.5">
                  <div className="flex items-center justify-between w-full gap-3">
                    <div>
                      <div className="text-sm font-medium">{ay.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {formatDate(ay.start_date)} &mdash; {formatDate(ay.end_date)}
                      </div>
                    </div>
                    {ay.is_current && (
                      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-[10px] px-1.5 py-0 h-5">
                        Current
                      </Badge>
                    )}
                  </div>
                </SelectItem>
              ))
            )}
          </SelectContent>
        </Select>
        {yearsError && (
          <p className="text-xs text-red-500 flex items-center gap-1"><AlertCircle className="h-3 w-3" />Failed to load academic years. Please refresh.</p>
        )}
        {errors.academicYearId && <p className="text-xs text-red-500 flex items-center gap-1"><AlertCircle className="h-3 w-3" />{errors.academicYearId}</p>}
        {!yearsLoading && form.schoolId && academicYears.length === 0 && (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200 text-sm text-amber-700">
            <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
            <span>This school has no active academic years. Please contact the school directly.</span>
          </div>
        )}
      </div>

      {/* ── Class Select ── */}
      <div className="space-y-2">
        <Label className="flex items-center gap-1.5 text-base">
          <BookOpen className="h-4 w-4 text-edu-blue-600" />
          Select Your Class <span className="text-red-500">*</span>
        </Label>
        <Select
          value={form.classId}
          onValueChange={(v) => updateForm({ classId: v })}
          disabled={!form.academicYearId || classesLoading}
        >
          <SelectTrigger className="h-11">
            {!form.academicYearId ? (
              <span className="text-muted-foreground">Select an academic year first</span>
            ) : classesLoading ? (
              <span className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />Loading classes...
              </span>
            ) : (
              <SelectValue placeholder="Choose your class" />
            )}
          </SelectTrigger>
          <SelectContent>
            {classes.length === 0 && !classesLoading ? (
              <div className="p-3 text-sm text-muted-foreground text-center">No classes available for this year</div>
            ) : (
              classes.map((cls: any) => (
                <SelectItem key={cls.id} value={cls.id} className="py-2.5">
                  <div>
                    <div className="text-sm font-medium">
                      {cls.name}
                      {cls.level !== null && <span className="text-muted-foreground ml-1">(Level {cls.level})</span>}
                    </div>
                    {cls.description && <div className="text-xs text-muted-foreground">{cls.description}</div>}
                  </div>
                </SelectItem>
              ))
            )}
          </SelectContent>
        </Select>
        {classesError && (
          <p className="text-xs text-red-500 flex items-center gap-1"><AlertCircle className="h-3 w-3" />Failed to load classes: {classesQueryError?.message || 'RLS policy may be missing. Contact the school.'}</p>
        )}
        {errors.classId && <p className="text-xs text-red-500 flex items-center gap-1"><AlertCircle className="h-3 w-3" />{errors.classId}</p>}
        {!classesLoading && form.academicYearId && classes.length === 0 && (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200 text-sm text-amber-700">
            <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
            <span>No classes available for this academic year. Please contact the school directly.</span>
          </div>
        )}
      </div>

      {/* ── Selection Summary ── */}
      {step1Ready && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 space-y-2">
          <p className="text-xs font-semibold text-green-700 uppercase tracking-wider">Selection Summary</p>
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-sm">
              <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
              <span className="font-medium text-green-800">{form.schoolName}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
              <span className="font-medium text-green-800">Academic Year {form.academicYearName}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
              <span className="font-medium text-green-800">{form.className}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )

  // ── STEP 2: Personal Info ──

  const renderPersonalStep = () => (
    <div className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>First Name <span className="text-red-500">*</span></Label>
          <Input value={form.firstName} onChange={(e) => updateForm({ firstName: e.target.value })} placeholder="John" />
          {errors.firstName && <p className="text-xs text-red-500">{errors.firstName}</p>}
        </div>
        <div className="space-y-2">
          <Label>Last Name <span className="text-red-500">*</span></Label>
          <Input value={form.lastName} onChange={(e) => updateForm({ lastName: e.target.value })} placeholder="Doe" />
          {errors.lastName && <p className="text-xs text-red-500">{errors.lastName}</p>}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Date of Birth <span className="text-red-500">*</span></Label>
          <Input type="date" value={form.dateOfBirth} onChange={(e) => updateForm({ dateOfBirth: e.target.value })} />
          {errors.dateOfBirth && <p className="text-xs text-red-500">{errors.dateOfBirth}</p>}
        </div>
        <div className="space-y-2">
          <Label>Gender <span className="text-red-500">*</span></Label>
          <Select value={form.gender} onValueChange={(v) => updateForm({ gender: v })}>
            <SelectTrigger><SelectValue placeholder="Select gender" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="male">Male</SelectItem>
              <SelectItem value="female">Female</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
          {errors.gender && <p className="text-xs text-red-500">{errors.gender}</p>}
        </div>
      </div>

      <div className="space-y-2">
        <Label className="flex items-center gap-1.5">
          <CreditCard className="h-3.5 w-3.5 text-gray-500" />
          National ID / Birth Certificate Number <span className="text-red-500">*</span>
        </Label>
        <Input value={form.nationalId} onChange={(e) => updateForm({ nationalId: e.target.value })} placeholder="Enter ID or certificate number" />
        {errors.nationalId && <p className="text-xs text-red-500">{errors.nationalId}</p>}
      </div>

      <div className="space-y-2">
        <Label className="flex items-center gap-1.5">
          <Phone className="h-3.5 w-3.5 text-gray-500" />
          Phone Number (Optional)
        </Label>
        <Input type="tel" value={form.phone} onChange={(e) => updateForm({ phone: e.target.value })} placeholder="+1 234 567 8900" />
      </div>

      <div className="space-y-2">
        <Label className="flex items-center gap-1.5">
          <MapPin className="h-3.5 w-3.5 text-gray-500" />
          Home Address <span className="text-red-500">*</span>
        </Label>
        <Textarea value={form.address} onChange={(e) => updateForm({ address: e.target.value })} placeholder="Your full home address" rows={2} />
        {errors.address && <p className="text-xs text-red-500">{errors.address}</p>}
      </div>

      <div className="space-y-2">
        <Label>Previous School (Optional)</Label>
        <Input value={form.previousSchool} onChange={(e) => updateForm({ previousSchool: e.target.value })} placeholder="Name of previous school" />
      </div>
    </div>
  )

  // ── STEP 3: Parent Info ──

  const renderParentStep = () => (
    <div className="space-y-5">
      <div className="rounded-lg bg-blue-50 border border-blue-200 p-3 flex gap-2 mb-2">
        <Users className="h-4 w-4 text-blue-500 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-blue-700">Parent/Guardian contact information. This email will be used for all school communications.</p>
      </div>

      <div className="space-y-2">
        <Label>Parent/Guardian Full Name <span className="text-red-500">*</span></Label>
        <Input value={form.parentName} onChange={(e) => updateForm({ parentName: e.target.value })} placeholder="Full name" />
        {errors.parentName && <p className="text-xs text-red-500">{errors.parentName}</p>}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Relationship <span className="text-red-500">*</span></Label>
          <Select value={form.parentRelationship} onValueChange={(v) => updateForm({ parentRelationship: v })}>
            <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="father">Father</SelectItem>
              <SelectItem value="mother">Mother</SelectItem>
              <SelectItem value="guardian">Guardian</SelectItem>
            </SelectContent>
          </Select>
          {errors.parentRelationship && <p className="text-xs text-red-500">{errors.parentRelationship}</p>}
        </div>
        <div className="space-y-2">
          <Label>Parent Occupation (Optional)</Label>
          <Input value={form.parentOccupation} onChange={(e) => updateForm({ parentOccupation: e.target.value })} placeholder="Occupation" />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="flex items-center gap-1.5">
            <Phone className="h-3.5 w-3.5 text-gray-500" />
            Phone Number <span className="text-red-500">*</span>
          </Label>
          <Input type="tel" value={form.parentPhone} onChange={(e) => updateForm({ parentPhone: e.target.value })} placeholder="+1 234 567 8900" />
          {errors.parentPhone && <p className="text-xs text-red-500">{errors.parentPhone}</p>}
        </div>
        <div className="space-y-2">
          <Label className="flex items-center gap-1.5">
            <Mail className="h-3.5 w-3.5 text-gray-500" />
            Email <span className="text-red-500">*</span>
          </Label>
          <Input type="email" value={form.parentEmail} onChange={(e) => updateForm({ parentEmail: e.target.value })} placeholder="parent@example.com" />
          {errors.parentEmail && <p className="text-xs text-red-500">{errors.parentEmail}</p>}
        </div>
      </div>

      <div className="space-y-2">
        <Label>Parent National ID (Optional)</Label>
        <Input value={form.parentNationalId} onChange={(e) => updateForm({ parentNationalId: e.target.value })} placeholder="ID number" />
      </div>
    </div>
  )

  // ── STEP 4: Documents ──

  const docFields: { key: ApplicationDocument['type']; label: string; desc: string; required: boolean }[] = [
    { key: 'transcript', label: 'Previous Report Card / Transcript', desc: 'PDF or image (max 20MB)', required: true },
    { key: 'birth_certificate', label: 'Birth Certificate', desc: 'PDF or image (max 20MB)', required: true },
    { key: 'passport_photo', label: 'Passport Photo', desc: 'Image only (max 20MB)', required: true },
    { key: 'other', label: 'Other Supporting Document', desc: 'PDF or image (optional)', required: false },
  ]

  const renderDocumentsStep = () => (
    <div className="space-y-5">
      <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 flex gap-2 mb-2">
        <Upload className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-amber-700">Upload clear scans or photos of the required documents. Maximum file size: 20MB each.</p>
      </div>

      {docFields.map(({ key, label, desc, required }: any) => {
        const doc = form.documents.find((d: any) => d.type === key)
        return (
          <div key={key} className="border rounded-lg p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <Label className="text-sm font-medium">
                  {label} {required && <span className="text-red-500">*</span>}
                </Label>
                <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
              </div>
              {!doc ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleFileUpload(key)}
                  disabled={uploading}
                  className="shrink-0"
                >
                  {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                  <span className="ml-1.5">Upload</span>
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeDocument(key)}
                  className="shrink-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
            {uploadProgress > 0 && uploadProgress < 100 && (
              <div className="mt-2">
                <Progress value={uploadProgress} className="h-1.5" />
                <p className="text-xs text-muted-foreground mt-1">{uploadProgress}%</p>
              </div>
            )}
            {doc && (
              <div className="mt-2 flex items-center gap-2 text-xs text-green-600 bg-green-50 rounded px-2 py-1.5">
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span className="truncate">{doc.name}</span>
                <span className="text-muted-foreground">({(doc.size / 1024 / 1024).toFixed(1)}MB)</span>
              </div>
            )}
            {errors[key] && <p className="text-xs text-red-500 mt-1 flex items-center gap-1"><AlertCircle className="h-3 w-3" />{errors[key]}</p>}
          </div>
        )
      })}
    </div>
  )

  // ── STEP 5: Review ──

  const renderReviewStep = () => (
    <div className="space-y-5">
      <div className="rounded-lg bg-green-50 border border-green-200 p-3 flex gap-2 mb-2">
        <ClipboardList className="h-4 w-4 text-green-500 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-green-700">Please review all information carefully before submitting. You will not be able to edit after submission.</p>
      </div>

      <Card className="border-2 border-edu-blue-100">
        <CardContent className="p-4 space-y-4">
          <div>
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Building2 className="h-3.5 w-3.5" /> School & Class
            </h3>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div><span className="text-muted-foreground">School:</span> <span className="font-medium">{form.schoolName}</span></div>
              <div><span className="text-muted-foreground">Academic Year:</span> <span className="font-medium">{form.academicYearName}</span></div>
              <div><span className="text-muted-foreground">Class:</span> <span className="font-medium">{form.className}</span></div>
            </div>
          </div>
          <div className="border-t pt-3">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <User className="h-3.5 w-3.5" /> Student Information
            </h3>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div><span className="text-muted-foreground">Name:</span> <span className="font-medium">{form.firstName} {form.lastName}</span></div>
              <div><span className="text-muted-foreground">DOB:</span> <span className="font-medium">{form.dateOfBirth}</span></div>
              <div><span className="text-muted-foreground">Gender:</span> <span className="font-medium capitalize">{form.gender}</span></div>
              <div><span className="text-muted-foreground">ID/Certificate:</span> <span className="font-medium">{form.nationalId}</span></div>
              <div><span className="text-muted-foreground">Phone:</span> <span className="font-medium">{form.phone || '—'}</span></div>
              <div className="col-span-2"><span className="text-muted-foreground">Address:</span> <span className="font-medium">{form.address}</span></div>
              <div className="col-span-2"><span className="text-muted-foreground">Previous School:</span> <span className="font-medium">{form.previousSchool || 'None'}</span></div>
            </div>
          </div>
          <div className="border-t pt-3">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5" /> Parent/Guardian
            </h3>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div><span className="text-muted-foreground">Name:</span> <span className="font-medium">{form.parentName}</span></div>
              <div><span className="text-muted-foreground">Relationship:</span> <span className="font-medium capitalize">{form.parentRelationship}</span></div>
              <div><span className="text-muted-foreground">Phone:</span> <span className="font-medium">{form.parentPhone}</span></div>
              <div><span className="text-muted-foreground">Email:</span> <span className="font-medium">{form.parentEmail}</span></div>
            </div>
          </div>
          <div className="border-t pt-3">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <FileText className="h-3.5 w-3.5" /> Documents ({form.documents.length})
            </h3>
            <div className="space-y-1 text-sm">
              {form.documents.map((doc: any, i: any) => (
                <div key={i} className="flex items-center gap-2 text-green-600">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span className="capitalize">{doc.type.replace(/_/g, ' ')}</span>
                  <span className="text-muted-foreground">— {doc.name}</span>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <label className="flex items-start gap-3 p-3 rounded-lg border bg-gray-50 cursor-pointer">
        <input type="checkbox" className="mt-0.5 h-4 w-4 rounded border-gray-300 text-edu-blue-600 focus:ring-edu-blue-500" />
        <span className="text-sm text-gray-700">I confirm that all the information provided above is accurate and complete to the best of my knowledge.</span>
      </label>
    </div>
  )

  // ── Progress ──

  const progressPercent = ((step - 1) / (steps.length - 1)) * 100

  // ── Success screen ──

  if (submitted && result) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 via-white to-edu-blue-50 p-4">
        <div className="w-full max-w-lg">
          <Card className="border-2 border-green-100 shadow-sm">
            <CardContent className="py-10 text-center">
              <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6">
                <CheckCircle2 className="h-10 w-10 text-green-600" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">Application Submitted!</h1>
              <p className="text-gray-500 mb-6">Thank you for applying to {result.schoolName}.</p>

              <div className="bg-edu-blue-50 rounded-xl p-5 mb-6 text-left space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500">Reference Number</span>
                  <span className="text-lg font-bold font-mono text-edu-blue-700">{result.referenceNumber}</span>
                </div>
                <div className="border-t border-edu-blue-100 pt-3">
                  <p className="text-sm text-gray-600">
                    The school admin will review your application and contact you at <strong>{result.parentEmail}</strong>.
                    You will receive your login credentials once your application is approved.
                  </p>
                </div>
              </div>

              <div className="text-xs text-gray-400 space-y-2">
                <p>Please save your reference number for future correspondence.</p>
                <Button onClick={() => router.push('/')} variant="outline" className="mt-4">
                  <ArrowLeft className="h-4 w-4 mr-2" /> Back to Home
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  // ── Main form ──

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-edu-blue-50 py-8 px-4">
      <div className="w-full max-w-2xl mx-auto">
        <div className="mb-6">
          <button onClick={() => step === 1 ? router.push('/') : handleBack()} className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors">
            <ArrowLeft className="h-4 w-4" /> {step === 1 ? 'Back to home' : 'Back'}
          </button>
        </div>

        <Card className="border-2 border-gray-100 shadow-sm mb-4">
          <CardContent className="p-6">
            <div className="text-center mb-6">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-edu-blue-500 to-edu-blue-700 flex items-center justify-center mx-auto mb-3 shadow-lg">
                <GraduationCap className="h-6 w-6 text-white" />
              </div>
              <h1 className="text-xl font-bold text-gray-900">Apply for Admission</h1>
              <p className="text-sm text-muted-foreground mt-1">Step {step} of {steps.length} — {steps[step - 1].label}</p>
            </div>

            <div className="mb-6">
              <Progress value={progressPercent} className="h-2" />
              <div className="flex justify-between mt-2">
                {steps.map((s: any) => (
                  <div key={s.id} className="flex flex-col items-center" style={{ width: `${100 / steps.length}%` }}>
                    <div className={`flex items-center justify-center w-7 h-7 rounded-full text-xs font-medium transition-colors ${
                      s.id < step ? 'bg-green-500 text-white' :
                      s.id === step ? 'bg-edu-blue-600 text-white' :
                      'bg-gray-100 text-gray-400'
                    }`}>
                      {s.id < step ? <Check className="h-3.5 w-3.5" /> : s.id}
                    </div>
                    <span className={`text-[10px] mt-1 hidden sm:block ${
                      s.id === step ? 'text-edu-blue-600 font-medium' : 'text-gray-400'
                    }`}>{s.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {renderStep()}
          </CardContent>
        </Card>

        {/* Navigation buttons */}
        {step < 5 && (
          <div className="flex justify-between gap-3">
            <Button variant="outline" onClick={handleBack} disabled={step === 1} className="w-28">
              <ArrowLeft className="h-4 w-4 mr-1.5" /> Back
            </Button>
            <Button onClick={handleNext} disabled={step === 1 && !step1Ready} className="flex-1 sm:flex-none sm:w-32">
              Next <ArrowRight className="h-4 w-4 ml-1.5" />
            </Button>
          </div>
        )}
        {step === 5 && (
          <div className="flex justify-between gap-3">
            <Button variant="outline" onClick={handleBack} className="w-28">
              <ArrowLeft className="h-4 w-4 mr-1.5" /> Back
            </Button>
            <Button onClick={handleSubmit} disabled={submitting} className="flex-1 sm:flex-none bg-green-600 hover:bg-green-700 text-white">
              {submitting ? (
                <><Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> Submitting...</>
              ) : (
                <><CheckCircle2 className="h-4 w-4 mr-1.5" /> Submit Application</>
              )}
            </Button>
          </div>
        )}

        <p className="text-center text-xs text-gray-400 mt-6">
          EduCore School Management System &copy; {new Date().getFullYear()}
        </p>
      </div>
    </div>
  )
}
