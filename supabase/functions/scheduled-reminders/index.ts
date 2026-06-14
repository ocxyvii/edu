import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7'

interface ReminderResult {
  fee_reminders_sent: number
  absence_alerts_sent: number
  library_reminders_sent: number
  errors: string[]
}

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Content-Type': 'application/json',
  }
}

async function sendFeeReminders(supabase: any): Promise<{ sent: number; errors: string[] }> {
  let sent = 0
  const errors: string[] = []

  try {
    // Invoices due in exactly 3 days
    const threeDaysFromNow = new Date()
    threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3)
    const targetDate = threeDaysFromNow.toISOString().split('T')[0]

    const { data: invoices } = await supabase
      .from('fee_invoices')
      .select(`
        id, invoice_number, amount, balance, due_date, status, student_id,
        students!inner(
          id, admission_number, school_id,
          profiles!inner(first_name, last_name, phone, email)
        ),
        fee_structures!left(name)
      `)
      .eq('due_date', targetDate)
      .in('status', ['pending', 'partial'])

    if (!invoices?.length) return { sent: 0, errors: [] }

    for (const inv of invoices) {
      try {
        const stud = inv.students as any
        const profile = stud?.profiles
        const parentEmail = profile?.email
        const parentPhone = profile?.phone

        if (parentEmail) {
          await supabase.functions.invoke('send-email', {
            body: {
              to: parentEmail,
              template: 'fee-reminder',
              subject: 'Fee Payment Reminder',
              data: {
                parent_name: `${profile?.first_name ?? ''} ${profile?.last_name ?? ''}`.trim() || 'Parent',
                student_name: `${profile?.first_name ?? ''} ${profile?.last_name ?? ''}`.trim(),
                fee_description: inv.fee_structures?.name ?? 'Tuition Fee',
                amount: String(inv.amount),
                balance: String(inv.balance ?? inv.amount),
                due_date: inv.due_date ?? targetDate,
                school_name: '',
              },
            },
          })
        }

        if (parentPhone) {
          await supabase.functions.invoke('send-sms', {
            body: {
              to: parentPhone,
              template: 'fee-reminder',
              data: {
                student_name: `${profile?.first_name ?? ''} ${profile?.last_name ?? ''}`.trim(),
                amount: String(inv.amount),
                balance: String(inv.balance ?? inv.amount),
                due_date: inv.due_date ?? targetDate,
                school_name: '',
              },
              school_id: stud?.school_id ?? '',
            },
          })
        }

        sent++
      } catch (innerErr) {
        errors.push(`Invoice ${inv.id}: ${String(innerErr)}`)
      }
    }
  } catch (err) {
    errors.push(`Fee reminders query: ${String(err)}`)
  }

  return { sent, errors }
}

async function sendAbsenceAlerts(supabase: any): Promise<{ sent: number; errors: string[] }> {
  let sent = 0
  const errors: string[] = []

  try {
    const today = new Date().toISOString().split('T')[0]

    // Find students with 3+ consecutive absences ending before today
    // We check attendance records grouped by student and ordered by date
    const { data: schools } = await supabase
      .from('schools')
      .select('id')

    for (const school of schools ?? []) {
      try {
        const { data: students } = await supabase
          .from('students')
          .select('id, admission_number, profiles!inner(first_name, last_name, phone, email), classes!left(name)')
          .eq('school_id', school.id)
          .eq('is_active', true)

        if (!students?.length) continue

        for (const student of students) {
          try {
            const stud = student as any

            // Get last 5 attendance records
            const { data: attendance } = await supabase
              .from('attendance')
              .select('date, status')
              .eq('student_id', student.id)
              .order('date', { ascending: false })
              .limit(5)

            if (!attendance?.length) continue

            // Count consecutive absences from most recent
            let consecutive = 0
            for (const record of attendance) {
              if (record.status === 'absent') consecutive++
              else break
            }

            // Check if the absence alert was already sent today
            const { data: existingAlert } = await supabase
              .from('notifications')
              .select('id')
              .eq('user_id', student.id)
              .eq('type', 'warning')
              .eq('created_at::date', today)
              .maybeSingle()

            if (consecutive >= 3 && !existingAlert) {
              const parentEmail = stud.profiles?.email
              const parentPhone = stud.profiles?.phone

              if (parentEmail) {
                await supabase.functions.invoke('send-email', {
                  body: {
                    to: parentEmail,
                    template: 'absence-alert',
                    subject: 'Attendance Alert',
                    data: {
                      parent_name: `${stud.profiles?.first_name ?? ''} ${stud.profiles?.last_name ?? ''}`.trim(),
                      student_name: `${stud.profiles?.first_name ?? ''} ${stud.profiles?.last_name ?? ''}`.trim(),
                      class_name: stud.classes?.name ?? '',
                      consecutive_days: String(consecutive),
                      last_attendance_date: attendance[0]?.date ?? '',
                      school_name: '',
                    },
                  },
                })
              }

              if (parentPhone) {
                await supabase.functions.invoke('send-sms', {
                  body: {
                    to: parentPhone,
                    template: 'attendance-alert',
                    data: {
                      student_name: `${stud.profiles?.first_name ?? ''} ${stud.profiles?.last_name ?? ''}`.trim(),
                      consecutive_days: String(consecutive),
                      school_name: '',
                    },
                    school_id: school.id,
                  },
                })
              }

              // Log notification
              await supabase.from('notifications').insert({
                user_id: student.id,
                school_id: school.id,
                title: 'Attendance Alert',
                message: `${stud.profiles?.first_name ?? ''} has been absent for ${consecutive} consecutive day(s).`,
                type: 'warning',
                is_read: false,
              })

              sent++
            }
          } catch (innerErr) {
            errors.push(`Student ${student.id}: ${String(innerErr)}`)
          }
        }
      } catch (schoolErr) {
        errors.push(`School ${school.id}: ${String(schoolErr)}`)
      }
    }
  } catch (err) {
    errors.push(`Absence alerts query: ${String(err)}`)
  }

  return { sent, errors }
}

