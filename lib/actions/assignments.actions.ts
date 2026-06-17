'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function createAssignment(data: {
  title: string
  description: string
  classId: string
  sectionId: string
  subjectId: string
  dueDate: string
  maxMarks: number
  attachments?: { name: string; url: string; size: number; type: string }[]
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data: profile } = await supabase
    .from('profiles')
    .select('school_id, first_name, last_name')
    .eq('id', user.id)
    .single()

  if (!profile?.school_id) throw new Error('School not found')

  const { data: assignment, error } = await supabase
    .from('assignments')
    .insert({
      school_id: profile.school_id,
      teacher_id: user.id,
      class_id: data.classId,
      section_id: data.sectionId,
      subject_id: data.subjectId,
      title: data.title,
      description: data.description,
      due_date: data.dueDate,
      max_marks: data.maxMarks,
      attachments: data.attachments ?? [],
      is_published: true,
    })
    .select('id, title')
    .single()

  if (error) throw new Error(`Failed to create assignment: ${error.message}`)

  const { data: sectionStudents } = await supabase
    .from('students')
    .select('id, profiles(first_name, last_name)')
    .eq('section_id', data.sectionId)
    .eq('is_active', true)

  const { data: classStudents } = await supabase
    .from('students')
    .select('id, profiles(first_name, last_name)')
    .eq('class_id', data.classId)
    .is('section_id', null)
    .eq('is_active', true)

  const allStudents = [
    ...(sectionStudents ?? []),
    ...(classStudents ?? []),
  ]
  const uniqueStudents = Array.from(
    new Map(allStudents.map(s => [s.id, s])).values()
  )

  const { data: subject } = await supabase
    .from('subjects')
    .select('name')
    .eq('id', data.subjectId)
    .single()

  if (uniqueStudents.length > 0) {
    const notifications = uniqueStudents.map(student => ({
      school_id: profile.school_id,
      user_id: student.id,
      title: 'New Assignment Posted',
      body: `${profile.first_name} ${profile.last_name} posted a new assignment: "${data.title}" for ${subject?.name ?? 'your class'}. Due: ${new Date(data.dueDate).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' })}`,
      type: 'info' as const,
      is_read: false,
      action_url: '/student/assignments',
      metadata: {
        assignment_id: assignment.id,
        subject: subject?.name,
        due_date: data.dueDate,
        max_marks: data.maxMarks,
      }
    }))

    await supabase.from('notifications').insert(notifications)

    const studentIds = uniqueStudents.map(s => s.id)
    const { data: parentLinks } = await supabase
      .from('parent_student')
      .select('parent_id, student_id, students(profiles(first_name, last_name))')
      .in('student_id', studentIds)

    if (parentLinks && parentLinks.length > 0) {
      const parentNotifications = parentLinks.map(link => ({
        school_id: profile.school_id,
        user_id: link.parent_id,
        title: 'New Assignment for Your Child',
        body: `A new assignment "${data.title}" has been posted for ${(link.students as any)?.profiles?.first_name ?? 'your child'}. Due: ${new Date(data.dueDate).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' })}`,
        type: 'info' as const,
        is_read: false,
        action_url: '/parent',
        metadata: {
          assignment_id: assignment.id,
          student_id: link.student_id,
        }
      }))
      await supabase.from('notifications').insert(parentNotifications)
    }
  }

  revalidatePath('/teacher/assignments')
  return { success: true, assignmentId: assignment.id }
}

export async function getTeacherAssignments(): Promise<any> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data, error } = await supabase
    .from('assignments')
    .select(`
      id, title, description, due_date, max_marks,
      is_published, attachments, created_at,
      subjects ( id, name, code ),
      classes ( id, name, level ),
      sections ( id, name ),
      submissions ( id, status, marks )
    `)
    .eq('teacher_id', user.id)
    .order('created_at', { ascending: false })

  if (error) throw error

  return (data ?? []).map(a => ({
    ...a,
    submission_count: a.submissions?.length ?? 0,
    graded_count: a.submissions?.filter(
      (s: any) => s.status === 'graded'
    ).length ?? 0,
    pending_count: a.submissions?.filter(
      (s: any) => s.status === 'submitted'
    ).length ?? 0,
    is_overdue: new Date(a.due_date) < new Date(),
  }))
}

export async function getAssignmentSubmissions(assignmentId: string): Promise<any> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('submissions')
    .select(`
      id, content, attachments, submitted_at,
      marks, feedback, status, graded_at,
      students (
        id, admission_number,
        profiles ( first_name, last_name, avatar_url )
      )
    `)
    .eq('assignment_id', assignmentId)
    .order('submitted_at', { ascending: false })

  if (error) throw error
  return data ?? []
}

export async function gradeSubmission(
  submissionId: string,
  marks: number,
  feedback: string
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data: submission } = await supabase
    .from('submissions')
    .select('student_id, assignments(title, max_marks, school_id)')
    .eq('id', submissionId)
    .single()

  const { error } = await supabase
    .from('submissions')
    .update({
      marks,
      feedback,
      status: 'graded',
      graded_by: user.id,
      graded_at: new Date().toISOString(),
    })
    .eq('id', submissionId)

  if (error) throw error

  const assignment = (submission?.assignments as any)
  await supabase.from('notifications').insert({
    school_id: assignment?.school_id,
    user_id: submission?.student_id,
    title: 'Assignment Graded',
    body: `Your submission for "${assignment?.title}" has been graded. You scored ${marks}/${assignment?.max_marks}.`,
    type: 'success',
    is_read: false,
    action_url: '/student/assignments',
    metadata: { submission_id: submissionId, marks, max_marks: assignment?.max_marks }
  })

  revalidatePath('/teacher/assignments')
  return { success: true }
}
