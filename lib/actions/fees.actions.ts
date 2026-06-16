'use server'

import { z } from 'zod'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

const getSchoolId = async () => {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  const { data } = await supabase.from('profiles').select('school_id').eq('id', user.id).single()
  if (!data?.school_id) throw new Error('No school assigned')
  return data.school_id as string
}

const FeeStructureSchema = z.object({
  name: z.string().min(1),
  fee_type: z.enum(['tuition', 'transport', 'library', 'lab', 'boarding', 'uniform', 'activity', 'other']),
  amount: z.number().positive(),
  academic_year_id: z.string().uuid(),
  term_id: z.string().uuid().optional(),
  class_id: z.string().uuid().optional(),
  due_date: z.string().optional(),
  description: z.string().optional(),
  is_optional: z.boolean().optional().default(false),
})

const PaymentSchema = z.object({
  invoice_id: z.string().uuid(),
  student_id: z.string().uuid(),
  amount: z.number().positive(),
  payment_method: z.enum(['cash', 'mpesa', 'card', 'bank_transfer', 'cheque']),
  transaction_ref: z.string().optional(),
  notes: z.string().optional(),
})

const DiscountSchema = z.object({
  invoice_id: z.string().uuid(),
  amount: z.number().positive(),
  reason: z.string().min(1),
  approved_by: z.string().uuid().optional(),
})

const ScholarshipSchema = z.object({
  student_id: z.string().uuid(),
  percentage: z.number().min(0).max(100),
  name: z.string().min(1),
  academic_year_id: z.string().uuid(),
  reason: z.string().optional(),
})

export async function createFeeStructure(data: z.infer<typeof FeeStructureSchema>) {
  const parsed = FeeStructureSchema.parse(data)
  const supabase = await createClient()
  const schoolId = await getSchoolId()
  const { error } = await supabase.from('fee_structures').insert({
    ...parsed,
    school_id: schoolId,
    due_date: parsed.due_date ?? null,
    term_id: parsed.term_id ?? null,
    class_id: parsed.class_id ?? null,
  })
  if (error) throw new Error(error.message)
  revalidatePath('/school-admin/fees')
}

export async function updateFeeStructure(id: string, data: Partial<z.infer<typeof FeeStructureSchema>>) {
  const supabase = await createClient()
  const schoolId = await getSchoolId()
  const { error } = await supabase.from('fee_structures').update(data).eq('id', id).eq('school_id', schoolId)
  if (error) throw new Error(error.message)
  revalidatePath('/school-admin/fees')
}

export async function deleteFeeStructure(id: string) {
  const supabase = await createClient()
  const schoolId = await getSchoolId()
  const { error } = await supabase.from('fee_structures').delete().eq('id', id).eq('school_id', schoolId)
  if (error) throw new Error(error.message)
  revalidatePath('/school-admin/fees')
}

export async function toggleFeeStructure(id: string, isActive: boolean) {
  const supabase = await createClient()
  const schoolId = await getSchoolId()
  const { error } = await supabase.from('fee_structures').update({ is_active: isActive }).eq('id', id).eq('school_id', schoolId)
  if (error) throw new Error(error.message)
  revalidatePath('/school-admin/fees')
}

export async function getFeeStructures() {
  const supabase = await createClient()
  const schoolId = await getSchoolId()
  const { data } = await supabase
    .from('fee_structures')
    .select('*, classes(name, level), terms(name), academic_years(name)')
    .eq('school_id', schoolId)
    .order('created_at', { ascending: false })
  return data ?? []
}

export async function getFeeStructure(id: string) {
  const supabase = await createClient()
  const schoolId = await getSchoolId()
  const { data } = await supabase
    .from('fee_structures')
    .select('*, classes(name, level), terms(name), academic_years(name)')
    .eq('id', id)
    .eq('school_id', schoolId)
    .single()
  return data
}

