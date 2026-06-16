'use server'

import { z } from 'zod'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

async function getAuthContext() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('school_id, role')
    .eq('id', user.id)
    .single()
  if (error || !profile?.school_id) throw new Error('No school assigned')
  return { userId: user.id, schoolId: profile.school_id, role: profile.role, supabase }
}

const DateRangeSchema = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
})

// ─────────────────────────────────────────────────────
// 1. ATTENDANCE REPORT
// ─────────────────────────────────────────────────────

const AttendanceReportSchema = z.object({
  classId: z.string().optional(),
  sectionId: z.string().optional(),
  dateRange: DateRangeSchema.optional(),
})

export async function getAttendanceReport(opts: z.infer<typeof AttendanceReportSchema> = {}): Promise<any> {
  const { supabase, schoolId } = await getAuthContext()
  const { classId, sectionId, dateRange } = AttendanceReportSchema.parse(opts)

  let query = supabase
    .from('attendance')
    .select(`
      id, student_id, class_id, section_id, date, status, notes,
      students!inner(
        id, admission_number,
        profiles!inner(first_name, last_name, avatar_url)
      )
    `)
    .eq('school_id', schoolId)

  if (classId) query = query.eq('class_id', classId)
  if (sectionId) query = query.eq('section_id', sectionId)
  if (dateRange?.from) query = query.gte('date', dateRange.from)
  if (dateRange?.to) query = query.lte('date', dateRange.to)

  const { data: records, error } = await query.order('date', { ascending: true })
  if (error) throw new Error(error.message)

  // Build per-student aggregation
  const studentMap = new Map<string, {
    student_id: string
    admission_number: string
    name: string
    avatar_url: string | null
    present: number
    absent: number
    late: number
    excused: number
    total: number
  }>()

  for (const r of records ?? []) {
    const sid = r.student_id
    const s = r.students as any
    if (!studentMap.has(sid)) {
      studentMap.set(sid, {
        student_id: sid,
        admission_number: s.admission_number,
        name: `${s.profiles?.first_name ?? ''} ${s.profiles?.last_name ?? ''}`.trim(),
        avatar_url: s.profiles?.avatar_url ?? null,
        present: 0, absent: 0, late: 0, excused: 0, total: 0,
      })
    }
    const entry = studentMap.get(sid)!
    entry.total++
    if (r.status === 'present') entry.present++
    else if (r.status === 'absent') entry.absent++
    else if (r.status === 'late') entry.late++
    else if (r.status === 'excused') entry.excused++
  }

  const students = Array.from(studentMap.values()).map(s => ({
    ...s,
    percentage: s.total > 0 ? Math.round(((s.present + s.late) / s.total) * 100) : 0,
  })).sort((a, b) => a.percentage - b.percentage)

  // Daily attendance rate (for line chart)
  const dailyMap = new Map<string, { date: string; present: number; absent: number; late: number; total: number }>()
  for (const r of records ?? []) {
    const d = r.date
    if (!dailyMap.has(d)) dailyMap.set(d, { date: d, present: 0, absent: 0, late: 0, total: 0 })
    const day = dailyMap.get(d)!
    day.total++
    if (r.status === 'present') day.present++
    else if (r.status === 'absent') day.absent++
    else if (r.status === 'late') day.late++
  }
  const dailyRates = Array.from(dailyMap.values()).map(d => ({
    ...d,
    rate: d.total > 0 ? Math.round((d.present / d.total) * 100) : 0,
  })).sort((a, b) => a.date.localeCompare(b.date))

  // Per-class totals
  const classMap = new Map<string, { class_name: string; present: number; absent: number; total: number }>()
  for (const r of records ?? []) {
    // We can't get class name from this query directly, so we'll aggregate by class_id
    const cid = r.class_id
    if (!classMap.has(cid)) classMap.set(cid, { class_name: cid, present: 0, absent: 0, total: 0 })
    const c = classMap.get(cid)!
    c.total++
    if (r.status === 'present') c.present++
    else if (r.status === 'absent') c.absent++
  }
  const classAttendance = Array.from(classMap.entries()).map(([id, data]) => ({
    class_id: id,
    class_name: data.class_name,
    present: data.present,
    absent: data.absent,
    total: data.total,
    rate: data.total > 0 ? Math.round((data.present / data.total) * 100) : 0,
  }))

  return {
    summary: {
      totalRecords: records?.length ?? 0,
      totalStudents: students.length,
      averageAttendance: students.length > 0
        ? Math.round(students.reduce((sum, s) => sum + s.percentage, 0) / students.length)
        : 0,
      atRiskCount: students.filter(s => s.percentage < 75).length,
    },
    dailyRates,
    classAttendance,
    students,
  }
}

