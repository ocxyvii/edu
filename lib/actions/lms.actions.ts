'use server'

import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

async function getTeacherContext() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  const { data: profile } = await supabase
    .from('profiles')
    .select('school_id')
    .eq('id', user.id)
    .single()
  if (!profile?.school_id) throw new Error('No school assigned')
  return { userId: user.id, schoolId: profile.school_id, supabase }
}

async function getStudentContext() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  const { data: profile } = await supabase
    .from('profiles')
    .select('*, students!id(*)')
    .eq('id', user.id)
    .single()
  if (!profile) throw new Error('Profile not found')
  const student = (profile as any).students
  if (!student) throw new Error('Student record not found')
  return {
    userId: user.id,
    schoolId: student.school_id,
    studentId: student.id,
    classId: student.class_id,
    supabase,
  }
}

const CreateCourseSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  subject_id: z.string().min(1),
  class_id: z.string().min(1),
  description: z.string().optional(),
})

const UpdateCourseSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  is_published: z.boolean().optional(),
})

const AddMaterialSchema = z.object({
  course_id: z.string().min(1),
  title: z.string().min(1, 'Title is required'),
  type: z.enum(['video', 'document', 'link', 'quiz', 'audio']),
  content_url: z.string().optional(),
  content: z.string().optional(),
  duration: z.number().int().positive().optional(),
})

const CreateQuizSchema = z.object({
  course_id: z.string().min(1),
  title: z.string().min(1),
  questions: z.array(z.object({
    question_text: z.string().min(1),
    question_type: z.enum(['mcq', 'true_false', 'short_answer']),
    options: z.array(z.string()).optional(),
    correct_answer: z.string().min(1),
    marks: z.number().int().positive().default(1),
  })).min(1),
})

const SubmitQuizSchema = z.object({
  quiz_id: z.string().min(1),
  answers: z.record(z.string()),
})

// ── Teacher Course Management ─────────────────────────────────

export async function createCourse(data: z.infer<typeof CreateCourseSchema>) {
  const { supabase, userId, schoolId } = await getTeacherContext()
  const parsed = CreateCourseSchema.parse(data)

  const { data: course, error } = await supabase
    .from('courses')
    .insert({
      school_id: schoolId,
      teacher_id: userId,
      title: parsed.title,
      subject_id: parsed.subject_id,
      class_id: parsed.class_id,
      description: parsed.description || null,
      is_published: false,
    })
    .select('id, title')
    .single()

  if (error) throw new Error(error.message)
  revalidatePath('/teacher/courses')
  return course
}

export async function updateCourse(id: string, data: z.infer<typeof UpdateCourseSchema>) {
  const { supabase, schoolId } = await getTeacherContext()
  const parsed = UpdateCourseSchema.parse(data)

  const { error } = await supabase
    .from('courses')
    .update(parsed)
    .eq('id', id)
    .eq('school_id', schoolId)

  if (error) throw new Error(error.message)
  revalidatePath(`/teacher/courses/${id}`)
  revalidatePath('/teacher/courses')
}

export async function getTeacherCourses() {
  const { supabase, userId, schoolId } = await getTeacherContext()

  const { data: courses } = await supabase
    .from('courses')
    .select(`
      *,
      subjects!inner(name, code),
      classes!left(name, level),
      teacher_subjects!inner(subject_id)
    `)
    .eq('school_id', schoolId)
    .eq('teacher_id', userId)
    .order('created_at', { ascending: false })

  const courseIds = courses?.map(c => c.id) ?? []
  if (!courseIds.length) return []

  const { data: materials } = await supabase
    .from('course_materials')
    .select('course_id, id')
    .in('course_id', courseIds)

  const matCount = (materials ?? []).reduce<Record<string, number>>((acc, m) => {
    acc[m.course_id] = (acc[m.course_id] || 0) + 1
    return acc
  }, {})

  return (courses ?? []).map(c => ({
    ...c,
    materials_count: matCount[c.id] || 0,
  }))
}

