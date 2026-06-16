'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { getClassesForSchool, enrollStudent } from '@/lib/actions/admissions.actions'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  X, Loader2, School, UserPlus, Copy, CheckCircle2, Printer, Eye, EyeOff, Info,
} from 'lucide-react'
import { toast } from 'sonner'
import type { Application, EnrollmentResult } from '@/types/admissions.types'

interface Props {
  application: Application
  onClose: () => void
  onComplete: () => void
}

function generatePassword(): string {
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ'
  const lower = 'abcdefghjkmnpqrstuvwxyz'
  const digits = '23456789'
  const all = upper + lower + digits
  let pwd = ''
  pwd += upper[Math.floor(Math.random() * upper.length)]
  pwd += digits[Math.floor(Math.random() * digits.length)]
  for (let i = 0; i < 6; i++) pwd += all[Math.floor(Math.random() * all.length)]
  return pwd.split('').sort(() => Math.random() - 0.5).join('')
}

export function EnrollDialog({ application: app, onClose, onComplete }: Props) {
  const [step, setStep] = useState<'form' | 'result'>('form')
  const [classId, setClassId] = useState('')
  const [sectionId, setSectionId] = useState('')
  const [enrollmentDate, setEnrollmentDate] = useState(new Date().toISOString().split('T')[0])
  const [admissionNumber, setAdmissionNumber] = useState('')
  const [studentPassword, setStudentPassword] = useState(generatePassword())
  const [parentPassword, setParentPassword] = useState(generatePassword())
  const [showStudentPwd, setShowStudentPwd] = useState(false)
  const [showParentPwd, setShowParentPwd] = useState(false)
  const [result, setResult] = useState<EnrollmentResult | null>(null)
  const printRef = useRef<HTMLDivElement>(null)

  // Parse notes from application for pre-fill
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

  const { data: classes } = useQuery({
    queryKey: ['classes-for-enroll', app.school_id],
    queryFn: () => getClassesForSchool(app.school_id),
    enabled: !!app.school_id,
  })

  // Pre-fill class from application notes if available
  useEffect(() => {
    if (applicationNotes?.class_id && classes && !classId) {
      const match = classes.find((c: any) => c.id === applicationNotes.class_id)
      if (match) setClassId(applicationNotes.class_id)
    }
  }, [applicationNotes, classes, classId])
  const selectedClass = classes?.find((c: any) => c.id === classId)
  const sections = (selectedClass as any)?.sections ?? []

  const enrollMutation = useMutation({
    mutationFn: () => enrollStudent({
      application_id: app.id,
      class_id: classId,
      section_id: sectionId || null,
      enrollment_date: enrollmentDate,
      admission_number: admissionNumber,
      student_password: studentPassword,
      parent_password: parentPassword,
    }),
    onSuccess: (data: any) => {
      setResult(data)
      setStep('result')
      toast.success('Student enrolled successfully!')
      onComplete()
    },
    onError: (err: Error) => toast.error(err.message),
  })

  // Generate admission number when class is selected
  useEffect(() => {
    if (classId && !admissionNumber) {
      setAdmissionNumber(`STU-${Date.now().toString().slice(-6)}`)
    }
  }, [classId, admissionNumber])

  const handleSubmit = () => {
    if (!classId) { toast.error('Please select a class'); return }
    if (!admissionNumber.trim()) { toast.error('Admission number is required'); return }
    enrollMutation.mutate()
  }

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text).then(() => toast.success(`${label} copied`))
  }

  const handlePrint = () => {
    const printWindow = window.open('', '_blank')
    if (!printWindow || !result) return
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Enrollment Letter - ${result.admissionNumber}</title>
        <style>
          @page { margin: 20mm; }
          body { font-family: 'Times New Roman', Times, serif; color: #333; line-height: 1.6; }
          .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #1E40AF; padding-bottom: 20px; }
          .header h1 { color: #1E40AF; margin: 0; font-size: 24px; }
          .header p { color: #666; margin: 5px 0 0; }
          .content { margin: 20px 0; }
          .content h2 { color: #1E40AF; font-size: 18px; border-bottom: 1px solid #ddd; padding-bottom: 8px; }
          table { width: 100%; border-collapse: collapse; margin: 15px 0; }
          td { padding: 8px 12px; border-bottom: 1px solid #eee; }
          td:first-child { font-weight: bold; width: 180px; color: #555; }
          .credentials { background: #f0f4ff; padding: 15px; border-radius: 8px; margin: 15px 0; }
          .credentials h3 { color: #1E40AF; margin: 0 0 10px; }
          .footer { margin-top: 40px; text-align: right; }
          .footer p { margin: 5px 0; color: #555; }
          .badge { display: inline-block; background: #1E40AF; color: white; padding: 4px 12px; border-radius: 4px; font-size: 14px; }
          @media print { body { margin: 0; padding: 0; } }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>${result.schoolName || 'School Name'}</h1>
          <p>Enrollment Confirmation Letter</p>
        </div>
        <div class="content">
          <p>Date: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
          <h2>Student Details</h2>
          <table>
            <tr><td>Student Name</td><td>${app.student_name}</td></tr>
            <tr><td>Admission Number</td><td><strong>${result.admissionNumber}</strong></td></tr>
            <tr><td>Class</td><td>${selectedClass?.name || ''}</td></tr>
            <tr><td>Section</td><td>${sections.find((s: any) => s.id === sectionId)?.name || ''}</td></tr>
            <tr><td>Enrollment Date</td><td>${new Date(enrollmentDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</td></tr>
          </table>
          <h2>Login Credentials</h2>
          <div class="credentials">
            <h3>Student Portal</h3>
            <table>
              <tr><td>Email</td><td>${result.studentEmail}</td></tr>
              <tr><td>Password</td><td>${result.studentPassword}</td></tr>
            </table>
            <h3>Parent Portal</h3>
            <table>
              <tr><td>Email</td><td>${result.parentEmail}</td></tr>
              <tr><td>Password</td><td>${result.parentPassword}</td></tr>
            </table>
          </div>
          <p style="margin-top: 20px; font-style: italic; color: #555;">
            Welcome to our school! We look forward to a wonderful journey of learning and growth together.
          </p>
        </div>
        <div class="footer">
          <p>Sincerely,</p>
          <p><strong>School Administration</strong></p>
        </div>
      </body>
      </html>
    `)
    printWindow.document.close()
    setTimeout(() => printWindow.print(), 500)
  }

  const handleCopyAll = () => {
    if (!result) return
    const text = [
      `Student: ${result.studentName}`,
      `Admission Number: ${result.admissionNumber}`,
      result.className ? `Class: ${result.className}${result.sectionName ? ` — ${result.sectionName}` : ''}` : '',
      '',
      `── STUDENT LOGIN ──`,
      `Email: ${result.studentEmail}`,
      `Password: ${result.studentPassword}`,
      '',
      `── PARENT LOGIN ──`,
      `Email: ${result.parentEmail}`,
      `Password: ${result.parentPassword}`,
      `Status: ${result.parentAccountNote}`,
    ].filter(Boolean).join('\n')
    navigator.clipboard.writeText(text).then(() => toast.success('All credentials copied to clipboard'))
  }

  // Result step
  if (step === 'result' && result) {
    return (
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
        <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
          <div ref={printRef} className="p-6 space-y-6">
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-3">
                <CheckCircle2 className="h-8 w-8 text-green-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-900">Enrollment Complete</h2>
              <p className="text-muted-foreground text-sm mt-1">{result.studentName} has been enrolled successfully.</p>
            </div>

            {/* Student info */}
            <div className="bg-edu-blue-50 rounded-xl p-4 space-y-1">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500">Student</span>
                <span className="text-sm font-medium">{result.studentName}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500">Admission Number</span>
                <span className="text-lg font-bold font-mono text-edu-blue-700">{result.admissionNumber}</span>
              </div>
              {(result.className || result.sectionName) && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500">Class</span>
                  <span className="text-sm font-medium">{result.className}{result.sectionName ? ` — Section ${result.sectionName}` : ''}</span>
                </div>
              )}
            </div>

            {/* Credentials grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="border rounded-xl p-4 space-y-2">
                <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-1.5"><School className="h-4 w-4" /> Student Login</h3>
                <div className="text-sm space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-muted-foreground shrink-0">Email:</span>
                    <span className="font-mono text-xs truncate">{result.studentEmail}</span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-muted-foreground shrink-0">Password:</span>
                    <span className="font-mono text-xs">{result.studentPassword}</span>
                  </div>
                </div>
                <Button size="sm" variant="outline" className="w-full text-xs" onClick={() => copyToClipboard(`Email: ${result.studentEmail}\nPassword: ${result.studentPassword}`, 'Student credentials')}>
                  <Copy className="h-3 w-3 mr-1" /> Copy
                </Button>
              </div>
              <div className="border rounded-xl p-4 space-y-2">
                <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-1.5"><UserPlus className="h-4 w-4" /> Parent Login</h3>
                <div className="text-sm space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-muted-foreground shrink-0">Email:</span>
                    <span className="font-mono text-xs truncate">{result.parentEmail}</span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-muted-foreground shrink-0">Password:</span>
                    <span className="font-mono text-xs">{result.parentPassword}</span>
                  </div>
                </div>
                <div className={`text-xs text-center rounded-md px-2 py-1 ${result.parentIsNew ? 'bg-green-50 text-green-700' : 'bg-blue-50 text-blue-700'}`}>
                  {result.parentAccountNote}
                </div>
                <Button size="sm" variant="outline" className="w-full text-xs" onClick={() => copyToClipboard(`Email: ${result.parentEmail}\nPassword: ${result.parentPassword}`, 'Parent credentials')}>
                  <Copy className="h-3 w-3 mr-1" /> Copy
                </Button>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-3">
              <Button variant="outline" className="flex-1" onClick={handlePrint}>
                <Printer className="h-4 w-4 mr-1.5" /> Print Letter
              </Button>
              <Button variant="outline" className="flex-1" onClick={handleCopyAll}>
                <Copy className="h-4 w-4 mr-1.5" /> Copy All
              </Button>
              <Button className="flex-1" onClick={onClose}>Done</Button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Enrollment form
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="p-6 space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Enroll Student</h2>
              <p className="text-sm text-muted-foreground">{app.student_name}</p>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose}><X className="h-5 w-5" /></Button>
          </div>

          <div className="space-y-4">
            {applicationNotes && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex gap-2">
                <Info className="h-4 w-4 text-blue-500 flex-shrink-0 mt-0.5" />
                <div className="text-xs text-blue-700">
                  <p className="font-medium">Student applied for:</p>
                  <p>{applicationNotes.class_name || app.applying_for_class}{applicationNotes?.academic_year_name ? ` (${applicationNotes.academic_year_name})` : ''}</p>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label>Admission Number</Label>
              <Input
                value={admissionNumber}
                onChange={(e) => setAdmissionNumber(e.target.value)}
                placeholder="Auto-generated"
                className="font-mono"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Class *</Label>
                <Select value={classId} onValueChange={(v) => { setClassId(v); setSectionId('') }}>
                  <SelectTrigger><SelectValue placeholder="Select class" /></SelectTrigger>
                  <SelectContent>
                    {classes?.map((c: any) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}{c.level !== null ? ` (Lvl ${c.level})` : ''}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Section</Label>
                <Select value={sectionId} onValueChange={setSectionId} disabled={sections.length === 0}>
                  <SelectTrigger><SelectValue placeholder={sections.length === 0 ? 'No sections' : 'Optional'} /></SelectTrigger>
                  <SelectContent>
                    {sections.map((s: any) => (
                      <SelectItem key={s.id} value={s.id}>{s.name}{s.capacity ? ` (Cap: ${s.capacity})` : ''}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Enrollment Date</Label>
              <Input type="date" value={enrollmentDate} onChange={(e) => setEnrollmentDate(e.target.value)} />
            </div>

            <div className="border-t pt-4 space-y-4">
              <h3 className="text-sm font-semibold text-gray-700">Login Credentials</h3>

              <div className="space-y-2">
                <Label>Student Password</Label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Input
                      type={showStudentPwd ? 'text' : 'password'}
                      value={studentPassword}
                      onChange={(e) => setStudentPassword(e.target.value)}
                      className="font-mono pr-8"
                    />
                    <button
                      type="button"
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      onClick={() => setShowStudentPwd(!showStudentPwd)}
                    >
                      {showStudentPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  <Button variant="outline" size="icon" onClick={() => setStudentPassword(generatePassword())} title="Regenerate">
                    <Loader2 className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">Student login: {admissionNumber.toLowerCase()}@school.edu.local</p>
              </div>

              <div className="space-y-2">
                <Label>Parent Password</Label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Input
                      type={showParentPwd ? 'text' : 'password'}
                      value={parentPassword}
                      onChange={(e) => setParentPassword(e.target.value)}
                      className="font-mono pr-8"
                    />
                    <button
                      type="button"
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      onClick={() => setShowParentPwd(!showParentPwd)}
                    >
                      {showParentPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  <Button variant="outline" size="icon" onClick={() => setParentPassword(generatePassword())} title="Regenerate">
                    <Loader2 className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">Parent login: {app.parent_email}</p>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button
              onClick={handleSubmit}
              disabled={!classId || !admissionNumber.trim() || enrollMutation.isPending}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {enrollMutation.isPending ? (
                <><Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> Enrolling...</>
              ) : (
                <><UserPlus className="h-4 w-4 mr-1.5" /> Confirm Enrollment</>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
