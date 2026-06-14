import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

interface EmailPayload {
  to: string
  subject: string
  html?: string
  template: 'welcome' | 'admission-confirmation' | 'admission-approval' | 'fee-reminder' | 'result-published' | 'absence-alert'
  data: Record<string, string>
}

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Content-Type': 'application/json',
  }
}

function brandWrapper(heading: string, bodyHtml: string): string {
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body style="font-family: 'Segoe UI', Arial, sans-serif; background: #f4f7fc; margin: 0; padding: 0;">
  <table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding: 20px;">
    <table width="600" cellpadding="0" cellspacing="0" style="background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 16px rgba(0,0,0,0.08);">
      <tr><td style="background: linear-gradient(135deg, #1E40AF, #3B82F6); padding: 32px 40px; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 22px; font-weight: 600;">${heading}</h1>
      </td></tr>
      <tr><td style="padding: 32px 40px;">
        ${bodyHtml}
      </td></tr>
      <tr><td style="background: #f8fafc; padding: 16px 40px; text-align: center; font-size: 12px; color: #94a3b8;">
        <p style="margin: 0;">Powered by <strong>EduCore</strong> School Management System</p>
        <p style="margin: 4px 0 0;">This is an automated message. Please do not reply directly.</p>
      </td></tr>
    </table>
  </td></tr></table>
</body></html>`
}

function buildTemplates() {
  return {
    welcome: (d: Record<string, string>) => brandWrapper('Welcome to EduCore!', `
      <p style="font-size: 15px; color: #334155; line-height: 1.7;">Dear ${d.name || 'User'},</p>
      <p style="font-size: 14px; color: #475569; line-height: 1.7;">
        Welcome to <strong>EduCore</strong>! Your account has been created successfully.
      </p>
      <table width="100%" cellpadding="8" style="background: #f0f9ff; border-radius: 8px; margin: 16px 0;">
        <tr><td style="font-size: 13px; color: #1e40af;">
          <strong>School:</strong> ${d.school_name || 'Your School'}<br>
          <strong>Role:</strong> ${d.role || 'User'}<br>
          <strong>Email:</strong> ${d.email || ''}
        </td></tr>
      </table>
      <p style="font-size: 14px; color: #475569; line-height: 1.7;">
        You can log in to your portal using the email above and your temporary password.
        Please change your password after your first login.
      </p>
      <p style="font-size: 14px; color: #475569; line-height: 1.7;">
        <a href="${d.portal_url || '#'}" style="display: inline-block; background: #1E40AF; color: white; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: 600; font-size: 14px;">Go to Portal</a>
      </p>
      <p style="font-size: 14px; color: #475569; line-height: 1.7;">Best regards,<br>The EduCore Team</p>
    `),

    'admission-confirmation': (d: Record<string, string>) => brandWrapper('Application Received', `
      <p style="font-size: 15px; color: #334155; line-height: 1.7;">Dear ${d.parent_name || 'Parent'},</p>
      <p style="font-size: 14px; color: #475569; line-height: 1.7;">
        Thank you for submitting an admission application for
        <strong>${d.student_name || 'your child'}</strong> at
        <strong>${d.school_name || 'the school'}</strong>.
      </p>
      <div style="background: #f0f9ff; border-left: 4px solid #1E40AF; padding: 16px; margin: 16px 0; border-radius: 4px;">
        <p style="margin: 0 0 8px; font-size: 13px; color: #1e40af;"><strong>Application Details</strong></p>
        <p style="margin: 0; font-size: 13px; color: #334155;">
          Application #: ${d.application_number || 'Pending'}<br>
          Student: ${d.student_name || ''}<br>
          Class: ${d.class_name || ''}
        </p>
      </div>
      <p style="font-size: 14px; color: #475569; line-height: 1.7;">
        The admissions team will review your application within 3–5 working days.
        You will receive a notification once a decision has been made.
      </p>
      <p style="font-size: 14px; color: #475569; line-height: 1.7;">Best regards,<br>The ${d.school_name || 'School'} Team</p>
    `),

    'admission-approval': (d: Record<string, string>) => brandWrapper('Application Approved!', `
      <p style="font-size: 15px; color: #334155; line-height: 1.7;">Dear ${d.parent_name || 'Parent'},</p>
      <p style="font-size: 14px; color: #475569; line-height: 1.7;">
        We are delighted to inform you that the application for
        <strong>${d.student_name || 'your child'}</strong> at
        <strong>${d.school_name || 'the school'}</strong>
        has been <strong style="color: #16a34a;">approved</strong>!
      </p>
      <div style="background: #f0fdf4; border-left: 4px solid #16a34a; padding: 16px; margin: 16px 0; border-radius: 4px;">
        <p style="margin: 0 0 8px; font-size: 13px; color: #166534;"><strong>Next Steps</strong></p>
        <ol style="margin: 0; padding-left: 20px; font-size: 13px; color: #334155;">
          <li>Contact the school to complete enrollment</li>
          <li>Submit required documents (birth certificate, previous report cards)</li>
          <li>Pay admission and tuition fees</li>
          <li>Attend orientation day</li>
        </ol>
      </div>
      <p style="font-size: 14px; color: #475569; line-height: 1.7;">
        Welcome to the ${d.school_name || ''} community! We look forward to having ${d.student_name || 'your child'} with us.
      </p>
      <p style="font-size: 14px; color: #475569; line-height: 1.7;">Best regards,<br>The ${d.school_name || 'School'} Team</p>
    `),

    'fee-reminder': (d: Record<string, string>) => brandWrapper('Fee Payment Reminder', `
      <p style="font-size: 15px; color: #334155; line-height: 1.7;">Dear ${d.parent_name || 'Parent'},</p>
      <p style="font-size: 14px; color: #475569; line-height: 1.7;">
        This is a friendly reminder that the following fees are due or overdue:
      </p>
      <table width="100%" cellpadding="10" style="border-collapse: collapse; margin: 16px 0;">
        <tr style="background: #f1f5f9;"><th style="text-align: left; font-size: 13px; padding: 10px;">Item</th><th style="text-align: right; font-size: 13px; padding: 10px;">Amount</th></tr>
        <tr><td style="border-bottom: 1px solid #e2e8f0; font-size: 13px; padding: 10px;">${d.fee_description || 'Tuition Fee'}</td>
        <td style="border-bottom: 1px solid #e2e8f0; font-size: 13px; padding: 10px; text-align: right;">${d.amount || ''}</td></tr>
        <tr style="background: #fef2f2;"><td style="font-size: 13px; padding: 10px; font-weight: 600;">Outstanding Balance</td>
        <td style="font-size: 13px; padding: 10px; text-align: right; font-weight: 600; color: #dc2626;">${d.balance || ''}</td></tr>
      </table>
      <p style="font-size: 14px; color: #475569; line-height: 1.7;">
        Due Date: <strong>${d.due_date || 'N/A'}</strong>
      </p>
      <p style="font-size: 14px; color: #475569; line-height: 1.7;">
        Please make payment at your earliest convenience to avoid any disruption to your child's learning.
      </p>
      <p style="font-size: 14px; color: #475569; line-height: 1.7;">Best regards,<br>The Finance Team</p>
    `),

    'result-published': (d: Record<string, string>) => brandWrapper('Results Published', `
      <p style="font-size: 15px; color: #334155; line-height: 1.7;">Dear ${d.parent_name || 'Parent'},</p>
      <p style="font-size: 14px; color: #475569; line-height: 1.7;">
        The results for <strong>${d.exam_name || 'the recent examination'}</strong> have been published.
      </p>
      <div style="background: #f0f9ff; border-left: 4px solid #1E40AF; padding: 16px; margin: 16px 0; border-radius: 4px;">
        <p style="margin: 0 0 4px; font-size: 13px; color: #334155;">
          <strong>Student:</strong> ${d.student_name || ''}<br>
          <strong>Class:</strong> ${d.class_name || ''}<br>
          <strong>Overall Grade:</strong> ${d.grade || 'N/A'}<br>
          <strong>Percentage:</strong> ${d.percentage || 'N/A'}
        </p>
      </div>
      <p style="font-size: 14px; color: #475569; line-height: 1.7;">
        You can view the full detailed results and report card on the parent portal.
      </p>
      <p style="font-size: 14px; color: #475569; line-height: 1.7;">
        <a href="${d.portal_url || '#'}" style="display: inline-block; background: #1E40AF; color: white; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: 600; font-size: 14px;">View Results</a>
      </p>
      <p style="font-size: 14px; color: #475569; line-height: 1.7;">Best regards,<br>The Academic Team</p>
    `),

    'absence-alert': (d: Record<string, string>) => brandWrapper('Attendance Alert', `
      <p style="font-size: 15px; color: #334155; line-height: 1.7;">Dear ${d.parent_name || 'Parent'},</p>
      <p style="font-size: 14px; color: #475569; line-height: 1.7;">
        This is to notify you that <strong>${d.student_name || 'your child'}</strong>
        has been marked absent for <strong>${d.consecutive_days || 'several'}</strong> consecutive day(s).
      </p>
      <div style="background: #fef2f2; border-left: 4px solid #dc2626; padding: 16px; margin: 16px 0; border-radius: 4px;">
        <p style="margin: 0; font-size: 13px; color: #334155;">
          <strong>Student:</strong> ${d.student_name || ''}<br>
          <strong>Class:</strong> ${d.class_name || ''}<br>
          <strong>Consecutive Absences:</strong> ${d.consecutive_days || 'N/A'}<br>
          <strong>Last Attendance:</strong> ${d.last_attendance_date || 'N/A'}
        </p>
      </div>
      <p style="font-size: 14px; color: #475569; line-height: 1.7;">
        Regular attendance is critical for academic success. Please contact the school
        to discuss your child's attendance or provide any necessary documentation.
      </p>
      <p style="font-size: 14px; color: #475569; line-height: 1.7;">Best regards,<br>The ${d.school_name || 'School'} Team</p>
    `),
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders() })
  }
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: corsHeaders() })
  }

  try {
    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
    const FROM_EMAIL = Deno.env.get('FROM_EMAIL') ?? 'noreply@educore.school'

    if (!RESEND_API_KEY) {
      return new Response(JSON.stringify({ error: 'RESEND_API_KEY not configured' }), { status: 500, headers: corsHeaders() })
    }

    const payload: EmailPayload = await req.json()

    if (!payload.to || !payload.template) {
      return new Response(JSON.stringify({ error: 'Missing required fields: to, template' }), { status: 400, headers: corsHeaders() })
    }

    const templates = buildTemplates()
    const builder = templates[payload.template]
    if (!builder) {
      return new Response(JSON.stringify({ error: `Unknown template: ${payload.template}` }), { status: 400, headers: corsHeaders() })
    }

    const html = builder(payload.data || {})

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: [payload.to],
        subject: payload.subject || 'Notification from EduCore',
        html,
      }),
    })

    if (!res.ok) {
      const errorBody = await res.text()
      console.error('Resend API error:', res.status, errorBody)
      return new Response(JSON.stringify({ error: 'Failed to send email' }), { status: 500, headers: corsHeaders() })
    }

    const data = await res.json()
    return new Response(JSON.stringify({ success: true, id: data.id, template: payload.template }), { status: 200, headers: corsHeaders() })
  } catch (err) {
    console.error('send-email error:', err)
    return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500, headers: corsHeaders() })
  }
})