export async function getCourse(id: string) {
  const { supabase, schoolId } = await getTeacherContext()

  const { data: course, error } = await supabase
    .from('courses')
    .select('*, subjects!inner(name, code), classes!left(name, level)')
    .eq('id', id)
    .eq('school_id', schoolId)
    .single()

  if (error) throw new Error(error.message)

  const { data: materials } = await supabase
    .from('course_materials')
    .select('*')
    .eq('course_id', id)
    .order('order_index', { ascending: true })

  return { ...course, materials: materials ?? [] }
}

export async function getTeachersSubjects() {
  const { supabase, userId, schoolId } = await getTeacherContext()

  const { data } = await supabase
    .from('teacher_subjects')
    .select('subject_id, subjects!inner(id, name, code)')
    .eq('school_id', schoolId)
    .eq('teacher_id', userId)

  return data?.map((ts: any) => ts.subjects) ?? []
}

export async function getTeachersClassesForSubject(subjectId: string) {
  const { supabase, userId, schoolId } = await getTeacherContext()

  const { data: subjects } = await supabase
    .from('subjects')
    .select('class_id, classes!inner(id, name, level)')
    .eq('id', subjectId)
    .eq('school_id', schoolId)
    .single()

  if (!subjects?.class_id) return []
  return [subjects.classes]
}

export async function getClassesForSchool() {
  const { supabase, schoolId } = await getTeacherContext()

  const { data } = await supabase
    .from('classes')
    .select('id, name, level')
    .eq('school_id', schoolId)
    .order('level', { ascending: true })

  return data ?? []
}

// ── Material Management ───────────────────────────────────────

export async function addMaterial(data: z.infer<typeof AddMaterialSchema>) {
  const { supabase, schoolId } = await getTeacherContext()
  const parsed = AddMaterialSchema.parse(data)

  const { data: maxOrder } = await supabase
    .from('course_materials')
    .select('order_index')
    .eq('course_id', parsed.course_id)
    .order('order_index', { ascending: false })
    .limit(1)
    .single()

  const nextOrder = (maxOrder?.order_index ?? -1) + 1

  const { data: material, error } = await supabase
    .from('course_materials')
    .insert({
      course_id: parsed.course_id,
      school_id: schoolId,
      title: parsed.title,
      type: parsed.type,
      content_url: parsed.content_url || null,
      content: parsed.content || null,
      duration: parsed.duration || null,
      order_index: nextOrder,
    })
    .select('id, title')
    .single()

  if (error) throw new Error(error.message)
  revalidatePath(`/teacher/courses/${parsed.course_id}`)
  return material
}

export async function updateMaterial(id: string, data: {
  title?: string
  content_url?: string
  content?: string
  type?: string
  duration?: number
  is_published?: boolean
}) {
  const { supabase, schoolId } = await getTeacherContext()

  const { data: material } = await supabase
    .from('course_materials')
    .select('course_id')
    .eq('id', id)
    .single()

  if (!material) throw new Error('Material not found')

  const { error } = await supabase
    .from('course_materials')
    .update(data)
    .eq('id', id)
    .eq('school_id', schoolId)

  if (error) throw new Error(error.message)
  revalidatePath(`/teacher/courses/${material.course_id}`)
}

export async function deleteMaterial(id: string) {
  const { supabase, schoolId } = await getTeacherContext()

  const { data: material } = await supabase
    .from('course_materials')
    .select('course_id')
    .eq('id', id)
    .single()

  if (!material) throw new Error('Material not found')

  const { error } = await supabase
    .from('course_materials')
    .delete()
    .eq('id', id)
    .eq('school_id', schoolId)

  if (error) throw new Error(error.message)
  revalidatePath(`/teacher/courses/${material.course_id}`)
}

export async function reorderMaterials(orderedIds: string[]) {
  const { supabase } = await getTeacherContext()

  const updates = orderedIds.map((id, index) =>
    supabase
      .from('course_materials')
      .update({ order_index: index })
      .eq('id', id)
  )

  await Promise.all(updates)
}