// ─────────────────────────────────────────────────────
// 2. ACADEMIC PERFORMANCE REPORT
// ─────────────────────────────────────────────────────

const AcademicReportSchema = z.object({
  examId: z.string().min(1),
  classId: z.string().optional(),
})

export async function getAcademicPerformanceReport(opts: z.infer<typeof AcademicReportSchema>): Promise<any> {
  const { supabase, schoolId } = await getAuthContext()
  const { examId, classId } = AcademicReportSchema.parse(opts)

  const { data: exam } = await supabase
    .from('exams')
    .select('*, terms!inner(name, academic_year_id), classes!left(name)')
    .eq('id', examId)
    .eq('school_id', schoolId)
    .single()
  if (!exam) throw new Error('Exam not found')

  const effectiveClassId = classId || exam.class_id

  const { data: examSubjects } = await supabase
    .from('exam_subjects')
    .select('*, subjects!inner(id, name, code)')
    .eq('exam_id', examId)
    .order('created_at')

  const subjectIds = (examSubjects ?? []).map(es => es.subject_id)

  // Get all students in the class
  let studentQuery = supabase
    .from('students')
    .select('id, admission_number, profiles!inner(first_name, last_name, avatar_url)')
    .eq('school_id', schoolId)
    .eq('is_active', true)

  if (effectiveClassId) studentQuery = studentQuery.eq('class_id', effectiveClassId)

  const { data: students } = await studentQuery
  if (!students?.length) {
    return {
      exam: { name: exam.name, type: exam.exam_type, term: exam.terms?.name },
      subjects: (examSubjects ?? []).map(es => ({ id: es.subjects.id, name: es.subjects.name, code: es.subjects.code, maxMarks: es.max_marks })),
      students: [],
      gradeDistribution: [],
      summary: { averageScore: 0, passRate: 0, totalStudents: 0 },
    }
  }

  const studentIds = students.map(s => s.id)

  const { data: results } = await supabase
    .from('results')
    .select('*')
    .eq('exam_id', examId)
    .in('student_id', studentIds)

  const resultMap = new Map<string, Map<string, any>>()
  for (const r of results ?? []) {
    if (!resultMap.has(r.student_id)) resultMap.set(r.student_id, new Map())
    resultMap.get(r.student_id)!.set(r.subject_id, r)
  }

  // Per-subject averages
  const subjectAverages = (examSubjects ?? []).map(es => {
    const subResults = (results ?? []).filter(r => r.subject_id === es.subject_id)
    const avg = subResults.length > 0
      ? Math.round(subResults.reduce((s, r) => s + Number(r.marks_obtained), 0) / subResults.length * 100) / 100
      : 0
    return {
      subject_id: es.subjects.id,
      subject_name: es.subjects.name,
      subject_code: es.subjects.code,
      maxMarks: es.max_marks,
      average: avg,
      passMark: es.pass_marks,
      totalStudents: subResults.length,
    }
  })

  // Per-student rows
  const studentRows = students.map(s => {
    const subjects = (examSubjects ?? []).map(es => {
      const res = resultMap.get(s.id)?.get(es.subject_id)
      return {
        subject_id: es.subjects.id,
        subject_name: es.subjects.name,
        subject_code: es.subjects.code,
        maxMarks: es.max_marks,
        marksObtained: res ? Number(res.marks_obtained) : null,
        grade: res?.grade ?? '-',
      }
    })
    const totalObtained = subjects.reduce((sum, sub) => sum + (sub.marksObtained ?? 0), 0)
    const totalMax = subjects.reduce((sum, sub) => sum + sub.maxMarks, 0)
    const percentage = totalMax > 0 ? Math.round((totalObtained / totalMax) * 100) : 0
    const passed = subjects.filter(sub => sub.marksObtained !== null && sub.marksObtained >= 40).length
    const totalGraded = subjects.filter(sub => sub.marksObtained !== null).length
    return {
      student_id: s.id,
      admission_number: s.admission_number,
      name: `${(s as any).profiles?.first_name ?? ''} ${(s as any).profiles?.last_name ?? ''}`.trim(),
      avatar_url: (s as any).profiles?.avatar_url ?? null,
      subjects,
      totalObtained,
      totalMax,
      percentage,
      passed,
      totalSubjects: totalGraded,
      overallGrade: percentage >= 80 ? 'A' : percentage >= 65 ? 'B' : percentage >= 50 ? 'C' : percentage >= 40 ? 'D' : 'F',
    }
  })

  // Sort by percentage descending and assign rank
  studentRows.sort((a, b) => b.percentage - a.percentage)
  studentRows.forEach((s, i) => { (s as any).rank = i + 1 })

  // Grade distribution
  const gradeCounts = { A: 0, B: 0, C: 0, D: 0, F: 0 }
  for (const s of studentRows) {
    if (s.overallGrade === 'A') gradeCounts.A++
    else if (s.overallGrade === 'B') gradeCounts.B++
    else if (s.overallGrade === 'C') gradeCounts.C++
    else if (s.overallGrade === 'D') gradeCounts.D++
    else gradeCounts.F++
  }
  const gradeDistribution = Object.entries(gradeCounts).map(([grade, count]) => ({ grade, count }))

  const averageScore = studentRows.length > 0
    ? Math.round(studentRows.reduce((s, r) => s + r.percentage, 0) / studentRows.length)
    : 0
  const passRate = studentRows.length > 0
    ? Math.round((studentRows.filter(s => s.percentage >= 40).length / studentRows.length) * 100)
    : 0

  return {
    exam: { name: exam.name, type: exam.exam_type, term: exam.terms?.name, class_name: exam.classes?.name ?? null },
    subjects: subjectAverages,
    students: studentRows,
    gradeDistribution,
    summary: { averageScore, passRate, totalStudents: studentRows.length },
  }
}

