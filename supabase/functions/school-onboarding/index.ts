import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7'

interface OnboardingPayload {
  schoolId: string
  schoolName: string
  adminId: string
  adminEmail: string
  adminFirstName: string
  adminLastName: string
  adminPassword: string
}

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Content-Type': 'application/json',
  }
}

const GRADE_NAMES = [
  'Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6',
  'Grade 7', 'Grade 8', 'Grade 9', 'Grade 10', 'Grade 11', 'Grade 12',
]

const COMMON_SUBJECTS = [
  { name: 'Mathematics', code: 'MATH' },
  { name: 'English Language', code: 'ENG' },
  { name: 'Kiswahili', code: 'KISW' },
  { name: 'Science', code: 'SCI' },
  { name: 'Social Studies', code: 'SST' },
  { name: 'Religious Education', code: 'RE' },
  { name: 'Physical Education', code: 'PE' },
  { name: 'Creative Arts', code: 'ART' },
  { name: 'Information Technology', code: 'ICT' },
  { name: 'Agriculture', code: 'AGR' },
  { name: 'Home Science', code: 'HSC' },
  { name: 'Business Studies', code: 'BST' },
  { name: 'French', code: 'FREN' },
  { name: 'German', code: 'GER' },
]

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders() })
  }
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: corsHeaders() })
  }

  try {
    const payload: OnboardingPayload = await req.json()

    if (!payload.schoolId || !payload.adminId) {
      return new Response(JSON.stringify({ error: 'Missing required fields: schoolId, adminId' }), { status: 400, headers: corsHeaders() })
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    const supabase = createClient(supabaseUrl, supabaseKey)

    const results: Record<string, any> = {}

    // 1. Create default academic year
    const currentYear = new Date().getFullYear()
    const academicYearName = `${currentYear}-${currentYear + 1}`
    const { data: academicYear, error: ayError } = await supabase
      .from('academic_years')
      .insert({
        school_id: payload.schoolId,
        name: academicYearName,
        start_date: `${currentYear}-09-01`,
        end_date: `${currentYear + 1}-08-31`,
        is_current: true,
      })
      .select()
      .single()

    if (ayError) throw new Error(`Failed to create academic year: ${ayError.message}`)
    results.academic_year = academicYear.id

    // 2. Create 2 default terms
    const terms = [
      { name: 'Term 1', start_date: `${currentYear}-09-01`, end_date: `${currentYear}-12-15`, is_current: true },
      { name: 'Term 2', start_date: `${currentYear + 1}-01-15`, end_date: `${currentYear + 1}-04-15`, is_current: false },
    ]

    const createdTerms: any[] = []
    for (const term of terms) {
      const { data: t, error: tError } = await supabase
        .from('terms')
        .insert({
          school_id: payload.schoolId,
          academic_year_id: academicYear.id,
          name: term.name,
          start_date: term.start_date,
          end_date: term.end_date,
          is_current: term.is_current,
        })
        .select()
        .single()

      if (tError) throw new Error(`Failed to create term ${term.name}: ${tError.message}`)
      createdTerms.push(t)
    }
    results.terms = createdTerms.map(t => t.id)

    // 3. Create classes Grade 1-12
    const createdClasses: any[] = []
    for (let i = 0; i < GRADE_NAMES.length; i++) {
      const { data: cls, error: cError } = await supabase
        .from('classes')
        .insert({
          school_id: payload.schoolId,
          academic_year_id: academicYear.id,
          name: GRADE_NAMES[i],
          level: i + 1,
          description: `${GRADE_NAMES[i]} class`,
        })
        .select()
        .single()

      if (cError) {
        console.error(`Failed to create class ${GRADE_NAMES[i]}: ${cError.message}`)
      } else {
        createdClasses.push(cls)

        // Create one default section per class
        const { error: sError } = await supabase
          .from('sections')
          .insert({
            school_id: payload.schoolId,
            class_id: cls.id,
            name: 'A',
            capacity: 40,
          })

        if (sError) console.error(`Failed to create section for ${cls.name}: ${sError.message}`)
      }
    }
    results.classes = createdClasses.map(c => c.id)

    // 4. Create common subjects
    const createdSubjects: any[] = []
    for (const subj of COMMON_SUBJECTS) {
      const { data: subject, error: subError } = await supabase
        .from('subjects')
        .insert({
          school_id: payload.schoolId,
          name: subj.name,
          code: subj.code,
          description: `${subj.name} subject`,
          credit_hours: subj.name === 'Physical Education' ? 1 : subj.name === 'Mathematics' ? 4 : 3,
        })
        .select()
        .single()

      if (subError) {
        console.error(`Failed to create subject ${subj.name}: ${subError.message}`)
      } else {
        createdSubjects.push(subject)
      }
    }
    results.subjects = createdSubjects.map(s => s.id)

    // 5. Update school settings with defaults
    await supabase
      .from('schools')
      .update({
        settings: {
          timezone: 'Africa/Nairobi',
          currency: 'KES',
          max_students: 500,
          max_teachers: 50,
          default_language: 'en',
          fee_structure: {
            late_fee_percentage: 5,
            payment_deadline_day: 10,
          },
          attendance_policy: {
            required_attendance_percentage: 80,
            allowed_absences_per_term: 10,
            consecutive_absence_threshold: 3,
          },
          grading_system: {
            a: { min: 80, max: 100, points: 12 },
            'b+': { min: 75, max: 79, points: 11 },
            b: { min: 70, max: 74, points: 10 },
            'c+': { min: 65, max: 69, points: 9 },
            c: { min: 60, max: 64, points: 8 },
            'd+': { min: 55, max: 59, points: 7 },
            d: { min: 50, max: 54, points: 6 },
            e: { min: 0, max: 49, points: 0 },
          },
          communication: {
            sms_provider: 'africastalking',
            email_provider: 'resend',
            sender_id: 'EDUCORE',
          },
          academic: {
            terms_per_year: 2,
            current_term: createdTerms[0]?.id ?? null,
          },
        },
      })
      .eq('id', payload.schoolId)

    // 6. Send welcome email to admin
    if (payload.adminEmail && payload.adminFirstName) {
      try {
        const portalUrl = `${Deno.env.get('PUBLIC_APP_URL') ?? 'http://localhost:3000'}/login?role=school_admin`

        await supabase.functions.invoke('send-email', {
          body: {
            to: payload.adminEmail,
            template: 'welcome',
            subject: `Welcome to EduCore — ${payload.schoolName} is ready!`,
            data: {
              name: `${payload.adminFirstName} ${payload.adminLastName || ''}`.trim(),
              school_name: payload.schoolName,
              role: 'School Admin',
              email: payload.adminEmail,
              portal_url: portalUrl,
            },
          },
        })
      } catch (emailErr) {
        console.error('Failed to send welcome email:', emailErr)
      }
    }

    return new Response(JSON.stringify({
      success: true,
      message: `School ${payload.schoolName} onboarded successfully`,
      data: {
        academic_year: results.academic_year,
        terms_created: results.terms?.length ?? 0,
        classes_created: results.classes?.length ?? 0,
        subjects_created: results.subjects?.length ?? 0,
        admin_email_sent: !!payload.adminEmail,
        default_settings_applied: true,
      },
    }), { status: 200, headers: corsHeaders() })
  } catch (err) {
    console.error('school-onboarding error:', err)
    return new Response(JSON.stringify({ error: 'Internal server error', detail: String(err) }), { status: 500, headers: corsHeaders() })
  }
})
