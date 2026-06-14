import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7'

interface ReportCardPayload {
  studentId: string
  examId: string
  schoolId: string
}

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Content-Type': 'application/json',
  }
}

function calculateGrade(percentage: number): string {
  if (percentage >= 80) return 'A'
  if (percentage >= 70) return 'B+'
  if (percentage >= 60) return 'B'
  if (percentage >= 50) return 'C+'
  if (percentage >= 40) return 'C'
  if (percentage >= 30) return 'D+'
  return 'E'
}

function buildPDFContent(data: {
  school: any
  student: any
  exam: any
  subjects: any[]
  totals: { obtained: number; max: number; percentage: number; grade: string }
  attendance: any
  classPosition: number
  totalStudents: number
}): any {
  const COL_WIDTHS = [40, '*', 40, 40, 40, 40]
  const headerRow = [
    { text: '#', style: 'tableHeader', alignment: 'center' },
    { text: 'Subject', style: 'tableHeader' },
    { text: 'Max', style: 'tableHeader', alignment: 'center' },
    { text: 'Score', style: 'tableHeader', alignment: 'center' },
    { text: '%', style: 'tableHeader', alignment: 'center' },
    { text: 'Grade', style: 'tableHeader', alignment: 'center' },
  ]

  const bodyRows = data.subjects.map((s, i) => [
    { text: String(i + 1), alignment: 'center', fontSize: 10 },
    { text: s.subject_name, fontSize: 10 },
    { text: String(s.max_marks), alignment: 'center', fontSize: 10 },
    { text: s.marks_obtained !== null ? String(s.marks_obtained) : '-', alignment: 'center', fontSize: 10 },
    {
      text: s.marks_obtained !== null && s.max_marks > 0
        ? String(Math.round((s.marks_obtained / s.max_marks) * 100))
        : '-',
      alignment: 'center',
      fontSize: 10,
    },
    { text: s.grade || '-', alignment: 'center', fontSize: 10, bold: true },
  ])

  bodyRows.push([
    { text: '', border: [false, true, false, false], colSpan: 2 }, {},
    { text: 'Total', style: 'tableFooter', alignment: 'center' },
    { text: String(data.totals.obtained), style: 'tableFooter', alignment: 'center' },
    { text: String(data.totals.percentage), style: 'tableFooter', alignment: 'center' },
    { text: data.totals.grade, style: 'tableFooter', alignment: 'center', bold: true },
  ])

  return {
    pageSize: 'A4',
    pageMargins: [40, 40, 40, 40],
    info: {
      title: `Report Card - ${data.student.first_name} ${data.student.last_name}`,
      author: 'EduCore',
      subject: `${data.exam.name} Results`,
    },
    content: [
      // Header
      { text: data.school.name || 'School Name', style: 'schoolName', alignment: 'center' },
      { text: data.school.address || '', style: 'subtext', alignment: 'center', margin: [0, 2, 0, 0] },
      { text: data.school.city ? `${data.school.city}${data.school.state ? ', ' + data.school.state : ''}` : '', style: 'subtext', alignment: 'center', margin: [0, 0, 0, 8] },
      { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 1, lineColor: '#1E40AF' }], margin: [0, 0, 0, 12] },

      // Title
      { text: 'REPORT CARD', style: 'title', alignment: 'center', margin: [0, 0, 0, 16] },

      // Student details
      { text: 'Student Information', style: 'sectionTitle', margin: [0, 0, 0, 6] },
      {
        table: {
          widths: ['30%', '70%'],
          body: [
            [
              { text: 'Student Name:', style: 'label' },
              { text: `${data.student.first_name || ''} ${data.student.last_name || ''}`, style: 'value' },
            ],
            [
              { text: 'Admission No:', style: 'label' },
              { text: data.student.admission_number || 'N/A', style: 'value' },
            ],
            [
              { text: 'Class:', style: 'label' },
              { text: data.student.class_name || 'N/A', style: 'value' },
            ],
            [
              { text: 'Exam:', style: 'label' },
              { text: data.exam.name || 'N/A', style: 'value' },
            ],
            [
              { text: 'Term:', style: 'label' },
              { text: data.exam.term || 'N/A', style: 'value' },
            ],
            [
              { text: 'Class Position:', style: 'label' },
              { text: `${data.classPosition} of ${data.totalStudents}`, style: 'value' },
            ],
            [
              { text: 'Attendance:', style: 'label' },
              { text: data.attendance ? `${data.attendance.presentDays} / ${data.attendance.totalDays} (${data.attendance.percentage}%)` : 'N/A', style: 'value' },
            ],
          ],
        },
        layout: 'noBorders',
        margin: [0, 0, 0, 16],
      },

      // Subject marks table
      { text: 'Subject Marks', style: 'sectionTitle', margin: [0, 0, 0, 6] },
      {
        table: {
          widths: COL_WIDTHS,
          headerRows: 1,
          body: [headerRow, ...bodyRows],
        },
        layout: {
          fillColor: (rowIndex: number) => rowIndex === 0 ? '#1E40AF' : rowIndex % 2 === 0 ? '#f8fafc' : null,
          hLineWidth: () => 0.5,
          hLineColor: () => '#e2e8f0',
          vLineWidth: () => 0.5,
          vLineColor: () => '#e2e8f0',
          paddingLeft: () => 6,
          paddingRight: () => 6,
          paddingTop: () => 5,
          paddingBottom: () => 5,
        },
        margin: [0, 0, 0, 16],
      },

      // Overall performance
      { text: 'Overall Performance', style: 'sectionTitle', margin: [0, 0, 0, 6] },
      {
        table: {
          widths: ['33%', '33%', '34%'],
          body: [[
            {
              stack: [
                { text: 'Total Score', style: 'kpiLabel', alignment: 'center' },
                { text: `${data.totals.obtained} / ${data.totals.max}`, style: 'kpiValue', alignment: 'center' },
              ],
              margin: [4, 8],
            },
            {
              stack: [
                { text: 'Percentage', style: 'kpiLabel', alignment: 'center' },
                { text: `${data.totals.percentage}%`, style: 'kpiValue', alignment: 'center', color: data.totals.percentage >= 40 ? '#059669' : '#dc2626' },
              ],
              margin: [4, 8],
            },
            {
              stack: [
                { text: 'Grade', style: 'kpiLabel', alignment: 'center' },
                { text: data.totals.grade, style: 'kpiValue', alignment: 'center', bold: true },
              ],
              margin: [4, 8],
            },
          ]]},
        },
        layout: {
          fillColor: () => '#f1f5f9',
          hLineWidth: () => 0,
          vLineWidth: () => 0.5,
          vLineColor: () => '#e2e8f0',
        },
        margin: [0, 0, 0, 16],
      },

      // Grade legend
      { text: 'Grade Legend', style: 'sectionTitle', margin: [0, 0, 0, 6] },
      {
        table: {
          widths: ['16%', '16%', '16%', '16%', '16%', '20%'],
          body: [[
            { text: 'A (80-100)', alignment: 'center', fontSize: 9, color: '#059669' },
            { text: 'B+ (70-79)', alignment: 'center', fontSize: 9, color: '#16a34a' },
            { text: 'B (60-69)', alignment: 'center', fontSize: 9, color: '#2563eb' },
            { text: 'C+ (50-59)', alignment: 'center', fontSize: 9, color: '#ca8a04' },
            { text: 'C (40-49)', alignment: 'center', fontSize: 9, color: '#ea580c' },
            { text: 'D+/E (Below 40)', alignment: 'center', fontSize: 9, color: '#dc2626' },
          ]],
        },
        layout: 'noBorders',
        margin: [0, 0, 0, 20],
      },

      // Footer
      { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 1, lineColor: '#1E40AF' }], margin: [0, 0, 0, 8] },
      {
        columns: [
          { text: `Generated: ${new Date().toLocaleDateString()}`, style: 'footer' },
          { text: 'Powered by EduCore', style: 'footer', alignment: 'right' },
        ],
      },
    ],
    styles: {
      schoolName: { fontSize: 18, bold: true, color: '#1E40AF' },
      title: { fontSize: 16, bold: true, color: '#1e293b' },
      sectionTitle: { fontSize: 11, bold: true, color: '#334155' },
      subtext: { fontSize: 9, color: '#64748b' },
      label: { fontSize: 10, bold: true, color: '#475569' },
      value: { fontSize: 10, color: '#0f172a' },
      tableHeader: { fontSize: 10, bold: true, color: 'white', alignment: 'center' },
      tableFooter: { fontSize: 10, bold: true, color: '#1e293b' },
      kpiLabel: { fontSize: 9, color: '#64748b' },
      kpiValue: { fontSize: 16, bold: true, color: '#0f172a' },
      footer: { fontSize: 8, color: '#94a3b8' },
    },
    defaultStyle: { font: 'Helvetica' },
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
    const payload: ReportCardPayload = await req.json()
    if (!payload.studentId || !payload.examId) {
      return new Response(JSON.stringify({ error: 'Missing required fields: studentId, examId' }), { status: 400, headers: corsHeaders() })
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Fetch school
    const { data: school } = await supabase.from('schools').select('*').eq('id', payload.schoolId).single()

    // Fetch student
    const { data: student } = await supabase
      .from('students')
      .select('id, admission_number, profiles!inner(first_name, last_name, avatar_url), classes!inner(name)')
      .eq('id', payload.studentId)
      .single()

    if (!student || !school) {
      return new Response(JSON.stringify({ error: 'Student or school not found' }), { status: 404, headers: corsHeaders() })
    }

    const stud = student as any

    // Fetch exam
    const { data: exam } = await supabase
      .from('exams')
      .select('*, terms!inner(name, academic_year_id)')
      .eq('id', payload.examId)
      .single()

    if (!exam) {
      return new Response(JSON.stringify({ error: 'Exam not found' }), { status: 404, headers: corsHeaders() })
    }

    const examData = exam as any

    // Get exam subjects
    const { data: examSubjects } = await supabase
      .from('exam_subjects')
      .select('*, subjects!inner(id, name, code)')
      .eq('exam_id', payload.examId)
      .order('created_at')

    // Get student results
    const { data: results } = await supabase
      .from('results')
      .select('*')
      .eq('student_id', payload.studentId)
      .eq('exam_id', payload.examId)

    const resultMap = new Map<string, any>()
    for (const r of results ?? []) resultMap.set(r.subject_id, r)

    const subjects = (examSubjects ?? []).map(es => {
      const res = resultMap.get(es.subject_id)
      return {
        subject_id: es.subjects.id,
        subject_name: es.subjects.name,
        subject_code: es.subjects.code,
        max_marks: es.max_marks,
        marks_obtained: res ? Number(res.marks_obtained) : null,
        grade: res?.grade ?? '-',
      }
    })

    const totalObtained = subjects.reduce((s, sub) => s + (sub.marks_obtained ?? 0), 0)
    const totalMax = subjects.reduce((s, sub) => s + sub.max_marks, 0)
    const percentage = totalMax > 0 ? Math.round((totalObtained / totalMax) * 100) : 0
    const grade = calculateGrade(percentage)

    // Class position from all results
    const { data: allResults } = await supabase
      .from('results')
      .select('student_id, marks_obtained, subject_id')
      .eq('exam_id', payload.examId)

    const studentTotals = new Map<string, number>()
    for (const r of allResults ?? []) {
      studentTotals.set(r.student_id, (studentTotals.get(r.student_id) ?? 0) + Number(r.marks_obtained))
    }
    const sortedStudents = Array.from(studentTotals.entries()).sort((a, b) => b[1] - a[1])
    const classPosition = sortedStudents.findIndex(([id]) => id === payload.studentId) + 1

    // Attendance
    const { data: attendance } = await supabase
      .from('attendance')
      .select('status')
      .eq('student_id', payload.studentId)
      .eq('school_id', payload.schoolId)

    const totalDays = attendance?.length ?? 0
    const presentDays = attendance?.filter(a => a.status === 'present').length ?? 0

    // Build PDF
    const pdfContent = buildPDFContent({
      school,
      student: {
        first_name: stud.profiles?.first_name ?? '',
        last_name: stud.profiles?.last_name ?? '',
        admission_number: stud.admission_number,
        class_name: stud.classes?.name ?? '',
      },
      exam: {
        name: examData.name,
        term: examData.terms?.name ?? '',
      },
      subjects,
      totals: { obtained: totalObtained, max: totalMax, percentage, grade },
      attendance: { totalDays, presentDays, percentage: totalDays > 0 ? Math.round((presentDays / totalDays) * 100) : 0 },
      classPosition: classPosition || sortedStudents.length,
      totalStudents: sortedStudents.length,
    })

    // Generate PDF via pdfmake
    const pdfResponse = await fetch('https://pdfmake.org/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(pdfContent),
    })

    if (!pdfResponse.ok) {
      // Fallback: use pdfmake from CDN
      const pdfMakeModule = await import('https://esm.sh/pdfmake@0.2.10/build/pdfmake.min.js')
      const vfsFonts = await import('https://esm.sh/pdfmake@0.2.10/build/vfs_fonts.js')
      pdfMakeModule.default.vfs = vfsFonts.default?.vfs || vfsFonts.vfs

      // We need to use Deno-compatible approach
      const pdfDoc = pdfMakeModule.default.createPdf(pdfContent)
      const pdfBuffer = await new Promise<Uint8Array>((resolve, reject) => {
        pdfDoc.getBuffer((buffer: ArrayBuffer) => {
          resolve(new Uint8Array(buffer))
        })
      })

      // Upload to Supabase Storage
      const filePath = `${payload.schoolId}/${payload.examId}/${payload.studentId}.pdf`
      const { error: uploadError } = await supabase.storage
        .from('report-cards')
        .upload(filePath, pdfBuffer, {
          contentType: 'application/pdf',
          upsert: true,
        })

      if (uploadError) throw new Error(`Storage upload failed: ${uploadError.message}`)

      const { data: signedUrl } = await supabase.storage
        .from('report-cards')
        .createSignedUrl(filePath, 60 * 60 * 24 * 7) // 7 days

      return new Response(JSON.stringify({
        success: true,
        url: signedUrl?.signedUrl ?? null,
        path: filePath,
        student: `${stud.profiles?.first_name ?? ''} ${stud.profiles?.last_name ?? ''}`,
        grade,
        percentage,
      }), { status: 200, headers: corsHeaders() })
    }

    const pdfBlob = await pdfResponse.blob()
    const pdfBytes = new Uint8Array(await pdfBlob.arrayBuffer())

    // Upload to Supabase Storage
    const filePath = `${payload.schoolId}/${payload.examId}/${payload.studentId}.pdf`
    const { error: uploadError } = await supabase.storage
      .from('report-cards')
      .upload(filePath, pdfBytes, {
        contentType: 'application/pdf',
        upsert: true,
      })

    if (uploadError) throw new Error(`Storage upload failed: ${uploadError.message}`)

    const { data: signedUrl } = await supabase.storage
      .from('report-cards')
      .createSignedUrl(filePath, 60 * 60 * 24 * 7)

    return new Response(JSON.stringify({
      success: true,
      url: signedUrl?.signedUrl ?? null,
      path: filePath,
      student: `${stud.profiles?.first_name ?? ''} ${stud.profiles?.last_name ?? ''}`,
      grade,
      percentage,
    }), { status: 200, headers: corsHeaders() })
  } catch (err) {
    console.error('generate-report-card error:', err)
    return new Response(JSON.stringify({ error: 'Internal server error', detail: String(err) }), { status: 500, headers: corsHeaders() })
  }
})
