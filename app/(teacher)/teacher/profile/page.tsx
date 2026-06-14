'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getTeacherProfile, updateTeacherProfile } from '@/lib/actions/teacher'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import { Save } from 'lucide-react'

export default function TeacherProfilePage() {
  const queryClient = useQueryClient()
  const [editing, setEditing] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['teacher-profile'],
    queryFn: () => getTeacherProfile(),
  })

  const [form, setForm] = useState({ first_name: '', last_name: '', phone: '', avatar_url: '' })

  const profile = data?.profile
  const teacher = data?.teacher

  const mutation = useMutation({
    mutationFn: () => updateTeacherProfile(form),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teacher-profile'] })
      setEditing(false)
      toast.success('Profile updated')
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const startEditing = () => {
    setForm({
      first_name: profile?.first_name ?? '',
      last_name: profile?.last_name ?? '',
      phone: profile?.phone ?? '',
      avatar_url: profile?.avatar_url ?? '',
    })
    setEditing(true)
  }

  const initials = profile
    ? `${profile.first_name?.[0] ?? ''}${profile.last_name?.[0] ?? ''}`.toUpperCase()
    : ''

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">My Profile</h1>
        <p className="text-gray-600 mt-1">View and update your personal information</p>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      ) : (
        <>
          <Card>
            <CardHeader>
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16">
                  <AvatarImage src={profile?.avatar_url ?? ''} />
                  <AvatarFallback className="text-lg">{initials}</AvatarFallback>
                </Avatar>
                <div>
                  <CardTitle className="text-xl">{profile?.first_name} {profile?.last_name}</CardTitle>
                  <CardDescription>{profile?.email}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Role</span>
                  <p className="font-medium capitalize">{profile?.role}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Phone</span>
                  <p className="font-medium">{profile?.phone ?? '—'}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Gender</span>
                  <p className="font-medium capitalize">{profile?.gender ?? '—'}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Date of Birth</span>
                  <p className="font-medium">{profile?.date_of_birth ?? '—'}</p>
                </div>
                {teacher && (
                  <>
                    <div>
                      <span className="text-muted-foreground">Employee Number</span>
                      <p className="font-medium">{teacher.employee_number ?? '—'}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Department</span>
                      <p className="font-medium">{teacher.department ?? '—'}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Qualification</span>
                      <p className="font-medium">{teacher.qualification ?? '—'}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Specialization</span>
                      <p className="font-medium">{teacher.specialization ?? '—'}</p>
                    </div>
                  </>
                )}
              </div>
              {!editing && (
                <Button onClick={startEditing} className="mt-4">Edit Profile</Button>
              )}
            </CardContent>
          </Card>

          {editing && (
            <Card>
              <CardHeader><CardTitle>Edit Profile</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>First Name *</Label>
                    <Input value={form.first_name} onChange={(e) => setForm(p => ({ ...p, first_name: e.target.value }))} />
                  </div>
                  <div>
                    <Label>Last Name *</Label>
                    <Input value={form.last_name} onChange={(e) => setForm(p => ({ ...p, last_name: e.target.value }))} />
                  </div>
                </div>
                <div>
                  <Label>Phone</Label>
                  <Input value={form.phone} onChange={(e) => setForm(p => ({ ...p, phone: e.target.value }))} placeholder="+1 (555) 123-4567" />
                </div>
                <div>
                  <Label>Avatar URL</Label>
                  <Input value={form.avatar_url} onChange={(e) => setForm(p => ({ ...p, avatar_url: e.target.value }))} placeholder="https://..." />
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setEditing(false)}>Cancel</Button>
                  <Button onClick={() => mutation.mutate()} disabled={mutation.isPending || !form.first_name || !form.last_name}>
                    {mutation.isPending ? 'Saving...' : <><Save className="h-4 w-4 mr-2" /> Save Changes</>}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  )
}