export async function uploadMaterialFile(formData: FormData) {
  const file = formData.get('file') as File | null
  if (!file) throw new Error('No file provided')

  const supabase = await createClient()

  const ext = file.name.split('.').pop()?.toLowerCase() || 'bin'
  const fileName = `course-materials/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

  const { data, error } = await supabase.storage
    .from('course-files')
    .upload(fileName, file, { contentType: file.type })

  if (error) throw new Error(`Upload failed: ${error.message}`)

  const { data: { publicUrl } } = supabase.storage
    .from('course-files')
    .getPublicUrl(data.path)

  return { url: publicUrl, name: file.name, type: file.type }
}

// ── Quiz Management ───────────────────────────────────────────

export async function createQuiz(data: z.infer<typeof CreateQuizSchema>) {
  const { supabase, schoolId, userId } = await getTeacherContext()
  const parsed = CreateQuizSchema.parse(data)

  const { data: maxOrder } = await supabase
    .from('course_materials')
    .select('order_index')
    .eq('course_id', parsed.course_id)
    .order('order_index', { ascending: false })
    .limit(1)
    .single()

  const nextOrder = (maxOrder?.order_index ?? -1) + 1

  const quizContent = JSON.stringify({
    questions: parsed.questions,
    total_marks: parsed.questions.reduce((sum, q) => sum + q.marks, 0),
  })

  const { data: material, error } = await supabase
    .from('course_materials')
    .insert({
      course_id: parsed.course_id,
      school_id: schoolId,
      title: parsed.title,
      type: 'quiz',
      content: quizContent,
      order_index: nextOrder,
    })
    .select('id')
    .single()

  if (error) throw new Error(error.message)
  revalidatePath(`/teacher/courses/${parsed.course_id}`)
  return material
}

export async function submitQuiz(data: z.infer<typeof SubmitQuizSchema>) {
  const { supabase, schoolId, studentId } = await getStudentContext()
  const parsed = SubmitQuizSchema.parse(data)

  const { data: material } = await supabase
    .from('course_materials')
    .select('content, course_id')
    .eq('id', parsed.quiz_id)
    .eq('school_id', schoolId)
    .single()

  if (!material) throw new Error('Quiz not found')

  const quiz = JSON.parse(material.content || '{}')
  const questions = quiz.questions ?? []

  let totalMarks = 0
  let earnedMarks = 0
  const results = questions.map((q: any) => {
    totalMarks += q.marks
    const studentAnswer = parsed.answers[q.question_text]?.trim().toLowerCase() || ''
    const correctAnswer = q.correct_answer?.trim().toLowerCase() || ''
    const isCorrect = studentAnswer === correctAnswer
    if (isCorrect) earnedMarks += q.marks
    return {
      question_text: q.question_text,
      correct_answer: q.correct_answer,
      student_answer: parsed.answers[q.question_text] || '',
      is_correct: isCorrect,
      marks: q.marks,
    }
  })

  const score = totalMarks > 0 ? Math.round((earnedMarks / totalMarks) * 100) : 0

  const { error: progressError } = await supabase
    .from('student_progress')
    .upsert({
      student_id: studentId,
      material_id: parsed.quiz_id,
      school_id: schoolId,
      progress: 100,
      completed: true,
      last_accessed_at: new Date().toISOString(),
    }, { onConflict: 'student_id,material_id' })

  if (progressError) throw new Error(progressError.message)

  return {
    score,
    earnedMarks,
    totalMarks,
    results,
    passed: score >= 50,
  }
}

export async function getQuestionsForSubject(subjectId: string) {
  const { supabase, schoolId } = await getTeacherContext()

  const { data } = await supabase
    .from('question_bank')
    .select('id, question_text, question_type, options, correct_answer, marks, difficulty, topic')
    .eq('school_id', schoolId)
    .eq('subject_id', subjectId)
    .eq('is_active', true)
    .order('created_at', { ascending: false })

  return data ?? []
}

// ── Student Course Access ─────────────────────────────────────

export async function getStudentCourses() {
  const { supabase, schoolId, classId } = await getStudentContext()

  const { data: courses } = await supabase
    .from('courses')
    .select('*, subjects!inner(name, code), classes!left(name, level)')
    .eq('school_id', schoolId)
    .eq('class_id', classId)
    .eq('is_published', true)
    .order('created_at', { ascending: false })

  const courseIds = courses?.map(c => c.id) ?? []
  if (!courseIds.length) return []

  const { data: materials } = await supabase
    .from('course_materials')
    .select('course_id, id')
    .in('course_id', courseIds)

  const matCount = (materials ?? []).reduce<Record<string, number>>((acc, m) => {
    acc[m.course_id] = (acc[m.course_id] || 0) + 1
    return acc
  }, {})

  return (courses ?? []).map(c => ({
    ...c,
    materials_count: matCount[c.id] || 0,
  }))
}

export async function getStudentCourseDetail(courseId: string) {
  const { supabase, schoolId, studentId, classId } = await getStudentContext()

  const { data: course, error } = await supabase
    .from('courses')
    .select('*, subjects!inner(name, code), classes!left(name, level)')
    .eq('id', courseId)
    .eq('school_id', schoolId)
    .eq('is_published', true)
    .single()

  if (error) throw new Error('Course not found')

  const { data: materials } = await supabase
    .from('course_materials')
    .select('*')
    .eq('course_id', courseId)
    .eq('is_published', true)
    .order('order_index', { ascending: true })

  const materialIds = (materials ?? []).map(m => m.id)

  const { data: progress } = await supabase
    .from('student_progress')
    .select('*')
    .eq('student_id', studentId)
    .in('material_id', materialIds)

  const progressMap = (progress ?? []).reduce<Record<string, any>>((acc, p) => {
    acc[p.material_id] = p
    return acc
  }, {})

  const materialsWithProgress = (materials ?? []).map(m => ({
    ...m,
    progress: progressMap[m.id] || null,
  }))

  const completed = materialsWithProgress.filter(m => m.progress?.completed).length
  const total = materialsWithProgress.length

  return {
    ...course,
    materials: materialsWithProgress,
    progress_summary: {
      completed,
      total,
      percent: total > 0 ? Math.round((completed / total) * 100) : 0,
    },
  }
}

export async function getStudentCourseProgress(courseId: string) {
  const { supabase, schoolId, studentId } = await getStudentContext()

  const { data: materials } = await supabase
    .from('course_materials')
    .select('id, title')
    .eq('course_id', courseId)
    .eq('school_id', schoolId)
    .eq('is_published', true)
    .order('order_index', { ascending: true })

  const materialIds = materials?.map(m => m.id) ?? []
  if (!materialIds.length) return { materials: [], progress: {}, completed: 0, total: 0, percent: 0 }

  const { data: progress } = await supabase
    .from('student_progress')
    .select('*')
    .eq('student_id', studentId)
    .in('material_id', materialIds)

  const progressMap = (progress ?? []).reduce<Record<string, any>>((acc, p) => {
    acc[p.material_id] = p
    return acc
  }, {})

  const completed = (progress ?? []).filter(p => p.completed).length
  const total = materialIds.length

  return {
    materials: materials ?? [],
    progress: progressMap,
    completed,
    total,
    percent: total > 0 ? Math.round((completed / total) * 100) : 0,
  }
}

export async function markMaterialComplete(materialId: string) {
  const { supabase, schoolId, studentId } = await getStudentContext()

  const { error } = await supabase
    .from('student_progress')
    .upsert({
      student_id: studentId,
      material_id: materialId,
      school_id: schoolId,
      progress: 100,
      completed: true,
      last_accessed_at: new Date().toISOString(),
    }, { onConflict: 'student_id,material_id' })

  if (error) throw new Error(error.message)
}

export async function trackProgress(materialId: string, progressPercent: number) {
  const { supabase, schoolId, studentId } = await getStudentContext()

  const clamped = Math.min(100, Math.max(0, progressPercent))

  const { error } = await supabase
    .from('student_progress')
    .upsert({
      student_id: studentId,
      material_id: materialId,
      school_id: schoolId,
      progress: clamped,
      completed: clamped >= 100,
      last_accessed_at: new Date().toISOString(),
    }, { onConflict: 'student_id,material_id' })

  if (error) throw new Error(error.message)
}

export async function getTeachersWithSubjects() {
  const { supabase, schoolId } = await getTeacherContext()

  const { data } = await supabase
    .from('teacher_subjects')
    .select('teacher_id, profiles!inner(id, first_name, last_name), subjects!inner(id, name, code)')
    .eq('school_id', schoolId)

  return data ?? []
}