export async function generateInvoices(data: {
  fee_structure_id: string
  class_id: string
  due_date: string
  description?: string
}) {
  const supabase = await createClient()
  const schoolId = await getSchoolId()

  const { data: fee, error: feeError } = await supabase
    .from('fee_structures').select('*').eq('id', data.fee_structure_id).single()
  if (feeError || !fee) throw new Error('Fee structure not found')

  const { data: students } = await supabase
    .from('students')
    .select('id')
    .eq('school_id', schoolId)
    .eq('class_id', data.class_id)
    .eq('is_active', true)

  if (!students?.length) throw new Error('No active students in this class')

  const { data: existingInvoices } = await supabase
    .from('fee_invoices')
    .select('student_id')
    .eq('fee_structure_id', data.fee_structure_id)

  const existingIds = new Set(existingInvoices?.map(i => i.student_id) ?? [])
  const newStudents = students.filter(s => !existingIds.has(s.id))

  if (!newStudents.length) throw new Error('All students already have invoices for this fee structure')

  const timestamp = Date.now()
  const invoices = newStudents.map((s, i) => ({
    school_id: schoolId,
    student_id: s.id,
    fee_structure_id: data.fee_structure_id,
    invoice_number: `INV-${timestamp}-${i + 1}`,
    amount: Number(fee.amount),
    paid_amount: 0,
    balance: Number(fee.amount),
    due_date: data.due_date,
    description: data.description ?? fee.name,
    status: 'pending' as const,
  }))

  const { error } = await supabase.from('fee_invoices').insert(invoices)
  if (error) throw new Error(error.message)
  revalidatePath('/school-admin/fees')
}

export async function getInvoices(filters?: {
  class_id?: string
  status?: string
  fee_structure_id?: string
  student_id?: string
}): Promise<any> {
  const supabase = await createClient()
  const schoolId = await getSchoolId()

  let query = supabase
    .from('fee_invoices')
    .select('*, students!inner(admission_number, class_id, classes!inner(name, level), profiles!inner(first_name, last_name)), fee_structures(name, fee_type)')
    .eq('school_id', schoolId)
    .order('created_at', { ascending: false })
    .limit(200)

  if (filters?.class_id) query = query.eq('students.class_id', filters.class_id)
  if (filters?.status) query = query.eq('status', filters.status)
  if (filters?.fee_structure_id) query = query.eq('fee_structure_id', filters.fee_structure_id)
  if (filters?.student_id) query = query.eq('student_id', filters.student_id)

  const { data } = await query
  return data ?? []
}

export async function getInvoice(id: string): Promise<any> {
  const supabase = await createClient()
  const schoolId = await getSchoolId()
  const { data } = await supabase
    .from('fee_invoices')
    .select('*, students!inner(admission_number, class_id, classes!inner(name, level), sections!inner(name), profiles!inner(first_name, last_name, phone)), fee_structures(name, fee_type, description), payments(*, recorded_by:profiles(first_name, last_name))')
    .eq('id', id)
    .eq('school_id', schoolId)
    .single()
  return data
}

export async function recordPayment(data: z.infer<typeof PaymentSchema>) {
  const parsed = PaymentSchema.parse(data)
  const supabase = await createClient()
  const serviceClient = createServiceClient()
  const schoolId = await getSchoolId()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: invoice, error: invError } = await supabase
    .from('fee_invoices')
    .select('amount, paid_amount, balance, status')
    .eq('id', parsed.invoice_id)
    .eq('school_id', schoolId)
    .single()
  if (invError || !invoice) throw new Error('Invoice not found')

  const newPaid = Number(invoice.paid_amount) + parsed.amount
  const newBalance = Number(invoice.balance) - parsed.amount
  const newStatus = newBalance <= 0 ? 'paid' : newPaid > 0 ? 'partial' : 'pending'

  const { error: paymentError } = await supabase.from('payments').insert({
    school_id: schoolId,
    invoice_id: parsed.invoice_id,
    student_id: parsed.student_id,
    amount: parsed.amount,
    payment_method: parsed.payment_method as any,
    transaction_ref: parsed.transaction_ref ?? null,
    notes: parsed.notes ?? null,
    receipt_number: `RCP-${Date.now()}`,
    recorded_by: user?.id,
  })
  if (paymentError) throw new Error(paymentError.message)

  const { error: updateError } = await serviceClient
    .from('fee_invoices')
    .update({ paid_amount: newPaid, balance: newBalance, status: newStatus })
    .eq('id', parsed.invoice_id)
  if (updateError) throw new Error(updateError.message)

  revalidatePath('/school-admin/fees')
}

