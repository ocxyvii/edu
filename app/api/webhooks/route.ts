import { NextResponse, type NextRequest } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { createClient } from '@/lib/supabase/server'
import crypto from 'crypto'

const WEBHOOK_SECRET = process.env.SUPABASE_WEBHOOK_SECRET

interface WebhookPayload {
  type: string
  table: string
  record: Record<string, unknown> | null
  old_record: Record<string, unknown> | null
  schema: string
  event: {
    session_variables: Record<string, unknown>
    op: 'INSERT' | 'UPDATE' | 'DELETE'
  }
  created_at: string
}

interface BackgroundJob {
  id: string
  type: string
  payload: Record<string, unknown>
  status: 'pending' | 'processing' | 'completed' | 'failed'
  created_at: string
}

const queue: BackgroundJob[] = []

setInterval(() => {
  for (let i = queue.length - 1; i >= 0; i--) {
    if (queue[i].status === 'completed' || queue[i].status === 'failed') {
      queue.splice(i, 1)
    }
  }
}, 60_000)

function verifySignature(payload: string, signature: string): boolean {
  if (!WEBHOOK_SECRET) return false
  const expected = crypto
    .createHmac('sha256', WEBHOOK_SECRET)
    .update(payload)
    .digest('hex')
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))
}

async function processPaymentWebhook(payload: WebhookPayload): Promise<void> {
  if (payload.table !== 'payments' || payload.event.op !== 'INSERT') return
  const record = payload.record
  if (!record) return

  const supabase = createServiceClient()

  if (record.status === 'completed') {
    // Auto-update invoice status
    if (record.invoice_id) {
      await supabase.rpc('update_invoice_status', {
        p_invoice_id: record.invoice_id as string,
      })
    }
  }

  if (record.transaction_ref) {
    const { data: existing } = await supabase
      .from('payments')
      .select('id')
      .eq('transaction_ref', record.transaction_ref as string)
      .maybeSingle()

    if (!existing && record.status === 'verified') {
      const { error } = await supabase.from('payments').upsert({
        school_id: record.school_id as string,
        student_id: record.student_id as string,
        invoice_id: record.invoice_id as string,
        amount: record.amount as number,
        payment_method: record.payment_method as string,
        transaction_ref: record.transaction_ref as string,
        status: 'completed',
        receipt_number: `RCP-${Date.now()}`,
      })
      if (error) console.error('Webhook payment insert error:', error)
    }
  }
}

async function processProfileWebhook(payload: WebhookPayload): Promise<void> {
  if (payload.table !== 'profiles' || payload.event.op !== 'INSERT') return
  const record = payload.record
  if (!record?.id) return

  const supabase = createServiceClient()

  const { data: existing } = await supabase
    .from('user_sessions')
    .select('user_id')
    .eq('user_id', record.id as string)
    .maybeSingle()

  if (!existing) {
    const { error } = await supabase.from('user_sessions').insert({
      user_id: record.id as string,
      session_token: crypto.randomUUID(),
      verified_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    })
    if (error) console.error('Webhook session insert error:', error)
  }
}

async function processAsyncJob(job: BackgroundJob): Promise<void> {
  job.status = 'processing'
  try {
    const payload = job.payload as unknown as WebhookPayload
    switch (job.type) {
      case 'payment':
        await processPaymentWebhook(payload)
        break
      case 'profile':
        await processProfileWebhook(payload)
        break
    }
    job.status = 'completed'
  } catch (err) {
    console.error(`Background job ${job.id} failed:`, err)
    job.status = 'failed'
  }
}

export async function POST(request: NextRequest) {
  try {
    const signature = request.headers.get('x-supabase-signature') || request.headers.get('x-webhook-signature') || ''
    const body = await request.text()

    if (WEBHOOK_SECRET && !verifySignature(body, signature)) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }

    const payload: WebhookPayload = JSON.parse(body)

    const job: BackgroundJob = {
      id: crypto.randomUUID(),
      type: payload.table === 'payments' ? 'payment' : payload.table === 'profiles' ? 'profile' : 'generic',
      payload: payload as unknown as Record<string, unknown>,
      status: 'pending',
      created_at: new Date().toISOString(),
    }

    queue.push(job)
    processAsyncJob(job)

    return NextResponse.json({
      received: true,
      job_id: job.id,
      table: payload.table,
      action: payload.event.op,
    })
  } catch (err: any) {
    console.error('Webhook error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({
    service: 'EduCore Webhook Receiver',
    version: '1.0',
    queue_size: queue.length,
    active_jobs: queue.filter(j => j.status === 'processing').length,
  })
}
