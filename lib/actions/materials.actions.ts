'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function uploadMaterial(data: {
  courseId?: string
  classId: string
  sectionId: string
  subjectId: string
  title: string
  type: 'document' | 'video' | 'link' | 'audio'
  contentUrl?: string
  file?: File
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data: profile } = await supabase
    .from('profiles')
    .select('school_id, first_name, last_name')
    .eq('id', user.id)
    .single()

  let contentUrl = data.contentUrl ?? ''

  if (data.file) {
    const filePath = `materials/${profile!.school_id}/${data.classId}/${Date.now()}_${data.file.name}`

    const { error: uploadError } = await supabase
      .storage
      .from('educore-files')
      .upload(filePath, data.file, {
        cacheControl: '3600',
        upsert: false,
      })

    if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`)

    const { data: urlData } = supabase
      .storage
      .from('educore-files')
      .getPublicUrl(filePath)

    contentUrl = urlData.publicUrl
  }

  let courseId = data.courseId
  if (!courseId) {
    const { data: existingCourse } = await supabase
      .from('courses')
      .select('id')
      .eq('teacher_id', user.id)
      .eq('class_id', data.classId)
      .eq('subject_id', data.subjectId)
      .eq('school_id', profile!.school_id)
      .maybeSingle()

    if (existingCourse) {
      courseId = existingCourse.id
    } else {
      const { data: subject } = await supabase
        .from('subjects')
        .select('name')
        .eq('id', data.subjectId)
        .single()

      const { data: newCourse } = await supabase
        .from('courses')
        .insert({
          school_id: profile!.school_id,
          subject_id: data.subjectId,
          teacher_id: user.id,
          class_id: data.classId,
          title: `${subject?.name ?? 'Course'} Materials`,
          is_published: true,
        })
        .select('id')
        .single()

      courseId = newCourse?.id
    }
  }

  const { data: lastMaterial } = await supabase
    .from('course_materials')
    .select('order_index')
    .eq('course_id', courseId!)
    .order('order_index', { ascending: false })
    .limit(1)
    .maybeSingle()

  const nextIndex = (lastMaterial?.order_index ?? 0) + 1

  const { data: material, error } = await supabase
    .from('course_materials')
    .insert({
      course_id: courseId!,
      school_id: profile!.school_id,
      title: data.title,
      type: data.type,
      content_url: contentUrl,
      order_index: nextIndex,
      is_published: true,
    })
    .select('id, title')
    .single()

  if (error) throw new Error(`Failed to save material: ${error.message}`)

  const { data: sectionStudents } = await supabase
    .from('students')
    .select('id')
    .eq('section_id', data.sectionId)
    .eq('is_active', true)

  const { data: classStudents } = await supabase
    .from('students')
    .select('id')
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
    const typeLabel: Record<string, string> = {
      document: 'Document',
      video: 'Video',
      link: 'Link',
      audio: 'Audio',
    }

    const notifications = uniqueStudents.map(student => ({
      school_id: profile!.school_id,
      user_id: student.id,
      title: 'New Learning Material Available',
      body: `${typeLabel[data.type] ?? 'Material'}: "${data.title}" has been uploaded for ${subject?.name ?? 'your class'} by ${profile!.first_name} ${profile!.last_name}.`,
      type: 'info' as const,
      is_read: false,
      action_url: '/student/materials',
      metadata: {
        material_id: material.id,
        course_id: courseId,
        type: data.type,
      }
    }))

    await supabase.from('notifications').insert(notifications)
  }

  revalidatePath('/teacher/materials')
  return { success: true, materialId: material.id, courseId }
}

export async function getClassMaterials(
  classId: string,
  sectionId?: string
): Promise<any> {
  const supabase = await createClient()

  const { data: courses, error } = await supabase
    .from('courses')
    .select(`
      id, title, description, is_published, created_at,
      subjects ( id, name, code ),
      teachers (
        profiles ( first_name, last_name, avatar_url )
      ),
      course_materials (
        id, title, type, content_url,
        order_index, is_published, created_at
      )
    `)
    .eq('class_id', classId)
    .eq('is_published', true)
    .order('created_at', { ascending: false })

  if (error) throw error

  return (courses ?? []).map(course => ({
    ...course,
    materials: (course.course_materials ?? [])
      .filter((m: any) => m.is_published)
      .sort((a: any, b: any) => a.order_index - b.order_index),
    material_count: course.course_materials?.filter(
      (m: any) => m.is_published
    ).length ?? 0,
  }))
}
