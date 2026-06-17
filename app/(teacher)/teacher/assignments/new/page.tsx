'use client'

import { useTeacherClassesRealtime } from '@/lib/hooks/useTeacherClasses'
import { useQuery, useMutation } from '@tanstack/react-query'
import { getSubjectsByClass } from '@/lib/actions/teacher'
import { createAssignment } from '@/lib/actions/assignments.actions'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useState } from 'react'
import { format } from 'date-fns'
import { toast } from 'sonner'

const assignmentSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters'),
  description: z.string().min(10, 'Please provide assignment description'),
  class_section_key: z.string().min(1, 'Please select a class'),
  subject_id: z.string().uuid('Please select a subject'),
  due_date: z.string().min(1, 'Please set a due date'),
  due_time: z.string().min(1, 'Please set a due time'),
  max_marks: z.coerce.number().min(1).max(1000),
  instructions: z.string().optional(),
})

type AssignmentFormData = z.infer<typeof assignmentSchema>

export default function CreateAssignmentPage() {
  const router = useRouter()
  const [selectedClassKey, setSelectedClassKey] = useState<string>('')

  const {
    data: myClasses,
    isLoading: classesLoading,
    error: classesError,
  } = useTeacherClassesRealtime()

  const selectedClass = myClasses?.find(
    (c: any) => `${c.class_id}|${c.section_id}` === selectedClassKey
  )

  const { data: subjects, isLoading: subjectsLoading } = useQuery({
    queryKey: ['class-subjects', selectedClass?.class_id],
    enabled: !!selectedClass?.class_id,
    queryFn: () => getSubjectsByClass(selectedClass!.class_id),
  })

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<AssignmentFormData>({
    resolver: zodResolver(assignmentSchema),
    defaultValues: { max_marks: 100 },
  })

  const createMutation = useMutation({
    mutationFn: async (formData: AssignmentFormData) => {
      const dueDateTime = new Date(
        `${formData.due_date}T${formData.due_time}:00`
      ).toISOString()

      await createAssignment({
        title: formData.title,
        description: formData.description,
        classId: selectedClass!.class_id,
        sectionId: selectedClass!.section_id,
        subjectId: formData.subject_id,
        dueDate: dueDateTime,
        maxMarks: formData.max_marks,
      })
    },
    onSuccess: () => {
      toast.success('Assignment created')
      router.push('/teacher/assignments')
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const onSubmit = (formData: AssignmentFormData) => {
    createMutation.mutate(formData)
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <button
          onClick={() => router.back()}
          className="text-gray-500 hover:text-gray-700"
        >
          ← Back
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Create Assignment
          </h1>
          <p className="text-sm text-gray-500">
            Create a new assignment for your students
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">

        {/* STEP 1: SELECT CLASS */}
        <div className="bg-white rounded-xl border p-6 space-y-4">
          <h2 className="font-semibold text-gray-900 flex items-center gap-2">
            <span className="bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs">1</span>
            Select Class
          </h2>

          {classesLoading && (
            <div className="h-12 bg-gray-100 rounded-lg animate-pulse" />
          )}

          {classesError && (
            <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm">
              Failed to load your classes. Please refresh the page.
            </div>
          )}

          {!classesLoading && !classesError && (
            <>
              {!myClasses || myClasses.length === 0 ? (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                  <p className="text-amber-800 font-medium text-sm">
                    No classes assigned to you yet
                  </p>
                  <p className="text-amber-700 text-xs mt-1">
                    Contact your school admin to assign you to a class
                    before creating assignments.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">
                    Which class is this assignment for? *
                  </label>
                  <select
                    className="w-full border border-gray-300 rounded-lg px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    value={selectedClassKey}
                    onChange={(e) => {
                      setSelectedClassKey(e.target.value)
                      setValue('class_section_key', e.target.value)
                      setValue('subject_id', '')
                    }}
                  >
                    <option value="">— Select a class —</option>
                    {myClasses.map((cls: any) => (
                      <option
                        key={`${cls.class_id}|${cls.section_id}`}
                        value={`${cls.class_id}|${cls.section_id}`}
                      >
                        {cls.class_name} — {cls.section_name}
                        {cls.is_class_teacher ? ' (Class Teacher)' : ''}
                        {cls.room ? ` · Room ${cls.room}` : ''}
                        · {cls.student_count} students
                      </option>
                    ))}
                  </select>
                  {errors.class_section_key && (
                    <p className="text-red-500 text-xs">
                      {errors.class_section_key.message}
                    </p>
                  )}

                  {selectedClass && (
                    <div className="mt-2 p-3 bg-blue-50 rounded-lg flex items-center gap-3">
                      <div className="bg-blue-600 text-white rounded-lg p-2 text-sm font-bold">
                        {selectedClass.class_name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-medium text-blue-900 text-sm">
                          {selectedClass.class_name} — {selectedClass.section_name}
                        </p>
                        <p className="text-blue-700 text-xs">
                          {selectedClass.student_count} students enrolled
                          {selectedClass.room && ` · Room ${selectedClass.room}`}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* STEP 2: SELECT SUBJECT */}
        {selectedClass && (
          <div className="bg-white rounded-xl border p-6 space-y-4">
            <h2 className="font-semibold text-gray-900 flex items-center gap-2">
              <span className="bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs">2</span>
              Select Subject
            </h2>

            {subjectsLoading ? (
              <div className="h-12 bg-gray-100 rounded-lg animate-pulse" />
            ) : subjects?.length === 0 ? (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                <p className="text-amber-800 font-medium text-sm">No subjects found for this class.</p>
                <p className="text-amber-700 text-xs mt-1">Ask your school admin to add subjects first.</p>
              </div>
            ) : (
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  Which subject? *
                </label>
                <select
                  {...register('subject_id')}
                  className="w-full border border-gray-300 rounded-lg px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="">— Select a subject —</option>
                  {subjects?.map((sub: any) => (
                    <option key={sub.id} value={sub.id}>
                      {sub.name}{sub.code ? ` (${sub.code})` : ''}
                    </option>
                  ))}
                </select>
                {errors.subject_id && (
                  <p className="text-red-500 text-xs">
                    {errors.subject_id.message}
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {/* STEP 3: ASSIGNMENT DETAILS */}
        {selectedClass && (
          <div className="bg-white rounded-xl border p-6 space-y-4">
            <h2 className="font-semibold text-gray-900 flex items-center gap-2">
              <span className="bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs">3</span>
              Assignment Details
            </h2>

            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700">
                Assignment Title *
              </label>
              <input
                {...register('title')}
                placeholder="e.g. Chapter 3 Review Questions"
                className="w-full border border-gray-300 rounded-lg px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {errors.title && (
                <p className="text-red-500 text-xs">{errors.title.message}</p>
              )}
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700">
                Description / Instructions *
              </label>
              <textarea
                {...register('description')}
                rows={4}
                placeholder="Describe the assignment in detail..."
                className="w-full border border-gray-300 rounded-lg px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
              {errors.description && (
                <p className="text-red-500 text-xs">
                  {errors.description.message}
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">
                  Due Date *
                </label>
                <input
                  {...register('due_date')}
                  type="date"
                  min={format(new Date(), 'yyyy-MM-dd')}
                  className="w-full border border-gray-300 rounded-lg px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {errors.due_date && (
                  <p className="text-red-500 text-xs">
                    {errors.due_date.message}
                  </p>
                )}
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">
                  Due Time *
                </label>
                <input
                  {...register('due_time')}
                  type="time"
                  defaultValue="23:59"
                  className="w-full border border-gray-300 rounded-lg px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {errors.due_time && (
                  <p className="text-red-500 text-xs">
                    {errors.due_time.message}
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700">
                Maximum Marks *
              </label>
              <input
                {...register('max_marks')}
                type="number"
                min={1}
                max={1000}
                className="w-full border border-gray-300 rounded-lg px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {errors.max_marks && (
                <p className="text-red-500 text-xs">
                  {errors.max_marks.message}
                </p>
              )}
            </div>
          </div>
        )}

        {/* SUBMIT */}
        {selectedClass && (
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => router.back()}
              className="flex-1 border border-gray-300 text-gray-700 rounded-lg py-3 text-sm font-medium hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || createMutation.isPending}
              className="flex-1 bg-blue-600 text-white rounded-lg py-3 text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting || createMutation.isPending
                ? 'Creating Assignment...'
                : `Create Assignment for ${selectedClass.class_name} — ${selectedClass.section_name}`}
            </button>
          </div>
        )}
      </form>
    </div>
  )
}
