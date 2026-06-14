'use server'

import { z } from 'zod'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

const getSchoolId = async () => {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  const { data } = await supabase.from('profiles').select('school_id, role').eq('id', user.id).single()
  if (!data?.school_id) throw new Error('No school assigned')
  return { schoolId: data.school_id as string, userId: user.id, role: data.role }
}

const EmployeeSchema = z.object({
  first_name: z.string().min(1),
  last_name: z.string().min(1),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  employee_number: z.string().optional(),
  department: z.string().optional(),
  position: z.string().optional(),
  contract_type: z.enum(['permanent', 'contract', 'part_time', 'intern']),
  basic_salary: z.coerce.number().min(0),
  allowances: z.record(z.number()).default({ housing: 0, transport: 0, medical: 0, other: 0 }),
  bank_name: z.string().optional(),
  bank_account: z.string().optional(),
  joining_date: z.string().optional(),
})

export async function createEmployee(data: z.infer<typeof EmployeeSchema>) {
  const parsed = EmployeeSchema.parse(data)
  const { schoolId, userId } = await getSchoolId()
  const supabase = await createClient()
  const serviceClient = createServiceClient()

  const { data: existingProfile } = await supabase
    .from('profiles')
    .select('id')
    .eq('email', parsed.email)
    .maybeSingle()

  let profileId: string

  if (existingProfile) {
    profileId = existingProfile.id
    await serviceClient.from('profiles').update({
      first_name: parsed.first_name,
      last_name: parsed.last_name,
      phone: parsed.phone ?? null,
      school_id: schoolId,
      role: 'teacher',
    }).eq('id', profileId)
  } else {
    const { data: authData, error: authError } = await serviceClient.auth.admin.createUser({
      email: parsed.email ?? `${parsed.employee_number || Date.now()}@edu.local`,
      password: 'changeme123',
      email_confirm: false,
      user_metadata: { first_name: parsed.first_name, last_name: parsed.last_name, role: 'teacher' },
    })
    if (authError) throw new Error(`Auth error: ${authError.message}`)

    profileId = authData.user.id
    await serviceClient.from('profiles').upsert({
      id: profileId,
      email: parsed.email ?? null,
      first_name: parsed.first_name,
      last_name: parsed.last_name,
      phone: parsed.phone ?? null,
      school_id: schoolId,
      role: 'teacher',
    }, { onConflict: 'id' })
  }

  const { error } = await supabase.from('employees').upsert({
    id: profileId,
    school_id: schoolId,
    employee_number: parsed.employee_number ?? null,
    department: parsed.department ?? null,
    position: parsed.position ?? null,
    contract_type: parsed.contract_type,
    basic_salary: parsed.basic_salary,
    allowances: parsed.allowances,
    bank_name: parsed.bank_name ?? null,
    bank_account: parsed.bank_account ?? null,
    joining_date: parsed.joining_date ?? null,
  }, { onConflict: 'id' })
  if (error) throw new Error(error.message)

  revalidatePath('/school-admin/hr')
  return profileId
}

export async function updateEmployee(id: string, data: Partial<z.infer<typeof EmployeeSchema>>) {
  const { schoolId } = await getSchoolId()
  const supabase = await createClient()

  const updateData: Record<string, any> = {}
  if (data.first_name !== undefined) updateData.first_name = data.first_name
  if (data.last_name !== undefined) updateData.last_name = data.last_name
  if (data.phone !== undefined) updateData.phone = data.phone

  if (Object.keys(updateData).length > 0) {
    const serviceClient = createServiceClient()
    const { error: profileError } = await serviceClient.from('profiles').update(updateData).eq('id', id)
    if (profileError) throw new Error(profileError.message)
  }

  const empData: Record<string, any> = {}
  if (data.employee_number !== undefined) empData.employee_number = data.employee_number
  if (data.department !== undefined) empData.department = data.department
  if (data.position !== undefined) empData.position = data.position
  if (data.contract_type !== undefined) empData.contract_type = data.contract_type
  if (data.basic_salary !== undefined) empData.basic_salary = data.basic_salary
  if (data.allowances !== undefined) empData.allowances = data.allowances
  if (data.bank_name !== undefined) empData.bank_name = data.bank_name
  if (data.bank_account !== undefined) empData.bank_account = data.bank_account
  if (data.joining_date !== undefined) empData.joining_date = data.joining_date

  if (Object.keys(empData).length > 0) {
    const { error } = await supabase.from('employees').update(empData).eq('id', id).eq('school_id', schoolId)
    if (error) throw new Error(error.message)
  }

  revalidatePath('/school-admin/hr')
}

export async function deleteEmployee(id: string) {
  const { schoolId } = await getSchoolId()
  const supabase = await createClient()
  const { error } = await supabase.from('employees').update({ is_active: false }).eq('id', id).eq('school_id', schoolId)
  if (error) throw new Error(error.message)
  revalidatePath('/school-admin/hr')
}

export async function getEmployees(filters?: { department?: string; contract_type?: string; status?: string; search?: string }) {
  const { schoolId } = await getSchoolId()
  const supabase = await createClient()

  let query = supabase
    .from('employees')
    .select('*, profiles!inner(*)')
    .eq('school_id', schoolId)
    .order('created_at', { ascending: false })

  if (filters?.department) query = query.eq('department', filters.department)
  if (filters?.contract_type) query = query.eq('contract_type', filters.contract_type)
  if (filters?.status === 'active') query = query.eq('is_active', true)
  if (filters?.status === 'inactive') query = query.eq('is_active', false)
  if (filters?.search) {
    const s = `%${filters.search}%`
    query = query.or(`profiles.first_name.ilike.${s},profiles.last_name.ilike.${s},employee_number.ilike.${s},department.ilike.${s}`)
  }

  const { data } = await query
  return data ?? []
}

