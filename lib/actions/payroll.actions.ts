'use server'

import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

const getSchoolId = async () => {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  const { data } = await supabase.from('profiles').select('school_id, role').eq('id', user.id).single()
  if (!data?.school_id) throw new Error('No school assigned')
  return { schoolId: data.school_id as string, userId: user.id, role: data.role }
}

export async function generatePayroll(month: number, year: number) {
  const { schoolId, userId } = await getSchoolId()
  const supabase = await createClient()

  const { data: employees } = await supabase
    .from('employees')
    .select('id, basic_salary, allowances')
    .eq('school_id', schoolId)
    .eq('is_active', true)

  if (!employees?.length) throw new Error('No active employees found')

  const { data: existing } = await supabase
    .from('payroll')
    .select('employee_id')
    .eq('school_id', schoolId)
    .eq('month', month)
    .eq('year', year)

  const existingIds = new Set(existing?.map(e => e.employee_id) ?? [])
  const newEmployees = employees.filter(e => !existingIds.has(e.id))

  if (!newEmployees.length) throw new Error('Payroll already generated for all employees this month')

  const defaultDeductions = { tax: 0, nhif: 0, nssf: 0, other: 0 }

  const records = newEmployees.map(emp => {
    const allowances = (emp.allowances as Record<string, number>) ?? {}
    const totalAllowances = Object.values(allowances).reduce((s, v) => s + Number(v), 0)
    const basic = Number(emp.basic_salary)
    const gross = basic + totalAllowances
    const deductions = { ...defaultDeductions, tax: Math.round(gross * 0.05) }
    const totalDeductions = Object.values(deductions).reduce((s, v) => s + v, 0)
    const net = gross - totalDeductions

    return {
      school_id: schoolId,
      employee_id: emp.id,
      month,
      year,
      basic_salary: basic,
      allowances,
      deductions,
      gross_salary: gross,
      net_salary: net,
      processed_by: userId,
    }
  })

  const { error } = await supabase.from('payroll').insert(records)
  if (error) throw new Error(error.message)

  revalidatePath('/school-admin/hr')
  return { count: records.length }
}

export async function updatePayrollEntry(id: string, data: {
  allowances?: Record<string, number>
  deductions?: Record<string, number>
  notes?: string
}) {
  const { schoolId } = await getSchoolId()
  const supabase = await createClient()

  const { data: entry } = await supabase.from('payroll').select('*').eq('id', id).eq('school_id', schoolId).single()
  if (!entry) throw new Error('Payroll entry not found')
  if (entry.status === 'paid') throw new Error('Cannot modify a paid payroll entry')

  const allowances = data.allowances ?? (entry.allowances as Record<string, number>)
  const deductions = data.deductions ?? (entry.deductions as Record<string, number>)

  const totalAllowances = Object.values(allowances).reduce((s, v) => s + Number(v), 0)
  const totalDeductions = Object.values(deductions).reduce((s, v) => s + Number(v), 0)
  const gross = Number(entry.basic_salary) + totalAllowances
  const net = gross - totalDeductions

  const { error } = await supabase.from('payroll').update({
    allowances,
    deductions,
    gross_salary: gross,
    net_salary: net,
    notes: data.notes ?? entry.notes,
  }).eq('id', id).eq('school_id', schoolId)
  if (error) throw new Error(error.message)

  revalidatePath('/school-admin/hr')
}

export async function markAsPaid(id: string) {
  const { schoolId } = await getSchoolId()
  const supabase = await createClient()
  const { error } = await supabase.from('payroll').update({
    status: 'paid',
    paid_date: new Date().toISOString().split('T')[0],
  }).eq('id', id).eq('school_id', schoolId)
  if (error) throw new Error(error.message)
  revalidatePath('/school-admin/hr')
}

export async function markAllAsPaid(month: number, year: number) {
  const { schoolId } = await getSchoolId()
  const supabase = await createClient()
  const { error } = await supabase.from('payroll').update({
    status: 'paid',
    paid_date: new Date().toISOString().split('T')[0],
  }).eq('school_id', schoolId).eq('month', month).eq('year', year).eq('status', 'processed')
  if (error) throw new Error(error.message)
  revalidatePath('/school-admin/hr')
}

export async function processPayroll(month: number, year: number) {
  const { schoolId } = await getSchoolId()
  const supabase = await createClient()
  const { error } = await supabase.from('payroll').update({
    status: 'processed',
  }).eq('school_id', schoolId).eq('month', month).eq('year', year).eq('status', 'pending')
  if (error) throw new Error(error.message)
  revalidatePath('/school-admin/hr')
}

export async function getPayrollEntries(month: number, year: number) {
  const { schoolId } = await getSchoolId()
  const supabase = await createClient()
  const { data } = await supabase
    .from('payroll')
    .select('*, employees!inner(id, employee_number, department, bank_name, bank_account, profiles!inner(first_name, last_name))')
    .eq('school_id', schoolId)
    .eq('month', month)
    .eq('year', year)
    .order('created_at')
  return data ?? []
}

export async function getPayrollEntry(id: string) {
  const { schoolId } = await getSchoolId()
  const supabase = await createClient()
  const { data } = await supabase
    .from('payroll')
    .select('*, employees!inner(id, employee_number, department, position, contract_type, bank_name, bank_account, joining_date, profiles!inner(first_name, last_name, email, phone))')
    .eq('id', id)
    .eq('school_id', schoolId)
    .single()
  return data
}

export async function getPayrollSummary(month: number, year: number) {
  const { schoolId } = await getSchoolId()
  const supabase = await createClient()

  const { data: entries } = await supabase
    .from('payroll')
    .select('gross_salary, net_salary, allowances, deductions, status')
    .eq('school_id', schoolId)
    .eq('month', month)
    .eq('year', year)

  if (!entries?.length) return null

  const totalGross = entries.reduce((s, e) => s + Number(e.gross_salary), 0)
  const totalNet = entries.reduce((s, e) => s + Number(e.net_salary), 0)
  const totalAllowances = entries.reduce((s, e) => {
    const als = e.allowances as Record<string, number>
    return s + Object.values(als ?? {}).reduce((a, v) => a + Number(v), 0)
  }, 0)
  const totalDeductions = entries.reduce((s, e) => {
    const deds = e.deductions as Record<string, number>
    return s + Object.values(deds ?? {}).reduce((a, v) => a + Number(v), 0)
  }, 0)

  return {
    totalEmployees: entries.length,
    totalGross,
    totalNet,
    totalAllowances,
    totalDeductions,
    paidCount: entries.filter(e => e.status === 'paid').length,
    processedCount: entries.filter(e => e.status === 'processed').length,
    pendingCount: entries.filter(e => e.status === 'pending').length,
  }
}

export async function getSchoolInfo() {
  const { schoolId } = await getSchoolId()
  const supabase = await createClient()
  const { data } = await supabase.from('schools').select('name, address, phone, email, logo_url').eq('id', schoolId).single()
  return data
}

export async function generateSalarySlip(payrollId: string) {
  const entry = await getPayrollEntry(payrollId)
  const school = await getSchoolInfo()
  if (!entry) throw new Error('Payroll entry not found')
  return { entry, school }
}