// ─────────────────────────────────────────────────────
// 3. FEE COLLECTION REPORT
// ─────────────────────────────────────────────────────

const FeeReportSchema = z.object({
  termId: z.string().optional(),
  dateRange: DateRangeSchema.optional(),
})

export async function getFeeCollectionReport(opts: z.infer<typeof FeeReportSchema> = {}): Promise<any> {
  const { supabase, schoolId } = await getAuthContext()
  const { termId, dateRange } = FeeReportSchema.parse(opts)

  // Get fee structures filtered by term
  let structureQuery = supabase
    .from('fee_structures')
    .select('id, name, fee_type, amount, class_id')
    .eq('school_id', schoolId)
    .eq('is_active', true)
  if (termId) structureQuery = structureQuery.eq('term_id', termId)
  const { data: structures } = await structureQuery

  // Get invoices
  let invoiceQuery = supabase
    .from('fee_invoices')
    .select(`
      id, invoice_number, student_id, amount, discount, paid_amount, balance, status, due_date, created_at,
      students!inner(
        id, admission_number,
        profiles!inner(first_name, last_name)
      )
    `)
    .eq('school_id', schoolId)

  if (dateRange?.from) invoiceQuery = invoiceQuery.gte('created_at', dateRange.from)
  if (dateRange?.to) invoiceQuery = invoiceQuery.lte('created_at', dateRange.to)

  const { data: invoices } = await invoiceQuery.order('created_at', { ascending: false })
  if (!invoices?.length) {
    return {
      summary: { expected: 0, collected: 0, outstanding: 0, overdue: 0, collectionRate: 0 },
      monthlyTrend: [],
      feeTypeBreakdown: [],
      defaulters: [],
    }
  }

  const totalAmount = invoices.reduce((s, i) => s + Number(i.amount), 0)
  const totalPaid = invoices.reduce((s, i) => s + Number(i.paid_amount), 0)
  const totalOutstanding = invoices.reduce((s, i) => s + Number(i.balance), 0)
  const overdueInvoices = invoices.filter(i => i.status === 'overdue')

  // Monthly collection trend
  const monthlyMap = new Map<string, { month: string; collected: number; target: number }>()
  for (const inv of invoices) {
    const month = inv.created_at?.slice(0, 7) ?? 'unknown'
    if (!monthlyMap.has(month)) monthlyMap.set(month, { month, collected: 0, target: 0 })
    const m = monthlyMap.get(month)!
    m.collected += Number(inv.paid_amount)
    m.target += Number(inv.amount)
  }
  const monthlyTrend = Array.from(monthlyMap.values()).sort((a, b) => a.month.localeCompare(b.month))

  // Fee type breakdown
  const typeMap = new Map<string, { type: string; amount: number; collected: number }>()
  for (const s of structures ?? []) {
    const t = s.fee_type
    if (!typeMap.has(t)) typeMap.set(t, { type: t, amount: 0, collected: 0 })
    const e = typeMap.get(t)!
    e.amount += Number(s.amount)
    // Approximate: collected proportionally to invoice payments
    const structureInvoices = invoices.filter(i => i.students.class_id === s.class_id)
    e.collected += structureInvoices.reduce((sum, i) => sum + Number(i.paid_amount), 0)
  }

  // Try more accurate fee type breakdown via fee_structure_id on invoices
  if (structures?.length) {
    for (const inv of invoices) {
      const matchingStructures = structures.filter(s => {
        if (s.class_id) {
          const student = inv.students as any
          return student?.class_id === s.class_id
        }
        return false
      })
      // Can't directly link, so keep the approximate approach
    }
  }

  const feeTypeBreakdown = Array.from(typeMap.values())

  // Defaulters (overdue + highest outstanding)
  const defaulters = invoices
    .filter(i => Number(i.balance) > 0)
    .map(i => {
      const stud = i.students as any
      const dueDate = i.due_date ? new Date(i.due_date) : null
      const daysOverdue = dueDate ? Math.max(0, Math.floor((Date.now() - dueDate.getTime()) / (1000 * 60 * 60 * 24))) : 0
      return {
        invoice_id: i.id,
        invoice_number: i.invoice_number,
        student_id: i.student_id,
        name: `${stud?.profiles?.first_name ?? ''} ${stud?.profiles?.last_name ?? ''}`.trim(),
        admission_number: stud?.admission_number ?? '',
        amount: Number(i.amount),
        paid: Number(i.paid_amount),
        outstanding: Number(i.balance),
        due_date: i.due_date,
        days_overdue: daysOverdue,
        status: i.status,
      }
    })
    .sort((a, b) => b.outstanding - a.outstanding)

  return {
    summary: {
      expected: totalAmount,
      collected: totalPaid,
      outstanding: totalOutstanding,
      overdue: overdueInvoices.length,
      collectionRate: totalAmount > 0 ? Math.round((totalPaid / totalAmount) * 100) : 0,
    },
    monthlyTrend,
    feeTypeBreakdown,
    defaulters,
  }
}

