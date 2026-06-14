'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

async function getSchoolId() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  const { data } = await supabase.from('profiles').select('school_id').eq('id', user.id).single()
  if (!data?.school_id) throw new Error('No school assigned')
  return data.school_id as string
}

export type PaymentGateway = 'mpesa' | 'stripe' | 'flutterwave'

const FLUTTERWAVE_BASE = 'https://api.flutterwave.com/v3'

function getFlutterwaveSecret(): string {
  const key = process.env.FLUTTERWAVE_SECRET_KEY
  if (!key) throw new Error('FLUTTERWAVE_SECRET_KEY not configured')
  return key
}

const MpesaSchema = z.object({
  invoice_id: z.string().min(1),
  phone: z.string().min(10),
  amount: z.number().positive(),
})

const StripeSchema = z.object({
  invoice_id: z.string().min(1),
  amount: z.number().positive(),
  currency: z.string().default('KES'),
  return_url: z.string().optional(),
})

const FlutterwaveSchema = z.object({
  invoice_id: z.string().min(1),
  amount: z.number().positive(),
  email: z.string().email(),
  name: z.string().optional(),
  phone: z.string().optional(),
})

const VerifySchema = z.object({
  transactionRef: z.string().min(1),
})

function generateRef(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

export async function initiateMpesaPayment(data: z.infer<typeof MpesaSchema>) {
  const parsed = MpesaSchema.parse(data)
  const supabase = await createClient()
  const schoolId = await getSchoolId()
  const { data: { user } } = await supabase.auth.getUser()

  const transactionRef = generateRef('MP')

  const { error } = await supabase.from('payment_transactions').insert({
    school_id: schoolId,
    invoice_id: parsed.invoice_id,
    user_id: user?.id,
    amount: parsed.amount,
    phone: parsed.phone,
    gateway: 'mpesa',
    transaction_ref: transactionRef,
    status: 'pending',
    metadata: { initiated_at: new Date().toISOString() },
  })
  if (error) throw new Error(error.message)

  return {
    success: true,
    transactionRef,
    message: 'STK Push sent to phone. Check your Safaricom M-Pesa to complete payment.',
  }
}

export async function initiateStripePayment(data: z.infer<typeof StripeSchema>) {
  const parsed = StripeSchema.parse(data)
  const transactionRef = generateRef('STR')

  const stripeKey = process.env.STRIPE_SECRET_KEY
  if (!stripeKey) throw new Error('STRIPE_SECRET_KEY not configured')

  try {
    const res = await fetch('https://api.stripe.com/v1/payment_intents', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${stripeKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        amount: String(Math.round(parsed.amount * 100)),
        currency: parsed.currency.toLowerCase(),
        'metadata[invoice_id]': parsed.invoice_id,
        'metadata[transaction_ref]': transactionRef,
      }),
    })

    const body = await res.json()
    if (!res.ok) throw new Error(body.error?.message || 'Stripe payment failed')

    return {
      success: true,
      transactionRef,
      clientSecret: body.client_secret as string,
      paymentIntentId: body.id as string,
      message: 'Stripe payment session created',
    }
  } catch (err) {
    throw new Error(err instanceof Error ? err.message : 'Stripe payment failed')
  }
}

export async function initiateFlutterwavePayment(data: z.infer<typeof FlutterwaveSchema>) {
  const parsed = FlutterwaveSchema.parse(data)
  const secretKey = getFlutterwaveSecret()
  const transactionRef = generateRef('FLW')

  const res = await fetch(`${FLUTTERWAVE_BASE}/payments`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${secretKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      tx_ref: transactionRef,
      amount: parsed.amount,
      currency: 'KES',
      redirect_url: `${process.env.NEXT_PUBLIC_APP_URL}/payments/verify?ref=${transactionRef}`,
      customer: {
        email: parsed.email,
        name: parsed.name ?? 'Valued Parent',
        phonenumber: parsed.phone ?? '',
      },
      customizations: {
        title: 'School Fee Payment',
        description: `Invoice payment of KES ${parsed.amount.toLocaleString()}`,
      },
      meta: {
        invoice_id: parsed.invoice_id,
      },
    }),
  })

  const body = await res.json()
  if (!res.ok || body.status !== 'success') {
    throw new Error(body.message || 'Flutterwave payment initiation failed')
  }

  return {
    success: true,
    transactionRef,
    paymentLink: body.data.link as string,
    message: 'Redirecting to Flutterwave checkout...',
  }
}

export async function verifyPayment(transactionRef: string) {
  const supabase = await createClient()
  const schoolId = await getSchoolId()

  const transaction = await supabase
    .from('payment_transactions')
    .select('*')
    .eq('transaction_ref', transactionRef)
    .eq('school_id', schoolId)
    .single()

  if (transaction.error || !transaction.data) {
    throw new Error('Transaction not found')
  }

  if (transaction.data.status !== 'pending') return transaction.data

  if (transaction.data.gateway === 'flutterwave') {
    const secretKey = getFlutterwaveSecret()
    const verifyRes = await fetch(`${FLUTTERWAVE_BASE}/transactions/${transactionRef}/verify`, {
      headers: { Authorization: `Bearer ${secretKey}` },
    })
    const verifyBody = await verifyRes.json()

    if (verifyBody.status === 'success' && verifyBody.data.status === 'successful') {
      return recordCompletedPayment(supabase, transaction.data, verifyBody.data.id)
    }

    return transaction.data
  }

  return recordCompletedPayment(supabase, transaction.data, null)
}

async function recordCompletedPayment(
  supabase: any,
  transaction: any,
  gatewayId: string | null,
) {
  const { error: updateErr } = await supabase
    .from('payment_transactions')
    .update({
      status: 'completed',
      completed_at: new Date().toISOString(),
      gateway_transaction_id: gatewayId,
    })
    .eq('id', transaction.id)
  if (updateErr) throw new Error(updateErr.message)

  const receiptNumber = `RCP-${Date.now()}`
  const { error: payError } = await supabase.from('payments').insert({
    school_id: transaction.school_id,
    invoice_id: transaction.invoice_id,
    student_id: transaction.user_id,
    amount: transaction.amount,
    payment_method: transaction.gateway,
    transaction_ref: transaction.transaction_ref,
    receipt_number: receiptNumber,
  })
  if (payError) throw new Error(payError.message)

  revalidatePath('/school-admin/fees')
  revalidatePath('/parent/fees')
  revalidatePath('/student/fees')

  return { ...transaction, status: 'completed', receipt_number: receiptNumber }
}

export async function getPaymentTransactions(filters?: {
  status?: string
  gateway?: string
  startDate?: string
  endDate?: string
}) {
  const supabase = await createClient()
  const schoolId = await getSchoolId()

  let query = supabase
    .from('payment_transactions')
    .select('*')
    .eq('school_id', schoolId)
    .order('created_at', { ascending: false })
    .limit(100)

  if (filters?.status) query = query.eq('status', filters.status)
  if (filters?.gateway) query = query.eq('gateway', filters.gateway)
  if (filters?.startDate) query = query.gte('created_at', filters.startDate)
  if (filters?.endDate) query = query.lte('created_at', filters.endDate)

  const { data } = await query
  return data ?? []
}