async function sendLibraryReminders(supabase: any): Promise<{ sent: number; errors: string[] }> {
  let sent = 0
  const errors: string[] = []

  try {
    const today = new Date().toISOString().split('T')[0]

    const { data: borrowings } = await supabase
      .from('library_borrowings')
      .select(`
        id, due_date, book_id, student_id,
        books!inner(title, author),
        students!inner(
          profiles!inner(first_name, last_name, phone, email),
          school_id
        )
      `)
      .eq('status', 'borrowed')
      .lt('due_date', today)

    if (!borrowings?.length) return { sent: 0, errors: [] }

    for (const borrowing of borrowings) {
      try {
        const b = borrowing as any
        const profile = b.students?.profiles
        const daysOverdue = Math.floor(
          (Date.now() - new Date(b.due_date).getTime()) / (1000 * 60 * 60 * 24)
        )

        if (profile?.email) {
          await supabase.functions.invoke('send-email', {
            body: {
              to: profile.email,
              template: 'welcome', // generic fallback with custom HTML
              subject: 'Library Book Return Reminder',
              data: {
                name: `${profile.first_name ?? ''} ${profile.last_name ?? ''}`.trim(),
                school_name: '',
              },
              html: `<p>This is a reminder that <strong>${b.books?.title ?? 'a book'}</strong> is overdue by <strong>${daysOverdue} day(s)</strong>.</p><p>Please return it at your earliest convenience to avoid late fees.</p>`,
            },
          })
        }

        if (profile?.phone) {
          const message = `EduCore Library: "${b.books?.title ?? 'Book'}" is ${daysOverdue} day(s) overdue. Please return it to the library.`
          await supabase.functions.invoke('send-sms', {
            body: {
              to: profile.phone,
              message,
              school_id: b.students?.school_id ?? '',
            },
          })
        }

        sent++
      } catch (innerErr) {
        errors.push(`Borrowing ${borrowing.id}: ${String(innerErr)}`)
      }
    }
  } catch (err) {
    errors.push(`Library reminders query: ${String(err)}`)
  }

  return { sent, errors }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders() })
  }
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: corsHeaders() })
  }

  try {
    // Verify cron secret to prevent unauthorized invocation
    const authHeader = req.headers.get('authorization') || ''
    const cronSecret = Deno.env.get('CRON_SECRET')
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders() })
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    const supabase = createClient(supabaseUrl, supabaseKey)

    const result: ReminderResult = {
      fee_reminders_sent: 0,
      absence_alerts_sent: 0,
      library_reminders_sent: 0,
      errors: [],
    }

    // Run all three reminders in parallel
    const [feeResult, absenceResult, libraryResult] = await Promise.all([
      sendFeeReminders(supabase),
      sendAbsenceAlerts(supabase),
      sendLibraryReminders(supabase),
    ])

    result.fee_reminders_sent = feeResult.sent
    result.absence_alerts_sent = absenceResult.sent
    result.library_reminders_sent = libraryResult.sent
    result.errors = [...feeResult.errors, ...absenceResult.errors, ...libraryResult.errors]

    return new Response(JSON.stringify({
      success: true,
      ...result,
    }), { status: 200, headers: corsHeaders() })
  } catch (err) {
    console.error('scheduled-reminders error:', err)
    return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500, headers: corsHeaders() })
  }
})
