'use client'

import { useState } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { getClasses, createStudent } from '@/lib/actions/school-admin'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'
import { ChevronLeft, ChevronRight, Check, Upload } from 'lucide-react'

const steps = ['Personal Info', 'Academic Info', 'Parent/Guardian', 'Review']

export default function NewStudentPage() {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [form, setForm] = useState({
    first_name: '', last_name: '', email: '', password: 'password123',
    phone: '', gender: '', date_of_birth: '',
    admission_number: '', class_id: '', section_id: '',
    parent_first_name: '', parent_last_name: '', parent_email: '', parent_phone: '',
  })

  const { data: classes } = useQuery({
    queryKey: ['classes'],
    queryFn: () => getClasses(),
  })

  const selectedClass = classes?.find((c: any) => c.id === form.class_id)

  const mutation = useMutation({
    mutationFn: () => createStudent(form),
    onSuccess: () => {
      toast.success('Student created successfully')
      router.push('/school-admin/students')
    },
    onError: (err: Error) => toast.error(err.message),
  })

  function update(field: string, value: string) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  function canProceed(): boolean {
    switch (step) {
      case 0: return !!form.first_name && !!form.last_name && !!form.email
      case 1: return !!form.admission_number && !!form.class_id
      default: return true
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Add New Student</h1>
        <p className="text-gray-600 mt-1">Register a new student in the school</p>
      </div>

      <div className="flex items-center gap-2">
        {steps.map((s: any, i: any) => (
          <div key={s} className="flex items-center gap-2 flex-1">
            <div className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium ${
              i < step ? 'bg-green-500 text-white' :
              i === step ? 'bg-edu-blue-600 text-white' :
              'bg-gray-200 text-gray-500'
            }`}>
              {i < step ? <Check className="h-4 w-4" /> : i + 1}
            </div>
            <span className={`text-sm hidden sm:block ${i === step ? 'font-medium text-gray-900' : 'text-gray-500'}`}>{s}</span>
            {i < steps.length - 1 && <div className="flex-1 h-px bg-gray-200" />}
          </div>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{steps[step]}</CardTitle>
          <CardDescription>
            {step === 0 && 'Enter the student\'s personal information'}
            {step === 1 && 'Assign class, section, and admission details'}
            {step === 2 && 'Add parent or guardian information (optional)'}
            {step === 3 && 'Review all information before submitting'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {step === 0 && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>First Name *</Label>
                  <Input value={form.first_name} onChange={(e) => update('first_name', e.target.value)} placeholder="John" />
                </div>
                <div>
                  <Label>Last Name *</Label>
                  <Input value={form.last_name} onChange={(e) => update('last_name', e.target.value)} placeholder="Doe" />
                </div>
              </div>
              <div>
                <Label>Email *</Label>
                <Input type="email" value={form.email} onChange={(e) => update('email', e.target.value)} placeholder="john.doe@example.com" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Phone</Label>
                  <Input value={form.phone} onChange={(e) => update('phone', e.target.value)} placeholder="+254..." />
                </div>
                <div>
                  <Label>Date of Birth</Label>
                  <Input type="date" value={form.date_of_birth} onChange={(e) => update('date_of_birth', e.target.value)} />
                </div>
              </div>
              <div>
                <Label>Gender</Label>
                <Select value={form.gender} onValueChange={(v) => update('gender', v)}>
                  <SelectTrigger><SelectValue placeholder="Select gender" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4">
              <div>
                <Label>Admission Number *</Label>
                <Input value={form.admission_number} onChange={(e) => update('admission_number', e.target.value)} placeholder="e.g., ADM-2025-001" />
              </div>
              <div>
                <Label>Class *</Label>
                <Select value={form.class_id} onValueChange={(v) => { update('class_id', v); update('section_id', '') }}>
                  <SelectTrigger><SelectValue placeholder="Select class" /></SelectTrigger>
                  <SelectContent>
                    {classes?.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              {selectedClass && selectedClass.sections?.length > 0 && (
                <div>
                  <Label>Section</Label>
                  <Select value={form.section_id} onValueChange={(v) => update('section_id', v)}>
                    <SelectTrigger><SelectValue placeholder="Select section" /></SelectTrigger>
                    <SelectContent>
                      {selectedClass.sections.map((s: any) => (
                        <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">Optionally create a parent/guardian account linked to this student.</p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Parent First Name</Label>
                  <Input value={form.parent_first_name} onChange={(e) => update('parent_first_name', e.target.value)} />
                </div>
                <div>
                  <Label>Parent Last Name</Label>
                  <Input value={form.parent_last_name} onChange={(e) => update('parent_last_name', e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Parent Email</Label>
                  <Input type="email" value={form.parent_email} onChange={(e) => update('parent_email', e.target.value)} />
                </div>
                <div>
                  <Label>Parent Phone</Label>
                  <Input value={form.parent_phone} onChange={(e) => update('parent_phone', e.target.value)} />
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-medium text-gray-500 uppercase mb-2">Personal Information</h3>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div><span className="text-gray-500">Name:</span> {form.first_name} {form.last_name}</div>
                  <div><span className="text-gray-500">Email:</span> {form.email}</div>
                  <div><span className="text-gray-500">Phone:</span> {form.phone || '-'}</div>
                  <div><span className="text-gray-500">Gender:</span> {form.gender || '-'}</div>
                  <div><span className="text-gray-500">DOB:</span> {form.date_of_birth || '-'}</div>
                </div>
              </div>
              <Separator />
              <div>
                <h3 className="text-sm font-medium text-gray-500 uppercase mb-2">Academic Information</h3>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div><span className="text-gray-500">Admission No:</span> {form.admission_number}</div>
                  <div><span className="text-gray-500">Class:</span> {selectedClass?.name ?? '-'}</div>
                  <div><span className="text-gray-500">Password:</span> {form.password}</div>
                </div>
              </div>
              {form.parent_first_name && (
                <>
                  <Separator />
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 uppercase mb-2">Parent/Guardian</h3>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div><span className="text-gray-500">Name:</span> {form.parent_first_name} {form.parent_last_name}</div>
                      <div><span className="text-gray-500">Email:</span> {form.parent_email}</div>
                      <div><span className="text-gray-500">Phone:</span> {form.parent_phone || '-'}</div>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-between">
        <Button variant="outline" onClick={() => setStep(s => Math.max(0, s - 1))} disabled={step === 0}>
          <ChevronLeft className="h-4 w-4 mr-2" /> Previous
        </Button>
        {step < 3 ? (
          <Button onClick={() => setStep(s => s + 1)} disabled={!canProceed()}>
            Next <ChevronRight className="h-4 w-4 ml-2" />
          </Button>
        ) : (
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending}>
            {mutation.isPending ? 'Creating...' : 'Create Student'}
          </Button>
        )}
      </div>
    </div>
  )
}
