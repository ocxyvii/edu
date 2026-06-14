'use client'

import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'

export default function TeacherDebugPage() {
  const supabase = createClient()

  const { data: user, isLoading: userLoading } = useQuery({
    queryKey: ['debug-user'],
    queryFn: async () => {
      const { data } = await supabase.auth.getUser()
      return data.user
    },
  })

  const { data: profile } = useQuery({
    queryKey: ['debug-profile', user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user!.id)
        .single()
      return data
    },
  })

  const { data: teachersRecord } = useQuery({
    queryKey: ['debug-teachers', user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from('teachers')
        .select('*')
        .eq('user_id', user!.id)
        .maybeSingle()
      return data
    },
  })

  const { data: teacherSubjects } = useQuery({
    queryKey: ['debug-teacher-subjects', user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from('teacher_subjects')
        .select('*, subjects(id, name, code), sections(id, name)')
        .eq('teacher_id', user!.id)
      return data ?? []
    },
  })

  const { data: ctSections } = useQuery({
    queryKey: ['debug-ct-sections', user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from('sections')
        .select('*, classes(id, name, level)')
        .eq('class_teacher_id', user!.id)
      return data ?? []
    },
  })

  const { data: allTeacherSections } = useQuery({
    queryKey: ['debug-all-sections', profile?.school_id],
    enabled: !!profile?.school_id,
    queryFn: async () => {
      const { data } = await supabase
        .from('sections')
        .select('id, name, class_teacher_id, class_id, classes(id, name, level)')
        .eq('school_id', profile!.school_id)
      return data ?? []
    },
  })

  if (userLoading) return <Skeleton className="h-96 w-full" />

  return (
    <div className="space-y-8 p-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Teacher Debug</h1>
          <p className="text-sm text-gray-500">Diagnostic info for class-teacher linking</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
          Refresh
        </Button>
      </div>

      {/* User / Profile */}
      <Card>
        <CardHeader><CardTitle className="text-base">Authenticated User</CardTitle></CardHeader>
        <CardContent className="text-sm space-y-1 font-mono">
          <p><strong>ID:</strong> {user?.id ?? '—'}</p>
          <p><strong>Email:</strong> {user?.email ?? '—'}</p>
          <p><strong>Profile:</strong> {profile ? JSON.stringify(profile, null, 2) : 'No profile'}</p>
        </CardContent>
      </Card>

      {/* teachers table */}
      <Card>
        <CardHeader><CardTitle className="text-base">Teachers Record</CardTitle></CardHeader>
        <CardContent className="text-sm font-mono">
          {teachersRecord ? (
            <pre className="whitespace-pre-wrap">{JSON.stringify(teachersRecord, null, 2)}</pre>
          ) : (
            <p className="text-red-600">No record in teachers table!</p>
          )}
        </CardContent>
      </Card>

      {/* Sections where class_teacher_id matches */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            Sections (class_teacher_id)
            <Badge variant="outline">{ctSections?.length ?? 0}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm font-mono">
          {ctSections?.length ? (
            <pre className="whitespace-pre-wrap">{JSON.stringify(ctSections, null, 2)}</pre>
          ) : (
            <p className="text-amber-600">No sections found where class_teacher_id matches this user.</p>
          )}
        </CardContent>
      </Card>

      {/* teacher_subjects records */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            Teacher Subjects
            <Badge variant="outline">{teacherSubjects?.length ?? 0}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm font-mono">
          {teacherSubjects?.length ? (
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b">
                  <th className="py-1 pr-2">Subject</th>
                  <th className="py-1 pr-2">Section ID</th>
                  <th className="py-1 pr-2">Section Name</th>
                  <th className="py-1 pr-2">Has Section?</th>
                </tr>
              </thead>
              <tbody>
                {teacherSubjects.map((ts: any) => (
                  <tr key={ts.id} className="border-b border-gray-100">
                    <td className="py-1 pr-2">{ts.subjects?.name ?? ts.subject_id}</td>
                    <td className="py-1 pr-2 font-mono text-[10px]">{ts.section_id ?? 'NULL'}</td>
                    <td className="py-1 pr-2">{ts.sections?.name ?? '—'}</td>
                    <td className="py-1">
                      {ts.section_id ? (
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Yes</Badge>
                      ) : (
                        <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">NO</Badge>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="text-amber-600">No teacher_subjects records for this user.</p>
          )}
        </CardContent>
      </Card>

      {/* All sections in school (for comparison) */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            All Sections in School
            <Badge variant="outline">{allTeacherSections?.length ?? 0}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm font-mono">
          {allTeacherSections?.length ? (
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b">
                  <th className="py-1 pr-2">Section</th>
                  <th className="py-1 pr-2">Class</th>
                  <th className="py-1 pr-2">class_teacher_id</th>
                  <th className="py-1 pr-2">Matches User?</th>
                </tr>
              </thead>
              <tbody>
                {allTeacherSections.map((sec: any) => (
                  <tr key={sec.id} className="border-b border-gray-100">
                    <td className="py-1 pr-2">{sec.name}</td>
                    <td className="py-1 pr-2">{sec.classes?.name ?? sec.class_id}</td>
                    <td className="py-1 pr-2 font-mono text-[10px]">{sec.class_teacher_id ?? 'NULL'}</td>
                    <td className="py-1">
                      {sec.class_teacher_id === user?.id ? (
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">MATCH</Badge>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="text-gray-500">No sections found for this school.</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
