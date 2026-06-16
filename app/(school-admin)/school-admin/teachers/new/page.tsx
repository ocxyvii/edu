'use client'

import { useState } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { createTeacher, getSubjects } from '@/lib/actions/school-admin'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'
import { Check } from 'lucide-react'

export default function NewTeacherPage() {
  const router = useRouter()
  const [form, setForm] = useState({
    first_name: '', last_name: '', email: '', password: '',
    phone: '', employee_number: '', department: '',
    qualification: '', specialization: '', joining_date: '', salary: 0,
  })
  const [selectedSubjectIds, setSelectedSubjectIds] = useState<string[]>([])

  const { data: subjects } = useQuery({
    queryKey: ['subjects'],
    queryFn: () => getSubjects(),
  })

  const mutation = useMutation({
    mutationFn: () => createTeacher({ ...form, subject_ids: selectedSubjectIds }),
    onSuccess: () => {
      toast.success('Teacher created successfully')
      router.push('/school-admin/teachers')
    },
    onError: (err: Error) => toast.error(err.message),
  })

  function update(field: string, value: string) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  function toggleSubject(id: string) {
    setSelectedSubjectIds(prev =>
      prev.includes(id) ? prev.filter((s: any) => s !== id) : [...prev, id]
    )
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Add New Teacher</h1>
        <p className="text-gray-600 mt-1">Register a new teacher in the school</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Personal Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>First Name *</Label>
              <Input value={form.first_name} onChange={(e) => update('first_name', e.target.value)} placeholder="Jane" />
            </div>
            <div>
              <Label>Last Name *</Label>
              <Input value={form.last_name} onChange={(e) => update('last_name', e.target.value)} placeholder="Smith" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Email *</Label>
              <Input type="email" value={form.email} onChange={(e) => update('email', e.target.value)} placeholder="jane.smith@school.com" />
            </div>
            <div>
              <Label>Password *</Label>
              <Input type="text" value={form.password} onChange={(e) => update('password', e.target.value)} placeholder="Set teacher login password" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Phone</Label>
              <Input value={form.phone} onChange={(e) => update('phone', e.target.value)} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Employment Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Employee Number</Label>
              <Input value={form.employee_number} onChange={(e) => update('employee_number', e.target.value)} placeholder="EMP-001" />
            </div>
            <div>
              <Label>Department</Label>
              <Input value={form.department} onChange={(e) => update('department', e.target.value)} placeholder="Mathematics" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Qualification</Label>
              <Input value={form.qualification} onChange={(e) => update('qualification', e.target.value)} placeholder="B.Ed, M.Sc" />
            </div>
            <div>
              <Label>Specialization</Label>
              <Input value={form.specialization} onChange={(e) => update('specialization', e.target.value)} placeholder="Pure Mathematics" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Joining Date</Label>
              <Input type="date" value={form.joining_date} onChange={(e) => update('joining_date', e.target.value)} />
            </div>
            <div>
              <Label>Salary (KES)</Label>
              <Input type="number" value={form.salary} onChange={(e) => update('salary', e.target.value)} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Subject Assignments</CardTitle>
        </CardHeader>
        <CardContent>
          {subjects?.length === 0 ? (
            <p className="text-sm text-muted-foreground">No subjects created yet. Add subjects in Academic Setup first.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {subjects?.map((subject) => (
                <Badge
                  key={subject.id}
                  variant={selectedSubjectIds.includes(subject.id) ? 'default' : 'outline'}
                  className="cursor-pointer"
                  onClick={() => toggleSubject(subject.id)}
                >
                  {selectedSubjectIds.includes(subject.id) && <Check className="h-3 w-3 mr-1" />}
                  {subject.name} ({subject.code})
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={() => mutation.mutate()} disabled={mutation.isPending || !form.first_name || !form.last_name || !form.email || !form.password}>
          {mutation.isPending ? 'Creating...' : 'Create Teacher'}
        </Button>
      </div>
    </div>
  )
}
