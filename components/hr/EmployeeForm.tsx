'use client'

import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createEmployee, updateEmployee } from '@/lib/actions/hr.actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'
import { Loader2, Plus, Trash2, Check } from 'lucide-react'

interface EmployeeFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  initialData?: any
}

const STEPS = ['Personal Info', 'Employment Details', 'Salary & Benefits', 'Review']

export function EmployeeForm({ open, onOpenChange, initialData }: EmployeeFormProps) {
  const queryClient = useQueryClient()
  const isEditing = !!initialData
  const [step, setStep] = useState(0)

  const [firstName, setFirstName] = useState(initialData?.profiles?.first_name ?? '')
  const [lastName, setLastName] = useState(initialData?.profiles?.last_name ?? '')
  const [email, setEmail] = useState(initialData?.profiles?.email ?? '')
  const [phone, setPhone] = useState(initialData?.profiles?.phone ?? '')
  const [employeeNumber, setEmployeeNumber] = useState(initialData?.employee_number ?? '')
  const [department, setDepartment] = useState(initialData?.department ?? '')
  const [position, setPosition] = useState(initialData?.position ?? '')
  const [contractType, setContractType] = useState(initialData?.contract_type ?? 'permanent')
  const [joiningDate, setJoiningDate] = useState(initialData?.joining_date ?? '')
  const [basicSalary, setBasicSalary] = useState(initialData?.basic_salary?.toString() ?? '')
  const [bankName, setBankName] = useState(initialData?.bank_name ?? '')
  const [bankAccount, setBankAccount] = useState(initialData?.bank_account ?? '')

  const defaultAllowances = initialData?.allowances ?? { housing: 0, transport: 0, medical: 0, other: 0 }
  const [allowances, setAllowances] = useState<Record<string, string>>(
    Object.fromEntries(Object.entries(defaultAllowances).map(([k, v]) => [k, String(v)]))
  )
  const [newAllowanceKey, setNewAllowanceKey] = useState('')
  const [newAllowanceVal, setNewAllowanceVal] = useState('')

  const createMutation = useMutation({
    mutationFn: () => createEmployee({
      first_name: firstName, last_name: lastName, email: email || undefined,
      phone: phone || undefined, employee_number: employeeNumber || undefined,
      department: department || undefined, position: position || undefined,
      contract_type: contractType as any, basic_salary: parseFloat(basicSalary) || 0,
      allowances: Object.fromEntries(Object.entries(allowances).map(([k, v]) => [k, parseFloat(v) || 0])),
      bank_name: bankName || undefined, bank_account: bankAccount || undefined,
      joining_date: joiningDate || undefined,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] })
      reset()
      toast.success('Employee created')
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const updateMutation = useMutation({
    mutationFn: () => updateEmployee(initialData.id, {
      first_name: firstName, last_name: lastName, phone: phone || undefined,
      employee_number: employeeNumber || undefined, department: department || undefined,
      position: position || undefined, contract_type: contractType as any,
      basic_salary: parseFloat(basicSalary) || 0,
      allowances: Object.fromEntries(Object.entries(allowances).map(([k, v]) => [k, parseFloat(v) || 0])),
      bank_name: bankName || undefined, bank_account: bankAccount || undefined,
      joining_date: joiningDate || undefined,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] })
      reset()
      toast.success('Employee updated')
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const reset = () => {
    onOpenChange(false)
    setStep(0)
    if (!isEditing) {
      setFirstName(''); setLastName(''); setEmail(''); setPhone('')
      setEmployeeNumber(''); setDepartment(''); setPosition('')
      setContractType('permanent'); setJoiningDate(''); setBasicSalary('')
      setBankName(''); setBankAccount('')
      setAllowances({ housing: '0', transport: '0', medical: '0', other: '0' })
    }
  }

  const addAllowance = () => {
    if (!newAllowanceKey.trim()) return
    setAllowances({ ...allowances, [newAllowanceKey.trim().toLowerCase()]: newAllowanceVal || '0' })
    setNewAllowanceKey('')
    setNewAllowanceVal('')
  }

  const removeAllowance = (key: string) => {
    const { [key]: _, ...rest } = allowances
    setAllowances(rest)
  }

  const totalAllowances = Object.values(allowances).reduce((s, v) => s + (parseFloat(v) || 0), 0)
  const gross = (parseFloat(basicSalary) || 0) + totalAllowances
  const isPending = createMutation.isPending || updateMutation.isPending

  const canNext = () => {
    if (step === 0) return firstName && lastName
    if (step === 1) return true
    if (step === 2) return basicSalary && parseFloat(basicSalary) > 0
    return true
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) reset() }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Employee' : 'Add Employee'}</DialogTitle>
          <DialogDescription>
            Step {step + 1} of {STEPS.length}: {STEPS[step]}
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-2 mb-4">
          {STEPS.map((s, i) => (
            <div key={s} className={`flex-1 h-1.5 rounded-full ${i <= step ? 'bg-blue-500' : 'bg-gray-200'}`} />
          ))}
        </div>

        <div className="py-2">
          {step === 0 && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>First Name *</Label>
                  <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="First name" />
                </div>
                <div>
                  <Label>Last Name *</Label>
                  <Input value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Last name" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Email</Label>
                  <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email address" />
                </div>
                <div>
                  <Label>Phone</Label>
                  <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone number" />
                </div>
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Employee Number</Label>
                  <Input value={employeeNumber} onChange={(e) => setEmployeeNumber(e.target.value)} placeholder="EMP-001" />
                </div>
                <div>
                  <Label>Joining Date</Label>
                  <Input type="date" value={joiningDate} onChange={(e) => setJoiningDate(e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Department</Label>
                  <Input value={department} onChange={(e) => setDepartment(e.target.value)} placeholder="e.g. Mathematics" />
                </div>
                <div>
                  <Label>Position</Label>
                  <Input value={position} onChange={(e) => setPosition(e.target.value)} placeholder="e.g. Senior Teacher" />
                </div>
              </div>
              <div>
                <Label>Contract Type</Label>
                <Select value={contractType} onValueChange={setContractType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="permanent">Permanent</SelectItem>
                    <SelectItem value="contract">Contract</SelectItem>
                    <SelectItem value="part_time">Part Time</SelectItem>
                    <SelectItem value="intern">Intern</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Basic Salary (KES) *</Label>
                  <Input type="number" value={basicSalary} onChange={(e) => setBasicSalary(e.target.value)} min={0} />
                </div>
                <div>
                  <Label>Bank Name</Label>
                  <Input value={bankName} onChange={(e) => setBankName(e.target.value)} placeholder="Bank name" />
                </div>
              </div>
              <div>
                <Label>Bank Account</Label>
                <Input value={bankAccount} onChange={(e) => setBankAccount(e.target.value)} placeholder="Account number" />
              </div>

              <Separator />
              <Label>Allowances</Label>
              <div className="space-y-2">
                {Object.entries(allowances).map(([key, val]) => (
                  <div key={key} className="flex items-center gap-2">
                    <Input value={key} onChange={(e) => {
                      const { [key]: _, ...rest } = allowances
                      setAllowances({ ...rest, [e.target.value]: val })
                    }} className="w-40" placeholder="Allowance type" />
                    <Input type="number" value={val} onChange={(e) => setAllowances({ ...allowances, [key]: e.target.value })} className="w-32" min={0} />
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => removeAllowance(key)}>
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                ))}
                <div className="flex items-center gap-2">
                  <Input value={newAllowanceKey} onChange={(e) => setNewAllowanceKey(e.target.value)} className="w-40" placeholder="New type" />
                  <Input type="number" value={newAllowanceVal} onChange={(e) => setNewAllowanceVal(e.target.value)} className="w-32" placeholder="Amount" min={0} />
                  <Button variant="outline" size="icon" className="h-8 w-8" onClick={addAllowance}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <div className="rounded-lg border p-4 space-y-3">
                <h3 className="font-medium">Personal Info</h3>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <p><span className="text-muted-foreground">Name:</span> {firstName} {lastName}</p>
                  <p><span className="text-muted-foreground">Email:</span> {email || '—'}</p>
                  <p><span className="text-muted-foreground">Phone:</span> {phone || '—'}</p>
                </div>
              </div>
              <div className="rounded-lg border p-4 space-y-3">
                <h3 className="font-medium">Employment</h3>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <p><span className="text-muted-foreground">Employee #:</span> {employeeNumber || '—'}</p>
                  <p><span className="text-muted-foreground">Department:</span> {department || '—'}</p>
                  <p><span className="text-muted-foreground">Position:</span> {position || '—'}</p>
                  <p><span className="text-muted-foreground">Contract:</span> {contractType}</p>
                  <p><span className="text-muted-foreground">Joined:</span> {joiningDate || '—'}</p>
                </div>
              </div>
              <div className="rounded-lg border p-4 space-y-3">
                <h3 className="font-medium">Salary & Benefits</h3>
                <div className="space-y-1 text-sm">
                  <p className="flex justify-between"><span className="text-muted-foreground">Basic Salary</span><span>KES {parseFloat(basicSalary || '0').toLocaleString()}</span></p>
                  {Object.entries(allowances).map(([k, v]) => (
                    <p key={k} className="flex justify-between"><span className="text-muted-foreground capitalize">{k}</span><span>KES {parseFloat(v || '0').toLocaleString()}</span></p>
                  ))}
                  <Separator />
                  <p className="flex justify-between font-medium"><span>Gross Salary</span><span>KES {gross.toLocaleString()}</span></p>
                </div>
              </div>
              <div className="rounded-lg border p-4 space-y-3">
                <h3 className="font-medium">Bank Details</h3>
                <p className="text-sm"><span className="text-muted-foreground">Bank:</span> {bankName || '—'} · {bankAccount || '—'}</p>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="flex justify-between">
          <div>
            {step > 0 && <Button variant="outline" onClick={() => setStep(step - 1)}>Previous</Button>}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={reset}>Cancel</Button>
            {step < STEPS.length - 1 ? (
              <Button onClick={() => setStep(step + 1)} disabled={!canNext()}>Next</Button>
            ) : (
              <Button
                onClick={() => isEditing ? updateMutation.mutate() : createMutation.mutate()}
                disabled={isPending || !firstName || !lastName || !basicSalary}
              >
                {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {isEditing ? 'Update Employee' : 'Create Employee'}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