// ─────────────────────────────────────────────────────
// 4. STUDENT PROGRESS REPORT
// ─────────────────────────────────────────────────────

const StudentProgressSchema = z.object({
  studentId: z.string().min(1),
  academicYearId: z.string().optional(),
})

export async function getStudentProgressReport(opts: z.infer<typeof StudentProgressSchema>): Promise<any> {
  const { supabase, schoolId } = await getAuthContext()
  const { studentId, academicYearId } = StudentProgressSchema.parse(opts)

  // Get student info
  const { data: student } = await supabase
    .from('students')
    .select('*, profiles!inner(first_name, last_name, avatar_url), classes!left(name)')
    .eq('id', studentId)
    .eq('school_id', schoolId)
    .single()
  if (!student) throw new Error('Student not found')
  const stud = student as any

  // Get terms
  let termQuery = supabase
    .from('terms')
    .select('*')
    .eq('school_id', schoolId)
    .order('start_date', { ascending: true })
  if (academicYearId) termQuery = termQuery.eq('academic_year_id', academicYearId)
  const { data: terms } = await termQuery

  // Get all exams for these terms
  const termIds = (terms ?? []).map(t => t.id)
  if (!termIds.length) {
    return {
      student: { name: `${stud.profiles?.first_name ?? ''} ${stud.profiles?.last_name ?? ''}`.trim(), admission_number: stud.admission_number, class_name: stud.classes?.name ?? null },
      terms: [],
    }
  }

  const { data: exams } = await supabase
    .from('exams')
    .select('id, name, exam_type, term_id, total_marks')
    .in('term_id', termIds)
    .eq('school_id', schoolId)
    .eq('is_published', true)
    .order('start_date', { ascending: true })

  const examIds = (exams ?? []).map(e => e.id)

  // Get all results for this student in these exams
  const { data: results } = await supabase
    .from('results')
    .select('*, subjects!inner(name, code)')
    .eq('student_id', studentId)
    .in('exam_id', examIds)

  const resultsByExam = new Map<string, any[]>()
  for (const r of results ?? []) {
    if (!resultsByExam.has(r.exam_id)) resultsByExam.set(r.exam_id, [])
    resultsByExam.get(r.exam_id)!.push(r)
  }

  // Build per-term data
  const termData = (terms ?? []).map(term => {
    const termExams = (exams ?? []).filter(e => e.term_id === term.id)
    const examData = termExams.map(exam => {
      const examResults = resultsByExam.get(exam.id) ?? []
      const totalObtained = examResults.reduce((s, r) => s + Number(r.marks_obtained), 0)
      const totalMax = examResults.reduce((s, r) => s + Number(r.max_marks || exam.total_marks), 0) || examResults.reduce((s, r) => s + Number(r.marks_obtained), 0)
      return {
        exam_id: exam.id,
        exam_name: exam.name,
        exam_type: exam.exam_type,
        total_marks: exam.total_marks,
        obtained: totalObtained,
        max_total: totalMax || exam.total_marks,
        subjects: examResults.map(r => ({
          subject: (r.subjects as any)?.name ?? '',
          code: (r.subjects as any)?.code ?? '',
          marks: Number(r.marks_obtained),
          grade: r.grade,
        })),
      }
    })
    const termTotal = examData.reduce((s, e) => s + e.obtained, 0)
    const termMax = examData.reduce((s, e) => s + e.max_total, 0)
    return {
      term_id: term.id,
      term_name: term.name,
      exams: examData,
      totalObtained: termTotal,
      totalMax: termMax,
      percentage: termMax > 0 ? Math.round((termTotal / termMax) * 100) : 0,
    }
  })

  // Attendance for this student
  const { data: attendance } = await supabase
    .from('attendance')
    .select('status, date')
    .eq('student_id', studentId)
    .eq('school_id', schoolId)
    .order('date', { ascending: false })

  const totalDays = attendance?.length ?? 0
  const presentDays = attendance?.filter(a => a.status === 'present').length ?? 0
  const absentDays = attendance?.filter(a => a.status === 'absent').length ?? 0
  const lateDays = attendance?.filter(a => a.status === 'late').length ?? 0

  return {
    student: {
      name: `${stud.profiles?.first_name ?? ''} ${stud.profiles?.last_name ?? ''}`.trim(),
      admission_number: stud.admission_number,
      class_name: stud.classes?.name ?? null,
      avatar_url: stud.profiles?.avatar_url ?? null,
    },
    attendance: {
      totalDays,
      presentDays,
      absentDays,
      lateDays,
      percentage: totalDays > 0 ? Math.round((presentDays / totalDays) * 100) : 0,
    },
    terms: termData,
  }
}