export async function applyDiscount(data: z.infer<typeof DiscountSchema>) {
  const parsed = DiscountSchema.parse(data)
  const supabase = await createClient()
  const schoolId = await getSchoolId()

  const { data: invoice } = await supabase
    .from('fee_invoices')
    .select('amount, paid_amount, balance')
    .eq('id', parsed.invoice_id)
    .eq('school_id', schoolId)
    .single()
  if (!invoice) throw new Error('Invoice not found')

  const newBalance = Number(invoice.balance) - parsed.amount
  const newPaid = Number(invoice.paid_amount) + parsed.amount
  const newStatus = newBalance <= 0 ? 'paid' : 'partial'

  const { error: discError } = await supabase.from('fee_discounts').insert({
    school_id: schoolId,
    invoice_id: parsed.invoice_id,
    amount: parsed.amount,
    reason: parsed.reason,
    approved_by: parsed.approved_by ?? null,
  })
  if (discError) throw new Error(discError.message)

  const { error: updateError } = await supabase
    .from('fee_invoices')
    .update({ balance: newBalance, paid_amount: newPaid, status: newStatus })
    .eq('id', parsed.invoice_id)
  if (updateError) throw new Error(updateError.message)

  revalidatePath('/school-admin/fees')
}

export async function applyScholarship(data: z.infer<typeof ScholarshipSchema>) {
  const parsed = ScholarshipSchema.parse(data)
  const supabase = await createClient()
  const schoolId = await getSchoolId()

  const { error } = await supabase.from('scholarships').insert({
    ...parsed,
    school_id: schoolId,
  })
  if (error) throw new Error(error.message)
  revalidatePath('/school-admin/fees')
}

export async function getScholarships(studentId?: string) {
  const supabase = await createClient()
  const schoolId = await getSchoolId()
  let query = supabase
    .from('scholarships')
    .select('*, students!inner(profiles!inner(first_name, last_name)), academic_years(name)')
    .eq('school_id', schoolId)
    .order('created_at', { ascending: false })
  if (studentId) query = query.eq('student_id', studentId)
  const { data } = await query
  return data ?? []
}

export async function getFeeSummary() {
  const supabase = await createClient()
  const schoolId = await getSchoolId()

  const { data: invoices } = await supabase
    .from('fee_invoices')
    .select('amount, paid_amount, balance, status')
    .eq('school_id', schoolId)

  const total = invoices?.reduce((s, i) => s + Number(i.amount), 0) ?? 0
  const collected = invoices?.reduce((s, i) => s + Number(i.paid_amount), 0) ?? 0
  const outstanding = invoices?.reduce((s, i) => s + Number(i.balance), 0) ?? 0
  const paidCount = invoices?.filter(i => i.status === 'paid').length ?? 0
  const partialCount = invoices?.filter(i => i.status === 'partial').length ?? 0
  const pendingCount = invoices?.filter(i => i.status === 'pending' || i.status === 'overdue').length ?? 0

  return {
    total,
    collected,
    outstanding,
    count: invoices?.length ?? 0,
    paidCount,
    partialCount,
    pendingCount,
    collectionRate: total > 0 ? Math.round((collected / total) * 100) : 0,
  }
}