export async function getEmployee(id: string) {
  const { schoolId } = await getSchoolId()
  const supabase = await createClient()
  const { data } = await supabase.from('employees').select('*, profiles!inner(*)').eq('id', id).eq('school_id', schoolId).single()
  return data
}

export async function getDepartments() {
  const { schoolId } = await getSchoolId()
  const supabase = await createClient()
  const { data } = await supabase.from('employees').select('department').eq('school_id', schoolId).not('department', 'is', null)
  return [...new Set(data?.map(e => e.department).filter(Boolean) as string[])].sort()
}

// ── Leave Management ──────────────────────────────────────────

const LeaveSchema = z.object({
  employee_id: z.string().uuid(),
  leave_type: z.enum(['annual', 'sick', 'maternity', 'paternity', 'unpaid', 'emergency']),
  start_date: z.string().min(1),
  end_date: z.string().min(1),
  reason: z.string().min(1, 'Reason is required'),
})

export async function submitLeaveRequest(data: z.infer<typeof LeaveSchema>) {
  const parsed = LeaveSchema.parse(data)
  const { schoolId, userId } = await getSchoolId()
  const supabase = await createClient()

  const start = new Date(parsed.start_date)
  const end = new Date(parsed.end_date)
  const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1
  if (days < 1) throw new Error('End date must be after start date')

  const { error } = await supabase.from('leave_requests').insert({
    school_id: schoolId,
    employee_id: parsed.employee_id,
    leave_type: parsed.leave_type,
    start_date: parsed.start_date,
    end_date: parsed.end_date,
    days,
    reason: parsed.reason,
    status: 'pending',
  })
  if (error) throw new Error(error.message)
  revalidatePath('/school-admin/hr')
}

const defaultLeaveEntitlement: Record<string, number> = {
  annual: 21, sick: 15, maternity: 90, paternity: 14, unpaid: 0, emergency: 5,
}

export async function getLeaveBalance(employeeId: string) {
  const { schoolId } = await getSchoolId()
  const supabase = await createClient()

  const { data: settings } = await supabase
    .from('schools')
    .select('settings')
    .eq('id', schoolId)
    .single()

  const entitlements = (settings?.settings as any)?.leave_entitlement ?? defaultLeaveEntitlement
  const currentYear = new Date().getFullYear()

  const { data: approvedLeaves } = await supabase
    .from('leave_requests')
    .select('leave_type, days')
    .eq('employee_id', employeeId)
    .eq('school_id', schoolId)
    .eq('status', 'approved')
    .gte('start_date', `${currentYear}-01-01`)
    .lte('start_date', `${currentYear}-12-31`)

  const used: Record<string, number> = {}
  approvedLeaves?.forEach(l => {
    used[l.leave_type] = (used[l.leave_type] ?? 0) + l.days
  })

  const leaveTypes: z.infer<typeof LeaveSchema>['leave_type'][] = ['annual', 'sick', 'maternity', 'paternity', 'unpaid', 'emergency']

  return leaveTypes.map(type => ({
    leave_type: type,
    entitled: entitlements[type] ?? 0,
    used: used[type] ?? 0,
    remaining: Math.max(0, (entitlements[type] ?? 0) - (used[type] ?? 0)),
  }))
}

export async function getLeaveRequests(filters?: { status?: string; employee_id?: string }) {
  const { schoolId } = await getSchoolId()
  const supabase = await createClient()

  let query = supabase
    .from('leave_requests')
    .select('*, employees!inner(id, department, position, profiles!inner(first_name, last_name))')
    .eq('school_id', schoolId)
    .order('created_at', { ascending: false })
    .limit(100)

  if (filters?.status) query = query.eq('status', filters.status)
  if (filters?.employee_id) query = query.eq('employee_id', filters.employee_id)

  const { data } = await query
  return data ?? []
}

export async function approveLeaveRequest(id: string) {
  const { schoolId, userId } = await getSchoolId()
  const supabase = await createClient()
  const { error } = await supabase.from('leave_requests').update({
    status: 'approved',
    approved_by: userId,
    approved_at: new Date().toISOString(),
  }).eq('id', id).eq('school_id', schoolId)
  if (error) throw new Error(error.message)
  revalidatePath('/school-admin/hr')
}

export async function rejectLeaveRequest(id: string, reason: string) {
  const { schoolId } = await getSchoolId()
  const supabase = await createClient()
  const { error } = await supabase.from('leave_requests').update({
    status: 'rejected',
    rejection_reason: reason,
  }).eq('id', id).eq('school_id', schoolId)
  if (error) throw new Error(error.message)
  revalidatePath('/school-admin/hr')
}

export async function getUpcomingLeaves(month?: number, year?: number) {
  const { schoolId } = await getSchoolId()
  const supabase = await createClient()
  const m = month ?? new Date().getMonth() + 1
  const y = year ?? new Date().getFullYear()

  const { data } = await supabase
    .from('leave_requests')
    .select('*, employees!inner(id, department, profiles!inner(first_name, last_name))')
    .eq('school_id', schoolId)
    .eq('status', 'approved')
    .gte('start_date', `${y}-${String(m).padStart(2, '0')}-01`)
    .lte('start_date', `${y}-${String(m).padStart(2, '0')}-31`)
    .order('start_date')

  return data ?? []
}