// ─────────────────────────────────────────────────────
// 5. SCHOOL OVERVIEW REPORT
// ─────────────────────────────────────────────────────

const OverviewSchema = z.object({
  academicYearId: z.string().optional(),
})

export async function getSchoolOverviewReport(opts: z.infer<typeof OverviewSchema> = {}): Promise<any> {
  const { supabase, schoolId } = await getAuthContext()
  const { academicYearId } = OverviewSchema.parse(opts)

  const { data: school } = await supabase.from('schools').select('name, logo_url, settings').eq('id', schoolId).single()
  if (!school) throw new Error('School not found')

  const academicYearFilter = academicYearId ? { academic_year_id: academicYearId } : {}
  const currentTerm = academicYearId
    ? (await supabase.from('terms').select('id, name').eq('school_id', schoolId).eq('academic_year_id', academicYearId).eq('is_current', true).maybeSingle()).data
    : (await supabase.from('terms').select('id, name').eq('school_id', schoolId).eq('is_current', true).maybeSingle()).data

  // Total students
  const { count: totalStudents } = await supabase
    .from('students')
    .select('*', { count: 'exact', head: true })
    .eq('school_id', schoolId)
    .eq('is_active', true)

  // Total teachers
  const { count: totalTeachers } = await supabase
    .from('teachers')
    .select('*', { count: 'exact', head: true })
    .eq('school_id', schoolId)
    .eq('is_active', true)

  // Total classes
  const { count: totalClasses } = await supabase
    .from('classes')
    .select('*', { count: 'exact', head: true })
    .eq('school_id', schoolId)

  // Average attendance rate (last 30 days)
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
  const { data: recentAttendance } = await supabase
    .from('attendance')
    .select('status')
    .eq('school_id', schoolId)
    .gte('date', thirtyDaysAgo.toISOString().slice(0, 10))

  const totalAttendance = recentAttendance?.length ?? 0
  const presentAttendance = recentAttendance?.filter(a => a.status === 'present').length ?? 0
  const attendanceRate = totalAttendance > 0 ? Math.round((presentAttendance / totalAttendance) * 100) : 0

  // Fee collection overview (current term or all)
  let feeQuery = supabase
    .from('fee_invoices')
    .select('amount, paid_amount, status')
    .eq('school_id', schoolId)

  const { data: feeData } = await feeQuery

  const totalFeeAmount = (feeData ?? []).reduce((s, i) => s + Number(i.amount), 0)
  const totalFeeCollected = (feeData ?? []).reduce((s, i) => s + Number(i.paid_amount), 0)
  const collectionRate = totalFeeAmount > 0 ? Math.round((totalFeeCollected / totalFeeAmount) * 100) : 0

  // Current term exam pass rate
  if (currentTerm) {
    const { data: termExams } = await supabase
      .from('exams')
      .select('id')
      .eq('school_id', schoolId)
      .eq('term_id', currentTerm.id)
      .eq('is_published', true)

    const termExamIds = (termExams ?? []).map(e => e.id)
    if (termExamIds.length) {
      const { data: termResults } = await supabase
        .from('results')
        .select('marks_obtained, exam_id')
        .in('exam_id', termExamIds)
        .eq('school_id', schoolId)

      const passing = (termResults ?? []).filter(r => Number(r.marks_obtained) >= 40).length
    }
  }

  // Count students enrolled this academic year
  if (academicYearId) {
    const { data: year } = await supabase.from('academic_years').select('start_date, end_date').eq('id', academicYearId).single()
    if (year) {
      const { count: enrolledThisYear } = await supabase
        .from('students')
        .select('*', { count: 'exact', head: true })
        .eq('school_id', schoolId)
        .gte('enrollment_date', year.start_date)
        .lte('enrollment_date', year.end_date)
    }
  }

  return {
    schoolName: school.name,
    logoUrl: school.logo_url,
    currentTerm: currentTerm?.name ?? null,
    kpis: {
      totalStudents: totalStudents ?? 0,
      totalTeachers: totalTeachers ?? 0,
      totalClasses: totalClasses ?? 0,
      attendanceRate,
      collectionRate,
      totalFeeAmount,
      totalFeeCollected,
      totalFeeOutstanding: totalFeeAmount - totalFeeCollected,
    },
  }
}

