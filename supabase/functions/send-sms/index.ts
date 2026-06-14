import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7'

interface SMSPayload {
  to: string
  message: string
  template?: 'attendance-alert' | 'fee-reminder' | 'exam-result'
  data?: Record<string, string>
  school_id: string
}

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Content-Type': 'application/json',
  }
}

function buildTemplateMessage(template: string, data: Record<string, string>): string {
  switch (template) {
    case 'attendance-alert':
      return `EduCore Alert: ${data.student_name || 'Your child'} has been absent for ${data.consecutive_days || 'several'} day(s). Please contact the school. - ${data.school_name || ''}`
    case 'fee-reminder':
      return `EduCore Reminder: Fee payment of ${data.amount || ''} is due by ${data.due_date || 'soon'}. Balance: ${data.balance || ''}. Pay via the parent portal. - ${data.school_name || ''}`
    case 'exam-result':
      return `EduCore Results: ${data.student_name || ''} - ${data.exam_name || 'Exam'} - Grade: ${data.grade || 'N/A'} (${data.percentage || 'N/A'}). View full results on the portal.`
    default:
      return ''
  }
}

async function sendViaAfricasTalking(to: string, message: string): Promise<boolean> {
  const AT_API_KEY = Deno.env.get('AFRICASTALKING_API_KEY')
  const AT_USERNAME = Deno.env.get('AFRICASTALKING_USERNAME') ?? 'sandbox'

  if (!AT_API_KEY) return false

  const res = await fetch('https://api.africastalking.com/version1/messaging', {
    method: 'POST',
    headers: {
      'ApiKey': AT_API_KEY,
      'Content-Type': 'application/x-www-form-urlencoded',
      'Accept': 'application/json',
    },
    body: new URLSearchParams({
      username: AT_USERNAME,
      to: to.startsWith('+') ? to : `+${to}`,
      message,
      from: Deno.env.get('SMS_SENDER_ID') ?? 'EDUCORE',
    }),
  })

  if (!res.ok) {
    const body = await res.text()
    console.error('Africa\'s Talking error:', res.status, body)
    return false
  }

  const data = await res.json()
  return data?.SMSMessageData?.Recipients?.[0]?.status === 'Success'
}

async function sendViaTwilio(to: string, message: string): Promise<boolean> {
  const TWILIO_ACCOUNT_SID = Deno.env.get('TWILIO_ACCOUNT_SID')
  const TWILIO_AUTH_TOKEN = Deno.env.get('TWILIO_AUTH_TOKEN')
  const TWILIO_FROM = Deno.env.get('TWILIO_FROM')

  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_FROM) return false

  const auth = btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`)
  const res = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        To: to.startsWith('+') ? to : `+${to}`,
        From: TWILIO_FROM,
        Body: message,
      }),
    }
  )

  if (!res.ok) {
    const body = await res.text()
    console.error('Twilio error:', res.status, body)
    return false
  }

  return true
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders() })
  }
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: corsHeaders() })
  }

  try {
    const payload: SMSPayload = await req.json()

    if (!payload.to || !payload.school_id) {
      return new Response(JSON.stringify({ error: 'Missing required fields: to, school_id' }), { status: 400, headers: corsHeaders() })
    }

    let message = payload.message
    if (payload.template && payload.data) {
      message = buildTemplateMessage(payload.template, payload.data)
    }
    if (!message) {
      return new Response(JSON.stringify({ error: 'No message content' }), { status: 400, headers: corsHeaders() })
    }

    // Determine SMS provider from school settings
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    const supabase = createClient(supabaseUrl, supabaseKey)

    const { data: school } = await supabase
      .from('schools')
      .select('settings')
      .eq('id', payload.school_id)
      .single()

    const smsProvider = (school as any)?.settings?.sms_provider ?? 'africastalking'

    let sent = false
    if (smsProvider === 'africastalking' || smsProvider === 'auto') {
      sent = await sendViaAfricasTalking(payload.to, message)
    }
    if (!sent && (smsProvider === 'twilio' || smsProvider === 'auto')) {
      sent = await sendViaTwilio(payload.to, message)
    }

    if (!sent) {
      return new Response(JSON.stringify({ error: 'All SMS providers failed' }), { status: 502, headers: corsHeaders() })
    }

    return new Response(JSON.stringify({ success: true, provider: smsProvider }), { status: 200, headers: corsHeaders() })
  } catch (err) {
    console.error('send-sms error:', err)
    return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500, headers: corsHeaders() })
  }
})
