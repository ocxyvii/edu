import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const signature = req.headers.get('verif-hash')
  const secretHash = process.env.FLUTTERWAVE_WEBHOOK_SECRET_HASH

  if (secretHash && signature !== secretHash) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  try {
    const payload = await req.json()
    const { event, data } = payload

    if (event === 'charge.completed' && data.status === 'successful') {
      const txRef = data.tx_ref
      const supabase = await createClient()

      const { data: transaction } = await supabase
        .from('payment_transactions')
        .select('*')
        .eq('transaction_ref', txRef)
        .single()

      if (transaction && transaction.status === 'pending') {
        await supabase
          .from('payment_transactions')
          .update({
            status: 'completed',
            completed_at: new Date().toISOString(),
            gateway_transaction_id: String(data.id),
          })
          .eq('id', transaction.id)

        await supabase.from('payments').insert({
          school_id: transaction.school_id,
          invoice_id: transaction.invoice_id,
          student_id: transaction.user_id,
          amount: transaction.amount,
          payment_method: 'mpesa',
          transaction_ref: txRef,
          receipt_number: `RCP-${Date.now()}`,
        })
      }
    }

    return NextResponse.json({ received: true })
  } catch (err) {
    console.error('Webhook error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
