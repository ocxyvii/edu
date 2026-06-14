import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7'
import { HmacSHA256, enc } from 'https://esm.sh/crypto-js@4.2.0'

interface MpesaCallbackPayload {
  Body?: {
    stkCallback?: {
      MerchantRequestID: string
      CheckoutRequestID: string
      ResultCode: number
      ResultDesc: string
      CallbackMetadata?: {
        Item?: Array<{
          Name: string
          Value?: string | number
        }>
      }
    }
  }
  BillRefNumber?: string
  TransID?: string
  TransTime?: string
  TransAmount?: string
  MSISDN?: string
  FirstName?: string
  MiddleName?: string
  LastName?: string
}

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Content-Type': 'application/json',
  }
}

function verifyMpesaChecksum(body: string, signature: string): boolean {
  try {
    const passkey = Deno.env.get('MPESA_PASSKEY')
    if (!passkey) return false
    const expected = HmacSHA256(body, passkey).toString(enc.Hex)
    return expected === signature.toLowerCase()
  } catch {
    return false
  }
}

function extractCallbackMetadata(item: Array<{ Name: string; Value?: string | number }> | undefined): Record<string, string | number> {
  const result: Record<string, string | number> = {}
  if (!item) return result
  for (const i of item) {
    if (i.Value !== undefined) result[i.Name] = i.Value
  }
  return result
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders() })
  }
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: corsHeaders() })
  }

  try {
    const bodyText = await req.text()

    // Verify checksum if provided
    const signature = req.headers.get('x-mpesa-signature') || ''
    if (signature && !verifyMpesaChecksum(bodyText, signature)) {
      console.error('M-Pesa checksum verification failed')
      return new Response(JSON.stringify({ error: 'Invalid checksum' }), { status: 401, headers: corsHeaders() })
    }

    const payload: MpesaCallbackPayload = JSON.parse(bodyText)

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    const supabase = createClient(supabaseUrl, supabaseKey)

    // STK Push callback
    if (payload.Body?.stkCallback) {
      const callback = payload.Body.stkCallback
      const metadata = extractCallbackMetadata(callback.CallbackMetadata?.Item)

      const transactionRef = String(metadata['MpesaReceiptNumber'] || '')
      const phoneNumber = String(metadata['PhoneNumber'] || '')
      const amount = Number(metadata['Amount'] || 0)

      // Find pending payment by CheckoutRequestID
      const { data: pendingPayment } = await supabase
        .from('payments')
        .select('*')
        .eq('transaction_ref', callback.CheckoutRequestID)
        .maybeSingle()

      if (!pendingPayment) {
        console.error('No pending payment for CheckoutRequestID:', callback.CheckoutRequestID)
        return new Response(JSON.stringify({ received: true, status: 'no_match' }), { status: 200, headers: corsHeaders() })
      }

      if (callback.ResultCode === 0) {
        // Success — update payment record with M-Pesa confirmation
        await supabase
          .from('payments')
          .update({
            status: 'completed',
            transaction_ref: transactionRef || callback.CheckoutRequestID,
            paid_at: new Date().toISOString(),
            amount: amount || pendingPayment.amount,
            metadata: {
              mpesa_receipt: transactionRef,
              phone: phoneNumber,
              checkout_id: callback.CheckoutRequestID,
              result_desc: callback.ResultDesc,
            },
          })
          .eq('id', pendingPayment.id)

        // Update invoice status
        if (pendingPayment.invoice_id) {
          await supabase.rpc('update_invoice_status', {
            p_invoice_id: pendingPayment.invoice_id,
          })
        }

        // Send receipt notification
        if (pendingPayment.student_id) {
          const { data: student } = await supabase
            .from('students')
            .select('school_id, profiles!inner(first_name, last_name, phone)')
            .eq('id', pendingPayment.student_id)
            .single()

          const studentData = student as any
          if (studentData?.profiles?.phone) {
            await supabase.functions.invoke('send-sms', {
              body: {
                to: studentData.profiles.phone,
                message: `EduCore: Payment of KES ${amount} received. Receipt: ${transactionRef}. Thank you!`,
                school_id: studentData.school_id,
              },
            })
          }
        }

        console.log(`Payment completed: ${pendingPayment.id}, receipt: ${transactionRef}`)
      } else {
        // Failed
        await supabase
          .from('payments')
          .update({
            status: 'failed',
            metadata: {
              result_code: callback.ResultCode,
              result_desc: callback.ResultDesc,
              checkout_id: callback.CheckoutRequestID,
            },
          })
          .eq('id', pendingPayment.id)

        console.log(`Payment failed: ${pendingPayment.id}, code: ${callback.ResultCode}`)
      }

      return new Response(JSON.stringify({
        received: true,
        result_code: callback.ResultCode,
        transaction_ref: transactionRef || null,
      }), { status: 200, headers: corsHeaders() })
    }

    // C2B Validation callback
    if (payload.TransID) {
      const phone = payload.MSISDN || ''
      const amount = payload.TransAmount || '0'
      const ref = payload.TransID
      const time = payload.TransTime || ''

      // Try to match by phone number to a pending invoice
      const { data: students } = await supabase
        .from('students')
        .select('id, school_id')
        .in('id',
          (await supabase
            .from('profiles')
            .select('id')
            .eq('phone', phone)
            .maybeSingle()
          ).data?.id ? [(await supabase.from('profiles').select('id').eq('phone', phone).maybeSingle()).data?.id].filter(Boolean) : []
        )

      // If no match, create a receipt payment record
      const receiptNumber = `MP-${ref}`
      const { error } = await supabase.from('payments').insert({
        school_id: students?.[0]?.school_id ?? null,
        student_id: students?.[0]?.id ?? null,
        amount: Number(amount),
        payment_method: 'mpesa',
        transaction_ref: ref,
        status: 'completed',
        receipt_number: receiptNumber,
        paid_at: new Date().toISOString(),
        metadata: {
          phone,
          trans_time: time,
          first_name: payload.FirstName,
          middle_name: payload.MiddleName,
          last_name: payload.LastName,
        },
      })

      if (error) {
        console.error('C2B payment insert error:', error)
      }

      return new Response(JSON.stringify({
        ResultCode: 0,
        ResultDesc: 'Accepted',
      }), { status: 200, headers: { ...corsHeaders(), 'Content-Type': 'application/json' } })
    }

    return new Response(JSON.stringify({ received: true }), { status: 200, headers: corsHeaders() })
  } catch (err) {
    console.error('process-mpesa-callback error:', err)
    return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500, headers: corsHeaders() })
  }
})