// ─────────────────────────────────────────────────────
// 6. TEACHER PERFORMANCE REPORT
// ─────────────────────────────────────────────────────

const TeacherPerformanceSchema = z.object({
  termId: z.string().optional(),
})

export async function getTeacherPerformanceReport(opts: z.infer<typeof TeacherPerformanceSchema> = {}): Promise<any> {
  const { supabase, schoolId } = await getAuthContext()
  const { termId } = TeacherPerformanceSchema.parse(opts)

  // Get all teachers
  const { data: teachers } = await supabase
    .from('teachers')
    .select('id, employee_number, department, profiles!inner(first_name, last_name, email, avatar_url)')
    .eq('school_id', schoolId)
    .eq('is_active', true)

  if (!teachers?.length) return { teachers: [] }

  const teacherIds = teachers.map(t => t.id)

  // Get their subjects
  const { data: teacherSubjects } = await supabase
    .from('teacher_subjects')
    .select('*, subjects!inner(id, name, code)')
    .in('teacher_id', teacherIds)
    .eq('school_id', schoolId)

  // Get all terms if no term specified
  let terms: any[] = []
  if (termId) {
    const { data: t } = await supabase.from('terms').select('id, name').eq('id', termId).single()
    if (t) terms = [t]
  } else {
    const { data: t } = await supabase
      .from('terms')
      .select('id, name')
      .eq('school_id', schoolId)
      .eq('is_current', true)
      .maybeSingle()
    if (t) terms = [t]
  }
  if (!terms.length) return { teachers: [] }

  const termIds = terms.map(t => t.id)

  // Get exams for this term
  const { data: exams } = await supabase
    .from('exams')
    .select('id, name, exam_type')
    .in('term_id', termIds)
    .eq('school_id', schoolId)
    .eq('is_published', true)

  const examIds = (exams ?? []).map(e => e.id)

  // Get results
  const { data: allResults } = await supabase
    .from('results')
    .select('student_id, exam_id, subject_id, marks_obtained')
    .in('exam_id', examIds)
    .eq('school_id', schoolId)

  // Build teacher performance
  const teacherRows = teachers.map(t => {
    const tProf = (t as any).profiles
    const subjects = (teacherSubjects ?? []).filter(ts => ts.teacher_id === t.id)
    const subjectIds = subjects.map(s => s.subject_id)

    // Get results for this teacher's subjects
    const relevantResults = (allResults ?? []).filter(r => subjectIds.includes(r.subject_id))

    const totalResults = relevantResults.length
    const passedResults = relevantResults.filter(r => Number(r.marks_obtained) >= 40).length

    // Count classes assigned
    const assignedClasses = new Set(subjects.filter(s => s.section_id).map(s => s.section_id))

    return {
      teacher_id: t.id,
      name: `${tProf?.first_name ?? ''} ${tProf?.last_name ?? ''}`.trim(),
      email: tProf?.email ?? '',
      employee_number: t.employee_number,
      department: t.department,
      avatar_url: tProf?.avatar_url ?? null,
      subjects: subjects.map(s => ({
        subject_id: s.subjects.id,
        name: s.subjects.name,
        code: s.subjects.code,
        section_id: s.section_id,
      })),
      totalStudentsAssigned: assignedClasses.size,
      totalResults,
      passRate: totalResults > 0 ? Math.round((passedResults / totalResults) * 100) : 0,
      averageScore: totalResults > 0
        ? Math.round(relevantResults.reduce((s, r) => s + Number(r.marks_obtained), 0) / totalResults * 100) / 100
        : 0,
    }
  })

  teacherRows.sort((a, b) => b.averageScore - a.averageScore)
  teacherRows.forEach((t, i) => { (t as any).rank = i + 1 })

  return {
    term: terms[0]?.name ?? null,
    teachers: teacherRows,
    summary: {
      totalTeachers: teacherRows.length,
      averagePassRate: teacherRows.length > 0
        ? Math.round(teacherRows.reduce((s, t) => s + t.passRate, 0) / teacherRows.length)
        : 0,
      averageScore: teacherRows.length > 0
        ? Math.round(teacherRows.reduce((s, t) => s + t.averageScore, 0) / teacherRows.length * 100) / 100
        : 0,
    },
  }
}