export async function getFeeDashboard() {
  const supabase = await createClient()
  const schoolId = await getSchoolId()

  const { data: invoices } = await supabase
    .from('fee_invoices')
    .select('amount, paid_amount, balance, status, due_date, student_id, created_at')
    .eq('school_id', schoolId)

  const { data: payments } = await supabase
    .from('payments')
    .select('amount, paid_at, payment_method')
    .eq('school_id', schoolId)
    .gte('paid_at', new Date(Date.now() - 30 * 86400000).toISOString())

  const { data: topDefaulters } = await supabase
    .from('fee_invoices')
    .select('balance, student_id, students!inner(admission_number, profiles!inner(first_name, last_name))')
    .eq('school_id', schoolId)
    .in('status', ['pending', 'partial', 'overdue'])
    .order('balance', { ascending: false })
    .limit(10)

  const total = invoices?.reduce((s, i) => s + Number(i.amount), 0) ?? 0
  const collected = invoices?.reduce((s, i) => s + Number(i.paid_amount), 0) ?? 0
  const outstanding = invoices?.reduce((s, i) => s + Number(i.balance), 0) ?? 0

  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const monthlyTrend: { month: string; collected: number }[] = []
  for (let i = 5; i >= 0; i--) {
    const d = new Date()
    d.setMonth(d.getMonth() - i)
    const month = d.getMonth()
    const year = d.getFullYear()
    const mCollected = payments
      ?.filter(p => {
        const pd = new Date(p.paid_at)
        return pd.getMonth() === month && pd.getFullYear() === year
      })
      .reduce((s, p) => s + Number(p.amount), 0) ?? 0
    monthlyTrend.push({ month: monthNames[month], collected: mCollected })
  }

  const methodBreakdown = (payments ?? []).reduce<Record<string, number>>((acc, p) => {
    acc[p.payment_method] = (acc[p.payment_method] ?? 0) + Number(p.amount)
    return acc
  }, {})

  const overdueCount = invoices?.filter(i => i.status === 'overdue' || (i.status === 'pending' && new Date(i.due_date) < new Date())).length ?? 0

  return {
    total,
    collected,
    outstanding,
    overdueCount,
    invoiceCount: invoices?.length ?? 0,
    paidCount: invoices?.filter(i => i.status === 'paid').length ?? 0,
    collectionRate: total > 0 ? Math.round((collected / total) * 100) : 0,
    monthlyTrend,
    methodBreakdown,
    topDefaulters: topDefaulters ?? [],
    last30DaysCollected: payments?.reduce((s, p) => s + Number(p.amount), 0) ?? 0,
  }
}

export async function getFeeCollectionReport(params: {
  classId?: string
  termId?: string
  startDate?: string
  endDate?: string
}) {
  const supabase = await createClient()
  const schoolId = await getSchoolId()

  let query = supabase
    .from('fee_invoices')
    .select('*, students!inner(admission_number, class_id, classes!inner(name, level), profiles!inner(first_name, last_name)), fee_structures(name, fee_type), payments(*, recorded_by:profiles(first_name, last_name))')
    .eq('school_id', schoolId)
    .order('created_at', { ascending: false })

  if (params.classId) query = query.eq('students.class_id', params.classId)
  if (params.startDate) query = query.gte('created_at', params.startDate)
  if (params.endDate) query = query.lte('created_at', params.endDate)

  const { data } = await query
  return data ?? []
}

export async function getStudentFeeStatus(studentId: string) {
  const supabase = await createClient()
  const schoolId = await getSchoolId()

  const { data: invoices } = await supabase
    .from('fee_invoices')
    .select('*, fee_structures(name, fee_type), payments(*), fee_discounts(*)')
    .eq('student_id', studentId)
    .eq('school_id', schoolId)
    .order('created_at', { ascending: false })

  const { data: studentScholarships } = await supabase
    .from('scholarships')
    .select('*')
    .eq('student_id', studentId)
    .eq('school_id', schoolId)

  const totalBilled = invoices?.reduce((s, i) => s + Number(i.amount), 0) ?? 0
  const totalPaid = invoices?.reduce((s, i) => s + Number(i.paid_amount), 0) ?? 0
  const totalBalance = invoices?.reduce((s, i) => s + Number(i.balance), 0) ?? 0
  const scholarshipPercentage = studentScholarships?.reduce((s, sc) => s + Number(sc.percentage), 0) ?? 0

  return {
    invoices: invoices ?? [],
    scholarships: studentScholarships ?? [],
    summary: { totalBilled, totalPaid, totalBalance, scholarshipPercentage },
  }
}
